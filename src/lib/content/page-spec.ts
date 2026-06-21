import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  conceptTypeSchema,
  mathLevelSchema,
  modelModalitySchema,
  modelSourceTypeSchema,
  moduleTypeSchema,
  ontologyRelationshipSchema,
  type PageFrontmatter,
  type PageKind,
  pageAssetConfigSchema,
  pageGraphMessagesSchema,
  pageTableMessagesSchema,
  registryStatusSchema,
  systemTypeSchema,
  trainingRegimeTypeSchema,
} from "./schemas";

export const PAGE_SPEC_KINDS = [
  "concept",
  "glossary",
  "module",
  "model",
  "paper",
  "training-regime",
  "system",
] as const;

export type PageSpecKind = (typeof PAGE_SPEC_KINDS)[number];

export {
  modelModalitySchema,
  modelSourceTypeSchema,
  systemTypeSchema,
  trainingRegimeTypeSchema,
} from "./schemas";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const pageSpecSectionSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

const pageSpecCalloutSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
});

const pageSpecAssetMessagesSchema = z.record(
  z.string(),
  z.object({
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
);

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
  sections: z.record(z.string(), pageSpecSectionSchema).optional(),
  callouts: z.record(z.string(), pageSpecCalloutSchema).optional(),
  assets: pageAssetConfigSchema.optional(),
  assetMessages: pageSpecAssetMessagesSchema.optional(),
  graph: pageGraphMessagesSchema.optional(),
  tables: z.record(z.string(), pageTableMessagesSchema).optional(),
});

const pageSpecOntologyShape = {
  primaryClassificationId: z.string().min(1).optional(),
  secondaryClassificationIds: z.array(z.string().min(1)).default([]),
  relationships: z.array(ontologyRelationshipSchema).default([]),
};

function hasOntologyTopology(input: {
  primaryClassificationId?: string;
  secondaryClassificationIds: string[];
  relationships: Array<unknown>;
}): boolean {
  return (
    input.primaryClassificationId !== undefined ||
    input.secondaryClassificationIds.length > 0 ||
    input.relationships.length > 0
  );
}

function collectOntologyFirstOrLegacyTypedFieldIssues(options: {
  legacyFieldLabel: string;
  legacyFieldValue: string | undefined;
  input: {
    primaryClassificationId?: string;
    secondaryClassificationIds: string[];
    relationships: Array<unknown>;
  };
}): PageSpecValidationIssue[] {
  const { legacyFieldLabel, legacyFieldValue, input } = options;
  const issues: PageSpecValidationIssue[] = [];

  if (
    input.primaryClassificationId === undefined &&
    (input.secondaryClassificationIds.length > 0 ||
      input.relationships.length > 0)
  ) {
    issues.push({
      field: "primaryClassificationId",
      message:
        "primaryClassificationId is required when secondaryClassificationIds or relationships are provided.",
    });
  }

  if (!legacyFieldValue && !hasOntologyTopology(input)) {
    issues.push({
      field: "primaryClassificationId",
      message: `Provide primaryClassificationId for ontology-first authoring or ${legacyFieldLabel} as a temporary compatibility field.`,
    });
  }

  return issues;
}

const conceptBackedPageSpecShape = {
  ...pageSpecOntologyShape,
  releaseDate: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1).optional(),
  sourceId: z.string().min(1).optional(),
  conceptType: conceptTypeSchema.optional(),
  prerequisiteIds: z.array(z.string()).default([]),
  explainsIds: z.array(z.string()).default([]),
};

export const conceptPageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("concept"),
  ...conceptBackedPageSpecShape,
});

export const glossaryPageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("glossary"),
  ...conceptBackedPageSpecShape,
});

