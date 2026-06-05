import { assertHomeSearchEntryConvergence } from "./home-search-entry-convergence";
import { runRouteFamilyHttpConvergenceChecks } from "./route-family-http-convergence-runner";

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
  return runRouteFamilyHttpConvergenceChecks(baseUrl, {
    timeoutMs: options.timeoutMs,
    routes: [
      {
        path: HOME_SEARCH_ENTRY_CONVERGENCE_PATH,
        label: HOME_SEARCH_ENTRY_CONVERGENCE_PATH,
        assertBody: assertHomeSearchEntryConvergence,
      },
    ],
  });
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
