import { z } from "zod";

export const registryStatusSchema = z.enum(["draft", "published", "archived"]);

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
