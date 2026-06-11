import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  conceptTypeSchema,
  mathLevelSchema,
  moduleTypeSchema,
  type PageFrontmatter,
  type PageKind,
  pageAssetConfigSchema,
  pageGraphMessagesSchema,
  registryStatusSchema,
} from "./schemas";

export const PAGE_SPEC_KINDS = [
  "concept",
  "glossary",
  "module",
  "model",
  "paper",
  "training-regime",
] as const;

export type PageSpecKind = (typeof PAGE_SPEC_KINDS)[number];

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

export const trainingRegimeTypeSchema = z.enum([
  "pretraining",
  "post-training",
  "rl",
  "distillation",
  "optimization",
  "alignment",
  "other",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const pageSpecSectionSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

const pageSpecCalloutSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
});

const pageSpecBaseSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(SLUG_PATTERN, "Use lowercase letters, digits, and single hyphens."),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: registryStatusSchema.default("draft"),
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  relatedIds: z.array(z.string()).default([]),
  citationIds: z.array(z.string()).default([]),
  openingSummary: z.string().optional(),
  sections: z.record(z.string(), pageSpecSectionSchema).optional(),
  callouts: z.record(z.string(), pageSpecCalloutSchema).optional(),
  assets: pageAssetConfigSchema.optional(),
  graph: pageGraphMessagesSchema.optional(),
});

const conceptBackedPageSpecSchema = pageSpecBaseSchema.extend({
  conceptType: conceptTypeSchema,
  prerequisiteIds: z.array(z.string()).default([]),
  explainsIds: z.array(z.string()).default([]),
});

export const conceptPageSpecSchema = conceptBackedPageSpecSchema.extend({
  kind: z.literal("concept"),
});

export const glossaryPageSpecSchema = conceptBackedPageSpecSchema.extend({
  kind: z.literal("glossary"),
});

export const modulePageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("module"),
  moduleType: moduleTypeSchema,
  mathLevel: mathLevelSchema.default("none"),
  moduleFamily: z.string().optional(),
  variantGroup: z.string().optional(),
  variantOf: z.string().optional(),
  optimizes: z.array(z.string()).default([]),
  practicalBenefits: z.array(z.string()).default([]),
  exampleModelIds: z.array(z.string()).default([]),
  improvesOnIds: z.array(z.string()).default([]),
  tradeoffIds: z.array(z.string()).default([]),
  usedByModelIds: z.array(z.string()).default([]),
  introducedByPaperIds: z.array(z.string()).default([]),
});

export const modelPageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("model"),
  family: z.string().min(1),
  sourceType: modelSourceTypeSchema,
  modalities: z.array(modelModalitySchema).min(1),
  organizationId: z.string().optional(),
  releaseDate: z.string().optional(),
  architectureIds: z.array(z.string()).default([]),
  moduleIds: z.array(z.string()).default([]),
  trainingRegimeIds: z.array(z.string()).default([]),
  datasetIds: z.array(z.string()).default([]),
  paperIds: z.array(z.string()).default([]),
  parameterCount: z.string().optional(),
  activeParameterCount: z.string().optional(),
  contextLength: z.number().int().positive().optional(),
  precision: z.array(z.string()).optional(),
});

export const paperPageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("paper"),
  authors: z.array(z.string().min(1)).min(1),
  publishedAt: z.string().min(1),
  url: z.string().url(),
  venue: z.string().optional(),
  arxivId: z.string().optional(),
  introducesIds: z.array(z.string()).default([]),
  supportsIds: z.array(z.string()).default([]),
  arguesAgainstIds: z.array(z.string()).default([]),
  modelIds: z.array(z.string()).default([]),
  moduleIds: z.array(z.string()).default([]),
  conceptIds: z.array(z.string()).default([]),
});

export const trainingRegimePageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("training-regime"),
  regimeType: trainingRegimeTypeSchema,
  conceptType: conceptTypeSchema.optional(),
  variantGroup: z.string().optional(),
  usedByModelIds: z.array(z.string()).default([]),
  relatedModuleIds: z.array(z.string()).default([]),
  paperIds: z.array(z.string()).default([]),
});

