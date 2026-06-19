import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("Temperature concept registry discovery (temperature-concept-page-001)", () => {
  test("published record carries broad temperature aliases and the full nearby sampling chain", () => {
    const record = getConceptById("concept.temperature");

    expect(record?.status).toBe("published");
    expect(record?.conceptType).toBe("general");
    expect(record?.aliases).toEqual([
      "sampling temperature",
      "softmax temperature",
      "decoding temperature",
    ]);
    expect(record?.tags).toEqual(["token-to-probability-chain", "foundations"]);
    expect(record?.prerequisiteIds).toEqual(["concept.softmax"]);
    expect(record?.relatedIds).toEqual([
      "concept.softmax",
      "concept.entropy",
      "concept.sampling-overview",
      "concept.greedy-decoding",
      "concept.top-k-sampling",
      "concept.top-p-sampling",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.temperature")).toBe(true);
  });

  test("curated related docs keep the broad temperature record connected to nearby published glossary pages", () => {
    const source = getConceptById("concept.temperature");
    if (!source) {
      throw new Error("expected concept.temperature in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const [registryId, href] of [
      ["concept.softmax", "/docs/glossary/softmax"],
      ["concept.entropy", "/docs/glossary/entropy"],
      ["concept.sampling-overview", "/docs/glossary/sampling-overview"],
      ["concept.greedy-decoding", "/docs/glossary/greedy-decoding"],
      ["concept.top-k-sampling", "/docs/glossary/top-k-sampling"],
      ["concept.top-p-sampling", "/docs/glossary/top-p-sampling"],
    ] as const) {
      expect(
        items.some(
          (item) =>
            item.registryId === registryId &&
            item.href === href &&
            item.isPlanned === false,
        ),
      ).toBe(true);
    }
  });

  test("search documents and live search include the new decoding-temperature discovery term", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/temperature",
    );
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "sampling temperature",
        "softmax temperature",
        "decoding temperature",
      ]),
    );

    for (const query of [
      "decoding temperature",
      "softmax temperature",
      "sampling temperature",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => result.url === "/docs/glossary/temperature"),
      ).toBe(true);
    }
  });
});
