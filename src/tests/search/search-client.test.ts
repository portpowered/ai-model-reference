import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  createModelAtlasSearchClient,
  DOCS_SEARCH_API_PATH,
} from "@/features/docs/search/search-client";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import {
  resultsIncludeSampleModule,
  resultsIncludeTokenGlossary,
  SAMPLE_MODULE_URL,
  TOKEN_GLOSSARY_URL,
} from "./helpers";
import {
  createDocsSearchRouteFetch,
  TEST_DOCS_SEARCH_URL,
} from "./route-fetch";

const SAMPLE_URL = SAMPLE_MODULE_URL;

describe("createModelAtlasSearchClient", () => {
  const originalFetch = globalThis.fetch;
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("uses the docs search API path and ranks GQA sample page first", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      expect(url).toContain(DOCS_SEARCH_API_PATH);
      return createDocsSearchRouteFetch()(input);
    }) as unknown as typeof fetch;

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: TEST_DOCS_SEARCH_URL },
    });
    const results = await client.search("GQA");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
    expect(results.every((result) => !result.url.includes("#"))).toBe(true);
  });

  test("includes grouped-query attention for attention query", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: TEST_DOCS_SEARCH_URL },
    });
    const results = await client.search("attention");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("includes grouped-query attention for KV cache query", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: TEST_DOCS_SEARCH_URL },
    });
    const results = await client.search("KV cache");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("ranks token glossary first for Token query", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: TEST_DOCS_SEARCH_URL },
    });
    const results = await client.search("Token");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(TOKEN_GLOSSARY_URL);
  });

  test.each([
    "tokens",
    "tokenizer",
  ] as const)("includes token glossary for %s query", async (query) => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: TEST_DOCS_SEARCH_URL },
    });
    const results = await client.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeTokenGlossary(results)).toBe(true);
  });
});
