import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { formatPageKind } from "@/lib/content/ui-messages.types";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { expectUniqueCanonicalPageUrls } from "@/tests/search/helpers";

const TRANSFORMER_GLOSSARY_URL = "/docs/glossary/transformer";
const DIFFUSION_MODEL_GLOSSARY_URL = "/docs/glossary/diffusion-model";
const ATTENTION_MODULE_URL = "/docs/modules/attention";
const MULTI_HEAD_ATTENTION_URL = "/docs/modules/multi-head-attention";
const MULTI_QUERY_ATTENTION_URL = "/docs/modules/multi-query-attention";
const SPARSE_ATTENTION_URL = "/docs/modules/sparse-attention";
const ROPE_GLOSSARY_URL = "/docs/modules/rope";
const CONTEXT_WINDOW_GLOSSARY_URL = "/docs/glossary/context-window";
const FEED_FORWARD_NETWORK_GLOSSARY_URL = "/docs/modules/feed-forward-network";
const STANDARD_FFN_GLOSSARY_URL = "/docs/modules/standard-ffn";
const MIXTURE_OF_EXPERTS_GLOSSARY_URL = "/docs/modules/mixture-of-experts";
const RELU_GLOSSARY_URL = "/docs/modules/relu";
const LEAKY_RELU_GLOSSARY_URL = "/docs/modules/leaky-relu";
const SILU_GLOSSARY_URL = "/docs/modules/silu";
const SWIGLU_GLOSSARY_URL = "/docs/modules/swiglu";
const NORMALIZATION_CONCEPT_URL = "/docs/concepts/normalization";
const NORMALIZATION_GLOSSARY_URL = "/docs/glossary/normalization";
const LAYER_NORM_GLOSSARY_URL = "/docs/modules/layer-norm";
const BATCH_NORM_GLOSSARY_URL = "/docs/modules/batch-norm";
const GROUP_NORM_GLOSSARY_URL = "/docs/modules/group-norm";
const RMSNORM_GLOSSARY_URL = "/docs/modules/rmsnorm";
const QK_NORM_GLOSSARY_URL = "/docs/modules/qk-norm";
const RESIDUAL_CONNECTION_GLOSSARY_URL = "/docs/glossary/residual-connection";
const SKIP_CONNECTION_GLOSSARY_URL = "/docs/glossary/skip-connection";

const ATTENTION_MODULE_QUERIES = [
  { query: "MHA", url: MULTI_HEAD_ATTENTION_URL },
  { query: "MQA", url: MULTI_QUERY_ATTENTION_URL },
  { query: "sparse attention", url: SPARSE_ATTENTION_URL },
] as const;

const GLOSSARY_CANONICAL_QUERIES = [
  { query: "RoPE", url: ROPE_GLOSSARY_URL, kind: "module" as const },
  {
    query: "context window",
    url: CONTEXT_WINDOW_GLOSSARY_URL,
    kind: "glossary" as const,
  },
  {
    query: "feed-forward network",
    url: FEED_FORWARD_NETWORK_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "standard FFN",
    url: STANDARD_FFN_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "mixture of experts",
    url: MIXTURE_OF_EXPERTS_GLOSSARY_URL,
    kind: "module" as const,
  },
  { query: "ReLU", url: RELU_GLOSSARY_URL, kind: "module" as const },
  {
    query: "LeakyReLU",
    url: LEAKY_RELU_GLOSSARY_URL,
    kind: "module" as const,
  },
  { query: "SiLU", url: SILU_GLOSSARY_URL, kind: "module" as const },
  { query: "SwiGLU", url: SWIGLU_GLOSSARY_URL, kind: "module" as const },
  {
    query: "normalization",
    url: NORMALIZATION_CONCEPT_URL,
    kind: "concept" as const,
  },
  {
    query: "layer norm",
    url: LAYER_NORM_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "batch norm",
    url: BATCH_NORM_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "group norm",
    url: GROUP_NORM_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "RMSNorm",
    url: RMSNORM_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "QK norm",
    url: QK_NORM_GLOSSARY_URL,
    kind: "module" as const,
  },
  {
    query: "residual connection",
    url: RESIDUAL_CONNECTION_GLOSSARY_URL,
    kind: "glossary" as const,
  },
  {
    query: "skip connection",
    url: SKIP_CONNECTION_GLOSSARY_URL,
    kind: "glossary" as const,
  },
] as const;

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

