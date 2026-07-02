import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { isGlossaryPageAssignedToDerivedSection } from "@/lib/docs/glossary-derived-browse-sections";
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

describe("Phase 2/3 reconciliation docs sidebar meta (US-004)", () => {
  test("generated docs sidebar exposes all published docs section folders", () => {
    const folderNames = source.pageTree.children
      .filter((node) => node.type === "folder")
      .map((node) => node.name);

    expect(folderNames).toContain("Model Types");
    expect(folderNames).toContain("Inference");
    expect(folderNames).toContain("Glossary");
    expect(folderNames).toContain("Concepts");
    expect(folderNames).toContain("Modules");
    expect(folderNames).toContain("Models");
    expect(folderNames).toContain("Papers");
    expect(folderNames).toContain("Training");
    expect(folderNames).toContain("Systems");
  });

  for (const section of [
    "glossary",
    "concepts",
    "modules",
    "models",
    "papers",
    "training",
    "systems",
  ] as const) {
    test(`generated ${section} sidebar lists every published page exactly once with localized titles`, async () => {
      const pages = await loadPublishedDocsPages("en");
      const sectionPages = pages
        .filter((page) => {
          if (!page.docsSlug.startsWith(`${section}/`)) {
            return false;
          }
          if (
            section === "glossary" &&
            isGlossaryPageAssignedToDerivedSection(page)
          ) {
            return false;
          }
          return true;
        })
        .sort((left, right) => left.url.localeCompare(right.url));

      expect(sectionPages.length).toBeGreaterThan(0);

      const folderName =
        section === "glossary"
          ? "Glossary"
          : section === "concepts"
            ? "Concepts"
            : section === "modules"
              ? "Modules"
              : section === "models"
                ? "Models"
                : section === "papers"
                  ? "Papers"
                  : section === "training"
                    ? "Training"
                    : "Systems";
      const folder = findSidebarFolder(folderName);
      expect(folder?.type).toBe("folder");
      if (folder?.type !== "folder") {
        throw new Error(`expected ${folderName} folder in docs sidebar`);
      }

      const sidebarUrls = collectPageUrls(folder.children).sort();
      expect(sidebarUrls).toEqual(sectionPages.map((page) => page.url));

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
