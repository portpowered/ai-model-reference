import { afterEach, describe, expect, test } from "bun:test";
import {
  DOCS_SEARCH_API_PATH,
  createDocsSearchClient,
} from "@/features/docs/search/search-client";
import { docsSearchApi } from "@/lib/search/search-server";
import { SAMPLE_MODULE_URL, resultsIncludeSampleModule } from "./helpers";

const SAMPLE_URL = SAMPLE_MODULE_URL;

describe("createDocsSearchClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("uses the docs search API path and ranks GQA sample page first", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      expect(url).toContain(DOCS_SEARCH_API_PATH);
      return new Response(JSON.stringify(exported), { status: 200 });
    }) as unknown as typeof fetch;

    const client = createDocsSearchClient({
      from: DOCS_SEARCH_API_PATH,
    });
    const results = await client.search("GQA");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

  test("includes grouped-query attention for attention query", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(exported), {
        status: 200,
      })) as unknown as typeof fetch;

    const client = createDocsSearchClient({ from: DOCS_SEARCH_API_PATH });
    const results = await client.search("attention");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("includes grouped-query attention for KV cache query", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(exported), {
        status: 200,
      })) as unknown as typeof fetch;

    const client = createDocsSearchClient({ from: DOCS_SEARCH_API_PATH });
    const results = await client.search("KV cache");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});
