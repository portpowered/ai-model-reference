import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import {
  buildShellCollectionPageTreeChildren,
  buildUngroupedShellCollectionPageNodes,
  groupShellCollectionPages,
  type ShellCollectionPageSource,
} from "@/lib/navigation/shell-collection-page-tree";

function createTestPage(
  docsSlug: string,
  title: string,
): ShellCollectionPageSource {
  return {
    docsSlug,
    url: `/fixture/docs/${docsSlug}`,
    messages: { title },
    frontmatter: { kind: "kitchen-guide" },
  };
}

function getPageNodeEntries(
  nodes: Node[],
): Array<{ name: string; url: string }> {
  return nodes.flatMap((node) => {
    if (
      node.type === "page" &&
      "url" in node &&
      typeof node.url === "string" &&
      typeof node.name === "string"
    ) {
      return [{ name: node.name, url: node.url }];
    }

    return [];
  });
}

describe("shell collection page tree", () => {
  test("ungrouped collections render title-sorted pages without separators", () => {
    const pages = [
      createTestPage("guides/z-page", "Zebra Guide"),
      createTestPage("guides/a-page", "Alpha Guide"),
    ];
    const nodes = buildUngroupedShellCollectionPageNodes(pages);

    expect(nodes.every((node) => node.type === "page")).toBe(true);
    expect(getPageNodeEntries(nodes)).toEqual([
      { name: "Alpha Guide", url: "/fixture/docs/guides/a-page" },
      { name: "Zebra Guide", url: "/fixture/docs/guides/z-page" },
    ]);
  });

  test("generic grouping resolvers place pages under fixture-defined labels", () => {
    const pages = [
      createTestPage("guides/alpha", "Alpha Guide"),
      createTestPage("guides/beta", "Beta Guide"),
    ];
    const nodes = groupShellCollectionPages(pages, [
      {
        name: "Prep",
        matchesPage: (page) => page.docsSlug.endsWith("alpha"),
      },
      {
        name: "Cleanup",
        matchesPage: (page) => page.docsSlug.endsWith("beta"),
      },
    ]);

    expect(nodes.map((node) => node.type)).toEqual([
      "separator",
      "page",
      "separator",
      "page",
    ]);
    expect(nodes.map((node) => node.name)).toEqual([
      "Prep",
      "Alpha Guide",
      "Cleanup",
      "Beta Guide",
    ]);
  });

  test("buildShellCollectionPageTreeChildren uses configured folder labels and order", () => {
    const children = buildShellCollectionPageTreeChildren({
      pages: [
        createTestPage("reference/appliance-codes", "Appliance Service Codes"),
        createTestPage("guides/stovetop-basics", "Stovetop Basics"),
      ],
      definitions: [
        {
          id: "guides",
          routeSlug: "guides",
          frontmatterKind: "kitchen-guide",
          sidebarLabel: "Kitchen Guides",
        },
        {
          id: "reference",
          routeSlug: "reference",
          frontmatterKind: "maintenance-reference",
          sidebarLabel: "Maintenance Reference",
        },
      ],
      collectionIds: ["guides", "reference"],
    });

    expect(children.map((node) => node.type)).toEqual(["folder", "folder"]);
    expect(children.map((node) => node.name)).toEqual([
      "Kitchen Guides",
      "Maintenance Reference",
    ]);
  });
});
