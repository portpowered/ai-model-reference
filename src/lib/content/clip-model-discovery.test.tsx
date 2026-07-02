/**
 * Retained per derived-page-validation policy: representative CLIP model search
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

const CLIP_URL = "/docs/models/clip";

const CLIP_DISCOVERY_QUERIES = [
  { query: "CLIP", expectFirst: true },
  { query: "contrastive text image model", expectFirst: true },
  { query: "text-image conditioning", expectFirst: false },
  { query: "multimodal encoder", expectFirst: true },
] as const;

describe("clip model discovery surfaces", () => {
  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const clipDocument = documents.find(
      (document) => document.url === CLIP_URL,
    );

    expect(clipDocument).toBeDefined();
    expect(clipDocument?.kind).toBe("model");
    expect(clipDocument?.registryId).toBe("model.clip");
    expect(clipDocument?.aliases).toEqual(
      expect.arrayContaining([
        "CLIP",
        "Contrastive Language-Image Pre-training",
        "contrastive text image model",
        "text-image conditioning model",
        "multimodal encoder",
      ]),
    );
    expect(clipDocument?.relatedIds).toContain("concept.multimodal-model");
    expect(clipDocument?.relatedIds).toContain(
      "module.clip-image-tokenization",
    );
  });

  for (const { query, expectFirst } of CLIP_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical CLIP model page`, async () => {
      const results = await docsSearchApi.search(query);
      const metaMap = await loadSearchResultMetaMap();

      expect(resultsIncludeUrl(results, CLIP_URL)).toBe(true);
      expect(metaMap.get(CLIP_URL)?.kind).toBe("model");

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(CLIP_URL);
      }
    });
  }

  test("curated related items resolve conditioning, tokenization, and paper navigation from model.clip", () => {
    const source = getRegistryRecordById("model.clip");
    if (source?.kind !== "model") {
      throw new Error("expected model.clip in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.clip-image-tokenization")
        ?.href,
    ).toBe("/docs/modules/clip-image-tokenization");
    expect(
      items.find(
        (item) =>
          item.registryId ===
          "paper.learning-transferable-visual-models-from-natural-language-supervision",
      )?.href,
    ).toBe(
      "/docs/papers/learning-transferable-visual-models-from-natural-language-supervision",
    );
    expect(
      items.some((item) => item.href === "/docs/glossary/conditioning"),
    ).toBe(true);
    expect(
      items.some((item) => item.href === "/docs/glossary/multimodal-model"),
    ).toBe(true);
  });
});
