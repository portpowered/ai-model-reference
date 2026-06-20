import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import {
  getConceptById,
  getModuleById,
  getSystemById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";
import {
  getSidebarGroupIdsForSection,
  resolveConceptsSidebarGroup,
  resolveGlossarySidebarGroup,
  resolveModulesSidebarGroup,
  resolveSystemsSidebarGroup,
  resolveTrainingSidebarGroup,
  type SidebarGroupIdBySection,
  type SidebarGroupingSection,
} from "@/lib/content/sidebar-grouping";
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

type SectionKey = keyof typeof SECTION_FOLDER_NAMES;
type GroupedSectionConfig<Section extends SidebarGroupingSection> = {
  section: Section;
  resolveGroupId: (
    page: DocsPageSource,
  ) => SidebarGroupIdBySection[Section] | undefined;
};

const GROUPED_SECTION_CONFIGS = {
  glossary: {
    section: "glossary",
    resolveGroupId: (page) =>
      resolveGlossarySidebarGroup(
        getConceptById(page.frontmatter.registryId) ??
          failMissingRecord(page.frontmatter.registryId, "glossary concept"),
      ),
  },
  concepts: {
    section: "concepts",
    resolveGroupId: (page) =>
      resolveConceptsSidebarGroup(
        getConceptById(page.frontmatter.registryId) ??
          failMissingRecord(page.frontmatter.registryId, "concept"),
      ),
  },
  modules: {
    section: "modules",
    resolveGroupId: (page) =>
      resolveModulesSidebarGroup(
        getModuleById(page.frontmatter.registryId) ??
          failMissingRecord(page.frontmatter.registryId, "module"),
      ),
  },
  training: {
    section: "training",
    resolveGroupId: (page) =>
      resolveTrainingSidebarGroup(
        getTrainingRegimeById(page.frontmatter.registryId) ??
          failMissingRecord(page.frontmatter.registryId, "training regime"),
      ),
  },
  systems: {
    section: "systems",
    resolveGroupId: (page) =>
      resolveSystemsSidebarGroup(
        getSystemById(page.frontmatter.registryId) ??
          failMissingRecord(page.frontmatter.registryId, "system"),
      ),
  },
} as const satisfies Partial<{
  [Key in SectionKey]: GroupedSectionConfig<
    Extract<Key, SidebarGroupingSection>
  >;
}>;

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

function failMissingRecord(recordId: string, kind: string): never {
  throw new Error(`expected ${kind} record for ${recordId}`);
}

function sortPagesByTitle(pages: DocsPageSource[]): DocsPageSource[] {
  return [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, "en", {
      sensitivity: "base",
    }),
  );
}

function getPublishedSectionPages(
  pages: DocsPageSource[],
  section: SectionKey,
): DocsPageSource[] {
  return pages.filter((page) => page.docsSlug.startsWith(`${section}/`));
}

function getOrderedSectionPages(
  pages: DocsPageSource[],
  section: SectionKey,
): DocsPageSource[] {
  const sectionPages = getPublishedSectionPages(pages, section);
  const groupedSection =
    section in GROUPED_SECTION_CONFIGS
      ? GROUPED_SECTION_CONFIGS[
          section as keyof typeof GROUPED_SECTION_CONFIGS
        ]
      : undefined;
  if (!groupedSection) {
    return sortPagesByTitle(sectionPages);
  }

  const groupedPages = new Map<string, DocsPageSource[]>();
  const ungroupedPages: DocsPageSource[] = [];

  for (const page of sectionPages) {
    const groupId = groupedSection.resolveGroupId(page);
    if (!groupId) {
      ungroupedPages.push(page);
      continue;
    }

    const pagesForGroup = groupedPages.get(groupId) ?? [];
    pagesForGroup.push(page);
    groupedPages.set(groupId, pagesForGroup);
  }

  const orderedPages: DocsPageSource[] = [];
  for (const groupId of getSidebarGroupIdsForSection(groupedSection.section)) {
    orderedPages.push(...sortPagesByTitle(groupedPages.get(groupId) ?? []));
  }

  orderedPages.push(...sortPagesByTitle(ungroupedPages));
  return orderedPages;
}

function getRepresentativeAnchorUrls(
  pages: DocsPageSource[],
  section: SectionKey,
): { first: string; last: string } {
  const orderedPages = getOrderedSectionPages(pages, section);
  const firstPage = orderedPages[0];
  const lastPage = orderedPages.at(-1);

  if (!firstPage || !lastPage) {
    throw new Error(`expected published pages for ${section}`);
  }

  return {
    first: firstPage.url,
    last: lastPage.url,
  };
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

  test("section folders preserve runtime-derived first and last reader anchors", () => {
    const publishedPages = loadPublishedDocsPagesSync("en");

    for (const [section, folderName] of Object.entries(
      SECTION_FOLDER_NAMES,
    ) as [SectionKey, (typeof SECTION_FOLDER_NAMES)[SectionKey]][]) {
      const folderUrls = collectPageUrls(getFolderChildren(folderName));
      const representativeAnchors = getRepresentativeAnchorUrls(
        publishedPages,
        section,
      );

      expect(
        folderUrls[0],
        `${folderName} should keep the first reader-facing route aligned with the published runtime`,
      ).toBe(representativeAnchors.first);
      expect(
        folderUrls.at(-1),
        `${folderName} should keep the last reader-facing route aligned with the published runtime`,
      ).toBe(representativeAnchors.last);

      for (const anchorUrl of Object.values(representativeAnchors)) {
        expect(
          source.getPage(docsSlugFromUrl(anchorUrl)),
          `${folderName} representative route ${anchorUrl} should resolve through the Fumadocs source`,
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
