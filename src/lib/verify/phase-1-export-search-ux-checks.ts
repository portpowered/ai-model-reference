import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { resolveBasePathForExportVerification } from "@/lib/build/static-export";
import { verifyPhase1ExportSearchFromOutDir } from "@/lib/build/verify-phase-1-export-search";
import {
  shouldSerializeExportIntegrationProbes,
  withExportIntegrationProbeLock,
} from "./export-integration-probe-lock";
import { EXPORT_SEARCH_HYDRATION_SURFACE } from "./phase-1-export-search-convergence-evidence";
import {
  type RunPhase1SearchDialogChecksOptions,
  runPhase1SearchDialogChecks,
} from "./phase-1-search-dialog-checks";
import {
  PHASE_1_SEARCH_PAGE_QUERIES,
  type RunPhase1SearchPageChecksOptions,
  runPhase1SearchPageChecks,
} from "./phase-1-search-page-checks";
import { createStaticExportHttpServer } from "./static-export-http-server";

export const DEFAULT_EXPORT_OUT_DIR = "out";
export const DEFAULT_EXPORT_SEARCH_UX_TIMEOUT_MS = 45_000;

export const EXPORT_SEARCH_UX_STUB_ENV = "VERIFY_EXPORT_SEARCH_UX_STUB";

/** Under full-suite probe serialization, export Playwright probes only GQA to avoid lock-queue timeouts. */
export const CI_EXPORT_SEARCH_UX_PROBE_QUERIES = ["GQA"] as const;

export function resolveCiExportSearchUxProbeQueries(
  queries?: readonly string[],
): readonly string[] | undefined {
  if (queries !== undefined) {
    return queries;
  }
  if (shouldSerializeExportIntegrationProbes()) {
    return CI_EXPORT_SEARCH_UX_PROBE_QUERIES;
  }
  return PHASE_1_SEARCH_PAGE_QUERIES;
}

function withCiScopedSearchUxQueryOptions<
  T extends { queries?: readonly string[]; timeoutMs?: number },
>(options: T | undefined): T {
  const queries = resolveCiExportSearchUxProbeQueries(options?.queries);
  const timeoutMs = Math.max(
    options?.timeoutMs ?? 0,
    DEFAULT_EXPORT_SEARCH_UX_TIMEOUT_MS,
  );
  if (options === undefined) {
    return { queries, timeoutMs } as T;
  }
  return { ...options, queries, timeoutMs };
}

export type RunPhase1ExportSearchUxChecksOptions = {
  outDir?: string;
  cwd?: string;
  basePath?: string;
  searchPageOptions?: RunPhase1SearchPageChecksOptions;
  searchDialogOptions?: RunPhase1SearchDialogChecksOptions;
};

export type Phase1ExportSearchUxCheckFailure = {
  surface: "export-artifact" | "/search" | "header-dialog";
  reason: string;
  query?: string;
};

export function resolveExportSearchUxCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunPhase1ExportSearchUxChecksOptions {
  const stub = env[EXPORT_SEARCH_UX_STUB_ENV]?.trim();
  if (stub === "pass") {
    return {
      searchPageOptions: { runQueryCheck: async () => null },
      searchDialogOptions: { runQueryCheck: async () => null },
    };
  }
  if (stub === "fail-search") {
    return {
      searchPageOptions: {
        queries: ["attention"],
        runQueryCheck: async (_baseUrl, query) =>
          `no search results rendered on /search for query "${query}"`,
      },
      searchDialogOptions: { runQueryCheck: async () => null },
    };
  }
  return {};
}

function resolveOutDirAbsolute(outDir: string, cwd: string): string {
  return isAbsolute(outDir) ? outDir : join(cwd, outDir);
}

/**
 * Verifies Phase 1 `/search` and header dialog queries against a served static export artifact.
 */
export async function runPhase1ExportSearchUxChecks(
  options: RunPhase1ExportSearchUxChecksOptions = {},
): Promise<Phase1ExportSearchUxCheckFailure[]> {
  const cwd = options.cwd ?? process.cwd();
  const outDir = options.outDir ?? DEFAULT_EXPORT_OUT_DIR;
  const absoluteOutDir = resolveOutDirAbsolute(outDir, cwd);
  const basePath =
    options.basePath ?? resolveBasePathForExportVerification(process.env);

  if (!existsSync(absoluteOutDir)) {
    return [
      {
        surface: "export-artifact",
        reason: `Missing export directory at ${outDir} — run \`bun run build:export\` first.`,
      },
    ];
  }

  const artifact = await verifyPhase1ExportSearchFromOutDir(outDir, { cwd });
  if (!artifact.ok) {
    return [
      {
        surface: "export-artifact",
        reason: artifact.reason,
      },
    ];
  }

  const runServedChecks = async (): Promise<
    Phase1ExportSearchUxCheckFailure[]
  > => {
    const session = await createStaticExportHttpServer({
      outDir,
      cwd,
      basePath,
    });

    try {
      const failures: Phase1ExportSearchUxCheckFailure[] = [];

      const searchPageOptions = withCiScopedSearchUxQueryOptions(
        options.searchPageOptions,
      );
      const searchDialogOptions = withCiScopedSearchUxQueryOptions(
        options.searchDialogOptions,
      );

      const searchPageFailures = await runPhase1SearchPageChecks(
        session.baseUrl,
        searchPageOptions,
      );
      for (const failure of searchPageFailures) {
        failures.push({
          surface: "/search",
          query: failure.query,
          reason: formatPhase1ExportSearchHydrationUxReason(failure.reason),
        });
      }

      const searchDialogFailures = await runPhase1SearchDialogChecks(
        session.baseUrl,
        searchDialogOptions,
      );
      for (const failure of searchDialogFailures) {
        failures.push({
          surface: "header-dialog",
          query: failure.query,
          reason: failure.reason,
        });
      }

      return failures;
    } finally {
      await session.cleanup();
    }
  };

  if (isStubbedExportSearchUxCheck(options)) {
    return runServedChecks();
  }

  return withExportIntegrationProbeLock(runServedChecks);
}

function isStubbedExportSearchUxCheck(
  options: RunPhase1ExportSearchUxChecksOptions,
): boolean {
  return (
    options.searchPageOptions?.runQueryCheck !== undefined &&
    options.searchDialogOptions?.runQueryCheck !== undefined
  );
}

/** Prefixes a `/search` hydration DOM outcome for standalone verifier stderr. */
export function formatPhase1ExportSearchHydrationUxReason(
  domOutcome: string,
): string {
  return `${EXPORT_SEARCH_HYDRATION_SURFACE} — ${domOutcome}`;
}

export function formatPhase1ExportSearchUxCheckFailure(
  failure: Phase1ExportSearchUxCheckFailure,
): string {
  if (failure.query !== undefined) {
    return `${failure.surface}?query=${encodeURIComponent(failure.query)}: ${failure.reason}`;
  }
  return `${failure.surface}: ${failure.reason}`;
}

/**
 * Runs export search UX checks and throws when any surface fails.
 */
export async function assertPhase1ExportSearchUx(
  options: RunPhase1ExportSearchUxChecksOptions = {},
): Promise<void> {
  const failures = await runPhase1ExportSearchUxChecks(options);

  if (failures.length === 0) {
    return;
  }

  for (const failure of failures) {
    console.error(formatPhase1ExportSearchUxCheckFailure(failure));
  }

  throw new Error(
    `Phase 1 static export search UX verification failed (${failures.length} surface/surfaces)`,
  );
}
