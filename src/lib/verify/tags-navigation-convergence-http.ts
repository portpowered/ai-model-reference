import { runRouteFamilyHttpConvergenceChecks } from "./route-family-http-convergence-runner";
import {
  ATTENTION_TAG_LANDING_PATH,
  assertTagsAttentionNavigationConvergence,
  assertTagsIndexNavigationConvergence,
} from "./tags-navigation-convergence";

export type TagsNavigationConvergenceRoute = {
  path: "/tags" | typeof ATTENTION_TAG_LANDING_PATH;
  label: string;
  assertBody: (html: string) => string | null;
};

/** Phase 1 tags routes that must expose coherent site navigation and real tag links. */
export const TAGS_NAVIGATION_CONVERGENCE_ROUTES: readonly TagsNavigationConvergenceRoute[] =
  [
    {
      path: "/tags",
      label: "/tags",
      assertBody: assertTagsIndexNavigationConvergence,
    },
    {
      path: ATTENTION_TAG_LANDING_PATH,
      label: ATTENTION_TAG_LANDING_PATH,
      assertBody: assertTagsAttentionNavigationConvergence,
    },
  ] as const;

export type TagsNavigationConvergenceCheckFailure = {
  /** Full request URL (base + path) for stderr output. */
  url: string;
  route: string;
  status: number | null;
  reason: string;
};

export type RunTagsNavigationConvergenceChecksOptions = {
  timeoutMs?: number;
  routes?: readonly TagsNavigationConvergenceRoute[];
};

export function formatTagsNavigationConvergenceCheckFailure(
  failure: TagsNavigationConvergenceCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.url}: ${statusLabel} — ${failure.reason}`;
}

/**
 * Timed GET for `/tags` and `/tags/attention`; returns failures (empty when all pass).
 */
export async function runTagsNavigationConvergenceChecks(
  baseUrl: string,
  options: RunTagsNavigationConvergenceChecksOptions = {},
): Promise<TagsNavigationConvergenceCheckFailure[]> {
  const routes = options.routes ?? TAGS_NAVIGATION_CONVERGENCE_ROUTES;

  return runRouteFamilyHttpConvergenceChecks(baseUrl, {
    timeoutMs: options.timeoutMs,
    routes,
  });
}

/**
 * Runs tags navigation convergence checks, prints each failure, and throws when any fail.
 */
export async function assertTagsNavigationConvergenceRoutes(
  baseUrl: string,
  options: RunTagsNavigationConvergenceChecksOptions = {},
): Promise<void> {
  const failures = await runTagsNavigationConvergenceChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  const firstFailure = failures[0];
  if (firstFailure) {
    console.error(formatTagsNavigationConvergenceCheckFailure(firstFailure));
  }

  throw new Error("Phase 1 tags navigation convergence verification failed");
}