export const modulePageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("module"),
  ...pageSpecOntologyShape,
  releaseDate: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1).optional(),
  sourceId: z.string().min(1).optional(),
  moduleType: moduleTypeSchema.optional(),
  mathLevel: mathLevelSchema.default("none"),
  moduleFamily: z.string().optional(),
  variantGroup: z.string().optional(),
  variantOf: z.string().optional(),
  optimizes: z.array(z.string()).default([]),
  exampleModelIds: z.array(z.string()).default([]),
  improvesOnIds: z.array(z.string()).default([]),
  tradeoffIds: z.array(z.string()).default([]),
  usedByModelIds: z.array(z.string()).default([]),
  introducedByPaperIds: z.array(z.string()).default([]),
});

export const modelPageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("model"),
  releaseDate: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1).optional(),
  sourceId: z.string().min(1).optional(),
  family: z.string().min(1),
  sourceType: modelSourceTypeSchema,
  modalities: z.array(modelModalitySchema).min(1),
  organizationId: z.string().optional(),
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
  ...pageSpecOntologyShape,
  releaseDate: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1).optional(),
  sourceId: z.string().min(1).optional(),
  regimeType: trainingRegimeTypeSchema.optional(),
  conceptType: conceptTypeSchema.optional(),
  variantGroup: z.string().optional(),
  usedByModelIds: z.array(z.string()).default([]),
  relatedModuleIds: z.array(z.string()).default([]),
  paperIds: z.array(z.string()).default([]),
});

export const systemPageSpecSchema = pageSpecBaseSchema.extend({
  kind: z.literal("system"),
  ...pageSpecOntologyShape,
  releaseDate: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1).optional(),
  sourceId: z.string().min(1).optional(),
  systemType: systemTypeSchema.optional(),
  conceptType: conceptTypeSchema.optional(),
  variantGroup: z.string().optional(),
  relatedModelIds: z.array(z.string()).default([]),
  relatedModuleIds: z.array(z.string()).default([]),
  relatedConceptIds: z.array(z.string()).default([]),
  paperIds: z.array(z.string()).default([]),
  datasetIds: z.array(z.string()).default([]),
  organizationId: z.string().optional(),
});

export const pageSpecSchema = z.discriminatedUnion("kind", [
  conceptPageSpecSchema,
  glossaryPageSpecSchema,
  modulePageSpecSchema,
  modelPageSpecSchema,
  paperPageSpecSchema,
  trainingRegimePageSpecSchema,
  systemPageSpecSchema,
]);

export type ConceptPageSpec = z.infer<typeof conceptPageSpecSchema>;
export type GlossaryPageSpec = z.infer<typeof glossaryPageSpecSchema>;
export type ModulePageSpec = z.infer<typeof modulePageSpecSchema>;
export type ModelPageSpec = z.infer<typeof modelPageSpecSchema>;
export type PaperPageSpec = z.infer<typeof paperPageSpecSchema>;
export type TrainingRegimePageSpec = z.infer<
  typeof trainingRegimePageSpecSchema
>;
export type SystemPageSpec = z.infer<typeof systemPageSpecSchema>;
export type PageSpec = z.infer<typeof pageSpecSchema>;

export type PageSpecValidationIssue = {
  field: string;
  message: string;
};

export type PageSpecWarning = {
  field: string;
  message: string;
};

type DeprecatedTaxonomyFieldWarningOptions = {
  field: string;
  recordKind: "concept" | "glossary" | "module" | "training-regime" | "system";
  replacement: string;
};

function createDeprecatedTaxonomyFieldWarning(
  options: DeprecatedTaxonomyFieldWarningOptions,
): PageSpecWarning {
  const { field, recordKind, replacement } = options;
  return {
    field,
    message: `${field} is deprecated for ${recordKind} page specs. Use ${replacement} instead for ontology-first authoring.`,
  };
}