describe("Phase 2/3 reconciliation search API ranking (US-010)", () => {
  test("transformer query ranks glossary first and includes module hits with distinct kinds", async () => {
    const results = await docsSearchApi.search("transformer");
    const metaMap = await loadSearchResultMetaMap();

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(TRANSFORMER_GLOSSARY_URL);
    expect(resultsIncludeUrl(results, ATTENTION_MODULE_URL)).toBe(true);
    expect(metaMap.get(TRANSFORMER_GLOSSARY_URL)?.kind).toBe("glossary");
    expect(metaMap.get(ATTENTION_MODULE_URL)?.kind).toBe("module");
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test("diffusion model query ranks canonical glossary first with glossary kind metadata", async () => {
    const results = await docsSearchApi.search("diffusion model");
    const metaMap = await loadSearchResultMetaMap();

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
      DIFFUSION_MODEL_GLOSSARY_URL,
    );
    expect(metaMap.get(DIFFUSION_MODEL_GLOSSARY_URL)?.kind).toBe("glossary");
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test.each(
    ATTENTION_MODULE_QUERIES.map(({ query, url }) => [query, url] as const),
  )("%s query ranks matching attention module first with module kind", async (query, url) => {
    const results = await docsSearchApi.search(query);
    const metaMap = await loadSearchResultMetaMap();

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
    expect(metaMap.get(url)?.kind).toBe("module");
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test.each(
    GLOSSARY_CANONICAL_QUERIES.map(
      ({ query, url, kind }) => [query, url, kind] as const,
    ),
  )("%s query ranks canonical glossary page first with %s kind", async (query, url, kind) => {
    const results = await docsSearchApi.search(query);
    const metaMap = await loadSearchResultMetaMap();

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
    expect(metaMap.get(url)?.kind).toBe(kind);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });
});

describe("Phase 2/3 reconciliation search UI kind labels (US-010)", () => {
  test.each([
    [TRANSFORMER_GLOSSARY_URL, "glossary", "Glossary"],
    [DIFFUSION_MODEL_GLOSSARY_URL, "glossary", "Glossary"],
    [MULTI_HEAD_ATTENTION_URL, "module", "Module"],
    [MULTI_QUERY_ATTENTION_URL, "module", "Module"],
    [SPARSE_ATTENTION_URL, "module", "Module"],
    [ROPE_GLOSSARY_URL, "module", "Module"],
    [CONTEXT_WINDOW_GLOSSARY_URL, "glossary", "Glossary"],
    [FEED_FORWARD_NETWORK_GLOSSARY_URL, "module", "Module"],
    [STANDARD_FFN_GLOSSARY_URL, "module", "Module"],
    [MIXTURE_OF_EXPERTS_GLOSSARY_URL, "module", "Module"],
    [RELU_GLOSSARY_URL, "module", "Module"],
    [LEAKY_RELU_GLOSSARY_URL, "module", "Module"],
    [SILU_GLOSSARY_URL, "module", "Module"],
    [SWIGLU_GLOSSARY_URL, "module", "Module"],
    [NORMALIZATION_CONCEPT_URL, "concept", "Concept"],
    [NORMALIZATION_GLOSSARY_URL, "glossary", "Glossary"],
    [LAYER_NORM_GLOSSARY_URL, "module", "Module"],
    [BATCH_NORM_GLOSSARY_URL, "module", "Module"],
    [GROUP_NORM_GLOSSARY_URL, "module", "Module"],
    [RMSNORM_GLOSSARY_URL, "module", "Module"],
    [QK_NORM_GLOSSARY_URL, "module", "Module"],
    [RESIDUAL_CONNECTION_GLOSSARY_URL, "glossary", "Glossary"],
    [SKIP_CONNECTION_GLOSSARY_URL, "glossary", "Glossary"],
  ] as const)("SearchResultMetaDetails shows localized %s kind for %s", async (url, kind, label) => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[url];
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe(kind);
    expect(formatPageKind(messages, kind)).toBe(label);

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails url={url} meta={meta} messages={messages} />,
    );

    expect(html).toContain('data-testid="search-result-kind"');
    expect(html).toContain(label);
    expect(html).toContain('data-testid="search-result-summary"');
    expect(html).not.toContain('data-testid="search-result-matched-tags"');
  });
});
