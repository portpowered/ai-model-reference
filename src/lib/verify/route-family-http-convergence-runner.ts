import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RouteFamilyHttpConvergenceRoute = {
  path: string;
  /** Human-readable route label for failure output. */
  label: string;
  assertBody: (html: string) => string | null;
};

export type RouteFamilyHttpConvergenceCheckFailure = {
  /** Full request URL (base + path) for stderr output. */
  url: string;
  route: string;
  status: number | null;
  reason: string;
};

export type RunRouteFamilyHttpConvergenceChecksOptions<
  TRoute extends
    RouteFamilyHttpConvergenceRoute = RouteFamilyHttpConvergenceRoute,
> = {
  timeoutMs?: number;
  routes: readonly TRoute[];
};

/**
 * Timed GET for each route in order; returns failures (empty when all pass).
 * Stops at the first non-200 response, assertion failure, or fetch error.
 */
export async function runRouteFamilyHttpConvergenceChecks(
  baseUrl: string,
  options: RunRouteFamilyHttpConvergenceChecksOptions,
): Promise<RouteFamilyHttpConvergenceCheckFailure[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const { routes } = options;
  const failures: RouteFamilyHttpConvergenceCheckFailure[] = [];

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

      const assertionReason = route.assertBody(body);
      if (assertionReason) {
        failures.push({
          url,
          route: route.label,
          status,
          reason: assertionReason,
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
