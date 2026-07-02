/**
 * Focused parity coverage for search behavior before and after the generic base
 * document + AI enrichment boundary split. Keep these assertions aligned with
 * shipped discovery for attention, GQA alias, tag, and classification-scoped
 * search.
 */
import { describe, expect, test } from "bun:test";
import { GET } from "@/app/api/search/route";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { resultsIncludeUrl, SAMPLE_MODULE_URL } from "./helpers";

const GQA_URL = SAMPLE_MODULE_URL;
const RELU_URL = "/docs/modules/relu";
const LEAKY_RELU_URL = "/docs/modules/leaky-relu";

describe("search behavior parity baseline", () => {
  describe("grouped-query attention indexing", () => {
    test("indexes GQA page with aliases, attention tags, and module facets", async () => {
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const documents = buildSearchDocuments(pages, registry);
      const gqa = documents.find((document) => document.url === GQA_URL);

      expect(gqa).toBeDefined();
      expect(gqa?.aliases).toEqual(
        expect.arrayContaining([
          "GQA",
          "grouped-query attention",
          "grouped query attention",
        ]),
      );
      expect(gqa?.tags).toEqual(expect.arrayContaining(["attention"]));
      expect(gqa?.facets.moduleType).toBe("attention");
      expect(gqa?.registryId).toBe("module.grouped-query-attention");
    });
  });

  describe("attention and GQA query ranking", () => {
    test("attention query includes grouped-query attention page", async () => {
      const results = await docsSearchApi.search("attention");
      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeUrl(results, GQA_URL)).toBe(true);
    });

    test("GQA query ranks grouped-query attention first", async () => {
      const results = await docsSearchApi.search("GQA");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toBe(GQA_URL);
    });
  });

  describe("classification-scoped activation search", () => {
    test("activation classification returns activation-family module results", async () => {
      const response = await GET(
        new Request("http://localhost/api/search?classification=activation"),
      );
      expect(response.ok).toBe(true);

      const results = (await response.json()) as Array<{ url: string }>;
      const urls = results.map((result) => result.url);
      expect(urls).toEqual(expect.arrayContaining([RELU_URL, LEAKY_RELU_URL]));
    });
  });
});
