import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { validateRegistryContent } from "@/lib/content/validate-registry";

describe("tokenizers overview registry", () => {
  test("publishes tokenizers overview as a tokenization concept with stable aliases and relationships", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("concept.tokenizers-overview");

    expect(record?.kind).toBe("concept");
    if (record?.kind !== "concept") {
      throw new Error("expected concept.tokenizers-overview in registry");
    }

    expect(record.slug).toBe("tokenizers-overview");
    expect(record.status).toBe("published");
    expect(record.conceptType).toBe("architecture");
    expect(record.tags).toEqual([
      "tokenization",
      "foundations",
      "token-to-probability-chain",
    ]);
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "tokenizer overview",
        "tokenizers",
        "text tokenization",
      ]),
    );
    expect(record.relatedIds).toEqual([
      "concept.token",
      "concept.transformer-architecture",
      "module.sentencepiece",
      "module.bpe",
      "module.unigram-tokenizer",
      "module.wordpiece",
      "model.gpt-3",
    ]);
    expect(record.explainsIds).toEqual([
      "module.bpe",
      "module.wordpiece",
      "module.sentencepiece",
      "module.unigram-tokenizer",
    ]);
  });

  test("tokenization tag metadata and tag messages exist for landing-page discovery", async () => {
    const indexes = await loadRegistry();
    const tag = indexes.byId.get("tag.tokenization");

    expect(tag?.kind).toBe("tag");
    if (tag?.kind !== "tag") {
      throw new Error("expected tag.tokenization in registry");
    }

    expect(tag.category).toBe("module-type");
    expect(tag.status).toBe("published");
    expect(tag.aliases).toEqual(
      expect.arrayContaining(["tokenizer", "tokenizers", "text tokenization"]),
    );
  });

  test("tokenizer algorithm records preserve the merged tokenizer-family relationships and publish state", async () => {
    const indexes = await loadRegistry();
    const bpe = indexes.byId.get("module.bpe");
    const wordpiece = indexes.byId.get("module.wordpiece");
    const sentencepiece = indexes.byId.get("module.sentencepiece");

    for (const record of [bpe, wordpiece, sentencepiece]) {
      expect(record?.kind).toBe("module");
      if (record?.kind !== "module") {
        throw new Error("expected tokenizer module placeholder in registry");
      }

      expect(record.moduleType).toBe("tokenizer");
      expect(record.tags).toContain("tokenization");
      expect(record.variantGroup).toBe("subword-tokenizers");
    }

    expect(bpe?.status).toBe("published");
    expect(bpe?.relatedIds).toEqual([
      "concept.token",
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "module.wordpiece",
      "module.sentencepiece",
      "model.gpt-3",
    ]);

    expect(wordpiece?.status).toBe("published");
    expect(wordpiece?.relatedIds).toEqual([
      "concept.tokenizers-overview",
      "concept.token",
      "concept.embedding",
      "concept.encoder",
      "module.bidirectional-attention",
      "module.bpe",
      "module.sentencepiece",
    ]);
    expect(wordpiece?.citationIds).toEqual([
      "citation.gnmt-wordpiece",
      "citation.bert-pre-training-of-deep-bidirectional-transformers",
    ]);

    expect(sentencepiece?.status).toBe("published");
    expect(sentencepiece?.relatedIds).toEqual([
      "concept.tokenizers-overview",
      "concept.token",
      "module.bpe",
      "module.unigram-tokenizer",
      "module.wordpiece",
    ]);
  });

  test("curated related items stay navigable for shipped targets across the tokenizer family", async () => {
    const indexes = await loadRegistry();
    const source = indexes.byId.get("concept.tokenizers-overview");
    if (source?.kind !== "concept") {
      throw new Error("expected concept.tokenizers-overview in registry");
    }

    const candidates = [...indexes.byId.values()].filter(
      (record) =>
        record.kind === "concept" ||
        record.kind === "module" ||
        record.kind === "model" ||
        record.kind === "paper" ||
        record.kind === "training-regime" ||
        record.kind === "system" ||
        record.kind === "dataset" ||
        record.kind === "organization",
    );
    const items = deriveCuratedRelatedItems(
      source,
      candidates,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const token = items.find((item) => item.registryId === "concept.token");
    expect(token?.href).toBe("/docs/glossary/token");
    expect(token?.isPlanned).toBe(false);

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);

    const gpt3 = items.find((item) => item.registryId === "model.gpt-3");
    expect(gpt3?.href).toBe("/docs/models/gpt-3");
    expect(gpt3?.isPlanned).toBe(false);

    const bpe = items.find((item) => item.registryId === "module.bpe");
    expect(bpe?.href).toBe("/docs/modules/bpe");
    expect(bpe?.isPlanned).toBe(false);

    const sentencepiece = items.find(
      (item) => item.registryId === "module.sentencepiece",
    );
    expect(sentencepiece?.href).toBe("/docs/modules/sentencepiece");
    expect(sentencepiece?.isPlanned).toBe(false);

    const wordpiece = items.find(
      (item) => item.registryId === "module.wordpiece",
    );
    expect(wordpiece?.href).toBe("/docs/modules/wordpiece");
    expect(wordpiece?.isPlanned).toBe(false);
  });

  test("registry validation passes with tokenizers overview concept and tokenization tag wiring", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });
});
