import { z } from "zod";

export const registryKindSchema = z.enum([
  "model",
  "module",
  "concept",
  "paper",
  "training-regime",
  "dataset",
  "hardware",
  "organization",
  "citation",
  "tag",
  "graph",
]);

export const registryStatusSchema = z.enum(["draft", "published", "archived"]);

const baseRecordShape = {
  id: z.string().min(1),
  slug: z.string().min(1),
  defaultTitleKey: z.string().min(1),
  defaultSummaryKey: z.string().min(1),
  aliases: z.array(z.string()),
  tags: z.array(z.string()),
  relatedIds: z.array(z.string()),
  citationIds: z.array(z.string()),
  status: registryStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
};

export const baseRecordSchema = z.object({
  ...baseRecordShape,
  kind: registryKindSchema,
});

export const moduleTypeSchema = z.enum([
  "attention",
  "normalization",
  "feed-forward",
  "activation",
  "position-encoding",
  "tokenizer",
  "optimizer",
  "quantization",
  "inference-optimization",
  "training-method",
  "systems",
  "other",
]);

export const mathLevelSchema = z.enum(["none", "light", "detailed"]);

export const moduleRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("module"),
  moduleType: moduleTypeSchema,
  optimizes: z.array(z.string()),
  practicalBenefits: z.array(z.string()),
  exampleModelIds: z.array(z.string()),
  improvesOnIds: z.array(z.string()),
  tradeoffIds: z.array(z.string()),
  usedByModelIds: z.array(z.string()),
  introducedByPaperIds: z.array(z.string()),
  mathLevel: mathLevelSchema,
  moduleFamily: z.string().optional(),
  conceptType: z.string().optional(),
  variantGroup: z.string().optional(),
  variantOf: z.string().optional(),
});

export const tagCategorySchema = z.enum([
  "architecture",
  "module-type",
  "training",
  "inference",
  "systems",
  "modality",
  "paper-topic",
  "model-family",
  "difficulty",
]);

export const tagLandingPageSchema = z.enum([
  "search",
  "generated-tag-page",
  "custom-doc-page",
]);

export const tagRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("tag"),
  category: tagCategorySchema,
  landingPage: tagLandingPageSchema,
  parentTagId: z.string().optional(),
  searchBoost: z.number().optional(),
  customPageId: z.string().optional(),
});

export const citationTypeSchema = z.enum([
  "paper",
  "blog",
  "documentation",
  "repository",
  "dataset",
  "other",
]);

export const citationRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("citation"),
  citationType: citationTypeSchema,
  authors: z.array(z.string()).min(1),
  title: z.string().min(1),
  url: z.string().url(),
  mla: z.string().min(1),
  year: z.number().int().optional(),
  accessedAt: z.string().optional(),
});

export type RegistryKind = z.infer<typeof registryKindSchema>;
export type RegistryStatus = z.infer<typeof registryStatusSchema>;
export type BaseRecord = z.infer<typeof baseRecordSchema>;
export type ModuleRecord = z.infer<typeof moduleRecordSchema>;
export type TagRecord = z.infer<typeof tagRecordSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
