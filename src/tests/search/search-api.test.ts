import { afterEach, describe, expect, test } from "bun:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { docsSearchApi } from "@/lib/search/search-server";
import { resultsIncludeSampleModule, SAMPLE_MODULE_URL } from "./helpers";

const SAMPLE_URL = SAMPLE_MODULE_URL;

describe("docsSearchApi", () => {
  test("GET returns grouped-query attention for GQA query", async () => {
    const response = await docsSearchApi.GET(
      new Request("http://localhost/api/search?query=GQA"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

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
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(exported), {
        status: 200,
      })) as unknown as typeof fetch;

    const client = oramaStaticClient({ from: "http://test.local/api/search" });
    const results = await client.search("GQA");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_URL);
  });

  test("orama static client includes grouped-query attention for attention", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(exported), {
        status: 200,
      })) as unknown as typeof fetch;

    const client = oramaStaticClient({ from: "http://test.local/api/search" });
    const results = await client.search("attention");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test("orama static client includes grouped-query attention for KV cache", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(exported), {
        status: 200,
      })) as unknown as typeof fetch;

    const client = oramaStaticClient({ from: "http://test.local/api/search" });
    const results = await client.search("KV cache");

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});
