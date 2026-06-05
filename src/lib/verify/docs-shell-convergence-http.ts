import { assertDocsShellConvergence } from "./docs-shell-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

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
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const routes = options.routes ?? DOCS_SHELL_CONVERGENCE_ROUTES;
  const failures: DocsShellConvergenceCheckFailure[] = [];

  for (const route of routes) {
    const url = `${normalizedBase}${route.path}`;

    try {
      const { status, body } = await httpGetText(url, timeoutMs);

      if (status !== 200) {
        failures.push({
          url,
          route: route.label,
          status,
          reason: "expected HTTP 200",
        });
        return failures;
      }

      const shellReason = assertDocsShellConvergence(body);
      if (shellReason) {
        failures.push({
          url,
          route: route.label,
          status,
          reason: shellReason,
        });
        return failures;
      }
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      failures.push({
        url,
        route: route.label,
        status: null,
        reason,
      });
      return failures;
    }
  }

  return failures;
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
