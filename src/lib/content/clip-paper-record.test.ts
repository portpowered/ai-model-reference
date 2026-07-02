import { describe, expect, test } from "bun:test";
import {
  getPaperById,
  getRegistryCitationIds,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  deriveIntroducedRecordItems,
} from "@/lib/content/related-docs";

const publishedRegistryIds = new Set([
  "module.clip-image-tokenization",
  "concept.multimodal-model",
  "concept.modality",
  "concept.representation",
  "concept.embedding",
  "concept.conditioning",
  "concept.diffusion-model",
]);

function requirePaperRecord() {
  const record = getPaperById(
    "paper.learning-transferable-visual-models-from-natural-language-supervision",
  );
  if (!record) {
    throw new Error(
      "expected paper.learning-transferable-visual-models-from-natural-language-supervision in registry",
    );
  }

  return record;
}

describe("CLIP paper registry record", () => {
  test("loads the canonical paper record with citation-backed metadata", () => {
    const record = requirePaperRecord();

    expect(record.slug).toBe(
      "learning-transferable-visual-models-from-natural-language-supervision",
    );
    expect(record.kind).toBe("paper");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "CLIP",
        "CLIP paper",
        "Learning Transferable Visual Models From Natural Language Supervision",
      ]),
    );
    expect(record.citationIds).toEqual([
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
    ]);
    expect(getRegistryCitationIds(record.id)).toEqual([
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
    ]);
    expect(record.venue).toBe("arXiv");
    expect(record.arxivId).toBe("2103.00020");
    expect(record.modelIds).toEqual([]);
  });

  test("links only to adjacent published records that already exist on this branch", () => {
    const record = requirePaperRecord();
    const candidates = listRelatedRegistryRecords();

    expect(record.moduleIds).toEqual(["module.clip-image-tokenization"]);
    expect(record.conceptIds).toEqual([
      "concept.multimodal-model",
      "concept.modality",
      "concept.representation",
      "concept.embedding",
      "concept.conditioning",
      "concept.diffusion-model",
    ]);
    expect(record.supportsIds).toEqual([
      "concept.multimodal-model",
      "concept.modality",
      "concept.representation",
      "concept.embedding",
    ]);

    const introduced = deriveIntroducedRecordItems(
      record,
      candidates,
      publishedRegistryIds,
    );
    expect(introduced.map((item) => item.registryId)).toEqual([
      "module.clip-image-tokenization",
      "concept.multimodal-model",
      "concept.modality",
      "concept.representation",
      "concept.embedding",
      "concept.conditioning",
      "concept.diffusion-model",
    ]);
    expect(introduced.every((item) => item.href?.startsWith("/docs/"))).toBe(
      true,
    );

    const curated = deriveCuratedRelatedItems(
      record,
      candidates,
      publishedRegistryIds,
    );
    expect(curated.map((item) => item.registryId)).toEqual([
      "concept.multimodal-model",
      "concept.modality",
      "concept.representation",
      "module.clip-image-tokenization",
      "concept.embedding",
      "concept.conditioning",
      "concept.diffusion-model",
    ]);
  });
});
