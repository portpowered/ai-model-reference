import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { docsSearchApi } from "@/lib/search/search-server";
import { assertCanonicalPageLevelApiResults } from "@/lib/verify/phase-1-search-checks";
import {
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  resultsIncludeMultiHeadAttention,
  resultsIncludeMultiQueryAttention,
} from "@/tests/search/helpers";

const ATTENTION_VARIANT_ROUTE_CASES = [
  {
    slug: "multi-head-attention",
    url: MULTI_HEAD_ATTENTION_URL,
    title: "Multi-Head Attention",
    registryId: "module.multi-head-attention",
    expectInHtml: "Each head computes its own",
  },
  {
    slug: "multi-query-attention",
    url: MULTI_QUERY_ATTENTION_URL,
    title: "Multi-Query Attention",
    registryId: "module.multi-query-attention",
    expectInHtml: "Sharing one KV head across all queries",
  },
] as const;

describe("attention variant search discovery", () => {
  test("MHA query ranks multi-head attention first", async () => {
    const results = await docsSearchApi.search("MHA");
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(results[0]?.url).toBe(MULTI_HEAD_ATTENTION_URL);
  });

  test("multi-head attention query includes multi-head attention without duplicate pages", async () => {
    const results = await docsSearchApi.search("multi-head attention");
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeMultiHeadAttention(results)).toBe(true);
    expect(results[0]?.url).toBe(MULTI_HEAD_ATTENTION_URL);
  });

  test.each([
    "MQA",
    "multi-query attention",
  ] as const)("%s query ranks multi-query attention first", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(results[0]?.url).toBe(MULTI_QUERY_ATTENTION_URL);
    expect(resultsIncludeMultiQueryAttention(results)).toBe(true);
  });
});

describe("attention variant route smoke", () => {
  for (const route of ATTENTION_VARIANT_ROUTE_CASES) {
    test(`${route.url} loads published local docs content`, async () => {
      const page = await loadLocalDocsPage({
        section: "modules",
        slug: route.slug,
      });

      expect(page.messages.title).toBe(route.title);
      expect(page.frontmatter.registryId).toBe(route.registryId);
      expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    });

    test(`${route.url} renders without error`, async () => {
      const page = await loadLocalDocsPage({
        section: "modules",
        slug: route.slug,
      });

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(route.title);
      expect(html).toContain(route.expectInHtml);
      expect(html).not.toContain("Reader Shortcut");
    });
  }
});
