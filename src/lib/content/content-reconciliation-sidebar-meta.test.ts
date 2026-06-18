import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { source } from "@/lib/source";

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
  test("generated docs sidebar exposes glossary, concepts, and modules folders", () => {
    const folderNames = source.pageTree.children
      .filter((node) => node.type === "folder")
      .map((node) => node.name);

    expect(folderNames).toContain("Glossary");
    expect(folderNames).toContain("Concepts");
    expect(folderNames).toContain("Modules");
  });

  for (const section of ["glossary", "concepts", "modules"] as const) {
    test(`generated ${section} sidebar lists every published page with localized titles`, async () => {
      const pages = await loadPublishedDocsPages("en");
      const sectionPages = pages
        .filter((page) => page.docsSlug.startsWith(`${section}/`))
        .sort((left, right) => left.url.localeCompare(right.url));

      expect(sectionPages.length).toBeGreaterThan(0);

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

      const sidebarTitles = folder.children
        .filter(
          (node): node is Extract<Node, { type: "page" }> =>
            node.type === "page",
        )
        .map((node) => node.name);
      for (const page of sectionPages) {
        expect(sidebarTitles).toContain(page.messages.title);
      }
    });
  }
});
