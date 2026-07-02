import { describe, expect, test } from "bun:test";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocumentsForLocale } from "./build-documents";

async function loadSearchDocument(registryId: string) {
  const indexes = await loadRegistry();
  const pages = await loadShippedLocalizedDocsPages("en");
  const documents = buildSearchDocumentsForLocale("en", indexes, pages);

  const document = documents.find((entry) => entry.registryId === registryId);
  expect(document).toBeDefined();
  if (!document) {
    throw new Error(`Missing search document for ${registryId}`);
  }
  return document;
}

describe("buildSearchDocumentsForLocale", () => {
  test("promotes classification ancestry into the grouped-query attention facet contract", async () => {
    const document = await loadSearchDocument("module.grouped-query-attention");

    expect(document.facets.primaryClassificationId).toBe(
      "classification.module.attention.grouped-query",
    );
    expect(document.facets.primaryClassificationSlug).toBe(
      "attention-grouped-query",
    );
    expect(document.facets.classificationIds).toEqual(
      expect.arrayContaining([
        "classification.module.attention.grouped-query",
        "classification.module.attention",
      ]),
    );
    expect(document.facets.ancestorClassificationIds).toEqual([
      "classification.module.attention",
      "classification.module",
    ]);
    expect(document.facets.rootClassificationIds).toEqual([
      "classification.module",
    ]);
    expect(document.facets.rootClassificationSlugs).toEqual(["module"]);
    expect(document.facets.legacyModuleFamily).toBe("attention");
    expect(document.facets.legacyConceptType).toBe("attention-variant");
    expect(document.facets.legacyVariantGroup).toBe("attention-head-sharing");
    expect((document.facets as { moduleFamily?: string }).moduleFamily).toBe(
      undefined,
    );
  });

  test("includes relationship targets and ancestry roots in feed-forward search topology", async () => {
    const document = await loadSearchDocument("module.feed-forward-network");

    expect(document.topology.ancestorClassificationIds).toEqual(
      expect.arrayContaining(["classification.module"]),
    );
    expect(document.topology.rootClassificationIds).toEqual([
      "classification.module",
    ]);
    expect(document.facets.relatedTopologyIds).toEqual(
      expect.arrayContaining([
        "classification.module.feed-forward",
        "classification.module",
        "concept.activation",
      ]),
    );
    expect(document.facets.relationshipTypes).toEqual(
      expect.arrayContaining(["part-of", "uses"]),
    );
    expect(document.topology.terms).toEqual(
      expect.arrayContaining([
        "classification.module.feed-forward",
        "feed-forward network",
        "module",
        "uses",
        "concept.activation",
      ]),
    );
  });
});
