import {
  assertPhase1Routes,
  type RunPhase1RouteChecksOptions,
} from "./phase-1-route-checks";
import {
  assertPhase1Search,
  type RunPhase1SearchChecksOptions,
} from "./phase-1-search-checks";

export const PHASE_1_UX_SUCCESS_MESSAGE =
  "Phase 1 route and search UX verification passed.";

export type RunPhase1UxVerificationOptions = {
  routeOptions?: RunPhase1RouteChecksOptions;
  searchOptions?: RunPhase1SearchChecksOptions;
};

/**
 * Runs Phase 1 reader route checks, then /api/search checks, against a live base URL.
 */
export async function runPhase1UxVerification(
  baseUrl: string,
  options: RunPhase1UxVerificationOptions = {},
): Promise<void> {
  await assertPhase1Routes(baseUrl, options.routeOptions);
  await assertPhase1Search(baseUrl, options.searchOptions);
}
