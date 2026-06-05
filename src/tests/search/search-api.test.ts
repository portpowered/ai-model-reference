import { afterEach, describe, expect, test } from "bun:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { GET } from "@/app/api/search/route";
import { docsSearchApi } from "@/lib/search/search-server";
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
const TOKEN_URL = TOKEN_GLOSSARY_URL;

describe("live /api/search HTTP contract", () => {
  const routeFetch = createDocsSearchRouteFetch();

  test("bootstrap fetch returns advanced Orama export", async () => {
    const response = await routeFetch(TEST_DOCS_SEARCH_URL);
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });

  test("GET without query returns advanced Orama export", async () => {
    const response = await GET(new Request("http://localhost/api/search"));
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });

  test("GET returns grouped-query attention for GQA query", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=GQA"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

  test.each([
    "attention",
    "KV cache",
  ] as const)("GET returns grouped-query attention for %s query", async (query) => {
    const response = await GET(
      new Request(
        `http://localhost/api/search?query=${encodeURIComponent(query)}`,
      ),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});

describe("docsSearchApi", () => {
  test("search ranks grouped-query attention first for GQA", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

  test("search includes grouped-query attention for attention query", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("search includes grouped-query attention for title query", async () => {
    const results = await docsSearchApi.search("Grouped-Query Attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("search ranks token glossary first for Token query", async () => {
    const results = await docsSearchApi.search("Token");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(TOKEN_URL);
  });

  test.each([
    "tokens",
    "tokenizer",
  ] as const)("search includes token glossary for %s query", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeTokenGlossary(results)).toBe(true);
  });

  test.each([
    "KV cache",
    "kv cache",
    "kv-cache",
  ] as const)("search includes grouped-query attention for %s query", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("staticGET exports an advanced Orama index", async () => {
    const response = await docsSearchApi.staticGET();
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });
});

describe("docs search static client", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("orama static client returns grouped-query attention for GQA", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = oramaStaticClient({ from: TEST_DOCS_SEARCH_URL });
    const results = await client.search("GQA");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

  test("orama static client includes grouped-query attention for attention", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = oramaStaticClient({ from: TEST_DOCS_SEARCH_URL });
    const results = await client.search("attention");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("orama static client includes grouped-query attention for KV cache", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = oramaStaticClient({ from: TEST_DOCS_SEARCH_URL });
    const results = await client.search("KV cache");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});
