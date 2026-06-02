import { describe, expect, test } from "bun:test";
import {
  getMatchedTags,
  resolveSearchResultMeta,
} from "@/features/docs/search/search-result-meta-client";
import {
  buildSearchResultMetaMap,
  loadSearchResultMetaMap,
} from "@/lib/search/search-result-meta";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";

describe("search result meta", () => {
  test("loadSearchResultMetaMap includes grouped-query attention sample", () => {
    const map = loadSearchResultMetaMap();
    const meta = map.get(SAMPLE_URL);
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("module");
    expect(meta?.tags).toContain("attention");
    expect(meta?.tags).toContain("kv-cache");
  });

  test("getMatchedTags finds attention for query", () => {
    expect(getMatchedTags("attention", ["attention", "kv-cache"])).toEqual([
      "attention",
    ]);
  });

  test("resolveSearchResultMeta reads record entries", () => {
    const map = loadSearchResultMetaMap();
    const record = Object.fromEntries(map.entries());
    const meta = resolveSearchResultMeta(SAMPLE_URL, record);
    expect(meta?.description.length).toBeGreaterThan(0);
  });

  test("buildSearchResultMetaMap keys by url", () => {
    const map = buildSearchResultMetaMap([]);
    expect(map.size).toBe(0);
  });
});
