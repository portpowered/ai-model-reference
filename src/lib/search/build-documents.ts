import {
  collectMessageBodyText,
  collectMessageHeadings,
} from "@/lib/content/messages";
import type { DocsPageSource } from "@/lib/content/pages";
import { resolvePublishedResourceTags } from "@/lib/content/phase-1-published-resources";
import type { RegistryIndexes, RegistryRecord } from "@/lib/content/registry";
import type {
  ClassificationRecord,
  ConceptRecord,
  DatasetRecord,
  ModelRecord,
  ModuleRecord,
  OntologyRelationship,
  PaperRecord,
  SystemRecord,
  TagRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";
import type {
  SearchDocument,
  SearchDocumentFacets,
  SearchDocumentTopology,
  SearchDocumentTopologyClassification,
  SearchDocumentTopologyRelationship,
} from "./types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isModuleRecord(record: RegistryRecord): record is ModuleRecord {
  return record.kind === "module";
}

function isConceptRecord(record: RegistryRecord): record is ConceptRecord {
  return record.kind === "concept";
}

function isTagRecord(record: RegistryRecord): record is TagRecord {
  return record.kind === "tag";
}

function isModelRecord(record: RegistryRecord): record is ModelRecord {
  return record.kind === "model";
}

function isTrainingRegimeRecord(
  record: RegistryRecord,
): record is TrainingRegimeRecord {
  return record.kind === "training-regime";
}

type OntologyParticipatingRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord;

function isOntologyParticipatingRecord(
  record: RegistryRecord,
): record is OntologyParticipatingRecord {
  return (
    record.kind === "module" ||
    record.kind === "concept" ||
    record.kind === "model" ||
    record.kind === "paper" ||
    record.kind === "training-regime" ||
    record.kind === "system" ||
    record.kind === "dataset"
  );
}

function getRegistryRecord(
  indexes: RegistryIndexes,
  registryId?: string,
): RegistryRecord | undefined {
  if (!registryId) {
    return undefined;
  }
  return indexes.byId.get(registryId);
}

function tagSearchTerms(
  indexes: RegistryIndexes,
  tagSlugs: string[],
): string[] {
  const terms: string[] = [];
  for (const slug of tagSlugs) {
    terms.push(slug);
    const record = indexes.tagsBySlug.get(slug);
    if (record && isTagRecord(record)) {
      terms.push(record.slug, ...record.aliases);
    }
  }
  return unique(terms);
}

function humanizeSlug(slug: string): string {
  return slug.replace(/-/g, " ");
}

function buildClassificationTerms(
  classification: ClassificationRecord,
): string[] {
  return unique([
    classification.id,
    classification.slug,
    humanizeSlug(classification.slug),
    ...classification.aliases,
  ]);
}

function toTopologyClassification(
  classification: ClassificationRecord | undefined,
): SearchDocumentTopologyClassification | undefined {
  if (classification?.status !== "published") {
    return undefined;
  }

  const label = humanizeSlug(classification.slug);

  return {
    id: classification.id,
    slug: classification.slug,
    label,
    aliases: classification.aliases,
    terms: buildClassificationTerms(classification),
  };
}

function toTopologyRelationship(
  relationship: OntologyRelationship,
  indexes: RegistryIndexes,
): SearchDocumentTopologyRelationship {
  const target = indexes.byId.get(relationship.targetId);

  return {
    relationshipType: relationship.relationshipType,
    targetId: relationship.targetId,
    targetKind: target?.kind,
    targetSlug: target?.slug,
    targetAliases:
      target && "aliases" in target && Array.isArray(target.aliases)
        ? target.aliases
        : [],
  };
}