export const pageSpecSchema = z.discriminatedUnion("kind", [
  conceptPageSpecSchema,
  glossaryPageSpecSchema,
  modulePageSpecSchema,
  modelPageSpecSchema,
  paperPageSpecSchema,
  trainingRegimePageSpecSchema,
]);

export type ConceptPageSpec = z.infer<typeof conceptPageSpecSchema>;
export type GlossaryPageSpec = z.infer<typeof glossaryPageSpecSchema>;
export type ModulePageSpec = z.infer<typeof modulePageSpecSchema>;
export type ModelPageSpec = z.infer<typeof modelPageSpecSchema>;
export type PaperPageSpec = z.infer<typeof paperPageSpecSchema>;
export type TrainingRegimePageSpec = z.infer<
  typeof trainingRegimePageSpecSchema
>;
export type PageSpec = z.infer<typeof pageSpecSchema>;

export type PageSpecValidationIssue = {
  field: string;
  message: string;
};

export class PageSpecValidationError extends Error {
  readonly issues: PageSpecValidationIssue[];

  constructor(issues: PageSpecValidationIssue[]) {
    const summary = issues
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join("; ");
    super(`Invalid page spec: ${summary}`);
    this.name = "PageSpecValidationError";
    this.issues = issues;
  }
}

function formatZodPath(path: (string | number)[]): string {
  if (path.length === 0) {
    return "pageSpec";
  }
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }
    return formatted.length === 0 ? segment : `${formatted}.${segment}`;
  }, "");
}

export function formatPageSpecValidationIssues(
  error: z.ZodError,
): PageSpecValidationIssue[] {
  return error.issues.map((issue) => ({
    field: formatZodPath(issue.path),
    message: issue.message,
  }));
}

export function validatePageSpec(input: unknown): PageSpec {
  const result = pageSpecSchema.safeParse(input);
  if (!result.success) {
    throw new PageSpecValidationError(
      formatPageSpecValidationIssues(result.error),
    );
  }
  return result.data;
}

export function parsePageSpecJson(raw: string): PageSpec {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new PageSpecValidationError([
      {
        field: "pageSpec",
        message:
          error instanceof Error
            ? `Invalid JSON: ${error.message}`
            : "Invalid JSON",
      },
    ]);
  }
  return validatePageSpec(parsed);
}

export async function parsePageSpecFile(path: string): Promise<PageSpec> {
  const raw = await readFile(path, "utf8");
  return parsePageSpecJson(raw);
}

const registryKindByPageKind: Record<
  PageSpecKind,
  "concept" | "module" | "model" | "paper" | "training-regime"
> = {
  concept: "concept",
  glossary: "concept",
  module: "module",
  model: "model",
  paper: "paper",
  "training-regime": "training-regime",
};

export function registryKindForPageSpec(
  spec: PageSpec,
): (typeof registryKindByPageKind)[PageSpecKind] {
  return registryKindByPageKind[spec.kind];
}

export function registryIdForPageSpec(spec: PageSpec): string {
  return `${registryKindForPageSpec(spec)}.${spec.slug}`;
}

export function pageKindForPageSpec(spec: PageSpec): PageKind {
  return spec.kind;
}

export function derivePageFrontmatter(
  spec: PageSpec,
  updatedAt: string,
): PageFrontmatter {
  const frontmatter: PageFrontmatter = {
    kind: pageKindForPageSpec(spec),
    registryId: registryIdForPageSpec(spec),
    messageNamespace: "local",
    assetNamespace: "local",
    tags: spec.tags,
    status: spec.status,
    updatedAt,
  };

  if (spec.aliases.length > 0) {
    frontmatter.aliases = spec.aliases;
  }

  return frontmatter;
}

export function deriveDefaultTitleKey(): "title" {
  return "title";
}

export function deriveDefaultSummaryKey(): "description" {
  return "description";
}
