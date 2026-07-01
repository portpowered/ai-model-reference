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
import type { DocsCollectionId } from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";

const SIDEBAR_FOLDER_TITLES: Record<DocsCollectionId, string> = {
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

function generateCollectionNodes(
  collectionId: DocsCollectionId,
  pages: DocsPageSource[],
): Node[] {
  switch (collectionId) {
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

function assignPageToCollection(
  pagesByCollection: Map<DocsCollectionId, DocsPageSource[]>,
  collectionIdByRouteSlug: ReadonlyMap<string, DocsCollectionId>,
  page: DocsPageSource,
): void {
  const [routeSlug] = page.docsSlug.split("/", 1);
  const collectionId = collectionIdByRouteSlug.get(routeSlug);
  if (!collectionId) {
    return;
  }

  pagesByCollection.get(collectionId)?.push(page);
}

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const collectionDefinitions = listDocsCollectionDefinitions();
  const collectionIdByRouteSlug = new Map(
    collectionDefinitions.map((definition) => [
      definition.routeSlug,
      definition.id,
    ]),
  );
  const pages = loadPublishedDocsPagesSync("en");
  const pagesByCollection = new Map<DocsCollectionId, DocsPageSource[]>(
    collectionDefinitions.map((definition) => [definition.id, []]),
  );

  for (const page of pages) {
    assignPageToCollection(pagesByCollection, collectionIdByRouteSlug, page);
  }

  const children: Node[] = [];
  for (const definition of collectionDefinitions) {
    children.push({
      type: "folder",
      name: SIDEBAR_FOLDER_TITLES[definition.id],
      children: generateCollectionNodes(
        definition.id,
        pagesByCollection.get(definition.id) ?? [],
      ),
    });
  }

  return {
    ...baseTree,
    children,
  };
}
