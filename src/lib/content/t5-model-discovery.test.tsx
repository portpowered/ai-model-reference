/**
 * Retained per derived-page-validation policy: representative T5 model search
 * ranking and curated related-doc navigation cannot be expressed as derived
 * bundle invariants.
 */
import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { resultsIncludeUrl } from "@/tests/search/helpers";

const T5_URL = "/docs/models/t5";

const T5_DISCOVERY_QUERIES = [
  { query: "T5", expectFirst: true },
  { query: "text-to-text transformer", expectFirst: false },
  { query: "encoder-decoder T5", expectFirst: true },
  { query: "Text-to-Text Transfer Transformer", expectFirst: true },
] as const;

describe("t5 model discovery surfaces", () => {
  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const t5Document = documents.find((document) => document.url === T5_URL);

    expect(t5Document).toBeDefined();
    expect(t5Document?.kind).toBe("model");
    expect(t5Document?.registryId).toBe("model.t5");
    expect(t5Document?.aliases).toEqual(
      expect.arrayContaining([
        "T5",
        "Text-to-Text Transfer Transformer",
        "text-to-text transformer",
        "encoder-decoder T5",
      ]),
    );
    expect(t5Document?.tags).toEqual(
      expect.arrayContaining([
        "model-family",
        "attention",
        "tokenization",
        "position-encoding",
        "feed-forward",
      ]),
    );
    expect(t5Document?.relatedIds).toContain("module.t5-relative-position-bias");
    expect(t5Document?.relatedIds).toContain("concept.encoder-decoder");
    expect(t5Document?.relatedIds).toContain("training-regime.pretraining");
  });

  for (const { query, expectFirst } of T5_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical T5 model page`, async () => {
      const results = await docsSearchApi.search(query);
      const metaMap = await loadSearchResultMetaMap();

      expect(resultsIncludeUrl(results, T5_URL)).toBe(true);
      expect(metaMap.get(T5_URL)?.kind).toBe("model");

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(T5_URL);
      }
    });
  }

  test("curated related items resolve tokenization, position bias, and training navigation from model.t5", () => {
    const source = getRegistryRecordById("model.t5");
    if (source?.kind !== "model") {
      throw new Error("expected model.t5 in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.sentencepiece")?.href,
    ).toBe("/docs/modules/sentencepiece");
    expect(
      items.find(
        (item) => item.registryId === "module.t5-relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/t5-relative-position-bias");
    expect(
      items.find((item) => item.registryId === "module.cross-attention")?.href,
    ).toBe("/docs/modules/cross-attention");
    expect(
      items.find((item) => item.registryId === "training-regime.pretraining")
        ?.href,
    ).toBe("/docs/training/pretraining");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.supervised-fine-tuning",
      )?.href,
    ).toBe("/docs/training/supervised-fine-tuning");
    expect(
      items.some((item) => item.href === "/docs/glossary/encoder-decoder"),
    ).toBe(true);
    expect(
      items.some(
        (item) => item.href === "/docs/concepts/transformer-architecture",
      ),
    ).toBe(true);
  });
});
