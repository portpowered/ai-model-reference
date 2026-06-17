import { describe, expect, test } from "bun:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  DOCS_SEARCH_API_PATH,
  DOCS_SEARCH_BOOTSTRAP_FROM_ENV,
  readDocsSearchStaticBootstrapFrom,
  resolveClientDocsSearchBootstrapFromForLocale,
  resolveDocsSearchBootstrapFromForLocale,
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

describe("resolveDocsSearchBootstrapFromForLocale", () => {
  test("uses the default API route for english in dev", () => {
    expect(resolveDocsSearchBootstrapFromForLocale("en", {})).toBe(
      DOCS_SEARCH_API_PATH,
    );
  });

  test("uses a locale query for non-default locales in dev", () => {
    expect(resolveDocsSearchBootstrapFromForLocale("vi", {})).toBe(
      "/api/search?locale=vi",
    );
  });

  test("uses a distinct export artifact for vietnamese in static export builds", () => {
    expect(
      resolveDocsSearchBootstrapFromForLocale("vi", {
        NEXT_STATIC_EXPORT: "1",
        GITHUB_PAGES_BASE_PATH: "/ai-model-reference",
      }),
    ).toBe("/ai-model-reference/api/search.vi");
  });
});

describe("resolveClientDocsSearchBootstrapFromForLocale", () => {
  test("prefers the baked public bootstrap path for english", () => {
    expect(
      resolveClientDocsSearchBootstrapFromForLocale("en", {
        [DOCS_SEARCH_BOOTSTRAP_FROM_ENV]: "/ai-model-reference/api/search",
      }),
    ).toBe("/ai-model-reference/api/search");
  });

  test("derives localized export artifacts from the baked public bootstrap path", () => {
    expect(
      resolveClientDocsSearchBootstrapFromForLocale("vi", {
        [DOCS_SEARCH_BOOTSTRAP_FROM_ENV]: "/ai-model-reference/api/search",
      }),
    ).toBe("/ai-model-reference/api/search.vi");
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
