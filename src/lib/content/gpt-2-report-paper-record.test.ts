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
  "concept.decoder",
  "module.byte-level-tokenization",
  "concept.transformer-architecture",
  "concept.scaling-law",
]);

function requirePaperRecord() {
  const record = getPaperById("paper.gpt-2-report");
  if (!record) {
    throw new Error("expected paper.gpt-2-report in registry");
  }

  return record;
}

describe("gpt-2 report paper registry record", () => {
  test("loads the canonical paper record with citation-backed metadata", () => {
    const record = requirePaperRecord();

    expect(record.slug).toBe("gpt-2-report");
    expect(record.kind).toBe("paper");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "GPT-2 report",
        "Language Models are Unsupervised Multitask Learners",
        "OpenAI GPT-2 report",
      ]),
    );
    expect(record.citationIds).toEqual(["citation.gpt-2-report"]);
    expect(getRegistryCitationIds(record.id)).toEqual([
      "citation.gpt-2-report",
    ]);
    expect(record.venue).toBe("Technical report");
    expect(record.modelIds).toEqual([]);
  });

  test("links only to adjacent published records that already exist on this branch", () => {
    const record = requirePaperRecord();
    const candidates = listRelatedRegistryRecords();

    expect(record.moduleIds).toEqual(["module.byte-level-tokenization"]);
    expect(record.conceptIds).toEqual([
      "concept.transformer-architecture",
      "concept.scaling-law",
    ]);
    expect(record.supportsIds).toEqual([
      "concept.transformer-architecture",
      "concept.scaling-law",
    ]);

    const introduced = deriveIntroducedRecordItems(
      record,
      candidates,
      publishedRegistryIds,
    );
    expect(introduced.map((item) => item.registryId)).toEqual([
      "module.byte-level-tokenization",
      "concept.transformer-architecture",
      "concept.scaling-law",
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
      "concept.decoder",
      "module.byte-level-tokenization",
      "concept.transformer-architecture",
      "concept.scaling-law",
    ]);
  });
});
