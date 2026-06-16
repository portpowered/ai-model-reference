import { afterEach, describe, expect, test } from "bun:test";
import {
  createDocsSearchClient,
  DOCS_SEARCH_API_PATH,
} from "@/features/docs/search/search-client";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import {
  buildSearchResultMetaMap,
  loadSearchResultMetaMap,
} from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

const CHAIN_TAG = "token-to-probability-chain";

const SOFTMAX_BODY_PHRASE = "vocabulary softmax normalization at decode time";

const CHAIN_GLOSSARY_PAGES = [
  { title: "Token", url: "/docs/glossary/token" },
  { title: "Embedding", url: "/docs/glossary/embedding" },
  { title: "Tensor", url: "/docs/glossary/tensor" },
  { title: "Logit", url: "/docs/glossary/logit" },
  { title: "Softmax", url: "/docs/glossary/softmax" },
  { title: "Entropy", url: "/docs/glossary/entropy" },
  { title: "Temperature", url: "/docs/glossary/temperature" },
  { title: "Parameter", url: "/docs/glossary/parameter" },
  { title: "Activation", url: "/docs/glossary/activation" },
  {
    title: "Computational Graph",
    url: "/docs/glossary/computational-graph",
  },
  { title: "Gradient", url: "/docs/glossary/gradient" },
  { title: "Backpropagation", url: "/docs/glossary/backpropagation" },
  { title: "Loss Function", url: "/docs/glossary/loss-function" },
  { title: "Optimizer State", url: "/docs/glossary/optimizer-state" },
] as const;

const CHAIN_GLOSSARY_URLS = CHAIN_GLOSSARY_PAGES.map((page) => page.url);

const REPRESENTATIVE_ALIAS_QUERIES = [
  { query: "tokens", url: "/docs/glossary/token" },
  { query: "embeddings", url: "/docs/glossary/embedding" },
  { query: "logits", url: "/docs/glossary/logit" },
  { query: "backprop", url: "/docs/glossary/backpropagation" },
  { query: "objective function", url: "/docs/glossary/loss-function" },
  { query: "optimizer state", url: "/docs/glossary/optimizer-state" },
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

describe("Phase 2 full chain search indexing (US-011)", () => {
  test("indexes all fourteen chain glossary pages with shared chain tag", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const url of CHAIN_GLOSSARY_URLS) {
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.kind).toBe("glossary");
      expect(document?.tags).toEqual(
        expect.arrayContaining([CHAIN_TAG, "foundations"]),
      );
    }
  });

  test("search result meta map includes glossary kind for every chain page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const metaMap = buildSearchResultMetaMap(documents);

    for (const url of CHAIN_GLOSSARY_URLS) {
      const meta = metaMap.get(url);
      expect(meta).toBeDefined();
      expect(meta?.kind).toBe("glossary");
      expect(meta?.tags).toEqual(expect.arrayContaining([CHAIN_TAG]));
    }
  });
});

describe("Phase 2 full chain search title ranking (US-011)", () => {
  test.each(
    CHAIN_GLOSSARY_PAGES.map(({ title, url }) => [title, url] as const),
  )("ranks %s glossary first for canonical title query", async (title, url) => {
    const results = await docsSearchApi.search(title);
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
  });
});

describe("Phase 2 full chain search aliases and body text (US-011)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function searchWithStaticClient(query: string) {
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(exported), {
        status: 200,
      })) as unknown as typeof fetch;

    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const client = createDocsSearchClient({
      metaByUrl,
      client: { from: DOCS_SEARCH_API_PATH },
    });
    return client.search(query);
  }

  test.each(
    REPRESENTATIVE_ALIAS_QUERIES.map(({ query, url }) => [query, url] as const),
  )("alias query %s resolves to %s", async (query, url) => {
    const results = await docsSearchApi.search(query);
    expect(resultsIncludeUrl(results, url)).toBe(true);
  });

  test("static client finds softmax glossary for distinctive body phrase", async () => {
    const results = await searchWithStaticClient(SOFTMAX_BODY_PHRASE);
    expect(
      results.some((result) => result.url === "/docs/glossary/softmax"),
    ).toBe(true);
  });

  test("shared chain tag query returns multiple chain glossary pages with glossary kind metadata", async () => {
    const results = await docsSearchApi.search(CHAIN_TAG);
    const metaMap = await loadSearchResultMetaMap();

    const chainGlossaryHits = results.filter((result) => {
      const baseUrl = pageBaseUrl(result.url);
      if (
        !CHAIN_GLOSSARY_URLS.includes(
          baseUrl as (typeof CHAIN_GLOSSARY_URLS)[number],
        )
      ) {
        return false;
      }
      const meta = metaMap.get(baseUrl);
      return meta?.kind === "glossary";
    });

    expect(chainGlossaryHits.length).toBeGreaterThanOrEqual(10);
    expect(
      chainGlossaryHits.some((hit) => hit.url.includes("/docs/glossary/token")),
    ).toBe(true);
    expect(
      chainGlossaryHits.some((hit) =>
        hit.url.includes("/docs/glossary/softmax"),
      ),
    ).toBe(true);
  });
});
