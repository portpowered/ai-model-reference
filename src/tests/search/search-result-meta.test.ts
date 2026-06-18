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
const CHINCHILLA_URL = "/docs/models/chinchilla";
const CLAUDE_URL = "/docs/models/claude";
const DEEPSEEK_FAMILY_URL = "/docs/models/deepseek-family";
const DEEPSEEK_R1_URL = "/docs/models/deepseek-r1";
const DEEPSEEK_V2_URL = "/docs/models/deepseek-v2";
const DEEPSEEK_V3_URL = "/docs/models/deepseek-v3";
const GEMINI_URL = "/docs/models/gemini";
const GPT_OSS_URL = "/docs/models/gpt-oss";
const GPT2_URL = "/docs/models/gpt-2";
const LLAMA_3_URL = "/docs/models/llama-3";
const LLAMA_FAMILY_URL = "/docs/models/llama-family";
const MASKED_LANGUAGE_MODELS_URL = "/docs/models/masked-language-models";
const MODEL_FAMILIES_OVERVIEW_URL = "/docs/models/model-families-overview";
const PALM_URL = "/docs/models/palm";
const QWEN2_URL = "/docs/models/qwen2";
const QWEN25_URL = "/docs/models/qwen2-5";
const QWEN3_URL = "/docs/models/qwen3";
const QWEN_FAMILY_URL = "/docs/models/qwen-family";

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

  test("loadSearchResultMetaMap includes PaLM and Chinchilla as foundation checkpoint results", async () => {
    const map = await loadSearchResultMetaMap();

    const palmMeta = map.get(PALM_URL);
    expect(palmMeta).toBeDefined();
    expect(palmMeta?.kind).toBe("model");
    expect(palmMeta?.tags).toContain("foundations");
    expect(palmMeta?.aliases).toContain("Pathways Language Model");

    const chinchillaMeta = map.get(CHINCHILLA_URL);
    expect(chinchillaMeta).toBeDefined();
    expect(chinchillaMeta?.kind).toBe("model");
    expect(chinchillaMeta?.tags).toContain("foundations");
    expect(chinchillaMeta?.aliases).toContain("DeepMind Chinchilla");
  });

  test("loadSearchResultMetaMap includes frontier family hubs as model-family results", async () => {
    const map = await loadSearchResultMetaMap();

    for (const [url, alias] of [
      [LLAMA_FAMILY_URL, "Llama family"],
      [QWEN_FAMILY_URL, "Qwen family"],
      [DEEPSEEK_FAMILY_URL, "DeepSeek family"],
    ] as const) {
      const meta = map.get(url);
      expect(meta).toBeDefined();
      expect(meta?.kind).toBe("model");
      expect(meta?.tags).toEqual(
        expect.arrayContaining(["taxonomy", "model-family"]),
      );
      expect(meta?.aliases).toContain(alias);
    }
  });

  test("loadSearchResultMetaMap includes frontier representative checkpoints", async () => {
    const map = await loadSearchResultMetaMap();

    const qwen2Meta = map.get(QWEN2_URL);
    expect(qwen2Meta).toBeDefined();
    expect(qwen2Meta?.kind).toBe("model");
    expect(qwen2Meta?.aliases).toContain("Qwen 2");

    const qwen25Meta = map.get(QWEN25_URL);
    expect(qwen25Meta).toBeDefined();
    expect(qwen25Meta?.kind).toBe("model");
    expect(qwen25Meta?.aliases).toContain("Qwen 2.5");

    const llama3Meta = map.get(LLAMA_3_URL);
    expect(llama3Meta).toBeDefined();
    expect(llama3Meta?.kind).toBe("model");
    expect(llama3Meta?.aliases).toContain("Meta Llama 3");

    const qwen3Meta = map.get(QWEN3_URL);
    expect(qwen3Meta).toBeDefined();
    expect(qwen3Meta?.kind).toBe("model");
    expect(qwen3Meta?.aliases).toContain("Qwen 3");

    const deepseekR1Meta = map.get(DEEPSEEK_R1_URL);
    expect(deepseekR1Meta).toBeDefined();
    expect(deepseekR1Meta?.kind).toBe("model");
    expect(deepseekR1Meta?.aliases).toContain("DeepSeek R1");

    const deepseekV2Meta = map.get(DEEPSEEK_V2_URL);
    expect(deepseekV2Meta).toBeDefined();
    expect(deepseekV2Meta?.kind).toBe("model");
    expect(deepseekV2Meta?.aliases).toContain("DeepSeek V2");

    const deepseekV3Meta = map.get(DEEPSEEK_V3_URL);
    expect(deepseekV3Meta).toBeDefined();
    expect(deepseekV3Meta?.kind).toBe("model");
    expect(deepseekV3Meta?.aliases).toContain("DeepSeek V3");

    const gptOssMeta = map.get(GPT_OSS_URL);
    expect(gptOssMeta).toBeDefined();
    expect(gptOssMeta?.kind).toBe("model");
    expect(gptOssMeta?.aliases).toContain("GPT-OSS");

    const claudeMeta = map.get(CLAUDE_URL);
    expect(claudeMeta).toBeDefined();
    expect(claudeMeta?.kind).toBe("model");
    expect(claudeMeta?.aliases).toContain("Anthropic Claude");

    const geminiMeta = map.get(GEMINI_URL);
    expect(geminiMeta).toBeDefined();
    expect(geminiMeta?.kind).toBe("model");
    expect(geminiMeta?.aliases).toContain("Google Gemini");
  });

  test("buildSearchResultMetaMap keys by url", () => {
    const map = buildSearchResultMetaMap([]);
    expect(map.size).toBe(0);
  });
});
