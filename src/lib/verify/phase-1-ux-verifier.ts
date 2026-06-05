import {
  assertPhase1Routes,
  type RunPhase1RouteChecksOptions,
} from "./phase-1-route-checks";
import {
  assertPhase1Search,
  type RunPhase1SearchChecksOptions,
} from "./phase-1-search-checks";
import {
  assertPhase1SearchDialog,
  type RunPhase1SearchDialogChecksOptions,
} from "./phase-1-search-dialog-checks";
import {
  assertPhase1SearchPage,
  type RunPhase1SearchPageChecksOptions,
} from "./phase-1-search-page-checks";
import {
  assertPhase1SearchShortcuts,
  type RunPhase1SearchShortcutChecksOptions,
} from "./phase-1-search-shortcut-checks";
import {
  assertPhase1UxConvergence,
  type RunPhase1UxConvergenceOptions,
} from "./phase-1-ux-convergence";

export const PHASE_1_UX_SUCCESS_MESSAGE =
  "Phase 1 route and search UX verification passed.";

export type RunPhase1UxVerificationOptions = {
  convergenceOptions?: RunPhase1UxConvergenceOptions;
  routeOptions?: RunPhase1RouteChecksOptions;
  searchOptions?: RunPhase1SearchChecksOptions;
  searchPageOptions?: RunPhase1SearchPageChecksOptions;
  searchDialogOptions?: RunPhase1SearchDialogChecksOptions;
  searchShortcutOptions?: RunPhase1SearchShortcutChecksOptions;
};

/**
 * Runs Phase 1 reader UX convergence (docs shell, home search entry, reader and
 * tags navigation), route content checks, /api/search checks, built `/search`
 * UI checks, header search dialog checks, then keyboard shortcut checks against
 * a live base URL.
 */
export async function runPhase1UxVerification(
  baseUrl: string,
  options: RunPhase1UxVerificationOptions = {},
): Promise<void> {
  await assertPhase1UxConvergence(baseUrl, options.convergenceOptions);
  await assertPhase1Routes(baseUrl, options.routeOptions);
  await assertPhase1Search(baseUrl, options.searchOptions);
  await assertPhase1SearchPage(baseUrl, options.searchPageOptions);
  await assertPhase1SearchDialog(baseUrl, options.searchDialogOptions);
  await assertPhase1SearchShortcuts(baseUrl, options.searchShortcutOptions);
}
