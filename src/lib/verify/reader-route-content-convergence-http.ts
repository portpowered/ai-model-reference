import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import {
  assertHomeRouteContentConvergence,
  assertSearchRouteContentConvergence,
} from "./reader-route-content-convergence";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type ReaderRouteContentConvergenceRoute = {
  path: "/" | "/search";
  label: string;
  assertBody: (html: string) => string | null;
};

/** Phase 1 home and search routes with manual-gate content markers. */
export const READER_ROUTE_CONTENT_CONVERGENCE_ROUTES: readonly ReaderRouteContentConvergenceRoute[] =
  [
    {
      path: "/",
      label: "/",
      assertBody: assertHomeRouteContentConvergence,
    },
    {
      path: "/search",
      label: "/search",
      assertBody: assertSearchRouteContentConvergence,
    },
  ] as const;

export type ReaderRouteContentConvergenceCheckFailure = {
  /** Full request URL (base + path) for stderr output. */
  url: string;
  route: string;
  status: number | null;
  reason: string;
};

export type RunReaderRouteContentConvergenceChecksOptions = {
  timeoutMs?: number;
  routes?: readonly ReaderRouteContentConvergenceRoute[];
};

export function formatReaderRouteContentConvergenceCheckFailure(
  failure: ReaderRouteContentConvergenceCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.url}: ${statusLabel} — ${failure.reason}`;
}

/**
 * Timed GET for `/` and `/search`; returns failures (empty when all pass).
 */
export async function runReaderRouteContentConvergenceChecks(
  baseUrl: string,
  options: RunReaderRouteContentConvergenceChecksOptions = {},
): Promise<ReaderRouteContentConvergenceCheckFailure[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const routes = options.routes ?? READER_ROUTE_CONTENT_CONVERGENCE_ROUTES;
  const failures: ReaderRouteContentConvergenceCheckFailure[] = [];

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

      const contentReason = route.assertBody(body);
      if (contentReason) {
        failures.push({
          url,
          route: route.label,
          status,
          reason: contentReason,
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
 * Runs reader route content convergence checks, prints each failure, and throws when any fail.
 */
export async function assertReaderRouteContentConvergenceRoutes(
  baseUrl: string,
  options: RunReaderRouteContentConvergenceChecksOptions = {},
): Promise<void> {
  const failures = await runReaderRouteContentConvergenceChecks(
    baseUrl,
    options,
  );

  if (failures.length === 0) {
    return;
  }

  const firstFailure = failures[0];
  if (firstFailure) {
    console.error(
      formatReaderRouteContentConvergenceCheckFailure(firstFailure),
    );
  }

  throw new Error(
    "Phase 1 reader route content convergence verification failed",
  );
}
