import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { source } from "@/lib/source";

const SECTION_FOLDER_NAMES = {
  glossary: "Glossary",
  concepts: "Concepts",
  modules: "Modules",
  models: "Models",
  papers: "Papers",
  training: "Training",
  systems: "Systems",
} as const;

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

function getFolderChildren(folderName: string): Node[] {
  const folder = source.pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in docs sidebar`);
  }

  return folder.children;
}

function docsSlugFromUrl(url: string): string[] {
  return url.replace("/docs/", "").split("/");
}

function countUnique(values: string[]): number {
  return new Set(values).size;
}

describe("docs navigation source", () => {
  test("page tree keeps the required published docs folders", () => {
    const folderNames = source.pageTree.children
      .filter((node) => node.type === "folder")
      .map((node) => node.name);

    for (const folderName of Object.values(SECTION_FOLDER_NAMES)) {
      expect(folderNames).toContain(folderName);
    }
  });

  test("generated folder URLs stay within their published section contract without exact inventories", () => {
    const publishedPages = loadPublishedDocsPagesSync("en");

    for (const [section, folderName] of Object.entries(SECTION_FOLDER_NAMES)) {
      const folderUrls = collectPageUrls(getFolderChildren(folderName));
      const publishedSectionUrls = new Set(
        publishedPages
          .filter((page) => page.docsSlug.startsWith(`${section}/`))
          .map((page) => page.url),
      );
      const sectionPrefix = `/docs/${section}/`;

      expect(publishedSectionUrls.size).toBeGreaterThan(0);
      expect(
        folderUrls.length,
        `${folderName} should expose published routes`,
      ).toBeGreaterThan(0);
      expect(
        countUnique(folderUrls),
        `${folderName} should not repeat sidebar routes`,
      ).toBe(folderUrls.length);

      for (const url of folderUrls) {
        expect(
          url.startsWith(sectionPrefix),
          `${folderName} route ${url} should stay in ${sectionPrefix}`,
        ).toBe(true);
        expect(
          publishedSectionUrls.has(url),
          `${folderName} route ${url} should resolve from the published docs runtime`,
        ).toBe(true);
        expect(
          source.getPage(docsSlugFromUrl(url)),
          `${folderName} route ${url} should resolve through the Fumadocs source`,
        ).toBeDefined();
      }
    }
  });

  test("section folders expose discoverable routes without mirroring the full published corpus", () => {
    for (const folderName of Object.values(SECTION_FOLDER_NAMES)) {
      expect(
        collectPageUrls(getFolderChildren(folderName)).length,
        `${folderName} should expose at least one route in the sidebar`,
      ).toBeGreaterThan(0);
    }
  });
});
