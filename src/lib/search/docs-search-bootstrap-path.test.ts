import { describe, expect, test } from "bun:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  DOCS_SEARCH_API_PATH,
  DOCS_SEARCH_BOOTSTRAP_FROM_ENV,
  readDocsSearchStaticBootstrapFrom,
  resolveDocsSearchStaticBootstrapFrom,
} from "./docs-search-bootstrap-path";

describe("resolveDocsSearchStaticBootstrapFrom", () => {
  test("returns /api/search for dev and next start builds", () => {
    expect(resolveDocsSearchStaticBootstrapFrom({})).toBe(DOCS_SEARCH_API_PATH);
    expect(
      resolveDocsSearchStaticBootstrapFrom({
        NEXT_STATIC_EXPORT: "0",
      }),
    ).toBe(DOCS_SEARCH_API_PATH);
  });

  test("prefixes bootstrap path with GitHub Pages basePath during export", () => {
    expect(
      resolveDocsSearchStaticBootstrapFrom({
        NEXT_STATIC_EXPORT: "1",
        GITHUB_PAGES_BASE_PATH: "/ai-model-reference",
      }),
    ).toBe("/ai-model-reference/api/search");
  });

  test("readDocsSearchStaticBootstrapFrom prefers NEXT_PUBLIC env when set", () => {
    expect(
      readDocsSearchStaticBootstrapFrom({
        [DOCS_SEARCH_BOOTSTRAP_FROM_ENV]: "/ai-model-reference/api/search",
      }),
    ).toBe("/ai-model-reference/api/search");
  });
});

describe("static search bootstrap fetch path", () => {
  const originalFetch = globalThis.fetch;

  test("oramaStaticClient bootstraps from basePath-prefixed static asset without API route", async () => {
    const bootstrapFrom =
      "http://bootstrap-path-unit.test/ai-model-reference/api/search";
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

    try {
      const client = oramaStaticClient({ from: bootstrapFrom });
      const results = await client.search("GQA");
      expect(fetchedUrl).toBe(bootstrapFrom);
      expect(results.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
