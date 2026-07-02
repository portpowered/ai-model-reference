import { describe, expect, test } from "bun:test";
import type { Node, Root } from "fumadocs-core/page-tree";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import {
  collectSidebarPageLinks,
  DEEPSEEK_V4_PAPER_URL,
  DPO_TRAINING_URL,
  findSidebarPageLink,
  GPT_3_MODEL_URL,
  GROUPED_QUERY_ATTENTION_URL,
  ROUTING_SYSTEM_URL,
  TOKEN_GLOSSARY_URL,
  WHY_LONG_CONTEXT_IS_HARD_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { buildGeneratedDocsPageTree } from "@/lib/navigation/generated-docs-page-tree";
import { source } from "@/lib/source";

const EXPECTED_TOP_LEVEL_FOLDER_NAMES = [
  "Glossary",
  "Concepts",
  "Modules",
  "Models",
  "Papers",
  "Training",
  "Systems",
] as const;

const REPRESENTATIVE_GROUPED_PAGES = [
  {
    folderName: "Glossary",
    url: TOKEN_GLOSSARY_URL,
    name: "Token",
    separatorLabel: "Sequence And Attention",
  },
  {
    folderName: "Modules",
    url: GROUPED_QUERY_ATTENTION_URL,
    name: "Grouped-Query Attention",
    separatorLabel: "Attention Variants",
  },
  {
    folderName: "Concepts",
    url: WHY_LONG_CONTEXT_IS_HARD_URL,
    name: "Why long context is hard",
    separatorLabel: "Long Context",
  },
  {
    folderName: "Training",
    url: DPO_TRAINING_URL,
    name: "Direct Preference Optimization",
    separatorLabel: "Alignment",
  },
  {
    folderName: "Systems",
    url: ROUTING_SYSTEM_URL,
    name: "Routing",
    separatorLabel: "Routing",
  },
] as const;

function buildVerificationPageTree(): Root {
  return buildGeneratedDocsPageTree({
    name: "Docs",
    children: [],
  });
}

function getTopLevelFolderNames(pageTree: Root): string[] {
  return pageTree.children
    .filter((node) => node.type === "folder")
    .map((folder) => String(folder.name));
}

function getFolderChildren(pageTree: Root, folderName: string): Node[] {
  const folder = pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in docs sidebar`);
  }

  return folder.children;
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

function getSeparatorLabels(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.type === "separator")
    .map((node) => String(node.name));
}

describe("collection-driven docs sidebar verification", () => {
  test("buildGeneratedDocsPageTree exposes configured folder names and order", () => {
    const pageTree = buildVerificationPageTree();
    const collectionDefinitions = listDocsCollectionDefinitions();

    expect(getTopLevelFolderNames(pageTree)).toEqual([
      ...EXPECTED_TOP_LEVEL_FOLDER_NAMES,
    ]);
    expect(
      pageTree.children.filter((node) => node.type === "folder"),
    ).toHaveLength(collectionDefinitions.length);
  });

  test("buildGeneratedDocsPageTree matches source page-tree folder contract", () => {
    const generatedTree = buildVerificationPageTree();

    expect(getTopLevelFolderNames(generatedTree)).toEqual(
      getTopLevelFolderNames(source.pageTree),
    );
    expect(collectSidebarPageLinks(generatedTree)).toEqual(
      collectSidebarPageLinks(source.pageTree),
    );
  });

  test("representative grouped pages stay under the correct separator in each folder", () => {
    const pageTree = buildVerificationPageTree();

    for (const representative of REPRESENTATIVE_GROUPED_PAGES) {
      const children = getFolderChildren(pageTree, representative.folderName);
      const link = findSidebarPageLink(
        collectSidebarPageLinks(children),
        representative.url,
      );

      expect(link, representative.folderName).toEqual({
        name: representative.name,
        url: representative.url,
      });
      expect(
        findPrecedingSeparatorLabel(children, representative.url),
        representative.folderName,
      ).toBe(representative.separatorLabel);
      expect(getSeparatorLabels(children), representative.folderName).toContain(
        representative.separatorLabel,
      );
    }
  });

  test("ungrouped model and paper folders keep representative links without separators", () => {
    const pageTree = buildVerificationPageTree();

    for (const folderName of ["Models", "Papers"] as const) {
      const children = getFolderChildren(pageTree, folderName);
      expect(getSeparatorLabels(children), folderName).toEqual([]);
      expect(
        children.every((node) => node.type === "page"),
        folderName,
      ).toBe(true);
    }

    const links = collectSidebarPageLinks(pageTree);
    expect(findSidebarPageLink(links, GPT_3_MODEL_URL)).toEqual({
      name: "GPT-3",
      url: GPT_3_MODEL_URL,
    });
    expect(findSidebarPageLink(links, DEEPSEEK_V4_PAPER_URL)).toEqual({
      name: "DeepSeek-V4",
      url: DEEPSEEK_V4_PAPER_URL,
    });
  });
});
