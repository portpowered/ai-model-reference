import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { localizePageTree } from "@/lib/i18n/localize-page-tree";
import { source } from "@/lib/source";

function collectLinks(children: Node[]): string[] {
  const links: string[] = [];

  for (const child of children) {
    if ("url" in child && typeof child.url === "string") {
      links.push(child.url);
    }

    if ("children" in child && Array.isArray(child.children)) {
      links.push(...collectLinks(child.children));
    }
  }

  return links;
}

describe("localizePageTree", () => {
  test("keeps non-shipped docs links on English routes for vi page trees", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);

    expect(links).toContain("/docs/getting-started");
    expect(links).not.toContain("/vi/docs/getting-started");
  });

  test("localizes shipped docs links for vi page trees", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);

    expect(links).toContain("/vi/docs/modules/grouped-query-attention");
    expect(links).toContain("/vi/docs/glossary/token");
  });
});
