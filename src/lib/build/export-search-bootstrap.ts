import { isAbsolute, join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import {
  DOCS_SEARCH_API_PATH,
  localizedDocsSearchApiPath,
} from "@/lib/search/docs-search-bootstrap-path";

/** Bootstrap route the static search client fetches in export mode. */
export const EXPORT_SEARCH_BOOTSTRAP_ROUTE = DOCS_SEARCH_API_PATH;

/** Relative path to the emitted bootstrap JSON under the export `out/` directory. */
export const EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH = "api/search";

export function localizedExportSearchBootstrapRelativePath(
  locale: SiteLocale,
): string {
  return locale === defaultLocale ? "api/search" : `api/search.${locale}`;
}

export type AdvancedOramaExportPayload = {
  type: "advanced";
  [key: string]: unknown;
};

/** Resolves the absolute export artifact path for the search bootstrap payload. */
export function resolveExportSearchBootstrapFilePath(
  outDir: string,
  cwd: string = process.cwd(),
  locale: SiteLocale = defaultLocale,
): string {
  const absoluteOutDir = isAbsolute(outDir) ? outDir : join(cwd, outDir);
  return join(
    absoluteOutDir,
    localizedExportSearchBootstrapRelativePath(locale),
  );
}

export function localizedExportSearchBootstrapRoute(
  locale: SiteLocale,
): string {
  return localizedDocsSearchApiPath(locale);
}
