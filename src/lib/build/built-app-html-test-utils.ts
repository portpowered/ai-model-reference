import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasCompleteNextProductionBuild } from "@/lib/verify/server-lifecycle";

export const BUILT_APP_GITHUB_PAGES_BASE_PATH = "/ai-model-reference";

/** Normalizes export base-path-prefixed built HTML for production-route assertions. */
export function normalizeBuiltAppHtmlInternalPaths(html: string): string {
  const prefix = BUILT_APP_GITHUB_PAGES_BASE_PATH;
  if (!prefix || !html.includes(`href="${prefix}/`)) {
    return html;
  }
  return html.replaceAll(`href="${prefix}/`, 'href="/');
}

/** Reads production built HTML when a complete `.next` artifact is present. */
export function readBuiltAppServerHtml(
  relativePathFromServerApp: string,
  cwd: string = process.cwd(),
): string | null {
  if (!hasCompleteNextProductionBuild(cwd)) {
    return null;
  }

  const absolutePath = join(cwd, ".next/server/app", relativePathFromServerApp);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const html = readFileSync(absolutePath, "utf8");
  return normalizeBuiltAppHtmlInternalPaths(html);
}
