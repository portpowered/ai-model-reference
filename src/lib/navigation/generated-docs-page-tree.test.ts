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
  getSidebarGroupLabel,
  resolveConceptsSidebarGroup,
  resolveGlossarySidebarGroup,
  resolveModulesSidebarGroup,
  resolveModulesSidebarGroupWithSource,
  resolveSystemsSidebarGroup,
  resolveSystemsSidebarGroupWithSource,
  resolveTrainingSidebarGroup,
  resolveTrainingSidebarGroupWithSource,
  type SidebarGroupIdBySection,
  type SidebarGroupingSection,
} from "@/lib/content/sidebar-grouping";
import { source } from "@/lib/source";

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

function findNodeIndex(
  nodes: Node[],
  target: { name?: string; url?: string },
): number {
  return nodes.findIndex((node) => {
    if (target.name) {
      return node.name === target.name;
    }

    return node.type === "page" && "url" in node && node.url === target.url;
  });
}

function requireRecord<T>(record: T | undefined, label: string): T {
  if (!record) {
    throw new Error(`expected ${label} record`);
  }

  return record;
}

function sortPagesByTitle(pages: DocsPageSource[]): DocsPageSource[] {
  return [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, "en", {
      sensitivity: "base",
    }),
  );
}

function requireFirstPage(
  pages: DocsPageSource[],
  groupLabel: string,
): DocsPageSource {
  const representativePage = sortPagesByTitle(pages)[0];
  if (!representativePage) {
    throw new Error(`expected representative page for ${groupLabel}`);
  }

  return representativePage;
}

function requireLastPage(
  pages: DocsPageSource[],
  groupLabel: string,
): DocsPageSource {
  const representativePage = sortPagesByTitle(pages).at(-1);
  if (!representativePage) {
    throw new Error(`expected representative page for ${groupLabel}`);
  }

  return representativePage;
}

type GroupedSection<Section extends SidebarGroupingSection> = {
  folderName: string;
  section: Section;
  resolveGroupId: (
    page: DocsPageSource,
  ) => SidebarGroupIdBySection[Section] | undefined;
};

const GROUPED_SECTIONS = [
  {
    folderName: "Glossary",
    section: "glossary",
    resolveGroupId: (page) =>
      resolveGlossarySidebarGroup(
        requireRecord(
          getConceptById(page.frontmatter.registryId),
          `${page.frontmatter.registryId} glossary concept`,
        ),
      ),
  },
  {
    folderName: "Concepts",
    section: "concepts",
    resolveGroupId: (page) =>
      resolveConceptsSidebarGroup(
        requireRecord(
          getConceptById(page.frontmatter.registryId),
          `${page.frontmatter.registryId} concept`,
        ),
      ),
  },
  {
    folderName: "Modules",
    section: "modules",
    resolveGroupId: (page) =>
      resolveModulesSidebarGroup(
        requireRecord(
          getModuleById(page.frontmatter.registryId),
          `${page.frontmatter.registryId} module`,
        ),
      ),
  },
  {
    folderName: "Training",
    section: "training",
    resolveGroupId: (page) =>
      resolveTrainingSidebarGroup(
        requireRecord(
          getTrainingRegimeById(page.frontmatter.registryId),
          `${page.frontmatter.registryId} training regime`,
        ),
      ),
  },
  {
    folderName: "Systems",
    section: "systems",
    resolveGroupId: (page) =>
      resolveSystemsSidebarGroup(
        requireRecord(
          getSystemById(page.frontmatter.registryId),
          `${page.frontmatter.registryId} system`,
        ),
      ),
  },
] as const satisfies readonly GroupedSection<SidebarGroupingSection>[];

function collectExpectedGroups<Section extends SidebarGroupingSection>({
  section,
  resolveGroupId,
}: GroupedSection<Section>): Array<{
  groupId: SidebarGroupIdBySection[Section];
  label: string;
  representativePages: {
    first: DocsPageSource;
    last: DocsPageSource;
  };
  pageUrls: string[];
}> {
  const pages = loadPublishedDocsPagesSync("en").filter((page) =>
    page.docsSlug.startsWith(`${section}/`),
  );
  const pagesByGroup = new Map<
    SidebarGroupIdBySection[Section],
    DocsPageSource[]
  >();

  for (const page of pages) {
    const groupId = resolveGroupId(page);
    if (!groupId) {
      continue;
    }

    const groupedPages = pagesByGroup.get(groupId) ?? [];
    groupedPages.push(page);
    pagesByGroup.set(groupId, groupedPages);
  }

  return getSidebarGroupIdsForSection(section)
    .filter((groupId) => (pagesByGroup.get(groupId)?.length ?? 0) > 0)
    .map((groupId) => ({
      groupId,
      label: getSidebarGroupLabel(section, groupId),
      representativePages: {
        first: requireFirstPage(
          pagesByGroup.get(groupId) ?? [],
          getSidebarGroupLabel(section, groupId),
        ),
        last: requireLastPage(
          pagesByGroup.get(groupId) ?? [],
          getSidebarGroupLabel(section, groupId),
        ),
      },
      pageUrls: sortPagesByTitle(pagesByGroup.get(groupId) ?? []).map(
        (page) => page.url,
      ),
    }));
}

