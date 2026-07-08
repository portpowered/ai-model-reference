import { join } from "node:path";
import { getProjectRoot } from "./content-paths";

/** Returns true when an asset src should resolve to a local filesystem path. */
export function isLocalPageAssetSrc(src: string): boolean {
  return !src.startsWith("http://") && !src.startsWith("https://");
}

/** Resolves a page asset src to a local filesystem path for build-time validation. */
export function resolveColocatedPageAssetSrcPath(
  pageDirectory: string,
  src: string,
  projectRoot = getProjectRoot(),
): string {
  if (src.startsWith("/")) {
    return join(projectRoot, "public", src.slice(1));
  }

  return join(pageDirectory, src);
}
