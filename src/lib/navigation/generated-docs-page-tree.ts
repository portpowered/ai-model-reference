import type { Node, Root } from "fumadocs-core/page-tree";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import type {
  DocsCollectionId,
  DocsCollectionSidebarGroupingResolverId,
} from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import { buildGroupedSidebarNodes } from "@/lib/navigation/docs-sidebar-grouping-adapter";

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

function sortPages(pages: DocsPageSource[]): DocsPageSource[] {
  return [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, "en", {
      sensitivity: "base",
    }),
  );
}

function generateUngroupedNodes(pages: DocsPageSource[]): Node[] {
  return sortPages(pages).map(createPageNode);
}

function generateCollectionNodes(
  sidebarGroupingResolverId:
    | DocsCollectionSidebarGroupingResolverId
    | undefined,
  pages: DocsPageSource[],
): Node[] {
  if (!sidebarGroupingResolverId) {
    return generateUngroupedNodes(pages);
  }

  return buildGroupedSidebarNodes(sidebarGroupingResolverId, pages);
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
        definition.sidebarGroupingResolverId,
        pagesByCollection.get(definition.id) ?? [],
      ),
    });
  }

  return {
    ...baseTree,
    children,
  };
}
