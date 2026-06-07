import {
  type BuildModeEnv,
  isStaticExportBuild,
  resolveGitHubPagesBasePath,
} from "../build/static-export";
import { withBasePath } from "../navigation/site-path";

/** Route the live docs search API and static bootstrap artifact share. */
export const DOCS_SEARCH_API_PATH = "/api/search";

/** Client env key set in `next.config.ts` during static export builds. */
export const DOCS_SEARCH_BOOTSTRAP_FROM_ENV =
  "NEXT_PUBLIC_DOCS_SEARCH_BOOTSTRAP_FROM";

/**
 * Resolves the static search bootstrap fetch path for the current build mode.
 * Export builds honor GitHub Pages `basePath`; dev and `next start` keep `/api/search`.
 */
export function resolveDocsSearchStaticBootstrapFrom(
  env: BuildModeEnv = process.env,
): string {
  const basePath = isStaticExportBuild(env)
    ? resolveGitHubPagesBasePath(env)
    : "";
  return withBasePath(DOCS_SEARCH_API_PATH, basePath);
}

/** Reads the bootstrap path baked into the client bundle, with a test/dev fallback. */
export function readDocsSearchStaticBootstrapFrom(
  env: BuildModeEnv = process.env,
): string {
  const configured = env[DOCS_SEARCH_BOOTSTRAP_FROM_ENV];
  if (configured !== undefined && configured !== "") {
    return configured;
  }

  return resolveDocsSearchStaticBootstrapFrom(env);
}
