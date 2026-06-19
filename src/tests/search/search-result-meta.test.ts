import { describe, expect, test } from "bun:test";
import {
  getMatchedTags,
  resolveSearchResultMeta,
} from "@/features/docs/search/search-result-meta-client";
import {
  buildSearchResultMetaMap,
  loadSearchResultMetaMap,
} from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import {
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  SAMPLE_MODULE_URL,
  TOKEN_GLOSSARY_URL,
} from "./helpers";

const SAMPLE_URL = SAMPLE_MODULE_URL;
const TOKEN_URL = TOKEN_GLOSSARY_URL;

describe("search result meta", () => {
  test("loadSearchResultMetaMap includes grouped-query attention sample", async () => {
    const map = await loadSearchResultMetaMap();
    const meta = map.get(SAMPLE_URL);
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("module");
    expect(meta?.tags).toContain("attention");
    expect(meta?.tags).toContain("kv-cache");
  });

  test("loadSearchResultMetaMap includes multi-head and multi-query attention modules", async () => {
    const map = await loadSearchResultMetaMap();

    const mha = map.get(MULTI_HEAD_ATTENTION_URL);
    expect(mha).toBeDefined();
    expect(mha?.kind).toBe("module");
    expect(mha?.tags).toEqual(["attention"]);

    const mqa = map.get(MULTI_QUERY_ATTENTION_URL);
    expect(mqa).toBeDefined();
    expect(mqa?.kind).toBe("module");
    expect(mqa?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );
  });

  test("getMatchedTags finds attention for slug query", () => {
    expect(getMatchedTags("attention", ["attention", "kv-cache"])).toEqual([
      "attention",
    ]);
  });

  test("getMatchedTags finds attention when query matches a tag alias phrase", () => {
    expect(getMatchedTags("self-attention", ["attention", "kv-cache"])).toEqual(
      ["attention"],
    );
  });

  test("resolveSearchResultMeta returns kind, description, and tags for grouped-query attention", async () => {
    const record = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
    const meta = resolveSearchResultMeta(SAMPLE_URL, record);
    expect(meta).toEqual({
      title: "Grouped-Query Attention",
      kind: "module",
      description: expect.any(String),
      tags: expect.arrayContaining(["attention", "kv-cache"]),
      aliases: expect.any(Array),
    });
    expect(meta?.description.length).toBeGreaterThan(0);
  });

  test("resolveSearchResultMeta returns kind, description, and tags for token glossary", async () => {
    const record = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
    const meta = resolveSearchResultMeta(TOKEN_URL, record);
    expect(meta).toEqual({
      title: "Token",
      kind: "glossary",
      description: expect.any(String),
      tags: expect.arrayContaining(["attention"]),
      aliases: expect.any(Array),
    });
    expect(meta?.description).toContain("smallest unit");
  });

  test("loadSearchResultMetaMap includes token glossary", async () => {
    const map = await loadSearchResultMetaMap();
    const meta = map.get(TOKEN_URL);
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("glossary");
    expect(meta?.tags).toContain("attention");
    expect(meta?.aliases.length).toBeGreaterThan(0);
  });

  test("loadSearchResultMetaMap returns the shipped japanese attention proof set", async () => {
    const map = await loadSearchResultMetaMap("ja");
    expect(map.size).toBe(8);
    expect(map.get("/ja/docs/modules/attention")?.title).toBe("Attention");
    expect(map.get("/ja/docs/modules/grouped-query-attention")?.title).toBe(
      "Grouped-query attention",
    );
    expect(map.get("/ja/docs/modules/multi-head-attention")?.title).toBe(
      "マルチヘッド attention",
    );
    expect(map.get("/ja/docs/modules/multi-query-attention")?.title).toBe(
      "マルチクエリ attention",
    );
    expect(map.get("/ja/docs/modules/sliding-window-attention")?.title).toBe(
      "スライディングウィンドウ attention",
    );
    expect(map.get("/ja/docs/modules/linear-attention")?.title).toBe(
      "線形 attention",
    );
    expect(map.get("/ja/docs/glossary/token")?.title).toBe("Token");
    expect(map.get("/ja/docs/concepts/transformer-architecture")?.title).toBe(
      "Transformer アーキテクチャ",
    );
    expect(map.has("/ja/docs/modules/swiglu")).toBe(false);
  });

  test("buildSearchResultMetaMap keys by url", () => {
    const map = buildSearchResultMetaMap([]);
    expect(map.size).toBe(0);
  });
});
