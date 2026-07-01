import { describe, expect, test } from "bun:test";
import {
  baseRecordSchema,
  citationRecordSchema,
  classificationRecordSchema,
  ontologyRelationshipSchema,
  registryStatusSchema,
  tagRecordSchema,
} from "./registry-core";

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
  sortOrder: 10,
};

describe("registry core contracts", () => {
  test("exposes registry status enum values", () => {
    expect(registryStatusSchema.safeParse("published").success).toBe(true);
    expect(registryStatusSchema.safeParse("invalid").success).toBe(false);
  });

  test("parses a valid base record through the core surface", () => {
    const result = baseRecordSchema.safeParse({
      ...validBaseFields,
      kind: "module",
    });
    expect(result.success).toBe(true);
  });

  test("parses a valid tag record through the core surface", () => {
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

  test("parses a valid citation record through the core surface", () => {
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

  test("parses a valid classification record through the core surface", () => {
    const result = classificationRecordSchema.safeParse({
      ...validBaseFields,
      id: "classification.module.activation",
      slug: "activation-functions",
      kind: "classification",
      classificationType: "family",
      classifiesKinds: ["module"],
      parentClassificationId: "classification.module",
      legacyIds: ["classification.activation-functions"],
    });
    expect(result.success).toBe(true);
  });

  test("parses a valid ontology relationship through the core surface", () => {
    const result = ontologyRelationshipSchema.safeParse({
      relationshipType: "uses",
      targetId: "concept.activation",
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
