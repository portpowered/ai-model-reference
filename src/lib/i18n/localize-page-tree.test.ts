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
  test("omits unshipped vi docs links from the localized page tree", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);

    expect(links).not.toContain("/docs/getting-started");
    expect(links).not.toContain("/docs/modules/multi-head-attention");
    expect(links).not.toContain("/vi/docs/getting-started");
    expect(links).not.toContain("/vi/docs/modules/multi-head-attention");
    expect(links).not.toContain("/vi/docs/modules/linear-attention");
  });

  test("localizes shipped docs links for vi page trees", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const links = collectLinks(localizedTree.children);

    expect(links).toContain("/vi/docs/modules/grouped-query-attention");
    expect(links).toContain("/vi/docs/glossary/token");
  });

  test("removes empty separators left behind by locale pruning", () => {
    const localizedTree = localizePageTree(source.pageTree, "vi");
    const glossaryFolder = localizedTree.children.find((child) => {
      return (
        child.type === "folder" &&
        child.name === "Glossary" &&
        "children" in child &&
        Array.isArray(child.children)
      );
    });

    expect(glossaryFolder).toBeTruthy();
    if (
      !glossaryFolder ||
      !("children" in glossaryFolder) ||
      !Array.isArray(glossaryFolder.children)
    ) {
      throw new Error("expected localized glossary folder");
    }

    expect(glossaryFolder.children[0]?.type).not.toBe("separator");
    expect(glossaryFolder.children.at(-1)?.type).not.toBe("separator");
    expect(glossaryFolder.children.some((child) => child.type === "page")).toBe(
      true,
    );
  });
});
