import type { Root } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import {
  getAiDocsShellSidebarGroupingResolvers,
  listAiDocsShellSidebarDefinitions,
} from "@/lib/navigation/ai-docs-sidebar-adapter";
import { buildShellCollectionPageTree } from "@/lib/navigation/shell-collection-page-tree";

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const collectionDefinitions = listDocsCollectionDefinitions();
  const pages = loadPublishedDocsPagesSync("en");

  return buildShellCollectionPageTree(baseTree, {
    pages,
    definitions: listAiDocsShellSidebarDefinitions(),
    collectionIds: collectionDefinitions.map((definition) => definition.id),
    groupingResolvers: getAiDocsShellSidebarGroupingResolvers(),
  });
}
