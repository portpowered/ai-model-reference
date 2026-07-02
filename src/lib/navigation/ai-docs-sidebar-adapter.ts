import type {
  DocsCollectionDefinition,
  DocsCollectionId,
} from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import type { ShellCollectionSidebarDefinition } from "@/lib/navigation/shell-collection-page-tree";

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
