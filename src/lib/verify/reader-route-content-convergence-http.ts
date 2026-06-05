import {
  assertHomeRouteContentConvergence,
  assertSearchRouteContentConvergence,
} from "./reader-route-content-convergence";
import { runRouteFamilyHttpConvergenceChecks } from "./route-family-http-convergence-runner";

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
  const routes = options.routes ?? READER_ROUTE_CONTENT_CONVERGENCE_ROUTES;

  return runRouteFamilyHttpConvergenceChecks(baseUrl, {
    timeoutMs: options.timeoutMs,
    routes,
  });
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
