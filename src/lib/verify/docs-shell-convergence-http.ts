import { assertDocsShellConvergence } from "./docs-shell-convergence";
import { runRouteFamilyHttpConvergenceChecks } from "./route-family-http-convergence-runner";

export type DocsShellConvergenceRoute = {
  path: string;
  /** Human-readable route label for failure output. */
  label: string;
};

/** Phase 1 docs-like routes that must share the unified Fumadocs shell. */
export const DOCS_SHELL_CONVERGENCE_ROUTES: readonly DocsShellConvergenceRoute[] =
  [
    { path: "/docs/architecture", label: "/docs/architecture" },
    { path: "/docs/glossary", label: "/docs/glossary" },
    { path: "/docs/glossary/token", label: "/docs/glossary/token" },
    {
      path: "/docs/modules/grouped-query-attention",
      label: "/docs/modules/grouped-query-attention",
    },
  ] as const;

export type DocsShellConvergenceCheckFailure = {
  /** Full request URL (base + path) for stderr output. */
  url: string;
  route: string;
  status: number | null;
  reason: string;
};

export type RunDocsShellConvergenceChecksOptions = {
  timeoutMs?: number;
  routes?: readonly DocsShellConvergenceRoute[];
};

export function formatDocsShellConvergenceCheckFailure(
  failure: DocsShellConvergenceCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.url}: ${statusLabel} — ${failure.reason}`;
}

/**
 * Timed GET for each docs-like Phase 1 route; returns failures (empty when all pass).
 */
export async function runDocsShellConvergenceChecks(
  baseUrl: string,
  options: RunDocsShellConvergenceChecksOptions = {},
): Promise<DocsShellConvergenceCheckFailure[]> {
  const routes = options.routes ?? DOCS_SHELL_CONVERGENCE_ROUTES;

  return runRouteFamilyHttpConvergenceChecks(baseUrl, {
    timeoutMs: options.timeoutMs,
    routes: routes.map((route) => ({
      path: route.path,
      label: route.label,
      assertBody: assertDocsShellConvergence,
    })),
  });
}

/**
 * Runs docs shell convergence checks, prints each failure, and throws when any check fails.
 */
export async function assertDocsShellConvergenceRoutes(
  baseUrl: string,
  options: RunDocsShellConvergenceChecksOptions = {},
): Promise<void> {
  const failures = await runDocsShellConvergenceChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  const firstFailure = failures[0];
  if (firstFailure) {
    console.error(formatDocsShellConvergenceCheckFailure(firstFailure));
  }

  throw new Error("Phase 1 docs shell convergence verification failed");
}
