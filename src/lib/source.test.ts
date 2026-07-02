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

const REPRESENTATIVE_SECTION_URLS = {
  glossary: [
    "/docs/glossary/activation",
    "/docs/glossary/token",
    "/docs/glossary/top-k-sampling",
  ],
  concepts: [
    "/docs/concepts/alibi",
    "/docs/concepts/transformer-architecture",
    "/docs/concepts/page-spec-workflow-sample",
  ],
  modules: [
    "/docs/modules/multi-head-attention",
    "/docs/modules/grouped-query-attention",
    "/docs/modules/relu",
  ],
  models: ["/docs/models/deepseek-v4-flash", "/docs/models/gpt-3"],
  papers: ["/docs/papers/deepseek-v4"],
  training: [
    "/docs/training/dpo",
    "/docs/training/on-policy-distillation",
    "/docs/training/fp4-quantization-aware-training",
  ],
  systems: ["/docs/systems/on-disk-kv-cache", "/docs/systems/routing"],
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

  test("published sections keep representative anchors in the sidebar without full-section equality", () => {
    const publishedPages = loadPublishedDocsPagesSync("en");

    for (const [section, folderName] of Object.entries(SECTION_FOLDER_NAMES)) {
      const folderUrls = collectPageUrls(getFolderChildren(folderName));
      const publishedSectionUrls = publishedPages
        .filter((page) => page.docsSlug.startsWith(`${section}/`))
        .map((page) => page.url);

      expect(
        publishedSectionUrls.length,
        `${folderName} should have at least one published route`,
      ).toBeGreaterThan(0);

      expect(
        folderUrls,
        `${folderName} should surface the first published route as a representative anchor`,
      ).toContain(publishedSectionUrls[0] as string);
      expect(
        folderUrls,
        `${folderName} should surface the last published route as a representative anchor`,
      ).toContain(publishedSectionUrls.at(-1) as string);
    }
  });

  test("representative discovery routes resolve through the Fumadocs source", () => {
    for (const [section, urls] of Object.entries(REPRESENTATIVE_SECTION_URLS)) {
      const folderUrls = collectPageUrls(
        getFolderChildren(
          SECTION_FOLDER_NAMES[section as keyof typeof SECTION_FOLDER_NAMES],
        ),
      );

      for (const url of urls) {
        expect(folderUrls).toContain(url);
        expect(source.getPage(docsSlugFromUrl(url))).toBeDefined();
      }
    }
  });

  test("page tree exposes sidebar grouping separators for grouped reader flows", () => {
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
