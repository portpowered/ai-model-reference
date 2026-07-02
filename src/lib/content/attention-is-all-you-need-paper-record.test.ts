import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getPaperById,
  getRegistryCitationIds,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  deriveIntroducedRecordItems,
} from "@/lib/content/related-docs";

function requirePaperRecord() {
  const record = getPaperById("paper.attention-is-all-you-need");
  if (!record) {
    throw new Error("expected paper.attention-is-all-you-need in registry");
  }

  return record;
}

describe("attention is all you need paper registry record", () => {
  test("loads the canonical paper record with citation-backed metadata", () => {
    const record = requirePaperRecord();

    expect(record.slug).toBe("attention-is-all-you-need");
    expect(record.kind).toBe("paper");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "Attention Is All You Need",
        "Transformer paper",
        "Vaswani transformer paper",
      ]),
    );
    expect(record.citationIds).toEqual(["citation.attention-is-all-you-need"]);
    expect(getRegistryCitationIds(record.id)).toEqual([
      "citation.attention-is-all-you-need",
    ]);
    expect(record.venue).toBe("NeurIPS 2017");
    expect(record.publishedAt).toBe("2017-06-12");
    expect(record.url).toBe("https://arxiv.org/abs/1706.03762");
    expect(record.modelIds).toEqual([]);
  });

  test("links introduced and related transformer records that already resolve on this branch", () => {
    const record = requirePaperRecord();
    const candidates = listRelatedRegistryRecords();

    expect(record.moduleIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.feed-forward-network",
    ]);
    expect(record.conceptIds).toEqual([
      "concept.transformer",
      "concept.positional-encodings",
      "concept.encoder",
      "concept.decoder",
      "concept.residual-connection",
      "concept.skip-connection",
    ]);

    const introduced = deriveIntroducedRecordItems(
      record,
      candidates,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(introduced.map((item) => item.registryId)).toEqual([
      "concept.transformer",
      "module.attention",
      "module.multi-head-attention",
      "concept.positional-encodings",
      "module.feed-forward-network",
      "concept.encoder",
      "concept.decoder",
      "concept.residual-connection",
      "concept.skip-connection",
    ]);
    expect(introduced.every((item) => item.href?.startsWith("/docs/"))).toBe(
      true,
    );

    const curated = deriveCuratedRelatedItems(
      record,
      candidates,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(curated.map((item) => item.registryId)).toEqual(
      introduced.map((item) => item.registryId),
    );
  });
});
