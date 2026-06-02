import { z } from "zod";

export const registryStatusSchema = z.enum(["draft", "published", "archived"]);

export const baseRecordSchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: z.string(),
  defaultTitleKey: z.string(),
  defaultSummaryKey: z.string(),
  aliases: z.array(z.string()),
  tags: z.array(z.string()),
  relatedIds: z.array(z.string()),
  citationIds: z.array(z.string()),
  status: registryStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const tagRecordSchema = baseRecordSchema.extend({
  kind: z.literal("tag"),
  category: z.string(),
  parentTagId: z.string().optional(),
  landingPage: z.string(),
});

export const moduleRecordSchema = baseRecordSchema.extend({
  kind: z.literal("module"),
  moduleType: z.string(),
  moduleFamily: z.string().optional(),
  conceptType: z.string().optional(),
  variantGroup: z.string().optional(),
  optimizes: z.array(z.string()),
  practicalBenefits: z.array(z.string()),
  exampleModelIds: z.array(z.string()),
  improvesOnIds: z.array(z.string()).default([]),
  tradeoffIds: z.array(z.string()).default([]),
  usedByModelIds: z.array(z.string()),
  introducedByPaperIds: z.array(z.string()),
  mathLevel: z.enum(["none", "light", "detailed"]),
});

export const registryRecordSchema = z.union([
  tagRecordSchema,
  moduleRecordSchema,
  baseRecordSchema,
]);

export const pageFrontmatterSchema = z.object({
  kind: z.enum([
    "concept",
    "model",
    "module",
    "paper",
    "training-regime",
    "system",
    "glossary",
  ]),
  registryId: z.string(),
  messageNamespace: z.string(),
  assetNamespace: z.string(),
  tags: z.array(z.string()),
  aliases: z.array(z.string()).default([]),
  status: registryStatusSchema,
  updatedAt: z.string(),
});

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

export type RegistryRecord = z.infer<typeof registryRecordSchema>;
export type ModuleRecord = z.infer<typeof moduleRecordSchema>;
export type TagRecord = z.infer<typeof tagRecordSchema>;
export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;
export type PageMessages = z.infer<typeof pageMessagesSchema>;
