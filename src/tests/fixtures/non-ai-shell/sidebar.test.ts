import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import {
  collectSidebarPageLinks,
  findSidebarPageLink,
} from "@/lib/navigation/docs-sidebar-contract";
import {
  buildNonAiShellFixturePageTree,
  getNonAiShellFixtureCollectionDefinition,
  listNonAiShellFixtureCollectionDefinitions,
  listNonAiShellFixturePages,
  listNonAiShellFixturePagesForCollection,
  NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS,
} from "./fixture";

function getFolderChildren(pageTree: { children: Node[] }, folderName: string) {
  const folder = pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in fixture sidebar`);
  }

  return folder.children;
}

function getSeparatorLabels(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.type === "separator")
    .map((node) => String(node.name));
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

describe("non-AI shell fixture sidebar page tree", () => {
  test("builds one folder per collection in fixture-defined order", () => {
    const pageTree = buildNonAiShellFixturePageTree();
    const folders = pageTree.children.filter((node) => node.type === "folder");

    expect(folders.map((folder) => folder.name)).toEqual(
      listNonAiShellFixtureCollectionDefinitions().map(
        (definition) => definition.sidebarLabel,
      ),
    );
    expect(folders).toHaveLength(
      NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS.length,
    );
  });

  test("each folder uses the configured collection label and representative page links exactly once", () => {
    const pageTree = buildNonAiShellFixturePageTree();
    const sidebarLinks = collectSidebarPageLinks(pageTree);
    const sidebarUrls = sidebarLinks.map((link) => link.url);

    for (const collectionId of NON_AI_SHELL_FIXTURE_BROWSE_COLLECTION_IDS) {
      const definition = getNonAiShellFixtureCollectionDefinition(collectionId);
      const pages = listNonAiShellFixturePagesForCollection(collectionId);
      const folderChildren = getFolderChildren(
        pageTree,
        definition.sidebarLabel,
      );

      expect(getSeparatorLabels(folderChildren)).toEqual([]);
      expect(getPageNodeEntries(folderChildren)).toEqual(
        [...pages]
          .sort((left, right) =>
            left.messages.title.localeCompare(right.messages.title, "en", {
              sensitivity: "base",
            }),
          )
          .map((page) => ({
            name: page.messages.title,
            url: page.url,
          })),
      );

      for (const page of pages) {
        expect(
          sidebarUrls.filter((url) => url === page.url),
          page.url,
        ).toHaveLength(1);
        expect(findSidebarPageLink(sidebarLinks, page.url)).toEqual({
          name: page.messages.title,
          url: page.url,
        });
      }
    }

    expect(sidebarLinks).toHaveLength(listNonAiShellFixturePages().length);
    expect(new Set(sidebarUrls)).toEqual(
      new Set(listNonAiShellFixturePages().map((page) => page.url)),
    );
  });
});
