import { describe, expect, test } from "bun:test";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listModuleRecords,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

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

  test("curated related ids preserve published routes across tokenizer neighbors", () => {
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
      "concept.special-tokens",
      "concept.tokenizers-overview",
      "module.wordpiece",
      "module.sentencepiece",
      "model.gpt-3",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/glossary/special-tokens",
      "/docs/concepts/tokenizers-overview",
      "/docs/modules/wordpiece",
      "/docs/modules/sentencepiece",
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
    expect(items[2]?.reasonLabel).toBe("curated");
    expect(items[3]?.reasonLabel).toBe("curated");
    expect(items[4]?.reasonLabel).toBe("curated");
  });
});
