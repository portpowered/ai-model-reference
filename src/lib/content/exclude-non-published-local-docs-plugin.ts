import { readFileSync } from "node:fs";
import type { LoaderPlugin } from "fumadocs-core/source";
import { shouldExcludeLocalDocsPageFromRouting } from "@/lib/content/routable-docs-page";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";

function readPageFrontmatter(
  absolutePath: string | undefined,
): Record<string, unknown> | null {
  if (!absolutePath) {
    return null;
  }

  let source: string;
  try {
    source = readFileSync(absolutePath, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    return null;
  }

  return parseYamlFrontmatterBlock(match[1]);
}

/** Removes non-published local docs bundles from Fumadocs source routing. */
export function excludeNonPublishedLocalDocsPlugin(): LoaderPlugin {
  return {
    name: "exclude-non-published-local-docs",
    transformStorage({ storage }) {
      for (const path of storage.getFiles()) {
        const file = storage.read(path);
        if (file?.format !== "page") {
          continue;
        }

        const frontmatter = readPageFrontmatter(file.absolutePath);
        if (!frontmatter) {
          continue;
        }

        if (shouldExcludeLocalDocsPageFromRouting(path, frontmatter)) {
          storage.delete(path);
        }
      }
    },
  };
}
