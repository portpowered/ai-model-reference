import { describe, expect, test } from "bun:test";
import { loadRegistry } from "@/lib/content/registry";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

const TOKENIZER_CLASSIFICATION_ID = "classification.module.tokenization";

describe("multimodal tokenization registry identity (multimodal-tokenization-module-page-002)", () => {
  test("keeps a single canonical module.multimodal-tokenization record", async () => {
    const indexes = await loadRegistry();
    const matches = [...indexes.byId.values()].filter(
      (record) =>
        record.id === "module.multimodal-tokenization" ||
        record.slug === "multimodal-tokenization",
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe("module.multimodal-tokenization");
    expect(indexes.bySlug.get("multimodal-tokenization")?.id).toBe(
      "module.multimodal-tokenization",
    );
  });

  test("published registry record carries discovery aliases and tokenizer metadata", () => {
    const record = getRegistryRecordById("module.multimodal-tokenization");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error(
        "expected module.multimodal-tokenization in registry runtime",
      );
    }

    expect(record.status).toBe("published");
    expect(record.moduleType).toBe("tokenizer");
    expect(record.moduleFamily).toBe("tokenization");
    expect(record.primaryClassificationId).toBe(TOKENIZER_CLASSIFICATION_ID);
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "multimodal tokenization",
        "multimodal tokenizer",
        "image tokenization",
        "audio tokenization",
        "video tokenization",
        "modality adapter",
        "token-like embeddings",
        "omni tokenization",
      ]),
    );
    expect(record.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations", "taxonomy"]),
    );
    expect(record.citationIds).toEqual(
      expect.arrayContaining([
        "citation.learning-transferable-visual-models-from-natural-language-supervision",
        "citation.image-is-worth-16x16-words",
        "citation.flamingo-visual-language-model",
      ]),
    );
    expect(record.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.token",
        "concept.tokenizers-overview",
        "concept.visual-tokenization",
        "concept.multimodal-model",
        "concept.modality",
        "module.clip-image-tokenization",
        "module.cross-attention",
        "model.clip",
      ]),
    );
    expect(record.exampleModelIds).toContain("model.clip");
  });

  test("curated related ids preserve published routes for available neighbors", () => {
    const source = getRegistryRecordById("module.multimodal-tokenization");
    if (!source) {
      throw new Error(
        "expected module.multimodal-tokenization in registry runtime",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "concept.visual-tokenization",
      "concept.multimodal-model",
      "concept.modality",
      "module.clip-image-tokenization",
      "module.cross-attention",
      "model.clip",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/concepts/tokenizers-overview",
      "/docs/concepts/visual-tokenization",
      "/docs/glossary/multimodal-model",
      "/docs/glossary/modality",
      "/docs/modules/clip-image-tokenization",
      "/docs/modules/cross-attention",
      "/docs/models/clip",
    ]);
    expect(items.every((item) => item.isPlanned === false)).toBe(true);
  });
});
