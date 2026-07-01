import { z } from "zod";

export const registryKindSchema = z.enum([
  "model",
  "module",
  "concept",
  "classification",
  "paper",
  "training-regime",
  "system",
  "dataset",
  "hardware",
  "organization",
  "citation",
  "tag",
  "graph",
]);

export const registryStatusSchema = z.enum(["draft", "published", "archived"]);

export const ontologyParticipantKindSchema = z.enum([
  "model",
  "module",
  "concept",
  "paper",
  "training-regime",
  "system",
  "dataset",
]);

export const ontologyRelationshipTypeSchema = z.enum([
  "variant",
  "part-of",
  "uses",
  "used-by",
  "explains",
  "prerequisite",
  "related",
]);

export const ontologyRelationshipSchema = z.object({
  relationshipType: ontologyRelationshipTypeSchema,
  targetId: z.string().min(1),
});

export const ontologyMembershipShape = {
  primaryClassificationId: z.string().min(1).optional(),
  secondaryClassificationIds: z.array(z.string().min(1)).optional(),
  relationships: z.array(ontologyRelationshipSchema).optional(),
};

export const baseRecordShape = {
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
  sortOrder: z.number().int().optional(),
};

export const baseRecordSchema = z.object({
  ...baseRecordShape,
  kind: registryKindSchema,
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

export const classificationTypeSchema = z.enum([
  "domain",
  "family",
  "mechanism",
  "topology",
  "behavior",
]);

export const classificationRecordSchema = z.object({
  ...baseRecordShape,
  kind: z.literal("classification"),
  classificationType: classificationTypeSchema,
  classifiesKinds: z.array(ontologyParticipantKindSchema).min(1),
  parentClassificationId: z.string().min(1).optional(),
  legacyIds: z.array(z.string().min(1)).optional(),
});

export type RegistryKind = z.infer<typeof registryKindSchema>;
export type RegistryStatus = z.infer<typeof registryStatusSchema>;
export type BaseRecord = z.infer<typeof baseRecordSchema>;
export type OntologyParticipantKind = z.infer<
  typeof ontologyParticipantKindSchema
>;
export type OntologyRelationshipType = z.infer<
  typeof ontologyRelationshipTypeSchema
>;
export type OntologyRelationship = z.infer<typeof ontologyRelationshipSchema>;
export type TagRecord = z.infer<typeof tagRecordSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
export type ClassificationRecord = z.infer<typeof classificationRecordSchema>;
