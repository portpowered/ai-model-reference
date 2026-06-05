import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads concatenated production CSS from `.next/static/css` and chunk CSS files.
 * Returns null when no bundled CSS artifacts are present.
 */
export function readBundledAppCss(
  projectRoot: string = process.cwd(),
): string | null {
  const cssRoots = [
    join(projectRoot, ".next/static/css"),
    join(projectRoot, ".next/static/chunks"),
  ];

  const cssFiles = cssRoots.flatMap((root) => {
    if (!existsSync(root)) {
      return [];
    }

    return readdirSync(root)
      .filter((name) => name.endsWith(".css"))
      .map((name) => join(root, name));
  });

  if (cssFiles.length === 0) {
    return null;
  }

  return cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");
}
