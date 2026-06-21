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
      "classification.attention-mechanisms",
    );
    expect(document.facets.primaryClassificationSlug).toBe(
      "attention-mechanisms",
    );
    expect(document.facets.classificationIds).toEqual([
      "classification.attention-mechanisms",
    ]);
    expect(document.facets.ancestorClassificationIds).toEqual([
      "classification.neural-network-components",
    ]);
    expect(document.facets.rootClassificationIds).toEqual([
      "classification.neural-network-components",
    ]);
    expect(document.facets.rootClassificationSlugs).toEqual([
      "neural-network-components",
    ]);
    expect(document.facets.legacyModuleFamily).toBe("attention");
    expect(document.facets.legacyConceptType).toBe("attention-variant");
    expect(document.facets.legacyVariantGroup).toBe("attention-head-sharing");
    expect((document.facets as { moduleFamily?: string }).moduleFamily).toBe(
      undefined,
    );
  });

  test("includes relationship targets and ancestry roots in feed-forward search topology", async () => {
    const document = await loadSearchDocument("module.feed-forward-network");

    expect(document.topology.ancestorClassificationIds).toEqual([
      "classification.neural-network-components",
    ]);
    expect(document.topology.rootClassificationIds).toEqual([
      "classification.neural-network-components",
    ]);
    expect(document.facets.relatedTopologyIds).toEqual(
      expect.arrayContaining([
        "classification.feed-forward-networks",
        "classification.neural-network-components",
        "concept.activation",
      ]),
    );
    expect(document.facets.relationshipTypes).toEqual(
      expect.arrayContaining(["part-of", "uses"]),
    );
    expect(document.topology.terms).toEqual(
      expect.arrayContaining([
        "feed-forward-networks",
        "neural-network-components",
        "uses",
        "concept.activation",
      ]),
    );
  });
});
