import {
  assertDocsShellConvergenceRoutes,
  type RunDocsShellConvergenceChecksOptions,
} from "./docs-shell-convergence-http";
import {
  assertHomeSearchEntryConvergenceRoute,
  type RunHomeSearchEntryConvergenceChecksOptions,
} from "./home-search-entry-convergence-http";
import {
  assertPhase1ReaderConvergenceRoutes,
  type RunPhase1ReaderConvergenceChecksOptions,
} from "./phase-1-reader-convergence-http";

export type RunPhase1UxConvergenceOptions = {
  docsShellOptions?: RunDocsShellConvergenceChecksOptions;
  homeSearchEntryOptions?: RunHomeSearchEntryConvergenceChecksOptions;
  readerConvergenceOptions?: RunPhase1ReaderConvergenceChecksOptions;
};

/**
 * Runs Phase 1 reader UX convergence checks in documented order:
 * 1. unified docs shell on docs-like routes
 * 2. home single search entry on `/`
 * 3. reader route content (`/`, `/search`) then tags navigation
 */
export async function assertPhase1UxConvergence(
  baseUrl: string,
  options: RunPhase1UxConvergenceOptions = {},
): Promise<void> {
  await assertDocsShellConvergenceRoutes(baseUrl, options.docsShellOptions);
  await assertHomeSearchEntryConvergenceRoute(
    baseUrl,
    options.homeSearchEntryOptions,
  );
  await assertPhase1ReaderConvergenceRoutes(
    baseUrl,
    options.readerConvergenceOptions,
  );
}
