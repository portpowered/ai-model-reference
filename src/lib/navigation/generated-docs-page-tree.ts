import type { Node, Root } from "fumadocs-core/page-tree";
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

type SectionKey =
  | "glossary"
  | "concepts"
  | "modules"
  | "models"
  | "papers"
  | "training"
  | "systems";

const SECTION_ORDER: readonly SectionKey[] = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
];

const SECTION_TITLES: Record<SectionKey, string> = {
  glossary: "Glossary",
  concepts: "Concepts",
  modules: "Modules",
  models: "Models",
  papers: "Papers",
  training: "Training",
  systems: "Systems",
};

function createPageNode(page: DocsPageSource): Node {
  return {
    type: "page",
    name: page.messages.title,
    url: page.url,
  };
}

function createSeparator(name: string): Node {
  return {
    type: "separator",
    name,
  };
}

function sortPages(pages: DocsPageSource[]): DocsPageSource[] {
  return [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, "en", {
      sensitivity: "base",
    }),
  );
}

function groupPages(
  pages: DocsPageSource[],
  groups: ReadonlyArray<{
    name: string;
    matchesPage: (page: DocsPageSource) => boolean;
  }>,
): Node[] {
  const remaining = new Set(pages.map((page) => page.docsSlug));
  const nodes: Node[] = [];

  for (const group of groups) {
    const groupedPages = sortPages(
      pages.filter(
        (page) => remaining.has(page.docsSlug) && group.matchesPage(page),
      ),
    );
    if (groupedPages.length === 0) {
      continue;
    }

    nodes.push(createSeparator(group.name));
    for (const page of groupedPages) {
      remaining.delete(page.docsSlug);
      nodes.push(createPageNode(page));
    }
  }

  for (const page of sortPages(
    pages.filter((page) => remaining.has(page.docsSlug)),
  )) {
    nodes.push(createPageNode(page));
  }

  return nodes;
}

function groupPagesBySection<Section extends SidebarGroupingSection>(
  section: Section,
  pages: DocsPageSource[],
  resolveGroupId: (
    page: DocsPageSource,
  ) => SidebarGroupIdBySection[Section] | undefined,
): Node[] {
  return groupPages(
    pages,
    getSidebarGroupIdsForSection(section).map((groupId) => ({
      name: getSidebarGroupLabel(section, groupId),
      matchesPage: (page) => resolveGroupId(page) === groupId,
    })),
  );
}

function generateGlossaryNodes(pages: DocsPageSource[]): Node[] {
  return groupPagesBySection("glossary", pages, (page) => {
    const record = getConceptById(page.frontmatter.registryId);
    return record ? resolveGlossarySidebarGroup(record) : undefined;
  });
}

function generateConceptNodes(pages: DocsPageSource[]): Node[] {
  return groupPagesBySection("concepts", pages, (page) => {
    const record = getConceptById(page.frontmatter.registryId);
    return record ? resolveConceptsSidebarGroup(record) : undefined;
  });
}

function generateModuleNodes(pages: DocsPageSource[]): Node[] {
  return groupPagesBySection("modules", pages, (page) => {
    const record = getModuleById(page.frontmatter.registryId);
    return record ? resolveModulesSidebarGroup(record) : undefined;
  });
}

function generateTrainingNodes(pages: DocsPageSource[]): Node[] {
  return groupPagesBySection("training", pages, (page) => {
    const record = getTrainingRegimeById(page.frontmatter.registryId);
    return record ? resolveTrainingSidebarGroup(record) : undefined;
  });
}

function generateSystemNodes(pages: DocsPageSource[]): Node[] {
  return groupPagesBySection("systems", pages, (page) => {
    const record = getSystemById(page.frontmatter.registryId);
    return record ? resolveSystemsSidebarGroup(record) : undefined;
  });
}

function generateModelNodes(pages: DocsPageSource[]): Node[] {
  return sortPages(pages).map(createPageNode);
}

function generatePaperNodes(pages: DocsPageSource[]): Node[] {
  return sortPages(pages).map(createPageNode);
}

function generateSectionNodes(
  section: SectionKey,
  pages: DocsPageSource[],
): Node[] {
  switch (section) {
    case "glossary":
      return generateGlossaryNodes(pages);
    case "concepts":
      return generateConceptNodes(pages);
    case "modules":
      return generateModuleNodes(pages);
    case "models":
      return generateModelNodes(pages);
    case "papers":
      return generatePaperNodes(pages);
    case "training":
      return generateTrainingNodes(pages);
    case "systems":
      return generateSystemNodes(pages);
  }
}

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const pages = loadPublishedDocsPagesSync("en");
  const pagesBySection = new Map<SectionKey, DocsPageSource[]>(
    SECTION_ORDER.map((section) => [section, []]),
  );

  for (const page of pages) {
    const [section] = page.docsSlug.split("/", 1);
    if (
      section === "glossary" ||
      section === "concepts" ||
      section === "modules" ||
      section === "models" ||
      section === "papers" ||
      section === "training" ||
      section === "systems"
    ) {
      pagesBySection.get(section)?.push(page);
    }
  }

  const gettingStarted = baseTree.children.find(
    (node) =>
      node.type === "page" &&
      "url" in node &&
      node.url === "/docs/getting-started",
  );

  const children: Node[] = [];
  if (gettingStarted) {
    children.push(gettingStarted);
  }

  for (const section of SECTION_ORDER) {
    children.push({
      type: "folder",
      name: SECTION_TITLES[section],
      defaultOpen: section === "glossary",
      children: generateSectionNodes(
        section,
        pagesBySection.get(section) ?? [],
      ),
    });
  }

  return {
    ...baseTree,
    children,
  };
}
