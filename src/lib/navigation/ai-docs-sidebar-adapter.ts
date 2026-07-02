import type { DocsPageSource } from "@/lib/content/pages";
import {
  DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS,
  type DocsCollectionDefinition,
  type DocsCollectionId,
  type DocsCollectionSidebarGroupingResolverId,
} from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import { buildGroupedSidebarNodes } from "@/lib/navigation/docs-sidebar-grouping-adapter";
import type {
  ShellCollectionSidebarDefinition,
  ShellSidebarGroupingResolver,
} from "@/lib/navigation/shell-collection-page-tree";

const AI_SIDEBAR_FOLDER_LABELS: Record<DocsCollectionId, string> = {
  glossary: "Glossary",
  concepts: "Concepts",
  modules: "Modules",
  models: "Models",
  papers: "Papers",
  training: "Training",
  systems: "Systems",
};

export function resolveAiDocsSidebarFolderLabel(id: DocsCollectionId): string {
  return AI_SIDEBAR_FOLDER_LABELS[id];
}

export function toAiDocsShellSidebarDefinition(
  definition: DocsCollectionDefinition,
): ShellCollectionSidebarDefinition {
  return {
    id: definition.id,
    routeSlug: definition.routeSlug,
    frontmatterKind: definition.frontmatterKind,
    sidebarLabel: resolveAiDocsSidebarFolderLabel(definition.id),
    sidebarGroupingResolverId: definition.sidebarGroupingResolverId,
  };
}

export function listAiDocsShellSidebarDefinitions(): ShellCollectionSidebarDefinition[] {
  return listDocsCollectionDefinitions().map(toAiDocsShellSidebarDefinition);
}

export function listAiDocsCollectionIds(): DocsCollectionId[] {
  return listDocsCollectionDefinitions().map((definition) => definition.id);
}

export type AiDocsShellPageTreeSettings = {
  definitions: ShellCollectionSidebarDefinition[];
  collectionIds: DocsCollectionId[];
  groupingResolvers: Record<string, ShellSidebarGroupingResolver>;
};

export function getAiDocsShellPageTreeSettings(): AiDocsShellPageTreeSettings {
  const definitions = listAiDocsShellSidebarDefinitions();

  return {
    definitions,
    collectionIds: listAiDocsCollectionIds(),
    groupingResolvers: getAiDocsShellSidebarGroupingResolvers(),
  };
}

function createAiDocsGroupingResolver(
  resolverId: DocsCollectionSidebarGroupingResolverId,
): ShellSidebarGroupingResolver {
  return (pages) =>
    buildGroupedSidebarNodes(resolverId, pages as DocsPageSource[]);
}

export function getAiDocsShellSidebarGroupingResolvers(): Record<
  string,
  ShellSidebarGroupingResolver
> {
  return Object.fromEntries(
    DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS.map((resolverId) => [
      resolverId,
      createAiDocsGroupingResolver(resolverId),
    ]),
  );
}
