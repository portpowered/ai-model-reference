import { afterEach, describe, expect, test } from "bun:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { GET } from "@/app/api/search/route";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_SEARCH_ASSERTIONS,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "@/lib/verify/phase-1-search-checks";
import {
  expectUniqueCanonicalPageUrls,
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  resultsIncludeMultiHeadAttention,
  resultsIncludeMultiQueryAttention,
  resultsIncludeSampleModule,
  resultsIncludeTokenGlossary,
  resultsIncludeUrl,
  SAMPLE_MODULE_URL,
  TOKEN_GLOSSARY_URL,
} from "./helpers";
import {
  createDocsSearchRouteFetch,
  TEST_DOCS_SEARCH_URL,
} from "./route-fetch";

const SAMPLE_URL = SAMPLE_MODULE_URL;
const TOKEN_URL = TOKEN_GLOSSARY_URL;

describe("Phase 1 /api/search regression", () => {
  for (const assertion of PHASE_1_SEARCH_ASSERTIONS) {
    test(assertion.label, async () => {
      const results = await docsSearchApi.search(assertion.query);
      expect(assertion.assertResults(results)).toBeNull();
    });
  }
});

describe("live /api/search HTTP contract", () => {
  const routeFetch = createDocsSearchRouteFetch();

  test("bootstrap fetch returns advanced Orama export", async () => {
    const response = await routeFetch(TEST_DOCS_SEARCH_URL);
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });

  test("bootstrap fetch resolves relative /api/search paths like the browser client", async () => {
    const response = await routeFetch("/api/search");
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

  test("GET without query returns a locale-specific export for vietnamese", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?locale=vi"),
    );
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });

  test("GET without query returns a locale-specific export for japanese", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?locale=ja"),
    );
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });

  test("GET with a vietnamese locale query returns locale-scoped URLs", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=GQA&locale=vi"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.every((result) => result.url.startsWith("/vi/"))).toBe(true);
  });

  test("GET with a vietnamese locale query returns localized grouped-query attention content", async () => {
    const results = await docsSearchApi.search("GQA", { locale: "vi" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe("/vi/docs/modules/grouped-query-attention");

    const meta = await loadSearchResultMetaMap("vi");
    expect(meta.get("/vi/docs/modules/grouped-query-attention")?.title).toBe(
      "Grouped-query attention",
    );
    expect(
      meta.get("/vi/docs/modules/grouped-query-attention")?.description,
    ).toContain("giảm bộ nhớ KV cache");
  });

  test("GET with a vietnamese locale query returns localized linear-attention content", async () => {
    const results = await docsSearchApi.search("gần tuyến tính", {
      locale: "vi",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => result.url === "/vi/docs/modules/linear-attention",
      ),
    ).toBe(true);

    const meta = await loadSearchResultMetaMap("vi");
    expect(meta.get("/vi/docs/modules/linear-attention")?.title).toBe(
      "Linear attention",
    );
    expect(
      meta.get("/vi/docs/modules/linear-attention")?.description,
    ).toContain("gần tuyến tính");
  });

  test("GET with a japanese locale query stays empty when no japanese docs pages are shipped", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=attention&locale=ja"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results).toEqual([]);
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

  test("GET returns multi-head attention for MHA query", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=MHA"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(MULTI_HEAD_ATTENTION_URL);
  });

  test.each([
    "MQA",
    "multi-query attention",
  ] as const)("GET returns multi-query attention for %s query", async (query) => {
    const response = await GET(
      new Request(
        `http://localhost/api/search?query=${encodeURIComponent(query)}`,
      ),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(MULTI_QUERY_ATTENTION_URL);
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
  test("search returns at most one hit per canonical page URL for GQA", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test.each([
    "attention",
    "KV cache",
  ] as const)("search returns at most one hit per page for %s", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test("search ranks grouped-query attention first for GQA", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

  test("search ranks multi-head attention first for MHA", async () => {
    const results = await docsSearchApi.search("MHA");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(MULTI_HEAD_ATTENTION_URL);
    expect(resultsIncludeMultiHeadAttention(results)).toBe(true);
  });

  test("search ranks multi-head attention first for multi-head attention", async () => {
    const results = await docsSearchApi.search("multi-head attention");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(MULTI_HEAD_ATTENTION_URL);
  });

  test.each([
    "MQA",
    "multi-query attention",
  ] as const)("search ranks multi-query attention first for %s", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(MULTI_QUERY_ATTENTION_URL);
    expect(resultsIncludeMultiQueryAttention(results)).toBe(true);
  });

  test("search includes attention bridge and grouped-query attention for attention query", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, PHASE_1_ATTENTION_MODULE_URL)).toBe(true);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("search includes vector glossary for vector query", async () => {
    const results = await docsSearchApi.search("vector");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, PHASE_1_VECTOR_GLOSSARY_URL)).toBe(true);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test("search includes hidden size glossary for hidden size query", async () => {
    const results = await docsSearchApi.search("hidden size");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, PHASE_1_HIDDEN_SIZE_GLOSSARY_URL)).toBe(
      true,
    );
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
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

  test("staticGET exports an advanced Orama index for japanese", async () => {
    const response = await docsSearchApi.staticGET("ja");
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as { type: string };
    expect(payload.type).toBe("advanced");
  });

  test("search returns no japanese results when no japanese docs pages are shipped", async () => {
    const results = await docsSearchApi.search("attention", { locale: "ja" });
    expect(results).toEqual([]);
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

  test("orama static client returns non-empty attention concept results before app-level reranking", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = oramaStaticClient({ from: TEST_DOCS_SEARCH_URL });
    const results = await client.search("attention");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, "/docs/concepts/cross-attention")).toBe(
      true,
    );
  });

  test("orama static client includes grouped-query attention for KV cache", async () => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = oramaStaticClient({ from: TEST_DOCS_SEARCH_URL });
    const results = await client.search("KV cache");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});
