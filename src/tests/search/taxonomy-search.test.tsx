import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import {
  buildSearchResultMetaMap,
  loadSearchResultMetaMap,
} from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import {
  resultsIncludeUrl,
  SAMPLE_MODULE_URL,
  TAXONOMY_GLOSSARY_URLS,
} from "./helpers";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("phase 2 taxonomy search indexing", () => {
  test("indexes all nine taxonomy glossary pages with glossary kind facets", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const url of TAXONOMY_GLOSSARY_URLS) {
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
      expect(document?.tags).toEqual(
        expect.arrayContaining(["taxonomy", "foundations"]),
      );
    }
  });

  test("search result meta map includes glossary kind for taxonomy pages", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const metaMap = buildSearchResultMetaMap(documents);

    for (const url of TAXONOMY_GLOSSARY_URLS) {
      const meta = metaMap.get(url);
      expect(meta).toBeDefined();
      expect(meta?.kind).toBe("glossary");
      expect(meta?.description.length).toBeGreaterThan(0);
      expect(meta?.tags).toEqual(
        expect.arrayContaining(["taxonomy", "foundations"]),
      );
    }
  });
});

describe("phase 2 taxonomy search ranking", () => {
  test("ranks architecture glossary first for architecture query", async () => {
    const results = await docsSearchApi.search("architecture");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      "/docs/glossary/architecture",
    );
  });

  test("ranks generative model glossary first for generative model query", async () => {
    const results = await docsSearchApi.search("generative model");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      "/docs/glossary/generative-model",
    );
  });

  test("ranks modality glossary first for modality query", async () => {
    const results = await docsSearchApi.search("modality");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe("/docs/glossary/modality");
  });

  test("GET search endpoint ranks architecture glossary first", async () => {
    const response = await docsSearchApi.GET(
      new Request("http://localhost/api/search?query=architecture"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      "/docs/glossary/architecture",
    );
  });

  test("attention query still includes grouped-query attention module", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, SAMPLE_MODULE_URL)).toBe(true);
  });

  test("GQA query still ranks grouped-query attention module first", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(SAMPLE_MODULE_URL);
  });
});

describe("phase 2 taxonomy search UI labels", () => {
  test("SearchResultMetaDetails shows localized Glossary kind for architecture", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const architectureUrl = "/docs/glossary/architecture";
    const meta = metaByUrl[architectureUrl];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails
        url={architectureUrl}
        meta={meta}
        messages={messages}
      />,
    );

    expect(html).toContain("Glossary");
    expect(html).toContain('data-testid="search-result-summary"');
    expect(html).toContain("blueprint that defines how a model");
  });

  test("SearchResultMetaDetails still shows Module for grouped-query attention", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails
        url={SAMPLE_MODULE_URL}
        meta={meta}
        messages={messages}
      />,
    );

    expect(html).toContain("Module");
    expect(html).not.toContain("Glossary");
  });
});
