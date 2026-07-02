import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import {
  DOCS_COLLECTION_IDS,
  DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS,
} from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import {
  getAiDocsShellPageTreeSettings,
  getAiDocsShellSidebarGroupingResolvers,
  listAiDocsCollectionIds,
  listAiDocsShellSidebarDefinitions,
  resolveAiDocsSidebarFolderLabel,
} from "@/lib/navigation/ai-docs-sidebar-adapter";

const EXPECTED_AI_SIDEBAR_FOLDER_LABELS = [
  "Glossary",
  "Concepts",
  "Modules",
  "Models",
  "Papers",
  "Training",
  "Systems",
] as const;

function getSeparatorLabels(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.type === "separator")
    .map((node) => String(node.name));
}

describe("AI docs sidebar adapter", () => {
  test("exposes shell sidebar definitions in configured collection order", () => {
    const definitions = listAiDocsShellSidebarDefinitions();
    const collectionDefinitions = listDocsCollectionDefinitions();

    expect(definitions.map((definition) => definition.id)).toEqual(
      collectionDefinitions.map((definition) => definition.id),
    );
    expect(definitions.map((definition) => definition.id)).toEqual([
      ...DOCS_COLLECTION_IDS,
    ]);
    expect(listAiDocsCollectionIds()).toEqual([...DOCS_COLLECTION_IDS]);
    expect(definitions.map((definition) => definition.sidebarLabel)).toEqual([
      ...EXPECTED_AI_SIDEBAR_FOLDER_LABELS,
    ]);
  });

  test("bundles adapter page-tree settings for generic shell composition", () => {
    const settings = getAiDocsShellPageTreeSettings();

    expect(settings.definitions).toEqual(listAiDocsShellSidebarDefinitions());
    expect(settings.collectionIds).toEqual(listAiDocsCollectionIds());
    expect(Object.keys(settings.groupingResolvers).sort()).toEqual(
      [...DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS].sort(),
    );
  });

  test("preserves collection routing and grouping resolver ids from definitions", () => {
    const definitions = listAiDocsShellSidebarDefinitions();
    const collectionDefinitions = listDocsCollectionDefinitions();

    for (const [index, definition] of definitions.entries()) {
      const sourceDefinition = collectionDefinitions[index];
      expect(definition.routeSlug).toBe(sourceDefinition.routeSlug);
      expect(definition.frontmatterKind).toBe(sourceDefinition.frontmatterKind);
      expect(definition.sidebarGroupingResolverId).toBe(
        sourceDefinition.sidebarGroupingResolverId,
      );
      expect(definition.sidebarLabel).toBe(
        resolveAiDocsSidebarFolderLabel(sourceDefinition.id),
      );
    }
  });

  test("exposes grouping resolvers for grouped collections only", () => {
    const resolvers = getAiDocsShellSidebarGroupingResolvers();

    expect(Object.keys(resolvers).sort()).toEqual(
      [...DOCS_COLLECTION_SIDEBAR_GROUPING_RESOLVER_IDS].sort(),
    );
    expect(resolvers.models).toBeUndefined();
    expect(resolvers.papers).toBeUndefined();
  });

  test("grouping resolvers produce separator labels for configured collections", () => {
    const resolvers = getAiDocsShellSidebarGroupingResolvers();

    for (const definition of listDocsCollectionDefinitions()) {
      const resolverId = definition.sidebarGroupingResolverId;
      if (!resolverId) {
        continue;
      }

      const pages = loadPublishedDocsPagesSync("en").filter((page) =>
        page.docsSlug.startsWith(`${definition.routeSlug}/`),
      );
      const nodes = resolvers[resolverId]?.(pages) ?? [];

      expect(nodes.length).toBeGreaterThan(0);
      expect(getSeparatorLabels(nodes).length).toBeGreaterThan(0);
    }
  });
});
