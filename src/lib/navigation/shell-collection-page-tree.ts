import type { Node, Root } from "fumadocs-core/page-tree";
import type { ShellCollectionDefinition } from "@/lib/docs/collection-definition-contract";

export type ShellCollectionPageSource = {
  docsSlug: string;
  url: string;
  messages: { title: string };
  frontmatter: { kind: string };
};

export type ShellCollectionSidebarDefinition = Pick<
  ShellCollectionDefinition,
  | "id"
  | "routeSlug"
  | "frontmatterKind"
  | "sidebarLabel"
  | "sidebarGroupingResolverId"
>;

export type ShellSidebarGroupingResolver = (
  pages: readonly ShellCollectionPageSource[],
) => Node[];

export type ShellSidebarPageGroup<
  TPage extends ShellCollectionPageSource = ShellCollectionPageSource,
> = {
  name: string;
  matchesPage: (page: TPage) => boolean;
};

export function createShellCollectionPageNode(
  page: ShellCollectionPageSource,
): Node {
  return {
    type: "page",
    name: page.messages.title,
    url: page.url,
  };
}

export function sortShellCollectionPagesByTitle<
  TPage extends ShellCollectionPageSource,
>(pages: readonly TPage[]): TPage[] {
  return [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, "en", {
      sensitivity: "base",
    }),
  );
}

export function buildUngroupedShellCollectionPageNodes(
  pages: readonly ShellCollectionPageSource[],
): Node[] {
  return sortShellCollectionPagesByTitle(pages).map(
    createShellCollectionPageNode,
  );
}

export function groupShellCollectionPages<
  TPage extends ShellCollectionPageSource,
>(
  pages: readonly TPage[],
  groups: ReadonlyArray<ShellSidebarPageGroup<TPage>>,
): Node[] {
  const remaining = new Set(pages.map((page) => page.docsSlug));
  const nodes: Node[] = [];

  for (const group of groups) {
    const groupedPages = sortShellCollectionPagesByTitle(
      pages.filter(
        (page) => remaining.has(page.docsSlug) && group.matchesPage(page),
      ),
    );
    if (groupedPages.length === 0) {
      continue;
    }

    nodes.push({
      type: "separator",
      name: group.name,
    });
    for (const page of groupedPages) {
      remaining.delete(page.docsSlug);
      nodes.push(createShellCollectionPageNode(page));
    }
  }

  for (const page of sortShellCollectionPagesByTitle(
    pages.filter((entry) => remaining.has(entry.docsSlug)),
  )) {
    nodes.push(createShellCollectionPageNode(page));
  }

  return nodes;
}

function generateCollectionNodes(
  sidebarGroupingResolverId: string | undefined,
  pages: readonly ShellCollectionPageSource[],
  groupingResolvers: Record<string, ShellSidebarGroupingResolver>,
): Node[] {
  if (!sidebarGroupingResolverId) {
    return buildUngroupedShellCollectionPageNodes(pages);
  }

  const buildNodes = groupingResolvers[sidebarGroupingResolverId];
  if (!buildNodes) {
    throw new Error(
      `Unsupported shell sidebar grouping resolver id: ${sidebarGroupingResolverId}`,
    );
  }

  return buildNodes(pages);
}

function assignPageToCollection(
  pagesByCollection: Map<string, ShellCollectionPageSource[]>,
  collectionIdByRouteSlug: ReadonlyMap<string, string>,
  page: ShellCollectionPageSource,
): void {
  const [routeSlug] = page.docsSlug.split("/", 1);
  const collectionId = collectionIdByRouteSlug.get(routeSlug);
  if (!collectionId) {
    return;
  }

  pagesByCollection.get(collectionId)?.push(page);
}

export function buildShellCollectionPageTreeChildren({
  pages,
  definitions,
  collectionIds,
  groupingResolvers = {},
}: {
  pages: readonly ShellCollectionPageSource[];
  definitions: readonly ShellCollectionSidebarDefinition[];
  collectionIds: readonly string[];
  groupingResolvers?: Record<string, ShellSidebarGroupingResolver>;
}): Node[] {
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  const collectionIdByRouteSlug = new Map(
    definitions.map((definition) => [definition.routeSlug, definition.id]),
  );
  const pagesByCollection = new Map<string, ShellCollectionPageSource[]>(
    definitions.map((definition) => [definition.id, []]),
  );

  for (const page of pages) {
    assignPageToCollection(pagesByCollection, collectionIdByRouteSlug, page);
  }

  const children: Node[] = [];
  for (const collectionId of collectionIds) {
    const definition = definitionsById.get(collectionId);
    if (!definition) {
      throw new Error(
        `Missing collection definition for sidebar id: ${collectionId}`,
      );
    }

    children.push({
      type: "folder",
      name: definition.sidebarLabel,
      children: generateCollectionNodes(
        definition.sidebarGroupingResolverId,
        pagesByCollection.get(definition.id) ?? [],
        groupingResolvers,
      ),
    });
  }

  return children;
}

export function buildShellCollectionPageTree(
  baseTree: Root,
  options: Parameters<typeof buildShellCollectionPageTreeChildren>[0],
): Root {
  return {
    ...baseTree,
    children: buildShellCollectionPageTreeChildren(options),
  };
}
