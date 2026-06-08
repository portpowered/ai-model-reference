import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import { exportHtmlReferencesBasePathAssets } from "@/lib/build/verify-export-base-path";

const DEFAULT_GITHUB_PAGES_BASE_PATH = "/ai-model-reference";

export type EnsureExportSearchArtifactsOptions = {
  repoRoot: string;
  basePath?: string;
};

function searchExportHtmlPath(repoRoot: string): string {
  return join(repoRoot, "out", "search.html");
}

function exportSearchHtmlMatchesBasePath(
  repoRoot: string,
  basePath: string | undefined,
): boolean {
  const htmlPath = searchExportHtmlPath(repoRoot);
  if (!existsSync(htmlPath)) {
    return false;
  }

  const html = readFileSync(htmlPath, "utf8");
  if (!basePath || basePath.trim() === "") {
    return !exportHtmlReferencesBasePathAssets(
      html,
      DEFAULT_GITHUB_PAGES_BASE_PATH,
    );
  }

  return exportHtmlReferencesBasePathAssets(html, basePath);
}

/**
 * Ensures `out/search.html` exists for export integration tests without deleting
 * shared artifacts other parallel tests may still be serving.
 */
export function ensureExportSearchArtifacts(
  options: EnsureExportSearchArtifactsOptions,
): void {
  const { repoRoot, basePath } = options;
  if (exportSearchHtmlMatchesBasePath(repoRoot, basePath)) {
    return;
  }

  const buildResult = runStaticExportBuild({
    cwd: repoRoot,
    env: basePath ? { GITHUB_PAGES_BASE_PATH: basePath } : undefined,
  });
  if (buildResult.status !== 0) {
    throw new Error(
      `build-export failed with status ${buildResult.status}: ${buildResult.stderr ?? buildResult.stdout ?? ""}`,
    );
  }

  const htmlPath = searchExportHtmlPath(repoRoot);
  if (!existsSync(htmlPath)) {
    throw new Error(`missing export artifact at ${htmlPath}`);
  }
  if (!exportSearchHtmlMatchesBasePath(repoRoot, basePath)) {
    throw new Error(
      `export artifact at ${htmlPath} does not match expected base path ${basePath ?? "(default)"}`,
    );
  }
}
