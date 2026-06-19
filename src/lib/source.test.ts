import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { source } from "@/lib/source";

const DOCS_SECTION_FOLDERS = [
  ["glossary", "Glossary"],
  ["concepts", "Concepts"],
  ["modules", "Modules"],
  ["models", "Models"],
  ["papers", "Papers"],
  ["training", "Training"],
  ["systems", "Systems"],
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

function collectSeparatorNames(nodes: Node[]): string[] {
  const names: string[] = [];

  for (const node of nodes) {
    if (node.type === "separator" && typeof node.name === "string") {
      names.push(node.name);
    }
    if (node.type === "folder" && "children" in node) {
      names.push(...collectSeparatorNames(node.children));
    }
  }

  return names;
}

function findFolder(folderName: string): Extract<Node, { type: "folder" }> {
  const folder = source.pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in docs sidebar`);
  }

  return folder;
}

describe("docs navigation source", () => {
  test("page tree exposes the supported docs family folders in the generated order", () => {
    const folderNames = source.pageTree.children
      .filter((node): node is Extract<Node, { type: "folder" }> => {
        return node.type === "folder";
      })
      .map((node) => node.name);

    expect(folderNames).toEqual(
      DOCS_SECTION_FOLDERS.map(([, folderName]) => folderName),
    );
  });

  test("every published docs page resolves through the source and appears once in its family folder", () => {
    const publishedPages = loadPublishedDocsPagesSync("en");
    const sidebarUrls = collectPageUrls(source.pageTree.children);

    expect(new Set(sidebarUrls).size).toBe(sidebarUrls.length);

    for (const page of publishedPages) {
      expect(source.getPage(page.docsSlug.split("/"))).toBeDefined();
      expect(sidebarUrls).toContain(page.url);
    }

    for (const [section, folderName] of DOCS_SECTION_FOLDERS) {
      const folder = findFolder(folderName);
      const folderUrls = collectPageUrls(folder.children).sort();
      const sectionUrls = publishedPages
        .filter((page) => page.docsSlug.startsWith(`${section}/`))
        .map((page) => page.url)
        .sort();

      expect(sectionUrls.length).toBeGreaterThan(0);
      expect(folderUrls).toEqual(sectionUrls);
      expect(
        folderUrls.every((url) => url.startsWith(`/docs/${section}/`)),
      ).toBe(true);
    }
  });

  test("page tree exposes sidebar grouping separators for modules, concepts, and glossary", () => {
    const separatorNames = collectSeparatorNames(source.pageTree.children);

    for (const separatorName of [
      "Attention Foundations",
      "Attention Variants",
      "Long Context",
      "Architecture",
      "Model Taxonomy",
      "Sequence And Attention",
      "Math And Training",
      "Generation And Diffusion",
    ]) {
      expect(separatorNames).toContain(separatorName);
    }
  });
});
