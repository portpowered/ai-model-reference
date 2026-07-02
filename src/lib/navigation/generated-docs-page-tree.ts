import type { Root } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { getAiDocsShellPageTreeSettings } from "@/lib/navigation/ai-docs-sidebar-adapter";
import { buildDocsSidebarSectionNodes } from "@/lib/navigation/docs-sidebar-sections";

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const pages = loadPublishedDocsPagesSync("en");
  const { definitions, groupingResolvers } = getAiDocsShellPageTreeSettings();

  return {
    ...baseTree,
    children: buildDocsSidebarSectionNodes({
      pages,
      definitions,
      groupingResolvers,
    }),
  };
}
