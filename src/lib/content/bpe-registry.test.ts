import { describe, expect, test } from "bun:test";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";

describe("bpe registry relationships", () => {
  test("curated related ids preserve published routes and tokenizer-family neighbors", () => {
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
      undefined,
      "/docs/modules/wordpiece",
      "/docs/modules/sentencepiece",
      "/docs/models/gpt-3",
    ]);
    expect(items.map((item) => item.isPlanned)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(items.slice(2, 5).map((item) => item.reasonLabel)).toEqual([
      PLANNED_RELATED_REASON_LABEL,
      "curated",
      "curated",
      "curated",
    ]);
  });
});
