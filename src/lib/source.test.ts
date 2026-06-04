import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

const GLOSSARY_INDEX_URLS = [
  "/docs/glossary/architecture",
  "/docs/glossary/component",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generative-model",
  "/docs/glossary/modality",
  "/docs/glossary/model",
  "/docs/glossary/module",
  "/docs/glossary/representation",
  "/docs/glossary/token",
  "/docs/glossary/embedding",
  "/docs/glossary/tensor",
] as const;

function collectPageUrls(nodes: Node[]): string[] {
  const urls: string[] = [];

  for (const node of nodes) {
    if (node.type === "page" && "url" in node && typeof node.url === "string") {
      urls.push(node.url);
    }
    if (node.type === "folder" && "children" in node) {
      urls.push(...collectPageUrls(node.children));
    }
  }

  return urls;
}

describe("docs navigation source", () => {
  test("page tree includes taxonomy glossary links under Glossary", () => {
    const urls = collectPageUrls(source.pageTree.children);
    for (const url of GLOSSARY_INDEX_URLS) {
      expect(urls).toContain(url);
    }

    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const glossaryUrls = collectPageUrls(glossaryFolder.children);
    expect(glossaryUrls).toEqual([...GLOSSARY_INDEX_URLS]);
  });

  test("glossary navigation URLs have matching App Router pages", () => {
    for (const url of GLOSSARY_INDEX_URLS) {
      const slug = url.replace("/docs/glossary/", "");
      const routePath = join(
        process.cwd(),
        `src/app/docs/glossary/${slug}/page.tsx`,
      );
      expect(existsSync(routePath)).toBe(true);
    }
  });
});
