import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { resolveBasePathForExportVerification } from "@/lib/build/static-export";
import { verifyPhase1ExportSearchFromOutDir } from "@/lib/build/verify-phase-1-export-search";
import {
  shouldSerializeExportIntegrationProbes,
  withExportIntegrationProbeLock,
} from "./export-integration-probe-lock";
import {
  assertPhase1SearchDialog,
  type RunPhase1SearchDialogChecksOptions,
} from "./phase-1-search-dialog-checks";
import {
  assertPhase1SearchPage,
  PHASE_1_SEARCH_PAGE_QUERIES,
  type RunPhase1SearchPageChecksOptions,
} from "./phase-1-search-page-checks";
import { createStaticExportHttpServer } from "./static-export-http-server";

export const DEFAULT_EXPORT_OUT_DIR = "out";

export const EXPORT_SEARCH_UX_STUB_ENV = "VERIFY_EXPORT_SEARCH_UX_STUB";

/** Under CI full-suite load, export Playwright probes only GQA to avoid lock-queue timeouts. */
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
  T extends { queries?: readonly string[] },
>(options: T | undefined): T {
  const queries = resolveCiExportSearchUxProbeQueries(options?.queries);
  if (options === undefined) {
    return { queries } as T;
  }
  return { ...options, queries };
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
};

export function resolveExportSearchUxCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunPhase1ExportSearchUxChecksOptions {
  if (env[EXPORT_SEARCH_UX_STUB_ENV]?.trim() === "pass") {
    return {
      searchPageOptions: { runQueryCheck: async () => null },
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

  return withExportIntegrationProbeLock(async () => {
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

      try {
        await assertPhase1SearchPage(session.baseUrl, searchPageOptions);
      } catch (error) {
        failures.push({
          surface: "/search",
          reason: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        await assertPhase1SearchDialog(session.baseUrl, searchDialogOptions);
      } catch (error) {
        failures.push({
          surface: "header-dialog",
          reason: error instanceof Error ? error.message : String(error),
        });
      }

      return failures;
    } finally {
      await session.cleanup();
    }
  });
}

export function formatPhase1ExportSearchUxCheckFailure(
  failure: Phase1ExportSearchUxCheckFailure,
): string {
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
