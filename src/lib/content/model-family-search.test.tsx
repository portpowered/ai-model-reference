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

const ATTENTION_MODULE_URL = "/docs/modules/attention";

const MODEL_FAMILY_PAGES = [
  { title: "Transformer", url: "/docs/glossary/transformer" },
  { title: "Diffusion Model", url: "/docs/glossary/diffusion-model" },
  { title: "Multimodal Model", url: "/docs/glossary/multimodal-model" },
  { title: "World Model", url: "/docs/glossary/world-model" },
] as const;

const MODEL_FAMILY_URLS = MODEL_FAMILY_PAGES.map((page) => page.url);

const ALIAS_QUERIES = [
  { query: "transformer architecture", url: "/docs/glossary/transformer" },
  { query: "diffusion models", url: "/docs/glossary/diffusion-model" },
  { query: "multimodal models", url: "/docs/glossary/multimodal-model" },
  { query: "world models", url: "/docs/glossary/world-model" },
] as const;

const SUMMARY_KEYWORD_QUERIES = [
  { query: "feed-forward blocks", url: "/docs/glossary/transformer" },
  { query: "noise corruption process", url: "/docs/glossary/diffusion-model" },
  {
    query: "more than one data modality",
    url: "/docs/glossary/multimodal-model",
  },
  { query: "environment dynamics", url: "/docs/glossary/world-model" },
] as const;

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

describe("Phase 2 model-family search indexing (US-006)", () => {
  test("indexes all four model-family glossary pages with glossary kind facets", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const url of MODEL_FAMILY_URLS) {
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
      expect(document?.tags).toEqual(
        expect.arrayContaining(["taxonomy", "model-family"]),
      );
    }
  });

  test("search documents include title, aliases, description, and message body text", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const { title, url } of MODEL_FAMILY_PAGES) {
      const document = documents.find((entry) => entry.url === url);
      expect(document?.title).toBe(title);
      expect(document?.description.length).toBeGreaterThan(0);
      expect(document?.aliases.length).toBeGreaterThan(0);
      expect(document?.bodyText.length).toBeGreaterThan(100);
    }
  });

  test("search result meta map includes glossary kind for every model-family page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const metaMap = buildSearchResultMetaMap(documents);

    for (const url of MODEL_FAMILY_URLS) {
      const meta = metaMap.get(url);
      expect(meta).toBeDefined();
      expect(meta?.kind).toBe("glossary");
      expect(meta?.description.length).toBeGreaterThan(0);
      expect(meta?.tags).toEqual(
        expect.arrayContaining(["taxonomy", "model-family"]),
      );
    }
  });
});

describe("Phase 2 model-family search ranking (US-006)", () => {
  test.each(
    MODEL_FAMILY_PAGES.map(({ title, url }) => [title, url] as const),
  )("ranks %s glossary first for canonical title query", async (title, url) => {
    const results = await docsSearchApi.search(title);
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
  });

  test.each(
    ALIAS_QUERIES.map(({ query, url }) => [query, url] as const),
  )("alias query %s resolves to %s", async (query, url) => {
    const results = await docsSearchApi.search(query);
    expect(resultsIncludeUrl(results, url)).toBe(true);
  });

  test.each(
    SUMMARY_KEYWORD_QUERIES.map(({ query, url }) => [query, url] as const),
  )("summary keyword query %s resolves to %s", async (query, url) => {
    const results = await docsSearchApi.search(query);
    expect(resultsIncludeUrl(results, url)).toBe(true);
  });

  test("transformer query includes glossary and module hits with distinct kind metadata", async () => {
    const results = await docsSearchApi.search("transformer");
    const metaMap = await loadSearchResultMetaMap();

    const transformerHit = results.find(
      (result) => pageBaseUrl(result.url) === "/docs/glossary/transformer",
    );
    const moduleHit = results.find(
      (result) => pageBaseUrl(result.url) === ATTENTION_MODULE_URL,
    );

    expect(transformerHit).toBeDefined();
    expect(moduleHit).toBeDefined();
    expect(metaMap.get("/docs/glossary/transformer")?.kind).toBe("glossary");
    expect(metaMap.get(ATTENTION_MODULE_URL)?.kind).toBe("module");
  });
});

describe("Phase 2 model-family search UI labels (US-006)", () => {
  test("SearchResultMetaDetails shows localized Glossary kind for transformer", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const transformerUrl = "/docs/glossary/transformer";
    const meta = metaByUrl[transformerUrl];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails
        url={transformerUrl}
        meta={meta}
        messages={messages}
      />,
    );

    expect(html).toContain("Glossary");
    expect(html).toContain('data-testid="search-result-summary"');
    expect(html).toContain("feed-forward blocks");
  });
});
