import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Node } from "fumadocs-core/page-tree";
import { source } from "@/lib/source";

const TOKEN_GLOSSARY_URL = "/docs/glossary/token";

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
  test("page tree includes Token glossary link under Glossary", () => {
    const urls = collectPageUrls(source.pageTree.children);
    expect(urls).toContain(TOKEN_GLOSSARY_URL);

    const glossaryFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Glossary",
    );
    expect(glossaryFolder?.type).toBe("folder");
    if (glossaryFolder?.type !== "folder") {
      throw new Error("expected Glossary folder in docs sidebar");
    }

    const glossaryUrls = collectPageUrls(glossaryFolder.children);
    expect(glossaryUrls).toEqual([TOKEN_GLOSSARY_URL]);
  });

  test("token glossary navigation URL has a matching App Router page", () => {
    const routePath = join(
      process.cwd(),
      "src/app/docs/glossary/token/page.tsx",
    );
    expect(existsSync(routePath)).toBe(true);
  });
});
