import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  buildDocsSearchStaticOptions,
  createModelAtlasSearchClient,
  DOCS_SEARCH_API_PATH,
  docsSearchStaticOptions,
} from "@/features/docs/search/search-client";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import {
  expectUniqueCanonicalPageUrls,
  resultsIncludeSampleModule,
  resultsIncludeTokenGlossary,
  resultsIncludeUrl,
  SAMPLE_MODULE_URL,
  TOKEN_GLOSSARY_URL,
} from "./helpers";
import {
  createDocsSearchRouteFetch,
  createTestDocsSearchUrl,
} from "./route-fetch";

const SAMPLE_URL = SAMPLE_MODULE_URL;
const ATTENTION_MODULE_URL = "/docs/modules/attention";
const STATIC_CLIENT_SEARCH_URL = createTestDocsSearchUrl(
  "search-client-static",
);

describe("createModelAtlasSearchClient", () => {
  const originalFetch = globalThis.fetch;
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("docsSearchStaticOptions.from resolves to the static bootstrap path", () => {
    expect(docsSearchStaticOptions.from).toBe(DOCS_SEARCH_API_PATH);
  });

  test("buildDocsSearchStaticOptions uses a locale-specific bootstrap path", () => {
    expect(buildDocsSearchStaticOptions("vi").from).toBe(
      "/api/search?locale=vi",
    );
  });

  test("loads vietnamese result metadata for shipped localized pages", async () => {
    const localizedMeta = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap("vi"),
    );

    expect(
      localizedMeta["/vi/docs/modules/grouped-query-attention"]?.title,
    ).toBe("Grouped-query attention");
    expect(
      localizedMeta["/vi/docs/modules/linear-attention"]?.description,
    ).toContain("gần tuyến tính");
    expect(localizedMeta["/vi/docs/glossary/token"]?.description).toContain(
      "Đơn vị văn bản nhỏ nhất",
    );
  });

  test("fetches GQA results from a basePath-prefixed static bootstrap URL", async () => {
    const bootstrapFrom = "/ai-model-reference/api/search";
    const payload = await docsSearchApi.export();
    let fetchedUrl: string | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetchedUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return new Response(JSON.stringify(payload), { status: 200 });
    }) as typeof fetch;

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: bootstrapFrom },
    });
    const results = await client.search("GQA");

    expect(fetchedUrl).toBe(bootstrapFrom);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
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
      client: { from: STATIC_CLIENT_SEARCH_URL },
    });
    const results = await client.search("GQA");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
    expect(results.every((result) => !result.url.includes("#"))).toBe(true);
  });

  test("returns at most one hit per canonical page URL for attention query", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: STATIC_CLIENT_SEARCH_URL },
    });
    const results = await client.search("attention");

    expect(results.length).toBeGreaterThan(0);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
    expect(resultsIncludeUrl(results, ATTENTION_MODULE_URL)).toBe(true);
  });

  test("returns at most one hit per canonical page URL for KV cache query", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: STATIC_CLIENT_SEARCH_URL },
    });
    const results = await client.search("KV cache");

    expect(results.length).toBeGreaterThan(0);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("ranks token glossary first for Token query", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: STATIC_CLIENT_SEARCH_URL },
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
      client: { from: STATIC_CLIENT_SEARCH_URL },
    });
    const results = await client.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeTokenGlossary(results)).toBe(true);
  });
});
