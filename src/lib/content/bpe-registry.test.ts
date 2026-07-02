import { describe, expect, test } from "bun:test";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listModuleRecords,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";

describe("bpe registry relationships", () => {
  test("keeps one canonical module.bpe record with tokenizer discovery aliases", () => {
    const bpeModules = listModuleRecords().filter(
      (record) => record.id === "module.bpe" || record.slug === "bpe",
    );

    expect(bpeModules).toHaveLength(1);
    expect(bpeModules[0]?.id).toBe("module.bpe");
    expect(bpeModules[0]?.aliases).toEqual(
      expect.arrayContaining([
        "BPE",
        "byte pair encoding",
        "byte-pair encoding",
        "subword tokenizer",
      ]),
    );
  });

  test("curated related ids preserve published routes and draft tokenizer neighbors", () => {
    const source = getRegistryRecordById("module.bpe");
    if (!source) {
      throw new Error("expected module.bpe in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "module.wordpiece",
      "module.sentencepiece",
      "model.gpt-3",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      undefined,
      undefined,
      undefined,
      "/docs/models/gpt-3",
    ]);
    expect(items.map((item) => item.isPlanned)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
    expect(items.slice(1, 4).map((item) => item.reasonLabel)).toEqual([
      PLANNED_RELATED_REASON_LABEL,
      PLANNED_RELATED_REASON_LABEL,
      PLANNED_RELATED_REASON_LABEL,
    ]);
  });
});
