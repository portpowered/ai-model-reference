import { describe, expect, test } from "bun:test";
import { loadRegistry } from "@/lib/content/registry";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";

describe("byte-level tokenization registry identity (byte-level-tokenization-page-004)", () => {
  test("keeps a single canonical module.byte-level-tokenization record", async () => {
    const indexes = await loadRegistry();
    const matches = [...indexes.byId.values()].filter(
      (record) =>
        record.id === "module.byte-level-tokenization" ||
        record.slug === "byte-level-tokenization",
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe("module.byte-level-tokenization");
    expect(indexes.bySlug.get("byte-level-tokenization")?.id).toBe(
      "module.byte-level-tokenization",
    );
  });

  test("published registry record carries discovery aliases and tokenizer metadata", () => {
    const record = getRegistryRecordById("module.byte-level-tokenization");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error(
        "expected module.byte-level-tokenization in registry runtime",
      );
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "byte-level tokenization",
        "byte tokenizer",
        "byte level BPE",
        "why bytes not words",
      ]),
    );
    expect(record.tags).toEqual(["tokenization"]);
    expect(record.citationIds).toEqual(["citation.gpt-2-report"]);
    expect(record.relatedIds).toEqual([
      "paper.gpt-2-report",
      "concept.token",
      "concept.tokenizers-overview",
      "module.bpe",
      "concept.vocabulary-size",
      "model.gpt-3",
    ]);
    expect(record.usedByModelIds).toContain("model.gpt-3");
  });

  test("curated related ids preserve published routes and planned tokenizer neighbors", () => {
    const source = getRegistryRecordById("module.byte-level-tokenization");
    if (!source) {
      throw new Error(
        "expected module.byte-level-tokenization in registry runtime",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "paper.gpt-2-report",
      "concept.token",
      "concept.tokenizers-overview",
      "module.bpe",
      "concept.vocabulary-size",
      "model.gpt-3",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/papers/gpt-2-report",
      "/docs/glossary/token",
      "/docs/concepts/tokenizers-overview",
      "/docs/modules/bpe",
      "/docs/glossary/vocabulary-size",
      "/docs/models/gpt-3",
    ]);
    expect(items.map((item) => item.isPlanned)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
