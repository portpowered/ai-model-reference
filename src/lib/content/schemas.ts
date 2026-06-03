import { z } from "zod";

export const registryStatusSchema = z.enum(["draft", "published", "archived"]);

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

export type ModuleRecord = z.infer<typeof moduleRecordSchema>;

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
  authors: z.array(z.string()),
  title: z.string().min(1),
  year: z.number().int().optional(),
  url: z.string().url(),
  accessedAt: z.string().min(1).optional(),
  mla: z.string().min(1),
});

export type CitationRecord = z.infer<typeof citationRecordSchema>;

export const pageFrontmatterSchema = z.object({
  kind: z.literal("module"),
  registryId: z.string().min(1),
  messageNamespace: z.union([z.literal("local"), z.string().min(1)]),
  assetNamespace: z.union([z.literal("local"), z.string().min(1)]),
  tags: z.array(z.string()),
  aliases: z.array(z.string()).optional(),
  status: registryStatusSchema,
  updatedAt: z.string().min(1),
});

export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;

export const pageMessagesSchema = z.object({
  title: z.string(),
  description: z.string(),
  problemStatement: z.string().optional(),
  coreIdea: z.string().optional(),
  sections: z
    .record(
      z.object({
        title: z.string(),
        body: z.string().optional(),
      }),
    )
    .optional(),
  callouts: z
    .record(
      z.object({
        title: z.string().optional(),
        body: z.string(),
      }),
    )
    .optional(),
  assets: z
    .record(
      z.object({
        alt: z.string().optional(),
        caption: z.string().optional(),
      }),
    )
    .optional(),
});

export type PageMessages = z.infer<typeof pageMessagesSchema>;

const pageImageAssetSchema = z.object({
  type: z.literal("image"),
  src: z.string().min(1),
  altKey: z.string().min(1),
  captionKey: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

const pageGraphAssetSchema = z.object({
  type: z.literal("graph"),
  graphId: z.string().min(1),
  webRenderer: z.literal("react-flow"),
  printRenderer: z.enum(["vertical-svg", "mermaid", "image"]),
  printFallbackAssetId: z.string().min(1).optional(),
  altKey: z.string().min(1).optional(),
  captionKey: z.string().min(1).optional(),
});

const pageChartAssetSchema = z.object({
  type: z.literal("chart"),
  chartId: z.string().min(1),
  altKey: z.string().min(1).optional(),
  captionKey: z.string().min(1).optional(),
});

const pageTableAssetSchema = z.object({
  type: z.literal("table"),
  tableId: z.string().min(1),
  captionKey: z.string().min(1).optional(),
});

const pageCodeSchemaAssetSchema = z.object({
  type: z.literal("code-schema"),
  schemaId: z.string().min(1),
  language: z.string().min(1).optional(),
  captionKey: z.string().min(1).optional(),
});

export const pageAssetSchema = z.discriminatedUnion("type", [
  pageImageAssetSchema,
  pageGraphAssetSchema,
  pageChartAssetSchema,
  pageTableAssetSchema,
  pageCodeSchemaAssetSchema,
]);

export const pageAssetConfigSchema = z.record(pageAssetSchema);

export type PageAsset = z.infer<typeof pageAssetSchema>;
export type PageAssetConfig = z.infer<typeof pageAssetConfigSchema>;
