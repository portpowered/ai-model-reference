import { describe, expect, test } from "bun:test";
import {
  baseRecordSchema,
  citationRecordSchema,
  moduleRecordSchema,
  tagRecordSchema,
} from "./schemas";

const validBaseFields = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: ["citation.gqa-paper"],
  status: "published" as const,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

describe("registry schemas", () => {
  test("accepts a valid module record", () => {
    const result = moduleRecordSchema.safeParse({
      ...validBaseFields,
      kind: "module",
      moduleType: "attention",
      optimizes: ["kv-cache"],
      practicalBenefits: ["lower memory"],
      exampleModelIds: [],
      improvesOnIds: [],
      tradeoffIds: [],
      usedByModelIds: [],
      introducedByPaperIds: [],
      mathLevel: "light",
    });
    expect(result.success).toBe(true);
  });

  test("accepts a valid tag record", () => {
    const result = tagRecordSchema.safeParse({
      ...validBaseFields,
      id: "tag.attention",
      slug: "attention",
      kind: "tag",
      category: "module-type",
      landingPage: "generated-tag-page",
    });
    expect(result.success).toBe(true);
  });

  test("accepts a valid citation record", () => {
    const result = citationRecordSchema.safeParse({
      ...validBaseFields,
      id: "citation.gqa-paper",
      slug: "gqa-paper",
      kind: "citation",
      citationType: "paper",
      authors: ["Ainslie et al."],
      title: "GQA: Training Generalized Multi-Query Transformer Models",
      url: "https://arxiv.org/abs/2305.13245",
      mla: 'Ainslie, Joshua, et al. "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints." arXiv, 2023.',
      year: 2023,
    });
    expect(result.success).toBe(true);
  });

  test("rejects base records missing required fields", () => {
    const result = baseRecordSchema.safeParse({
      id: "module.incomplete",
      kind: "module",
    });
    expect(result.success).toBe(false);
  });

  test("rejects module records missing moduleType and related arrays", () => {
    const result = moduleRecordSchema.safeParse({
      ...validBaseFields,
      kind: "module",
      optimizes: ["kv-cache"],
      practicalBenefits: ["lower memory"],
      mathLevel: "none",
    });
    expect(result.success).toBe(false);
  });

  test("rejects tag records missing category and landingPage", () => {
    const result = tagRecordSchema.safeParse({
      ...validBaseFields,
      id: "tag.attention",
      slug: "attention",
      kind: "tag",
    });
    expect(result.success).toBe(false);
  });

  test("rejects citation records missing authors, title, url, or mla", () => {
    const result = citationRecordSchema.safeParse({
      ...validBaseFields,
      id: "citation.gqa-paper",
      slug: "gqa-paper",
      kind: "citation",
      citationType: "paper",
      authors: [],
      title: "",
      url: "not-a-url",
      mla: "",
    });
    expect(result.success).toBe(false);
  });
});
