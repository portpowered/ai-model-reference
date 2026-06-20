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
import { isRetryableStaticExportSearchProbeFailure } from "./static-export-search-empty-error-states-http";

export const DEFAULT_EXPORT_OUT_DIR = "out";

export const EXPORT_SEARCH_UX_STUB_ENV = "VERIFY_EXPORT_SEARCH_UX_STUB";
export const DEFAULT_EXPORT_SEARCH_UX_TIMEOUT_MS = 45_000;
export const CI_SCRIPT_TIMEOUT_MS_ENV = "CI_SCRIPT_TIMEOUT_MS";
export const DEFAULT_CI_SCRIPT_TIMEOUT_MS = 300_000;
const EXPORT_SEARCH_UX_RETRY_ATTEMPTS = 3;
const EXPORT_SEARCH_UX_RETRY_DELAY_MS = 5_000;

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
  T extends { queries?: readonly string[] },
>(options: T | undefined): T {
  const queries = resolveCiExportSearchUxProbeQueries(options?.queries);
  if (options === undefined) {
    return { queries } as T;
  }
  return { ...options, queries };
}

function withDefaultExportSearchUxTimeout<T extends { timeoutMs?: number }>(
  options: T | undefined,
): T {
  if (options === undefined) {
    return { timeoutMs: DEFAULT_EXPORT_SEARCH_UX_TIMEOUT_MS } as T;
  }
  return {
    ...options,
    timeoutMs: options.timeoutMs ?? DEFAULT_EXPORT_SEARCH_UX_TIMEOUT_MS,
  };
}

export type RunPhase1ExportSearchUxChecksOptions = {
  outDir?: string;
  cwd?: string;
  basePath?: string;
  logger?: (message: string) => void;
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

export function resolveCiScriptTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number | null {
  const isCi = env.CI === "true" || env.GITHUB_ACTIONS === "true";
  if (!isCi) {
    return null;
  }

  const raw = env[CI_SCRIPT_TIMEOUT_MS_ENV]?.trim();
  if (!raw) {
    return DEFAULT_CI_SCRIPT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CI_SCRIPT_TIMEOUT_MS;
  }

  return parsed;
}

function resolveOutDirAbsolute(outDir: string, cwd: string): string {
  return isAbsolute(outDir) ? outDir : join(cwd, outDir);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableSearchDialogFailureReason(reason: string): boolean {
  return (
    reason.includes(
      "timed out waiting for search results in header search dialog",
    ) || reason.includes("no search results rendered in header search dialog")
  );
}

function isRetryableExportSearchUxFailure(
  failure: Phase1ExportSearchUxCheckFailure,
): boolean {
  const retryableProbeReason: string | null = failure.reason;

  if (isRetryableStaticExportSearchProbeFailure(retryableProbeReason)) {
    return true;
  }

  const reason = failure.reason;

  if (failure.surface === "header-dialog") {
    return isRetryableSearchDialogFailureReason(reason);
  }

  if (failure.surface !== "/search") {
    return false;
  }

  return reason.includes("search input did not hydrate on /search within");
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
  const log = options.logger ?? (() => {});

  log(
    `[phase-1-export-search-ux] starting verification outDir=${outDir} cwd=${cwd} basePath=${basePath || "/"}`,
  );

  if (!existsSync(absoluteOutDir)) {
    log(
      `[phase-1-export-search-ux] missing export directory at ${absoluteOutDir}`,
    );
    return [
      {
        surface: "export-artifact",
        reason: `Missing export directory at ${outDir} — run \`bun run build:export\` first.`,
      },
    ];
  }

  log("[phase-1-export-search-ux] verifying export search artifact");
  const artifact = await verifyPhase1ExportSearchFromOutDir(outDir, { cwd });
  if (!artifact.ok) {
    log(
      `[phase-1-export-search-ux] export artifact verification failed: ${artifact.reason}`,
    );
    return [
      {
        surface: "export-artifact",
        reason: artifact.reason,
      },
    ];
  }
  log("[phase-1-export-search-ux] export search artifact verified");

  const runServedChecksOnce = async (): Promise<
    Phase1ExportSearchUxCheckFailure[]
  > => {
    log("[phase-1-export-search-ux] starting static export HTTP server");
    const session = await createStaticExportHttpServer({
      outDir,
      cwd,
      basePath,
    });
    log(
      `[phase-1-export-search-ux] static export HTTP server listening at ${session.baseUrl}`,
    );

    try {
      const failures: Phase1ExportSearchUxCheckFailure[] = [];

      const searchPageOptions = withDefaultExportSearchUxTimeout(
        withCiScopedSearchUxQueryOptions(options.searchPageOptions),
      );
      const searchDialogOptions = withDefaultExportSearchUxTimeout(
        withCiScopedSearchUxQueryOptions(options.searchDialogOptions),
      );

      const searchPageFailures = await runPhase1SearchPageChecks(
        session.baseUrl,
        {
          ...searchPageOptions,
          logger: options.searchPageOptions?.logger ?? log,
        },
      );
      log(
        `[phase-1-export-search-ux] /search checks completed with ${searchPageFailures.length} failure(s)`,
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
        {
          ...searchDialogOptions,
          logger: options.searchDialogOptions?.logger ?? log,
        },
      );
      log(
        `[phase-1-export-search-ux] header dialog checks completed with ${searchDialogFailures.length} failure(s)`,
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
      log("[phase-1-export-search-ux] stopping static export HTTP server");
      await session.cleanup();
      log("[phase-1-export-search-ux] static export HTTP server stopped");
    }
  };

  const runServedChecks = async (): Promise<
    Phase1ExportSearchUxCheckFailure[]
  > => {
    let failures: Phase1ExportSearchUxCheckFailure[] = [];

    for (
      let attempt = 1;
      attempt <= EXPORT_SEARCH_UX_RETRY_ATTEMPTS;
      attempt += 1
    ) {
      log(
        `[phase-1-export-search-ux] served verification attempt ${attempt}/${EXPORT_SEARCH_UX_RETRY_ATTEMPTS}`,
      );
      failures = await runServedChecksOnce();
      const shouldRetry =
        failures.length > 0 &&
        failures.every(isRetryableExportSearchUxFailure) &&
        attempt < EXPORT_SEARCH_UX_RETRY_ATTEMPTS;

      if (!shouldRetry) {
        log(
          `[phase-1-export-search-ux] served verification completed with ${failures.length} failure(s)`,
        );
        return failures;
      }

      log(
        `[phase-1-export-search-ux] retrying after ${EXPORT_SEARCH_UX_RETRY_DELAY_MS}ms because all ${failures.length} failure(s) were retryable`,
      );
      await sleep(EXPORT_SEARCH_UX_RETRY_DELAY_MS);
    }

    return failures;
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
