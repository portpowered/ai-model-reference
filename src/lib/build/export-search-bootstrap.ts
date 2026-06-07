import { isAbsolute, join } from "node:path";
import { DOCS_SEARCH_API_PATH } from "@/features/docs/search/search-client";

/** Bootstrap route the static search client fetches in export mode. */
export const EXPORT_SEARCH_BOOTSTRAP_ROUTE = DOCS_SEARCH_API_PATH;

/** Relative path to the emitted bootstrap JSON under the export `out/` directory. */
export const EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH = "api/search";

export type AdvancedOramaExportPayload = {
  type: "advanced";
  [key: string]: unknown;
};

/** Resolves the absolute export artifact path for the search bootstrap payload. */
export function resolveExportSearchBootstrapFilePath(
  outDir: string,
  cwd: string = process.cwd(),
): string {
  const absoluteOutDir = isAbsolute(outDir) ? outDir : join(cwd, outDir);
  return join(absoluteOutDir, EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH);
}
