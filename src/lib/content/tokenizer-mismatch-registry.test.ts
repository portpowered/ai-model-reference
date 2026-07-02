import { describe, expect, test } from "bun:test";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("tokenizer mismatch registry relationships", () => {
  test("curated related ids keep canonical tokenizer neighbors and planned drafts distinguishable", () => {
    const source = getRegistryRecordById("module.tokenizer-mismatch");
    if (!source) {
      throw new Error("expected module.tokenizer-mismatch in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.tokenizers-overview",
      "module.bpe",
      "module.wordpiece",
      "module.sentencepiece",
      "concept.special-tokens",
      "concept.embedding",
      "model.gpt-3",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/concepts/tokenizers-overview",
      "/docs/modules/bpe",
      "/docs/modules/wordpiece",
      "/docs/modules/sentencepiece",
      "/docs/glossary/special-tokens",
      "/docs/concepts/embedding",
      "/docs/models/gpt-3",
    ]);
    expect(items.map((item) => item.isPlanned)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(
      items.filter((item) => item.isPlanned).map((item) => item.reasonLabel),
    ).toEqual([]);
  });
});
