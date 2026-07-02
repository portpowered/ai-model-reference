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

describe("prefill-decode-split concept discovery", () => {
  test("registry record stays published with split-serving aliases, serving tags, and focused related ids", () => {
    const record = getConceptById("concept.prefill-decode-split");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Prefill/decode split",
      "prefill decode split",
      "split serving",
      "disaggregated serving",
      "disaggregated prefill decode",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.prerequisiteIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "concept.autoregressive-generation",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.prefill-decode-split"),
    ).toBe(true);
  });

  test("curated related links point to the serving path foundations", () => {
    const source = getConceptById("concept.prefill-decode-split");
    if (!source) {
      throw new Error("expected concept.prefill-decode-split in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/glossary/prefill");
    expect(
      items.find((item) => item.registryId === "concept.decode")?.href,
    ).toBe("/docs/glossary/decode");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/glossary/kv-cache");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(items.some((item) => item.registryId === "module.attention")).toBe(
      false,
    );
    expect(
      items.some((item) => item.registryId === "concept.transformer"),
    ).toBe(false);
  });

  test("search index records prefill-decode-split with aliases and serving tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/prefill-decode-split",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Prefill/decode split",
        "prefill decode split",
        "split serving",
        "disaggregated serving",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "attention", "kv-cache"]),
    );
  });

  test("search finds prefill/decode split by title, aliases, and body terms", async () => {
    for (const query of [
      "Prefill/decode split",
      "split serving",
      "disaggregated serving",
      "cache transfer",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some(
          (result) => result.url === "/docs/glossary/prefill-decode-split",
        ),
      ).toBe(true);
    }
  });
});
