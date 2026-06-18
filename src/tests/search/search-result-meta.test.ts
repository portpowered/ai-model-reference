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
const BERT_URL = "/docs/models/bert";
const GPT2_URL = "/docs/models/gpt-2";
const MASKED_LANGUAGE_MODELS_URL = "/docs/models/masked-language-models";
const MODEL_FAMILIES_OVERVIEW_URL = "/docs/models/model-families-overview";

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

  test("loadSearchResultMetaMap includes model-family overview pages as model results", async () => {
    const map = await loadSearchResultMetaMap();
    const meta = map.get(MODEL_FAMILIES_OVERVIEW_URL);
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("model");
    expect(meta?.tags).toEqual(
      expect.arrayContaining(["taxonomy", "model-family"]),
    );
    expect(meta?.aliases).toContain("model families");
  });

  test("loadSearchResultMetaMap includes GPT-2 as a checkpoint model result", async () => {
    const map = await loadSearchResultMetaMap();
    const meta = map.get(GPT2_URL);
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("model");
    expect(meta?.tags).toEqual(expect.arrayContaining(["foundations"]));
    expect(meta?.aliases).toEqual(
      expect.arrayContaining(["GPT-2", "OpenAI GPT-2"]),
    );
  });

  test("loadSearchResultMetaMap includes model category pages and new checkpoint support", async () => {
    const map = await loadSearchResultMetaMap();

    const categoryMeta = map.get(MASKED_LANGUAGE_MODELS_URL);
    expect(categoryMeta).toBeDefined();
    expect(categoryMeta?.kind).toBe("model");
    expect(categoryMeta?.tags).toContain("taxonomy");
    expect(categoryMeta?.aliases).toContain("masked language model");

    const bertMeta = map.get(BERT_URL);
    expect(bertMeta).toBeDefined();
    expect(bertMeta?.kind).toBe("model");
    expect(bertMeta?.tags).toContain("foundations");
    expect(bertMeta?.aliases).toContain(
      "Bidirectional Encoder Representations from Transformers",
    );
  });

  test("buildSearchResultMetaMap keys by url", () => {
    const map = buildSearchResultMetaMap([]);
    expect(map.size).toBe(0);
  });
});
