import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";
import {
  PHASE_1_ROUTE_ASSERTIONS,
  type Phase1RouteAssertion,
} from "@/lib/verify/phase-1-route-checks";

export const BUILT_APP_GITHUB_PAGES_BASE_PATH = "/ai-model-reference";

/** Normalizes export base-path-prefixed built HTML for production-route assertions. */
export function normalizeBuiltAppHtmlInternalPaths(html: string): string {
  const prefix = BUILT_APP_GITHUB_PAGES_BASE_PATH;
  if (!prefix || !html.includes(`href="${prefix}/`)) {
    return html;
  }
  return html.replaceAll(`href="${prefix}/`, 'href="/');
}

/** Reads production built HTML when integration convergence tests should run. */
export function readBuiltAppServerHtml(
  relativePathFromServerApp: string,
  cwd: string = process.cwd(),
): string | null {
  return readBuiltHtmlForConvergenceTests(
    `.next/server/app/${relativePathFromServerApp}`,
    cwd,
  );
}

/** Applies a Phase 1 route assertion to built-app HTML (null when content passes). */
export function assertBuiltAppRouteHtml(
  routePath: string,
  html: string,
  routes: readonly Phase1RouteAssertion[] = PHASE_1_ROUTE_ASSERTIONS,
): string | null {
  const assertion = routes.find((entry) => entry.path === routePath);
  if (!assertion) {
    return `missing Phase 1 route assertion for ${routePath}`;
  }
  return assertion.assertBody(html);
}
