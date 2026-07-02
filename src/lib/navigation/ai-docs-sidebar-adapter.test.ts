import { describe, expect, test } from "bun:test";
import { DOCS_COLLECTION_IDS } from "@/lib/docs/collection-definition-contract";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import {
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
    expect(definitions.map((definition) => definition.sidebarLabel)).toEqual([
      ...EXPECTED_AI_SIDEBAR_FOLDER_LABELS,
    ]);
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
});
