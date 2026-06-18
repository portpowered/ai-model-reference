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

export const conceptTypeSchema = z.enum([
  "architecture",
  "math",
  "training",
  "inference",
  "systems",
  "evaluation",
  "general",
]);

export const conceptRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("concept"),
  conceptType: conceptTypeSchema,
  prerequisiteIds: z.array(z.string()),
  explainsIds: z.array(z.string()),
});

export const modelSourceTypeSchema = z.enum([
  "open-weights",
  "closed",
  "research",
  "unknown",
]);

export const modelModalitySchema = z.enum([
  "text",
  "image",
  "audio",
  "video",
  "multimodal",
]);

export const modelRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("model"),
  family: z.string().min(1),
  sourceType: modelSourceTypeSchema,
  modalities: z.array(modelModalitySchema).min(1),
  architectureIds: z.array(z.string()),
  moduleIds: z.array(z.string()),
  trainingRegimeIds: z.array(z.string()),
  datasetIds: z.array(z.string()),
  paperIds: z.array(z.string()),
  organizationId: z.string().optional(),
  releaseDate: z.string().optional(),
  parameterCount: z.string().optional(),
  activeParameterCount: z.string().optional(),
  contextLength: z.number().int().positive().optional(),
  precision: z.array(z.string()).optional(),
});

export const paperRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("paper"),
  authors: z.array(z.string().min(1)).min(1),
  publishedAt: z.string().min(1),
  url: z.string().url(),
  introducesIds: z.array(z.string()),
  supportsIds: z.array(z.string()),
  arguesAgainstIds: z.array(z.string()),
  modelIds: z.array(z.string()),
  moduleIds: z.array(z.string()),
  conceptIds: z.array(z.string()),
  venue: z.string().optional(),
  arxivId: z.string().optional(),
});

export const trainingRegimeTypeSchema = z.enum([
  "pretraining",
  "post-training",
  "rl",
  "distillation",
  "optimization",
  "alignment",
  "other",
]);

export const trainingRegimeRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("training-regime"),
  regimeType: trainingRegimeTypeSchema,
  usedByModelIds: z.array(z.string()),
  relatedModuleIds: z.array(z.string()),
  paperIds: z.array(z.string()),
  conceptType: conceptTypeSchema.optional(),
  variantGroup: z.string().optional(),
});

export const generatedPageBundleRegistryRecordSchema = z.discriminatedUnion(
  "kind",
  [
    conceptRecordSchema,
    moduleRecordSchema,
    modelRecordSchema,
    paperRecordSchema,
    trainingRegimeRecordSchema,
  ],
);

export const graphTypeSchema = z.enum([
  "recursive-module-graph",
  "model-architecture",
  "module-compute-flow",
  "attention-pattern",
  "paper-contribution",
  "concept-map",
]);

export const graphLayoutSchema = z.literal("vertical-expandable");

export const graphRendererSchema = z.enum([
  "react-flow",
  "vertical-svg",
  "mermaid",
  "image",
]);

export const moduleGraphNodeKindSchema = z.enum([
  "model",
  "block",
  "operation",
  "projection",
  "attention",
  "normalization",
  "feed-forward",
  "embedding",
  "tokenizer",
  "cache",
  "diffusion-step",
  "fourier",
  "optimizer",
  "loss",
  "dataset",
  "hardware",
  "input",
  "output",
  "other",
]);

export const moduleGraphEdgeKindSchema = z.enum([
  "data-flow",
  "control-flow",
  "residual",
  "conditioning",
  "cache-read",
  "cache-write",
  "parameter-sharing",
  "loss-signal",
  "contains",
]);

export const graphHeadCountRoleSchema = z.enum(["query", "kv"]);

export const graphVisualRoleSchema = z.enum([
  "row-label",
  "query-head",
  "key-head",
  "value-head",
  "timeline-node",
  "timeline-node-muted",
  "summary-node",
  "process-node",
  "latent-node",
  "annotation",
  "default",
]);

export const moduleGraphNodeSchema = z.object({
  id: z.string().min(1),
  labelKey: z.string().min(1),
  summaryKey: z.string().optional(),
  registryId: z.string().optional(),
  moduleKind: moduleGraphNodeKindSchema,
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  childNodeIds: z.array(z.string()),
  collapsedByDefault: z.boolean().optional(),
  assetIds: z.array(z.string()).optional(),
  headCountRole: graphHeadCountRoleSchema.optional(),
  visualRole: graphVisualRoleSchema.optional(),
});

export const moduleGraphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  edgeKind: moduleGraphEdgeKindSchema,
  labelKey: z.string().optional(),
});

export const graphRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("graph"),
  subjectId: z.string().min(1),
  graphType: graphTypeSchema,
  rootNodeId: z.string().min(1),
  layout: graphLayoutSchema,
  defaultExpandedDepth: z.number().int().nonnegative(),
  supportedRenderers: z.array(graphRendererSchema).min(1),
  nodes: z.array(moduleGraphNodeSchema).min(1),
  edges: z.array(moduleGraphEdgeSchema),
});

