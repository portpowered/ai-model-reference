import { describe, expect, test } from "bun:test";
import { GET } from "@/app/api/search/route";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_SEARCH_ASSERTIONS,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "@/lib/verify/phase-1-search-checks";
import { withGlobalFetchOverride } from "@/tests/shared/global-fetch-lock";
import {
  createRetriedStaticClientSearch,
  expectUniqueCanonicalPageUrls,
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  resultsIncludeMultiHeadAttention,
  resultsIncludeMultiQueryAttention,
  resultsIncludeSampleModule,
  resultsIncludeTokenGlossary,
  resultsIncludeUrl,
  retrySearchResults,
  SAMPLE_MODULE_URL,
  TOKEN_GLOSSARY_URL,
} from "./helpers";
import {
  createDocsSearchRouteFetch,
  TEST_DOCS_SEARCH_URL,
} from "./route-fetch";

const LIVE_SEARCH_API_GATE_TIMEOUT_MS = 15_000;

const SAMPLE_URL = SAMPLE_MODULE_URL;
const TOKEN_URL = TOKEN_GLOSSARY_URL;
const ACTIVATION_GLOSSARY_URL = "/docs/glossary/activation";
const BIDIRECTIONAL_ATTENTION_URL = "/docs/modules/bidirectional-attention";
const FEED_FORWARD_NETWORK_URL = "/docs/modules/feed-forward-network";
const STANDARD_FFN_URL = "/docs/modules/standard-ffn";
const EXPERT_PARALLEL_OVERLAP_URL = "/docs/systems/expert-parallel-overlap";
const ACTIVATION_QUANTIZATION_URL = "/docs/concepts/activation-quantization";
const RELU_URL = "/docs/modules/relu";
const LEAKY_RELU_URL = "/docs/modules/leaky-relu";
const SILU_URL = "/docs/modules/silu";
const SWIGLU_URL = "/docs/modules/swiglu";
const JAPANESE_ATTENTION_PROOF_SET_URLS = [
  "/ja/docs/modules/attention",
  "/ja/docs/modules/linear-attention",
  "/ja/docs/modules/multi-head-attention",
  "/ja/docs/modules/grouped-query-attention",
  "/ja/docs/modules/multi-query-attention",
  "/ja/docs/modules/sliding-window-attention",
  "/ja/docs/glossary/token",
  "/ja/docs/concepts/transformer-architecture",
] as const;

