import { assertHomeSearchEntryConvergence } from "./home-search-entry-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const HOME_SEARCH_ENTRY_CONVERGENCE_PATH = "/" as const;

export type HomeSearchEntryConvergenceCheckFailure = {
  /** Full request URL (base + path) for stderr output. */
  url: string;
  route: string;
  status: number | null;
  reason: string;
};

export type RunHomeSearchEntryConvergenceChecksOptions = {
  timeoutMs?: number;
};

export function formatHomeSearchEntryConvergenceCheckFailure(
  failure: HomeSearchEntryConvergenceCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.url}: ${statusLabel} — ${failure.reason}`;
}

/**
 * Timed GET for `/`; returns failures (empty when the home page passes).
 */
export async function runHomeSearchEntryConvergenceChecks(
  baseUrl: string,
  options: RunHomeSearchEntryConvergenceChecksOptions = {},
): Promise<HomeSearchEntryConvergenceCheckFailure[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${HOME_SEARCH_ENTRY_CONVERGENCE_PATH}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);

    if (status !== 200) {
      return [
        {
          url,
          route: HOME_SEARCH_ENTRY_CONVERGENCE_PATH,
          status,
          reason: "expected HTTP 200",
        },
      ];
    }

    const entryReason = assertHomeSearchEntryConvergence(body);
    if (entryReason) {
      return [
        {
          url,
          route: HOME_SEARCH_ENTRY_CONVERGENCE_PATH,
          status,
          reason: entryReason,
        },
      ];
    }

    return [];
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return [
      {
        url,
        route: HOME_SEARCH_ENTRY_CONVERGENCE_PATH,
        status: null,
        reason,
      },
    ];
  }
}

/**
 * Runs home search-entry convergence checks, prints each failure, and throws when any fail.
 */
export async function assertHomeSearchEntryConvergenceRoute(
  baseUrl: string,
  options: RunHomeSearchEntryConvergenceChecksOptions = {},
): Promise<void> {
  const failures = await runHomeSearchEntryConvergenceChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  const firstFailure = failures[0];
  if (firstFailure) {
    console.error(formatHomeSearchEntryConvergenceCheckFailure(firstFailure));
  }

  throw new Error("Phase 1 home search entry convergence verification failed");
}
