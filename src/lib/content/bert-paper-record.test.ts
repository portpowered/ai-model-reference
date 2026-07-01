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
  "module.bidirectional-attention",
  "module.wordpiece",
  "module.gelu",
  "concept.encoder",
  "concept.embedding",
  "concept.transformer",
  "concept.transformer-architecture",
  "training-regime.pretraining",
]);

function requirePaperRecord() {
  const record = getPaperById(
    "paper.bert-pre-training-of-deep-bidirectional-transformers",
  );
  if (!record) {
    throw new Error(
      "expected paper.bert-pre-training-of-deep-bidirectional-transformers in registry",
    );
  }

  return record;
}

describe("bert paper registry record", () => {
  test("loads the canonical paper record with citation-backed metadata", () => {
    const record = requirePaperRecord();

    expect(record.slug).toBe(
      "bert-pre-training-of-deep-bidirectional-transformers",
    );
    expect(record.kind).toBe("paper");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "BERT",
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        "Pre-training of Deep Bidirectional Transformers for Language Understanding",
      ]),
    );
    expect(record.citationIds).toEqual([
      "citation.bert-pre-training-of-deep-bidirectional-transformers",
    ]);
    expect(getRegistryCitationIds(record.id)).toEqual([
      "citation.bert-pre-training-of-deep-bidirectional-transformers",
    ]);
    expect(record.venue).toBe("arXiv");
    expect(record.arxivId).toBe("1810.04805");
    expect(record.modelIds).toEqual([]);
  });

  test("links only to adjacent published records that already exist on this branch", () => {
    const record = requirePaperRecord();
    const candidates = listRelatedRegistryRecords();

    expect(record.moduleIds).toEqual([
      "module.bidirectional-attention",
      "module.wordpiece",
      "module.gelu",
    ]);
    expect(record.conceptIds).toEqual([
      "concept.encoder",
      "concept.embedding",
      "concept.transformer-architecture",
    ]);
    expect(record.supportsIds).toEqual([
      "concept.encoder",
      "concept.embedding",
      "concept.transformer-architecture",
      "training-regime.pretraining",
    ]);
    expect(record.relatedIds).toEqual(
      expect.arrayContaining([
        "module.bidirectional-attention",
        "module.wordpiece",
        "module.gelu",
        "concept.encoder",
        "concept.embedding",
        "concept.transformer",
        "concept.transformer-architecture",
        "training-regime.pretraining",
      ]),
    );

    const introduced = deriveIntroducedRecordItems(
      record,
      candidates,
      publishedRegistryIds,
    );
    expect(introduced.map((item) => item.registryId)).toEqual([
      "module.bidirectional-attention",
      "module.wordpiece",
      "module.gelu",
      "concept.encoder",
      "concept.embedding",
      "concept.transformer-architecture",
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
      "module.bidirectional-attention",
      "module.wordpiece",
      "module.gelu",
      "concept.encoder",
      "concept.embedding",
      "concept.transformer",
      "concept.transformer-architecture",
      "training-regime.pretraining",
    ]);
  });
});
