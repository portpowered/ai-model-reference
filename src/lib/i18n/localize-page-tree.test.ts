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
  test("keeps localized page-tree docs links inside the active vi route space", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);

    expect(links).not.toContain("/docs/getting-started");
    expect(links).toContain("/vi/docs/getting-started");
    expect(links).not.toContain("/docs/modules/multi-head-attention");
    expect(links).toContain("/vi/docs/modules/multi-head-attention");
  });

  test("localizes shipped docs links for vi page trees", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);

    expect(links).toContain("/vi/docs/modules/grouped-query-attention");
    expect(links).toContain("/vi/docs/glossary/token");
  });
});