function buildTopology(
  registryRecord: RegistryRecord | undefined,
  indexes: RegistryIndexes,
): SearchDocumentTopology {
  const emptyTopology: SearchDocumentTopology = {
    secondaryClassificationIds: [],
    secondaryClassifications: [],
    relationships: [],
    terms: [],
  };

  if (!registryRecord || !isOntologyParticipatingRecord(registryRecord)) {
    return emptyTopology;
  }

  const primaryClassificationId = registryRecord.primaryClassificationId;
  const secondaryClassificationIds =
    registryRecord.secondaryClassificationIds ?? [];
  const primaryClassification = toTopologyClassification(
    primaryClassificationId
      ? indexes.classificationsById.get(primaryClassificationId)
      : undefined,
  );
  const secondaryClassifications = secondaryClassificationIds.flatMap((id) => {
    const classification = toTopologyClassification(
      indexes.classificationsById.get(id),
    );
    return classification ? [classification] : [];
  });
  const relationships = (registryRecord.relationships ?? []).map(
    (relationship) => toTopologyRelationship(relationship, indexes),
  );
  const terms = unique([
    ...(primaryClassification?.terms ?? []),
    ...secondaryClassifications.flatMap(
      (classification) => classification.terms,
    ),
    ...relationships.flatMap((relationship) => [
      relationship.relationshipType,
      relationship.targetId,
      relationship.targetSlug ?? "",
      ...relationship.targetAliases,
    ]),
  ]);

  return {
    primaryClassificationId,
    secondaryClassificationIds,
    primaryClassification,
    secondaryClassifications,
    relationships,
    terms,
  };
}

function buildFacets(
  pageKind: string,
  tags: string[],
  registryRecord?: RegistryRecord,
): SearchDocumentFacets {
  const facets: SearchDocumentFacets = { kind: pageKind, tags };

  if (registryRecord && isModuleRecord(registryRecord)) {
    facets.moduleType = registryRecord.moduleType;
    facets.moduleFamily = registryRecord.moduleFamily;
    facets.conceptType = registryRecord.conceptType;
    facets.variantGroup = registryRecord.variantGroup;
    facets.optimizes = registryRecord.optimizes;
  }

  if (registryRecord && isConceptRecord(registryRecord)) {
    facets.conceptType = registryRecord.conceptType;
  }

  if (registryRecord && isModelRecord(registryRecord)) {
    facets.modelFamily = registryRecord.family;
    facets.sourceType = registryRecord.sourceType;
    facets.modalities = registryRecord.modalities;
    facets.trainingRegimeIds = registryRecord.trainingRegimeIds;
  }

  if (registryRecord && isTrainingRegimeRecord(registryRecord)) {
    facets.conceptType = registryRecord.conceptType;
    facets.variantGroup = registryRecord.variantGroup;
  }

  return facets;
}

export function buildSearchDocument(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): SearchDocument {
  const registryRecord = getRegistryRecord(
    indexes,
    page.frontmatter.registryId,
  );
  const registryAliases = registryRecord?.aliases ?? [];
  const pageTags = resolvePublishedResourceTags(page, indexes);
  const tagTerms = tagSearchTerms(indexes, pageTags);
  const headings = collectMessageHeadings(page.messages);
  const bodyText = collectMessageBodyText(page.messages);
  const topology = buildTopology(registryRecord, indexes);
  const aliases = unique([
    ...(page.frontmatter.aliases ?? []),
    ...registryAliases,
    ...tagTerms,
  ]);

  return {
    id: page.url,
    registryId: page.frontmatter.registryId,
    url: page.url,
    kind: page.frontmatter.kind,
    title: page.messages.title,
    description: page.messages.description,
    bodyText,
    headings,
    aliases,
    tags: pageTags,
    relatedIds: registryRecord?.relatedIds ?? [],
    facets: buildFacets(page.frontmatter.kind, pageTags, registryRecord),
    topology,
  };
}

export function buildSearchDocuments(
  pages: DocsPageSource[],
  indexes: RegistryIndexes,
): SearchDocument[] {
  return pages.map((page) => buildSearchDocument(page, indexes));
}

export function buildSearchDocumentsForLocale(
  locale: string,
  indexes: RegistryIndexes,
  pages: DocsPageSource[],
): SearchDocument[] {
  if (locale.trim() === "") {
    throw new Error("Search document locale must be non-empty.");
  }

  return buildSearchDocuments(pages, indexes);
}