function expectIndex(targetLabel: string, index: number): number {
  if (index < 0) {
    throw new Error(`expected page tree entry for ${targetLabel}`);
  }

  return index;
}

function findNextSeparatorIndex(nodes: Node[], currentIndex: number): number {
  return nodes.findIndex(
    (node, index) => index > currentIndex && node.type === "separator",
  );
}

describe("generated docs page tree", () => {
  test("does not keep the legacy Getting Started page as a top-level sidebar entry", () => {
    expect(
      source.pageTree.children.some(
        (node) =>
          node.type === "page" &&
          "url" in node &&
          node.url === "/docs/getting-started",
      ),
    ).toBe(false);
  });

  test("grouped docs folders expose runtime-derived subgroup labels in configured order", () => {
    for (const sectionConfig of GROUPED_SECTIONS) {
      const expectedGroups = collectExpectedGroups(sectionConfig);
      const actualLabels = getFolderChildren(sectionConfig.folderName)
        .filter((node) => node.type === "separator")
        .map((node) => node.name);

      expect(actualLabels, sectionConfig.folderName).toEqual(
        expectedGroups.map((group) => group.label),
      );
    }
  });

  test("runtime-derived subgroup pages stay contiguous after the correct separator", () => {
    for (const sectionConfig of GROUPED_SECTIONS) {
      const children = getFolderChildren(sectionConfig.folderName);

      for (const group of collectExpectedGroups(sectionConfig)) {
        const separatorIndex = expectIndex(
          `${sectionConfig.folderName} separator ${group.label}`,
          findNodeIndex(children, { name: group.label }),
        );
        const nextSeparatorIndex = findNextSeparatorIndex(
          children,
          separatorIndex,
        );
        const pageIndexes = group.pageUrls
          .map((url) =>
            expectIndex(
              `${sectionConfig.folderName} grouped page ${url}`,
              findNodeIndex(children, { url }),
            ),
          )
          .sort((left, right) => left - right);
        const firstPageIndex = pageIndexes[0];
        const lastPageIndex = pageIndexes.at(-1);
        if (firstPageIndex === undefined || lastPageIndex === undefined) {
          throw new Error(
            `expected runtime-derived subgroup pages for ${sectionConfig.folderName} ${group.label}`,
          );
        }
        const separatorBound =
          nextSeparatorIndex >= 0 ? nextSeparatorIndex : children.length;

        expect(
          firstPageIndex,
          `${sectionConfig.folderName} ${group.label}`,
        ).toBeGreaterThan(separatorIndex);
        expect(
          lastPageIndex,
          `${sectionConfig.folderName} ${group.label}`,
        ).toBeLessThan(separatorBound);
        expect(
          lastPageIndex - firstPageIndex + 1,
          `${sectionConfig.folderName} ${group.label} should stay contiguous`,
        ).toBe(pageIndexes.length);

        expect(
          children[firstPageIndex],
          `${sectionConfig.folderName} ${group.label} should start with the runtime-derived first anchor`,
        ).toMatchObject({
          type: "page",
          url: group.representativePages.first.url,
        });
        expect(
          children[lastPageIndex],
          `${sectionConfig.folderName} ${group.label} should end with the runtime-derived last anchor`,
        ).toMatchObject({
          type: "page",
          url: group.representativePages.last.url,
        });
      }
    }
  });

  test("representative covered records prove ontology-derived versus fallback subgroup sources", () => {
    expect(
      resolveModulesSidebarGroupWithSource(
        requireRecord(
          getModuleById("module.grouped-query-attention"),
          "module.grouped-query-attention module",
        ),
      ),
    ).toEqual({
      groupId: "attention-variants",
      source: "derived-taxonomy",
    });
    expect(
      resolveModulesSidebarGroupWithSource(
        requireRecord(
          getModuleById("module.attention"),
          "module.attention module",
        ),
      ),
    ).toEqual({
      groupId: "attention-foundations",
      source: "editorial-sidebar-grouping",
    });

    expect(
      resolveTrainingSidebarGroupWithSource(
        requireRecord(
          getTrainingRegimeById("training-regime.dpo"),
          "training-regime.dpo training regime",
        ),
      ),
    ).toEqual({
      groupId: "alignment",
      source: "derived-taxonomy",
    });
    expect(
      resolveTrainingSidebarGroupWithSource(
        requireRecord(
          getTrainingRegimeById("training-regime.on-policy-distillation"),
          "training-regime.on-policy-distillation training regime",
        ),
      ),
    ).toEqual({
      groupId: "distillation",
      source: "editorial-sidebar-grouping",
    });

    expect(
      resolveSystemsSidebarGroupWithSource(
        requireRecord(getSystemById("system.routing"), "system.routing system"),
      ),
    ).toEqual({
      groupId: "routing",
      source: "derived-taxonomy",
    });
    expect(
      resolveSystemsSidebarGroupWithSource(
        requireRecord(
          getSystemById("system.on-disk-kv-cache"),
          "system.on-disk-kv-cache system",
        ),
      ),
    ).toEqual({
      groupId: "memory",
      source: "editorial-sidebar-grouping",
    });
  });
});
