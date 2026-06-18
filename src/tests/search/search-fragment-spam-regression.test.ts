import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { createModelAtlasSearchClient } from "@/features/docs/search/search-client";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { assertApiGqaCanonicalPageHit } from "@/lib/verify/customer-ask-search-surface-convergence";
import { PHASE_1_SEARCH_ASSERTIONS } from "@/lib/verify/phase-1-search-checks";
import {
  expectCollapsedResultsDominateFragmentSpam,
  expectUniqueCanonicalPageUrls,
  retrySearchResults,
} from "./helpers";
import {
  createDocsSearchRouteFetch,
  TEST_DOCS_SEARCH_URL,
} from "./route-fetch";

describe("Phase 1 fragment-spam regression", () => {
  const originalFetch = globalThis.fetch;
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("collapsed API results dominate raw Orama fragment spam for %s", async (query) => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const rawClient = oramaStaticClient({ from: TEST_DOCS_SEARCH_URL });
    const rawResults = await retrySearchResults(
      () => rawClient.search(query),
      (results) => results.length > 0,
    );
    const collapsedResults = await docsSearchApi.search(query);

    expectCollapsedResultsDominateFragmentSpam(
      rawResults.map((result) => result.url),
      collapsedResults.map((result) => result.url),
    );
    expect(
      PHASE_1_SEARCH_ASSERTIONS.find(
        (entry) => entry.query === query,
      )?.assertResults(collapsedResults),
    ).toBeNull();
  });

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("collapsed static client returns canonical page-level hits for %s", async (query) => {
    globalThis.fetch = createDocsSearchRouteFetch();

    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: TEST_DOCS_SEARCH_URL },
    });
    const results = await client.search(query);

    expect(results.length).toBeGreaterThan(0);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test("GQA API results pass customer-ask canonical-first assertion", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(assertApiGqaCanonicalPageHit(results)).toBeNull();
  });
});
