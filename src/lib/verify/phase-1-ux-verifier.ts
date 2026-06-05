import {
  assertPhase1Routes,
  type RunPhase1RouteChecksOptions,
} from "./phase-1-route-checks";
import {
  assertPhase1Search,
  type RunPhase1SearchChecksOptions,
} from "./phase-1-search-checks";
import {
  assertPhase1SearchPage,
  type RunPhase1SearchPageChecksOptions,
} from "./phase-1-search-page-checks";

export const PHASE_1_UX_SUCCESS_MESSAGE =
  "Phase 1 route and search UX verification passed.";

export type RunPhase1UxVerificationOptions = {
  routeOptions?: RunPhase1RouteChecksOptions;
  searchOptions?: RunPhase1SearchChecksOptions;
  searchPageOptions?: RunPhase1SearchPageChecksOptions;
};

/**
 * Runs Phase 1 reader route checks, /api/search checks, then built `/search` UI
 * checks against a live base URL.
 */
export async function runPhase1UxVerification(
  baseUrl: string,
  options: RunPhase1UxVerificationOptions = {},
): Promise<void> {
  await assertPhase1Routes(baseUrl, options.routeOptions);
  await assertPhase1Search(baseUrl, options.searchOptions);
  await assertPhase1SearchPage(baseUrl, options.searchPageOptions);
}
