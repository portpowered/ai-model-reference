import {
  type BuildModeEnv,
  isStaticExportBuild,
  resolveGitHubPagesBasePath,
} from "../build/static-export";
import { defaultLocale, type SiteLocale } from "../i18n/locale-routing";
import { withBasePath } from "../navigation/site-path";

/** Route the live docs search API and static bootstrap artifact share. */
export const DOCS_SEARCH_API_PATH = "/api/search";

/** Client env key set in `next.config.ts` during static export builds. */
export const DOCS_SEARCH_BOOTSTRAP_FROM_ENV =
  "NEXT_PUBLIC_DOCS_SEARCH_BOOTSTRAP_FROM";

export function localizedDocsSearchApiPath(locale: SiteLocale): string {
  return locale === defaultLocale
    ? DOCS_SEARCH_API_PATH
    : `/api/search.${locale}`;
}

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

/**
 * Resolves the locale-aware search bootstrap fetch path for live and export builds.
 * Export builds use distinct emitted artifacts per locale; live builds use the API
 * route plus a locale query for non-default locales.
 */
export function resolveDocsSearchBootstrapFromForLocale(
  locale: SiteLocale,
  env: BuildModeEnv = process.env,
): string {
  if (isStaticExportBuild(env)) {
    return withBasePath(
      localizedDocsSearchApiPath(locale),
      resolveGitHubPagesBasePath(env),
    );
  }

  if (locale === defaultLocale) {
    return DOCS_SEARCH_API_PATH;
  }

  return `${DOCS_SEARCH_API_PATH}?locale=${encodeURIComponent(locale)}`;
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