export function collectDeprecatedTaxonomyWarnings(
  spec: PageSpec,
): PageSpecWarning[] {
  switch (spec.kind) {
    case "concept":
    case "glossary":
      return spec.conceptType
        ? [
            createDeprecatedTaxonomyFieldWarning({
              field: "conceptType",
              recordKind: spec.kind,
              replacement:
                "primaryClassificationId plus optional secondaryClassificationIds and relationships",
            }),
          ]
        : [];
    case "module":
      return [
        ...(spec.moduleType
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "moduleType",
                recordKind: "module",
                replacement:
                  "primaryClassificationId plus optional secondaryClassificationIds",
              }),
            ]
          : []),
        ...(spec.moduleFamily
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "moduleFamily",
                recordKind: "module",
                replacement:
                  "secondaryClassificationIds for additional taxonomy membership",
              }),
            ]
          : []),
        ...(spec.variantGroup
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "variantGroup",
                recordKind: "module",
                replacement:
                  "relationships for variant or related-module topology",
              }),
            ]
          : []),
      ];
    case "training-regime":
      return [
        ...(spec.regimeType
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "regimeType",
                recordKind: "training-regime",
                replacement:
                  "primaryClassificationId plus optional secondaryClassificationIds",
              }),
            ]
          : []),
        ...(spec.conceptType
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "conceptType",
                recordKind: "training-regime",
                replacement:
                  "primaryClassificationId plus optional secondaryClassificationIds",
              }),
            ]
          : []),
        ...(spec.variantGroup
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "variantGroup",
                recordKind: "training-regime",
                replacement:
                  "relationships for variant or nearby-regime topology",
              }),
            ]
          : []),
      ];
    case "system":
      return [
        ...(spec.systemType
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "systemType",
                recordKind: "system",
                replacement:
                  "primaryClassificationId plus optional secondaryClassificationIds",
              }),
            ]
          : []),
        ...(spec.conceptType
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "conceptType",
                recordKind: "system",
                replacement:
                  "primaryClassificationId plus optional secondaryClassificationIds",
              }),
            ]
          : []),
        ...(spec.variantGroup
          ? [
              createDeprecatedTaxonomyFieldWarning({
                field: "variantGroup",
                recordKind: "system",
                replacement:
                  "relationships for variant or related-system topology",
              }),
            ]
          : []),
      ];
    default:
      return [];
  }
}

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

  const issues = collectPageSpecCompatibilityIssues(result.data);
  if (issues.length > 0) {
    throw new PageSpecValidationError(issues);
  }

  return result.data;
}

function collectPageSpecCompatibilityIssues(
  spec: PageSpec,
): PageSpecValidationIssue[] {
  const compatibilityIssues: PageSpecValidationIssue[] = [];
  const ontologyInput = {
    primaryClassificationId:
      "primaryClassificationId" in spec
        ? spec.primaryClassificationId
        : undefined,
    secondaryClassificationIds:
      "secondaryClassificationIds" in spec
        ? spec.secondaryClassificationIds
        : [],
    relationships: "relationships" in spec ? spec.relationships : [],
  };
  const addCompatibilityIssues = (
    legacyFieldLabel: string,
    legacyFieldValue: string | undefined,
  ) => {
    compatibilityIssues.push(
      ...collectOntologyFirstOrLegacyTypedFieldIssues({
        legacyFieldLabel,
        legacyFieldValue,
        input: ontologyInput,
      }),
    );
  };

  switch (spec.kind) {
    case "concept":
    case "glossary":
      addCompatibilityIssues("conceptType", spec.conceptType);
      break;
    case "module":
      addCompatibilityIssues("moduleType", spec.moduleType);
      break;
    case "training-regime":
      addCompatibilityIssues("regimeType", spec.regimeType);
      break;
    case "system":
      addCompatibilityIssues("systemType", spec.systemType);
      break;
    default:
      break;
  }

  return compatibilityIssues;
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
  "concept" | "module" | "model" | "paper" | "training-regime" | "system"
> = {
  concept: "concept",
  glossary: "concept",
  module: "module",
  model: "model",
  paper: "paper",
  "training-regime": "training-regime",
  system: "system",
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
