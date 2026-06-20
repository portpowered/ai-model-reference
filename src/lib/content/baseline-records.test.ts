import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry } from "./registry";
import {
  citationRecordSchema,
  conceptRecordSchema,
  moduleRecordSchema,
  tagRecordSchema,
  trainingRegimeRecordSchema,
} from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

async function readRegistryJson<T>(
  relativePath: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Promise<T> {
  const raw = await readFile(join(registryRoot, relativePath), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  expect(parsed.success).toBe(true);
  return parsed.data as T;
}

describe("Phase 1 baseline registry records", () => {
  test("multi-head-latent-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/multi-head-latent-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.multi-head-latent-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.tags).toContain("kv-cache");
    expect(module.variantGroup).toBe("attention-head-sharing");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.citationIds).toContain("citation.deepseek-v2-mla-paper");
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
  });

  test("linear-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/linear-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.linear-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.variantGroup).toBe("subquadratic-attention");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.citationIds).toContain(
      "citation.katharopoulos-linear-attention-paper",
    );
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
  });

  test("sliding-window-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/sliding-window-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.sliding-window-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.tags).toContain("context-window");
    expect(module.variantGroup).toBe("attention-locality");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
  });

  test("sparse-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/sparse-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.sparse-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.variantGroup).toBe("sparse-patterns");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
  });

  test("grouped-query-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/grouped-query-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.grouped-query-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.tags).toContain("kv-cache");
    expect(module.variantGroup).toBe("attention-head-sharing");
    expect(module.citationIds).toContain("citation.gqa-paper");
    expect(module.optimizes.length).toBeGreaterThan(0);
  });

  test("byte-level-tokenization module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/byte-level-tokenization.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.byte-level-tokenization");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("tokenizer");
    expect(module.moduleFamily).toBe("tokenization");
    expect(module.tags).toEqual(["tokenization"]);
    expect(module.aliases).toEqual(
      expect.arrayContaining([
        "byte-level tokenization",
        "byte level tokenization",
        "byte-level tokenizer",
        "byte tokenizer",
        "byte-level BPE",
      ]),
    );
    expect(module.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.token",
        "concept.tokenizers-overview",
        "module.bpe",
        "concept.vocabulary-size",
        "model.gpt-3",
      ]),
    );
    expect(module.citationIds).toContain("citation.gpt-2-report");
    expect(module.usedByModelIds).toContain("model.gpt-3");
    expect(module.exampleModelIds).toContain("model.gpt-3");
    expect(module.optimizes).toEqual(
      expect.arrayContaining([
        "arbitrary-text-coverage",
        "open-vocabulary-text",
      ]),
    );
  });

  test("bidirectional-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/bidirectional-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.bidirectional-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toEqual(["attention"]);
    expect(module.aliases).toEqual(
      expect.arrayContaining([
        "bidirectional attention",
        "bidirectional self-attention",
        "bert attention",
        "full-context attention",
        "full context attention",
      ]),
    );
    expect(module.variantGroup).toBe("attention-mask-patterns");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.relatedIds).toEqual([
      "module.attention",
      "concept.autoregressive-generation",
      "concept.encoder",
      "concept.transformer-architecture",
      "concept.encoder-decoder",
    ]);
    expect(module.citationIds).toContain("citation.attention-is-all-you-need");
    expect(module.optimizes.length).toBeGreaterThan(0);
  });

  test("attention tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson("tags/attention.json", tagRecordSchema);

    expect(tag.id).toBe("tag.attention");
    expect(tag.kind).toBe("tag");
    expect(tag.category).toBe("module-type");
    expect(tag.aliases.length).toBeGreaterThan(0);
  });

  test("alignment tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson("tags/alignment.json", tagRecordSchema);

    expect(tag.id).toBe("tag.alignment");
    expect(tag.kind).toBe("tag");
    expect(tag.category).toBe("training");
    expect(tag.parentTagId).toBe("tag.foundations");
    expect(tag.relatedIds).toContain("concept.alignment");
  });

  test("bpe module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/bpe.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.bpe");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("tokenizer");
    expect(module.moduleFamily).toBe("tokenization");
    expect(module.tags).toContain("tokenization");
    expect(module.aliases).toEqual(
      expect.arrayContaining([
        "BPE",
        "byte pair encoding",
        "byte-pair encoding",
      ]),
    );
    expect(module.relatedIds).toContain("concept.token");
    expect(module.relatedIds).toContain("concept.tokenizers-overview");
    expect(module.relatedIds).toContain("module.wordpiece");
    expect(module.relatedIds).toContain("module.sentencepiece");
    expect(module.relatedIds).toContain("model.gpt-3");
    expect(module.exampleModelIds).toContain("model.gpt-3");
    expect(module.usedByModelIds).toContain("model.gpt-3");
    expect(module.citationIds).toContain("citation.sennrich-bpe");
  });

  test("tokenizers overview concept JSON passes conceptRecordSchema", async () => {
    const concept = await readRegistryJson(
      "concepts/tokenizers-overview.json",
      conceptRecordSchema,
    );

    expect(concept.id).toBe("concept.tokenizers-overview");
    expect(concept.kind).toBe("concept");
    expect(concept.status).toBe("published");
    expect(concept.conceptType).toBe("architecture");
    expect(concept.tags).toContain("tokenization");
    expect(concept.prerequisiteIds).toContain("concept.token");
    expect(concept.relatedIds).toContain("concept.transformer-architecture");
    expect(concept.explainsIds).toEqual([]);
  });

  test("wordpiece module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/wordpiece.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.wordpiece");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("draft");
    expect(module.moduleType).toBe("tokenizer");
    expect(module.moduleFamily).toBe("tokenization");
    expect(module.variantGroup).toBe("subword-tokenizers");
    expect(module.relatedIds).toContain("module.bpe");
    expect(module.relatedIds).toContain("module.sentencepiece");
  });

  test("sentencepiece module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/sentencepiece.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.sentencepiece");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("tokenizer");
    expect(module.moduleFamily).toBe("tokenization");
    expect(module.variantGroup).toBe("subword-tokenizers");
    expect(module.relatedIds).toContain("module.bpe");
    expect(module.relatedIds).toContain("module.wordpiece");
    expect(module.citationIds).toContain("citation.kudo-sentencepiece");
  });

  test("token concept JSON passes conceptRecordSchema", async () => {
    const concept = await readRegistryJson(
      "concepts/token.json",
      conceptRecordSchema,
    );

    expect(concept.id).toBe("concept.token");
    expect(concept.kind).toBe("concept");
    expect(concept.conceptType).toBe("architecture");
    expect(concept.tags).toContain("attention");
    expect(concept.status).toBe("published");
  });

  test("kv-cache tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson("tags/kv-cache.json", tagRecordSchema);

    expect(tag.id).toBe("tag.kv-cache");
    expect(tag.slug).toBe("kv-cache");
    expect(tag.parentTagId).toBe("tag.attention");
  });

  test("tokenization tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson(
      "tags/tokenization.json",
      tagRecordSchema,
    );

    expect(tag.id).toBe("tag.tokenization");
    expect(tag.slug).toBe("tokenization");
    expect(tag.kind).toBe("tag");
    expect(tag.category).toBe("module-type");
    expect(tag.aliases).toEqual(
      expect.arrayContaining([
        "tokenizer",
        "tokenizers",
        "subword tokenization",
      ]),
    );
  });

  test("gqa-paper citation JSON passes citationRecordSchema", async () => {
    const citation = await readRegistryJson(
      "citations/gqa-paper.json",
      citationRecordSchema,
    );

    expect(citation.id).toBe("citation.gqa-paper");
    expect(citation.kind).toBe("citation");
    expect(citation.status).toBe("published");
    expect(citation.authors.length).toBeGreaterThan(0);
    expect(citation.title.length).toBeGreaterThan(0);
    expect(citation.url).toMatch(/^https:\/\//);
    expect(citation.mla.length).toBeGreaterThan(0);
  });

  test("dpo citation JSON passes citationRecordSchema", async () => {
    const citation = await readRegistryJson(
      "citations/direct-preference-optimization.json",
      citationRecordSchema,
    );

    expect(citation.id).toBe("citation.direct-preference-optimization");
    expect(citation.title).toContain("Direct Preference Optimization");
    expect(citation.authors).toContain("Rafael Rafailov");
    expect(citation.url).toBe("https://arxiv.org/abs/2305.18290");
  });

  test("dpo training regime JSON passes trainingRegimeRecordSchema", async () => {
    const regime = await readRegistryJson(
      "training-regimes/dpo.json",
      trainingRegimeRecordSchema,
    );

    expect(regime.id).toBe("training-regime.dpo");
    expect(regime.slug).toBe("dpo");
    expect(regime.regimeType).toBe("alignment");
    expect(regime.tags).toEqual(expect.arrayContaining(["alignment"]));
    expect(regime.aliases).toEqual(
      expect.arrayContaining(["DPO", "Direct Preference Optimization"]),
    );
    expect(regime.citationIds).toContain(
      "citation.direct-preference-optimization",
    );
    expect(regime.relatedIds).toContain("concept.alignment");
    expect(regime.sidebarGrouping?.training).toBe("alignment");
  });

  test("gpt-2-report citation JSON passes citationRecordSchema", async () => {
    const citation = await readRegistryJson(
      "citations/gpt-2-report.json",
      citationRecordSchema,
    );

    expect(citation.id).toBe("citation.gpt-2-report");
    expect(citation.kind).toBe("citation");
    expect(citation.status).toBe("published");
    expect(citation.authors).toEqual(
      expect.arrayContaining(["Alec Radford", "Ilya Sutskever"]),
    );
    expect(citation.url).toContain("openai.com");
    expect(citation.year).toBe(2019);
  });

  test("sennrich-bpe citation JSON passes citationRecordSchema", async () => {
    const citation = await readRegistryJson(
      "citations/sennrich-bpe.json",
      citationRecordSchema,
    );

    expect(citation.id).toBe("citation.sennrich-bpe");
    expect(citation.kind).toBe("citation");
    expect(citation.status).toBe("published");
    expect(citation.authors).toEqual([
      "Rico Sennrich",
      "Barry Haddow",
      "Alexandra Birch",
    ]);
    expect(citation.title).toBe(
      "Neural Machine Translation of Rare Words with Subword Units",
    );
    expect(citation.url).toBe("https://arxiv.org/abs/1508.07909");
  });

  test("Phase 1 starter records cross-reference via loadRegistry", async () => {
    const indexes = await loadRegistry();

    const module = indexes.byId.get("module.grouped-query-attention");
    expect(module?.kind).toBe("module");

    const byteLevelTokenization = indexes.byId.get(
      "module.byte-level-tokenization",
    );
    expect(byteLevelTokenization?.kind).toBe("module");
    expect(indexes.bySlug.get("byte-level-tokenization")?.id).toBe(
      "module.byte-level-tokenization",
    );

    const concept = indexes.byId.get("concept.token");
    expect(concept?.kind).toBe("concept");
    expect(indexes.bySlug.get("token")?.id).toBe("concept.token");
    expect(indexes.byId.get("module.bpe")?.kind).toBe("module");
    expect(indexes.bySlug.get("bpe")?.id).toBe("module.bpe");

    for (const tagRef of module?.tags ?? []) {
      expect(resolveTag(indexes, tagRef)).toBeDefined();
    }
    for (const citationId of module?.citationIds ?? []) {
      expect(indexes.byId.get(citationId)?.kind).toBe("citation");
    }
    for (const tagRef of concept?.tags ?? []) {
      expect(resolveTag(indexes, tagRef)).toBeDefined();
    }
    expect(resolveTag(indexes, "tokenization")?.id).toBe("tag.tokenization");

    for (const tagRef of byteLevelTokenization?.tags ?? []) {
      expect(resolveTag(indexes, tagRef)).toBeDefined();
    }
    for (const relatedId of byteLevelTokenization?.relatedIds ?? []) {
      expect(indexes.byId.get(relatedId)).toBeDefined();
    }
    for (const citationId of byteLevelTokenization?.citationIds ?? []) {
      expect(indexes.byId.get(citationId)?.kind).toBe("citation");
    }
  });
});

function resolveTag(
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  tagRef: string,
): { id: string } | undefined {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return bySlug;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  const byId = indexes.byId.get(tagId);
  if (byId?.kind === "tag") {
    return byId;
  }
  return indexes.tagsBySlug.get(tagRef);
}
