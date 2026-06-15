import { readBuiltHtmlForConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";

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
