import { afterEach, describe, expect, test } from "bun:test";
import {
  DOCS_SEARCH_API_PATH,
  createDocsSearchClient,
} from "@/features/docs/search/search-client";
import { docsSearchApi } from "@/lib/search/search-server";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";

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
});
