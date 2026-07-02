import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import {
  getAiDocsShellPageTreeSettings,
  listAiDocsShellSidebarDefinitions,
} from "@/lib/navigation/ai-docs-sidebar-adapter";
import {
  collectSidebarPageLinks,
  DEEPSEEK_V4_PAPER_URL,
  findSidebarPageLink,
  GPT_3_MODEL_URL,
  GROUPED_QUERY_ATTENTION_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { buildGeneratedDocsPageTree } from "@/lib/navigation/generated-docs-page-tree";
import { buildShellCollectionPageTree } from "@/lib/navigation/shell-collection-page-tree";
import {
  buildNonAiShellFixturePageTree,
  listNonAiShellFixtureCollectionDefinitions,
} from "@/tests/fixtures/non-ai-shell/fixture";

function getTopLevelFolderNames(pageTree: { children: Node[] }): string[] {
  return pageTree.children
    .filter((node) => node.type === "folder")
    .map((folder) => String(folder.name));
}

function getFolderChildren(
  pageTree: { children: Node[] },
  folderName: string,
): Node[] {
  const folder = pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in docs sidebar`);
  }

  return folder.children;
}

function getSeparatorLabels(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.type === "separator")
    .map((node) => String(node.name));
}

function findPrecedingSeparatorLabel(
  nodes: Node[],
  pageUrl: string,
): string | undefined {
  let currentSeparator: string | undefined;

  for (const node of nodes) {
    if (node.type === "separator" && typeof node.name === "string") {
      currentSeparator = node.name;
      continue;
    }

    if (
      node.type === "page" &&
      "url" in node &&
      node.url === pageUrl &&
      typeof currentSeparator === "string"
    ) {
      return currentSeparator;
    }
  }

  return undefined;
}

describe("AI docs sidebar adapter extraction parity", () => {
  test("adapter-wired shell tree matches buildGeneratedDocsPageTree output", () => {
    const baseTree = { name: "Docs", children: [] };
    const generatedTree = buildGeneratedDocsPageTree(baseTree);
    const { definitions, collectionIds, groupingResolvers } =
      getAiDocsShellPageTreeSettings();
    const adapterTree = buildShellCollectionPageTree(baseTree, {
      pages: loadPublishedDocsPagesSync("en"),
      definitions,
      collectionIds,
      groupingResolvers,
    });

    expect(getTopLevelFolderNames(adapterTree)).toEqual(
      getTopLevelFolderNames(generatedTree),
    );
    expect(collectSidebarPageLinks(adapterTree)).toEqual(
      collectSidebarPageLinks(generatedTree),
    );
  });

  test("grouped modules folder keeps separator label and representative page placement", () => {
    const pageTree = buildGeneratedDocsPageTree({ name: "Docs", children: [] });
    const children = getFolderChildren(pageTree, "Modules");
    const links = collectSidebarPageLinks(children);

    expect(findSidebarPageLink(links, GROUPED_QUERY_ATTENTION_URL)).toEqual({
      name: "Grouped-Query Attention",
      url: GROUPED_QUERY_ATTENTION_URL,
    });
    expect(
      findPrecedingSeparatorLabel(children, GROUPED_QUERY_ATTENTION_URL),
    ).toBe("Attention Variants");
    expect(getSeparatorLabels(children)).toContain("Attention Variants");
  });

  test("ungrouped models folder keeps representative links without separators", () => {
    const pageTree = buildGeneratedDocsPageTree({ name: "Docs", children: [] });
    const children = getFolderChildren(pageTree, "Models");

    expect(getSeparatorLabels(children)).toEqual([]);
    expect(children.every((node) => node.type === "page")).toBe(true);
    expect(
      findSidebarPageLink(collectSidebarPageLinks(children), GPT_3_MODEL_URL),
    ).toEqual({
      name: "GPT-3",
      url: GPT_3_MODEL_URL,
    });
    expect(
      findSidebarPageLink(
        collectSidebarPageLinks(pageTree),
        DEEPSEEK_V4_PAPER_URL,
      ),
    ).toEqual({
      name: "DeepSeek-V4",
      url: DEEPSEEK_V4_PAPER_URL,
    });
  });

  test("non-AI fixture sidebar uses fixture labels instead of Model Atlas adapter labels", () => {
    const fixtureTree = buildNonAiShellFixturePageTree();
    const fixtureLabels = listNonAiShellFixtureCollectionDefinitions().map(
      (definition) => definition.sidebarLabel,
    );
    const aiLabels = listAiDocsShellSidebarDefinitions().map(
      (definition) => definition.sidebarLabel,
    );

    expect(getTopLevelFolderNames(fixtureTree)).toEqual([...fixtureLabels]);
    for (const label of fixtureLabels) {
      expect(aiLabels, label).not.toContain(label);
    }

    for (const collectionId of ["guides", "reference"] as const) {
      const definition =
        listNonAiShellFixtureCollectionDefinitions().find(
          (entry) => entry.id === collectionId,
        ) ?? null;
      expect(definition).not.toBeNull();
      if (!definition) {
        return;
      }

      const folderChildren = getFolderChildren(
        fixtureTree,
        definition.sidebarLabel,
      );
      expect(getSeparatorLabels(folderChildren)).toEqual([]);
    }
  });
});
