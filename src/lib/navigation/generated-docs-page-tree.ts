import type { Root } from "fumadocs-core/page-tree";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import { listAiDocsShellSidebarDefinitions } from "@/lib/navigation/ai-docs-sidebar-adapter";
import { buildGroupedSidebarNodes } from "@/lib/navigation/docs-sidebar-grouping-adapter";
import {
  buildShellCollectionPageTree,
  type ShellSidebarGroupingResolver,
} from "@/lib/navigation/shell-collection-page-tree";

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

  return buildShellCollectionPageTree(baseTree, {
    pages,
    definitions: listAiDocsShellSidebarDefinitions(),
    collectionIds: collectionDefinitions.map((definition) => definition.id),
    groupingResolvers: AI_SIDEBAR_GROUPING_RESOLVERS,
  });
}
