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
const ROPE_GLOSSARY_URL = "/docs/glossary/rope";
const CONTEXT_WINDOW_GLOSSARY_URL = "/docs/glossary/context-window";
const SILU_GLOSSARY_URL = "/docs/glossary/silu";
const SWIGLU_GLOSSARY_URL = "/docs/glossary/swiglu";

const ATTENTION_MODULE_QUERIES = [
  { query: "MHA", url: MULTI_HEAD_ATTENTION_URL },
  { query: "MQA", url: MULTI_QUERY_ATTENTION_URL },
  { query: "sparse attention", url: SPARSE_ATTENTION_URL },
] as const;

const GLOSSARY_CANONICAL_QUERIES = [
  { query: "RoPE", url: ROPE_GLOSSARY_URL, kind: "glossary" as const },
  {
    query: "context window",
    url: CONTEXT_WINDOW_GLOSSARY_URL,
    kind: "glossary" as const,
  },
  { query: "SiLU", url: SILU_GLOSSARY_URL, kind: "glossary" as const },
  { query: "SwiGLU", url: SWIGLU_GLOSSARY_URL, kind: "glossary" as const },
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
    [ROPE_GLOSSARY_URL, "glossary", "Glossary"],
    [CONTEXT_WINDOW_GLOSSARY_URL, "glossary", "Glossary"],
    [SILU_GLOSSARY_URL, "glossary", "Glossary"],
    [SWIGLU_GLOSSARY_URL, "glossary", "Glossary"],
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
