import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { source } from "@/lib/source";

type SectionMeta = {
  title: string;
  pages: string[];
};

const SECTION_META_PATHS = {
  glossary: "src/content/docs/glossary/meta.json",
  concepts: "src/content/docs/concepts/meta.json",
  modules: "src/content/docs/modules/meta.json",
} as const;

const ROOT_META_PATH = "src/content/docs/meta.json";

function parseMetaPageEntry(entry: string): { title: string; url: string } {
  const match = entry.match(/^\[(.+)\]\((.+)\)$/);
  if (!match) {
    throw new Error(`Invalid meta page entry: ${entry}`);
  }
  return { title: match[1], url: match[2] };
}

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

function findSidebarFolder(name: string): Node | undefined {
  return source.pageTree.children.find(
    (node) => node.type === "folder" && node.name === name,
  );
}

describe("Phase 2/3 reconciliation docs sidebar meta (US-003)", () => {
  test("root docs meta exposes glossary, concepts, and modules folders", async () => {
    const meta = JSON.parse(
      await readFile(join(process.cwd(), ROOT_META_PATH), "utf8"),
    ) as { pages: string[] };

    expect(meta.pages).toContain("glossary");
    expect(meta.pages).toContain("concepts");
    expect(meta.pages).toContain("modules");
  });

  for (const [section, metaPath] of Object.entries(SECTION_META_PATHS)) {
    test(`${section} meta.json lists every published page with localized titles`, async () => {
      const pages = await loadPublishedDocsPages("en");
      const sectionPages = pages
        .filter((page) => page.docsSlug.startsWith(`${section}/`))
        .sort((left, right) => left.url.localeCompare(right.url));

      const meta = JSON.parse(
        await readFile(join(process.cwd(), metaPath), "utf8"),
      ) as SectionMeta;

      expect(sectionPages.length).toBeGreaterThan(0);
      expect(meta.pages).toHaveLength(sectionPages.length);

      for (const page of sectionPages) {
        const entry = meta.pages.find((item) => item.includes(page.url));
        expect(entry).toBeDefined();
        const parsed = parseMetaPageEntry(entry ?? "");
        expect(parsed.url).toBe(page.url);
        expect(parsed.title).toBe(page.messages.title);
      }
    });

    test(`Fumadocs ${section} sidebar folder includes every published page URL`, async () => {
      const pages = await loadPublishedDocsPages("en");
      const sectionPages = pages.filter((page) =>
        page.docsSlug.startsWith(`${section}/`),
      );

      const folderName =
        section === "glossary"
          ? "Glossary"
          : section === "concepts"
            ? "Concepts"
            : "Modules";
      const folder = findSidebarFolder(folderName);
      expect(folder?.type).toBe("folder");
      if (folder?.type !== "folder") {
        throw new Error(`expected ${folderName} folder in docs sidebar`);
      }

      const sidebarUrls = collectPageUrls(folder.children);
      for (const page of sectionPages) {
        expect(sidebarUrls).toContain(page.url);
      }
      expect(sidebarUrls).toHaveLength(sectionPages.length);
    });
  }
});
