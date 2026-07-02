import type { Root } from "fumadocs-core/page-tree";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import type {
  DocsCollectionDefinition,
  DocsCollectionId,
} from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import { buildGroupedSidebarNodes } from "@/lib/navigation/docs-sidebar-grouping-adapter";
import { buildDocsSidebarSectionNodes } from "@/lib/navigation/docs-sidebar-sections";
import {
  type ShellCollectionSidebarDefinition,
  type ShellSidebarGroupingResolver,
} from "@/lib/navigation/shell-collection-page-tree";

const SIDEBAR_FOLDER_TITLES: Record<DocsCollectionId, string> = {
  glossary: "Glossary",
  concepts: "Concepts",
  modules: "Modules",
  models: "Models",
  papers: "Papers",
  training: "Training",
  systems: "Systems",
};

function toShellSidebarDefinition(
  definition: DocsCollectionDefinition,
): ShellCollectionSidebarDefinition {
  return {
    id: definition.id,
    routeSlug: definition.routeSlug,
    frontmatterKind: definition.frontmatterKind,
    sidebarLabel: SIDEBAR_FOLDER_TITLES[definition.id],
    sidebarGroupingResolverId: definition.sidebarGroupingResolverId,
  };
}

const AI_SIDEBAR_GROUPING_RESOLVERS: Record<
  string,
  ShellSidebarGroupingResolver
> = {
  glossary: (pages) =>
    buildGroupedSidebarNodes("glossary", pages as DocsPageSource[]),
  concepts: (pages) =>
    buildGroupedSidebarNodes("concepts", pages as DocsPageSource[]),
  modules: (pages) =>
    buildGroupedSidebarNodes("modules", pages as DocsPageSource[]),
  training: (pages) =>
    buildGroupedSidebarNodes("training", pages as DocsPageSource[]),
  systems: (pages) =>
    buildGroupedSidebarNodes("systems", pages as DocsPageSource[]),
};

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const collectionDefinitions = listDocsCollectionDefinitions();
  const pages = loadPublishedDocsPagesSync("en");
  const definitions = collectionDefinitions.map(toShellSidebarDefinition);

  return {
    ...baseTree,
    children: buildDocsSidebarSectionNodes({
      pages,
      definitions,
      groupingResolvers: AI_SIDEBAR_GROUPING_RESOLVERS,
    }),
  };
}
