import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { withBasePath } from "@/lib/navigation/site-path";
import { DOCS_SEARCH_API_PATH } from "@/lib/search/docs-search-bootstrap-path";

/** Concatenates all emitted client chunk sources under `out/_next/static/chunks`. */
export function readExportClientChunkContents(
  outDir: string,
  cwd: string = process.cwd(),
): string {
  const chunksDir = join(cwd, outDir, "_next/static/chunks");
  const files = readdirSync(chunksDir).filter((file) => file.endsWith(".js"));
  return files
    .map((file) => readFileSync(join(chunksDir, file), "utf8"))
    .join("\n");
}

/** True when export client chunks include the expected baked bootstrap fetch path. */
export function exportClientBundleIncludesBootstrapFrom(
  chunksContent: string,
  bootstrapFrom: string,
): boolean {
  return chunksContent.includes(bootstrapFrom);
}

/** Expected bootstrap fetch path for a GitHub Pages export with the given base path. */
export function resolveExportSearchBootstrapClientFrom(
  basePath: string,
): string {
  return withBasePath(DOCS_SEARCH_API_PATH, basePath);
}
