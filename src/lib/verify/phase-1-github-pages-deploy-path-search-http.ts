import {
  buildDeployPathSearchRowsFromFailures,
  DEPLOY_PATH_SEARCH_QUERIES,
  type DeployPathSearchCheckRow,
  type DeployPathSearchEvidence,
  type DeployPathSearchQuery,
  deriveDeployPathSearchEvidence,
} from "./phase-1-github-pages-deploy-path-search";
import type { DeployStaticHarnessOutcome } from "./phase-1-github-pages-deploy-static-harness";
import {
  type RunPhase1SearchPageChecksOptions,
  runPhase1SearchPageChecks,
} from "./phase-1-search-page-checks";

export type RunPhase1DeployPathSearchChecksOptions = {
  queries?: readonly DeployPathSearchQuery[];
  searchPageOptions?: RunPhase1SearchPageChecksOptions;
};

/**
 * Runs Phase 1 `/search` page checks against a static export harness base URL
 * and returns deploy-path-search evidence rows (one per query).
 */
export async function runPhase1DeployPathSearchChecks(
  baseUrl: string,
  options: RunPhase1DeployPathSearchChecksOptions = {},
): Promise<DeployPathSearchCheckRow[]> {
  const queries = options.queries ?? DEPLOY_PATH_SEARCH_QUERIES;
  const failures = await runPhase1SearchPageChecks(baseUrl, {
    ...options.searchPageOptions,
    queries,
  });

  return buildDeployPathSearchRowsFromFailures(failures, queries);
}

export type RunDeployPathSearchEvidenceFromHarnessOptions =
  RunPhase1DeployPathSearchChecksOptions;

/**
 * Acquires deploy-path search evidence from a static harness outcome: runs
 * `phase-1-search-page-checks` when the harness passes and always tears down
 * the session when one was started.
 */
export async function deriveDeployPathSearchEvidenceFromHarnessOutcome(
  harnessOutcome: DeployStaticHarnessOutcome,
  options: RunDeployPathSearchEvidenceFromHarnessOptions = {},
): Promise<DeployPathSearchEvidence> {
  if (harnessOutcome.status === "fail") {
    return deriveDeployPathSearchEvidence({
      skipped: true,
      skipStatus: "fail",
      skipReason: harnessOutcome.reason,
    });
  }

  if (harnessOutcome.status === "uncertain") {
    return deriveDeployPathSearchEvidence({
      skipped: true,
      skipStatus: "uncertain",
      skipReason: harnessOutcome.reason,
    });
  }

  try {
    const rows = await runPhase1DeployPathSearchChecks(
      harnessOutcome.baseUrl,
      options,
    );
    return deriveDeployPathSearchEvidence({ rows });
  } finally {
    await harnessOutcome.session.cleanup();
  }
}
