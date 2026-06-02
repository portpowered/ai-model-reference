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

export const pageKindSchema = z.enum([
  "concept",
  "model",
  "module",
  "paper",
  "training-regime",
  "system",
  "glossary",
]);

export const pageFrontmatterSchema = z.object({
  kind: pageKindSchema,
  registryId: z.string().min(1),
  messageNamespace: z.union([z.literal("local"), z.string().min(1)]),
  assetNamespace: z.union([z.literal("local"), z.string().min(1)]),
  tags: z.array(z.string()),
  status: registryStatusSchema,
  updatedAt: z.string().min(1),
  aliases: z.array(z.string()).optional(),
});

const pageSectionSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

const pageCalloutSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
});

const pageAssetMessageSchema = z.object({
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const pageMessagesSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  problemStatement: z.string().optional(),
  coreIdea: z.string().optional(),
  sections: z.record(z.string(), pageSectionSchema).optional(),
  callouts: z.record(z.string(), pageCalloutSchema).optional(),
  assets: z.record(z.string(), pageAssetMessageSchema).optional(),
});

export const graphWebRendererSchema = z.literal("react-flow");

export const graphPrintRendererSchema = z.enum([
  "vertical-svg",
  "mermaid",
  "image",
]);

const pageImageAssetSchema = z.object({
  type: z.literal("image"),
  src: z.string().min(1),
  altKey: z.string().min(1),
  captionKey: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

const pageGraphAssetSchema = z.object({
  type: z.literal("graph"),
  graphId: z.string().min(1),
  webRenderer: graphWebRendererSchema,
  printRenderer: graphPrintRendererSchema,
  printFallbackAssetId: z.string().optional(),
  altKey: z.string().optional(),
  captionKey: z.string().optional(),
});

const pageChartAssetSchema = z.object({
  type: z.literal("chart"),
  chartId: z.string().min(1),
  altKey: z.string().optional(),
  captionKey: z.string().optional(),
});

const pageTableAssetSchema = z.object({
  type: z.literal("table"),
  tableId: z.string().min(1),
  captionKey: z.string().optional(),
});

const pageCodeSchemaAssetSchema = z.object({
  type: z.literal("code-schema"),
  schemaId: z.string().min(1),
  language: z.string().optional(),
  captionKey: z.string().optional(),
});

export const pageAssetSchema = z.discriminatedUnion("type", [
  pageImageAssetSchema,
  pageGraphAssetSchema,
  pageChartAssetSchema,
  pageTableAssetSchema,
  pageCodeSchemaAssetSchema,
]);

export const pageAssetConfigSchema = z.record(z.string(), pageAssetSchema);

export type RegistryKind = z.infer<typeof registryKindSchema>;
export type RegistryStatus = z.infer<typeof registryStatusSchema>;
export type BaseRecord = z.infer<typeof baseRecordSchema>;
export type ModuleRecord = z.infer<typeof moduleRecordSchema>;
export type TagRecord = z.infer<typeof tagRecordSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
export type PageKind = z.infer<typeof pageKindSchema>;
export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;
export type PageMessages = z.infer<typeof pageMessagesSchema>;
export type PageAsset = z.infer<typeof pageAssetSchema>;
export type PageAssetConfig = z.infer<typeof pageAssetConfigSchema>;