function expectUrlsBefore(
  urls: string[],
  promotedUrls: readonly string[],
  laterUrl: string,
) {
  const laterIndex = urls.indexOf(laterUrl);

  for (const promotedUrl of promotedUrls) {
    const promotedIndex = urls.indexOf(promotedUrl);
    expect(promotedIndex).toBeGreaterThanOrEqual(0);
    if (laterIndex >= 0) {
      expect(promotedIndex).toBeLessThan(laterIndex);
    }
  }
}

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

  test("GET with a japanese locale query returns the shipped japanese attention proof set", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=attention&locale=ja"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    const urls = results.map((result) => result.url);
    expect(urls).toHaveLength(JAPANESE_ATTENTION_PROOF_SET_URLS.length);
    expect([...urls].sort()).toEqual(
      [...JAPANESE_ATTENTION_PROOF_SET_URLS].sort(),
    );
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

  test(
    "GET accepts classification=activation without a query and returns activation-family results",
    async () => {
      const response = await GET(
        new Request("http://localhost/api/search?classification=activation"),
      );
      expect(response.ok).toBe(true);

      const results = (await response.json()) as Array<{ url: string }>;
      const urls = results.map((result) => result.url);
      expect(urls).toEqual(expect.arrayContaining([RELU_URL, LEAKY_RELU_URL]));
    },
    { timeout: LIVE_SEARCH_API_GATE_TIMEOUT_MS },
  );

  test("GET accepts canonical classification IDs and combines query text with the classification scope", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/search?query=relu&classification=classification.activation-functions",
      ),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    const urls = results.map((result) => result.url);
    expect(results[0]?.url).toBe(RELU_URL);
    expect(urls).toEqual(expect.arrayContaining([RELU_URL, LEAKY_RELU_URL]));
  });

  test("GET with an unknown classification falls back to empty search results instead of crashing", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?classification=unknown-topic"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results).toEqual([]);
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

  test("search ranks the canonical self-attention concept first for exact reader queries", async () => {
    const hyphenatedResults = await docsSearchApi.search("self-attention");
    const spacedResults = await docsSearchApi.search("self attention");

    expect(hyphenatedResults.length).toBeGreaterThan(0);
    expect(spacedResults.length).toBeGreaterThan(0);
    expect(hyphenatedResults[0]?.url).toBe("/docs/concepts/self-attention");
    expect(spacedResults[0]?.url).toBe("/docs/concepts/self-attention");
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

  test.each([
    "bidirectional attention",
    "bidirectional self-attention",
    "full context attention",
    "bert attention",
  ] as const)("search returns bidirectional attention for %s", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(BIDIRECTIONAL_ATTENTION_URL);
    expect(resultsIncludeUrl(results, BIDIRECTIONAL_ATTENTION_URL)).toBe(true);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
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

  test.each([
    {
      query: "activation",
      expectedUrls: [
        ACTIVATION_GLOSSARY_URL,
        RELU_URL,
        LEAKY_RELU_URL,
        SILU_URL,
      ],
    },
    {
      query: "relu",
      expectedUrls: [RELU_URL, LEAKY_RELU_URL, SILU_URL],
    },
    {
      query: "gelu",
      expectedUrls: [
        ACTIVATION_GLOSSARY_URL,
        RELU_URL,
        LEAKY_RELU_URL,
        SILU_URL,
      ],
    },
    {
      query: "feed forward",
      expectedUrls: [FEED_FORWARD_NETWORK_URL, STANDARD_FFN_URL, SWIGLU_URL],
    },
    {
      query: "feedforward",
      expectedUrls: [FEED_FORWARD_NETWORK_URL, STANDARD_FFN_URL, SWIGLU_URL],
    },
    {
      query: "ffn",
      expectedUrls: [FEED_FORWARD_NETWORK_URL, STANDARD_FFN_URL, SWIGLU_URL],
    },
  ] as const)("search includes topology-aware seed results for $query", async ({
    query,
    expectedUrls,
  }) => {
    const results = await docsSearchApi.search(query);
    const urls = results.map((result) => result.url);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls).toEqual(expect.arrayContaining([...expectedUrls]));
    expectUniqueCanonicalPageUrls(urls);
  });

  test("search promotes activation-function modules above incidental activation body matches", async () => {
    const results = await docsSearchApi.search("activation");
    const urls = results.map((result) => result.url);

    expectUrlsBefore(
      urls,
      [RELU_URL, LEAKY_RELU_URL, SILU_URL],
      ACTIVATION_QUANTIZATION_URL,
    );
  });

  test.each([
    "feed forward",
    "feedforward",
  ] as const)("search promotes feed-forward family modules above unrelated tag matches for %s", async (query) => {
    const results = await docsSearchApi.search(query);
    const urls = results.map((result) => result.url);

    expectUrlsBefore(
      urls,
      [FEED_FORWARD_NETWORK_URL, STANDARD_FFN_URL, SWIGLU_URL],
      EXPERT_PARALLEL_OVERLAP_URL,
    );
  });

  test("search ranks the canonical feed-forward network page first for the direct FFN alias", async () => {
    const results = await docsSearchApi.search("ffn");

    expect(results[0]?.url).toBe(FEED_FORWARD_NETWORK_URL);
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

  test("search returns the shipped japanese attention proof set", async () => {
    const results = await docsSearchApi.search("attention", { locale: "ja" });
    const urls = results.map((result) => result.url);
    expect(urls).toHaveLength(JAPANESE_ATTENTION_PROOF_SET_URLS.length);
    expect([...urls].sort()).toEqual(
      [...JAPANESE_ATTENTION_PROOF_SET_URLS].sort(),
    );
  });
});

describe("docs search static client", () => {
  test("orama static client returns grouped-query attention for GQA", async () => {
    await withGlobalFetchOverride(createDocsSearchRouteFetch(), async () => {
      const results = await retrySearchResults(
        createRetriedStaticClientSearch(TEST_DOCS_SEARCH_URL, "GQA"),
        (candidateResults) => candidateResults[0]?.url === SAMPLE_URL,
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toBe(SAMPLE_URL);
    });
  });

  test("orama static client returns the canonical self-attention page for exact reader queries before app-level reranking", async () => {
    await withGlobalFetchOverride(createDocsSearchRouteFetch(), async () => {
      const hyphenatedResults = await retrySearchResults(
        createRetriedStaticClientSearch(TEST_DOCS_SEARCH_URL, "self-attention"),
        (candidateResults) =>
          candidateResults[0]?.url === "/docs/concepts/self-attention",
      );
      const spacedResults = await retrySearchResults(
        createRetriedStaticClientSearch(TEST_DOCS_SEARCH_URL, "self attention"),
        (candidateResults) =>
          resultsIncludeUrl(candidateResults, "/docs/concepts/self-attention"),
      );

      expect(hyphenatedResults.length).toBeGreaterThan(0);
      expect(spacedResults.length).toBeGreaterThan(0);
      expect(hyphenatedResults[0]?.url).toBe("/docs/concepts/self-attention");
      expect(
        resultsIncludeUrl(spacedResults, "/docs/concepts/self-attention"),
      ).toBe(true);
    });
  });

  test("orama static client returns non-empty attention results including bidirectional attention before app-level reranking", async () => {
    await withGlobalFetchOverride(createDocsSearchRouteFetch(), async () => {
      const results = await retrySearchResults(
        createRetriedStaticClientSearch(TEST_DOCS_SEARCH_URL, "attention"),
        (candidateResults) =>
          resultsIncludeUrl(candidateResults, PHASE_1_ATTENTION_MODULE_URL),
      );

      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeUrl(results, PHASE_1_ATTENTION_MODULE_URL)).toBe(
        true,
      );
      expect(resultsIncludeUrl(results, BIDIRECTIONAL_ATTENTION_URL)).toBe(
        true,
      );
    });
  });

  test("orama static client includes grouped-query attention for KV cache", async () => {
    await withGlobalFetchOverride(createDocsSearchRouteFetch(), async () => {
      const results = await retrySearchResults(
        createRetriedStaticClientSearch(TEST_DOCS_SEARCH_URL, "KV cache"),
        resultsIncludeSampleModule,
      );

      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeSampleModule(results)).toBe(true);
    });
  });

  test.each([
    {
      query: "gelu",
      expectedUrls: [
        ACTIVATION_GLOSSARY_URL,
        RELU_URL,
        LEAKY_RELU_URL,
        SILU_URL,
      ],
    },
    {
      query: "feedforward",
      expectedUrls: [FEED_FORWARD_NETWORK_URL, STANDARD_FFN_URL, SWIGLU_URL],
    },
  ] as const)("orama static client includes topology-aware seed results for $query", async ({
    query,
    expectedUrls,
  }) => {
    await withGlobalFetchOverride(createDocsSearchRouteFetch(), async () => {
      const results = await retrySearchResults(
        createRetriedStaticClientSearch(TEST_DOCS_SEARCH_URL, query),
        (candidateResults) =>
          expectedUrls.every((url) => resultsIncludeUrl(candidateResults, url)),
      );
      const urls = results.map((result) => result.url);

      expect(urls).toEqual(expect.arrayContaining([...expectedUrls]));
    });
  });
});
