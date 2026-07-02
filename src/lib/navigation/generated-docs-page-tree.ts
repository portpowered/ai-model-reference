import type { Root } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { getAiDocsShellPageTreeSettings } from "@/lib/navigation/ai-docs-sidebar-adapter";
import { buildShellCollectionPageTree } from "@/lib/navigation/shell-collection-page-tree";

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const pages = loadPublishedDocsPagesSync("en");
  const { definitions, collectionIds, groupingResolvers } =
    getAiDocsShellPageTreeSettings();

  return buildShellCollectionPageTree(baseTree, {
    pages,
    definitions,
    collectionIds,
    groupingResolvers,
  });
}