export const registryRecordSchema = z.discriminatedUnion("kind", [
  moduleRecordSchema,
  conceptRecordSchema,
  tagRecordSchema,
  citationRecordSchema,
  graphRecordSchema,
]);

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

const pageRelatedDocMessageSchema = z.object({
  reason: z.string().min(1),
});

const pageCalloutSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
});

const pageAssetVariantLabelSchema = z.object({
  label: z.string().min(1),
});

const pageAssetMessageSchema = z.object({
  alt: z.string().optional(),
  caption: z.string().optional(),
  variants: z.record(z.string(), pageAssetVariantLabelSchema).optional(),
});

const pageGraphNodeMessageSchema = z.object({
  label: z.string().min(1),
  summary: z.string().optional(),
});

export const pageGraphMessagesSchema = z.object({
  nodes: z.record(z.string(), pageGraphNodeMessageSchema),
});

export const pageTableMessagesSchema = z.object({
  dimensions: z.record(z.string(), z.string()).optional(),
  columns: z
    .record(z.string(), z.object({ title: z.string().min(1) }))
    .optional(),
  values: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

const pageMathVariableTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});

const pageMathFormulaSchema = z.object({
  label: z.string().min(1),
  formula: z.string().min(1),
  variableDefinitions: z
    .record(z.string(), pageMathVariableTermSchema)
    .optional(),
});

export const pageMathMessagesSchema = z.record(
  z.string(),
  pageMathFormulaSchema,
);

export const pageMessagesSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  problemStatement: z.string().optional(),
  coreIdea: z.string().optional(),
  openingSummary: z.string().optional(),
  sections: z.record(z.string(), pageSectionSchema).optional(),
  relatedDocs: z.record(z.string(), pageRelatedDocMessageSchema).optional(),
  callouts: z.record(z.string(), pageCalloutSchema).optional(),
  links: z.record(z.string(), z.string().min(1)).optional(),
  assets: z.record(z.string(), pageAssetMessageSchema).optional(),
  graph: pageGraphMessagesSchema.optional(),
  tables: z.record(z.string(), pageTableMessagesSchema).optional(),
  math: pageMathMessagesSchema.optional(),
});

export const tableColumnSchema = z.object({
  moduleId: z.string().min(1),
  titleKey: z.string().optional(),
});

export const tableDimensionSchema = z.object({
  id: z.string().min(1),
  labelKey: z.string().min(1),
});

export const tableCellValueKeysSchema = z.record(z.string(), z.string());

export const tableRecordSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  columns: z.array(tableColumnSchema).min(1),
  dimensions: z.array(tableDimensionSchema).min(1),
  valueKeysByModuleId: z.record(z.string(), tableCellValueKeysSchema),
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

export const attentionVariantGraphVariantSchema = z.object({
  variantId: z.string().min(1),
  graphId: z.string().min(1),
  labelKey: z.string().min(1),
});

const pageAttentionVariantGraphAssetSchema = z.object({
  type: z.literal("attention-variant-graph"),
  defaultVariantId: z.string().min(1),
  variants: z.array(attentionVariantGraphVariantSchema).min(2),
  webRenderer: graphWebRendererSchema,
  printRenderer: graphPrintRendererSchema,
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
  pageAttentionVariantGraphAssetSchema,
  pageChartAssetSchema,
  pageTableAssetSchema,
  pageCodeSchemaAssetSchema,
]);

export const pageAssetConfigSchema = z.record(z.string(), pageAssetSchema);

export type RegistryKind = z.infer<typeof registryKindSchema>;
export type RegistryStatus = z.infer<typeof registryStatusSchema>;
export type BaseRecord = z.infer<typeof baseRecordSchema>;
export type ModuleRecord = z.infer<typeof moduleRecordSchema>;
export type ConceptRecord = z.infer<typeof conceptRecordSchema>;
export type ModelRecord = z.infer<typeof modelRecordSchema>;
export type PaperRecord = z.infer<typeof paperRecordSchema>;
export type TrainingRegimeRecord = z.infer<typeof trainingRegimeRecordSchema>;
export type GeneratedPageBundleRegistryRecord = z.infer<
  typeof generatedPageBundleRegistryRecordSchema
>;
export type TagRecord = z.infer<typeof tagRecordSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
export type GraphRecord = z.infer<typeof graphRecordSchema>;
export type ModuleGraphNode = z.infer<typeof moduleGraphNodeSchema>;
export type ModuleGraphEdge = z.infer<typeof moduleGraphEdgeSchema>;
export type PageKind = z.infer<typeof pageKindSchema>;
export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;
export type PageMessages = z.infer<typeof pageMessagesSchema>;
export type PageTableMessages = z.infer<typeof pageTableMessagesSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type TableDimension = z.infer<typeof tableDimensionSchema>;
export type TableRecord = z.infer<typeof tableRecordSchema>;
export type PageAsset = z.infer<typeof pageAssetSchema>;
export type PageAssetConfig = z.infer<typeof pageAssetConfigSchema>;
