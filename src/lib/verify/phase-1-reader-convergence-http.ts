import {
  assertReaderRouteContentConvergenceRoutes,
  type RunReaderRouteContentConvergenceChecksOptions,
} from "./reader-route-content-convergence-http";
import {
  assertTagsNavigationConvergenceRoutes,
  type RunTagsNavigationConvergenceChecksOptions,
} from "./tags-navigation-convergence-http";

export type RunPhase1ReaderConvergenceChecksOptions = {
  readerRouteOptions?: RunReaderRouteContentConvergenceChecksOptions;
  tagsNavigationOptions?: RunTagsNavigationConvergenceChecksOptions;
};

/**
 * Runs Phase 1 reader route content checks (`/`, `/search`) then tags navigation
 * checks (`/tags`, `/tags/attention`) against a live base URL.
 */
export async function assertPhase1ReaderConvergenceRoutes(
  baseUrl: string,
  options: RunPhase1ReaderConvergenceChecksOptions = {},
): Promise<void> {
  await assertReaderRouteContentConvergenceRoutes(
    baseUrl,
    options.readerRouteOptions,
  );
  await assertTagsNavigationConvergenceRoutes(
    baseUrl,
    options.tagsNavigationOptions,
  );
}
