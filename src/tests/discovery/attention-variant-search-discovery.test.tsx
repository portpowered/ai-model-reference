import { describe, expect, test } from "bun:test";
import { docsSearchApi } from "@/lib/search/search-server";
import { assertCanonicalPageLevelApiResults } from "@/lib/verify/phase-1-search-checks";
import {
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  resultsIncludeMultiHeadAttention,
  resultsIncludeMultiQueryAttention,
} from "@/tests/search/helpers";

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
