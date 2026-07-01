import { describe, expect, test } from "bun:test";
import { DOCS_COLLECTION_IDS } from "@/lib/docs/collection-definition-contract";
import {
  assertDocsCollectionInventory,
  DOCS_COLLECTION_DEFINITIONS,
  getDocsCollectionDefinition,
  listDocsCollectionDefinitions,
} from "@/lib/docs/docs-collection-definitions";

describe("docs collection definitions config", () => {
  test("represents every current AI collection exactly once", () => {
    assertDocsCollectionInventory();

    expect(
      DOCS_COLLECTION_DEFINITIONS.map((definition) => definition.id),
    ).toEqual([...DOCS_COLLECTION_IDS]);
    expect(listDocsCollectionDefinitions()).toHaveLength(
      DOCS_COLLECTION_IDS.length,
    );
  });

  test("uses current public route slugs for each collection", () => {
    for (const definition of DOCS_COLLECTION_DEFINITIONS) {
      expect(definition.routeSlug).toBe(definition.id);
    }
  });

  test("uses current frontmatter and registry kinds", () => {
    expect(getDocsCollectionDefinition("glossary")).toMatchObject({
      routeSlug: "glossary",
      frontmatterKind: "glossary",
      registryKind: "concept",
    });
    expect(getDocsCollectionDefinition("concepts")).toMatchObject({
      frontmatterKind: "concept",
      registryKind: "concept",
    });
    expect(getDocsCollectionDefinition("modules")).toMatchObject({
      frontmatterKind: "module",
      registryKind: "module",
    });
    expect(getDocsCollectionDefinition("models")).toMatchObject({
      frontmatterKind: "model",
      registryKind: "model",
    });
    expect(getDocsCollectionDefinition("papers")).toMatchObject({
      frontmatterKind: "paper",
      registryKind: "paper",
    });
    expect(getDocsCollectionDefinition("systems")).toMatchObject({
      frontmatterKind: "system",
      registryKind: "system",
    });
  });

  test("maps training route slug to training-regime kinds", () => {
    expect(getDocsCollectionDefinition("training")).toMatchObject({
      id: "training",
      routeSlug: "training",
      frontmatterKind: "training-regime",
      registryKind: "training-regime",
    });
  });
});
