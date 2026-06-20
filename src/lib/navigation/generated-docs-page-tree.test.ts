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
  resolveSystemsSidebarGroup,
  resolveTrainingSidebarGroup,
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
  representativePage: DocsPageSource;
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
      representativePage: requireFirstPage(
        pagesByGroup.get(groupId) ?? [],
        getSidebarGroupLabel(section, groupId),
      ),
    }));
}

function expectIndex(targetLabel: string, index: number): number {
  if (index < 0) {
    throw new Error(`expected page tree entry for ${targetLabel}`);
  }

  return index;
}

describe("generated docs page tree", () => {
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

  test("representative subgroup pages appear after the correct separator", () => {
    for (const sectionConfig of GROUPED_SECTIONS) {
      const children = getFolderChildren(sectionConfig.folderName);

      for (const group of collectExpectedGroups(sectionConfig)) {
        const separatorIndex = expectIndex(
          `${sectionConfig.folderName} separator ${group.label}`,
          findNodeIndex(children, { name: group.label }),
        );
        const pageIndex = expectIndex(
          `${sectionConfig.folderName} representative page ${group.representativePage.url}`,
          findNodeIndex(children, { url: group.representativePage.url }),
        );

        expect(
          pageIndex,
          `${sectionConfig.folderName} ${group.label}`,
        ).toBeGreaterThan(separatorIndex);
      }
    }
  });
});
