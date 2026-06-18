import { describe, expect, test } from "bun:test";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { getConceptById, getModuleById } from "@/lib/content/registry-runtime";

describe("buildPageReleaseMetadata", () => {
  test("uses explicit module release metadata and source link", () => {
    const record = getModuleById("module.grouped-query-attention");
    const metadata = buildPageReleaseMetadata(record);

    expect(metadata).not.toBeNull();
    expect(metadata?.dateLabel).toBe("Released");
    expect(metadata?.releaseDate).toBe("2023-05-01");
    expect(metadata?.authors[0]).toBe("Joshua Ainslie");
    expect(metadata?.source).toEqual({
      title:
        "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
      url: "https://arxiv.org/abs/2305.13245",
    });
  });

  test("uses explicit unigram tokenizer release metadata and SentencePiece source link", () => {
    const record = getModuleById("module.unigram-tokenizer");
    const metadata = buildPageReleaseMetadata(record);

    expect(metadata).not.toBeNull();
    expect(metadata?.dateLabel).toBe("Released");
    expect(metadata?.releaseDate).toBe("2018-08-19");
    expect(metadata?.authors).toEqual(["Taku Kudo", "John Richardson"]);
    expect(metadata?.source).toEqual({
      title:
        "SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing",
      url: "https://arxiv.org/abs/1808.06226",
    });
  });

  test("does not infer release metadata for records without explicit fields", () => {
    const record = getConceptById("concept.token");
    const metadata = buildPageReleaseMetadata(record);

    expect(metadata).toBeNull();
  });
});
