import type { DocsPageSource } from "@/lib/content/pages";
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
  TrainingRegimeRecord,
} from "@/lib/content/schemas";
import { buildBaseSearchDocument } from "./build-base-document";
import { resolveLegacySearchTaxonomyCompatibility } from "./legacy-taxonomy-compat";
import type {
  SearchDocument,
  SearchDocumentFacets,
  SearchDocumentTopology,
  SearchDocumentTopologyClassification,
  SearchDocumentTopologyRelationship,
} from "./types";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "./types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isModelRecord(record: RegistryRecord): record is ModelRecord {
  return record.kind === "model";
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
    ...(classification.legacyIds ?? []),
    ...classification.aliases,
    ...classification.tags,
  ]);
}

function resolveIndexedClassification(
  classificationId: string | undefined,
  indexes: RegistryIndexes,
): ClassificationRecord | undefined {
  if (!classificationId) {
    return undefined;
  }

  const direct = indexes.classificationsById.get(classificationId);
  if (direct) {
    return direct;
  }

  for (const classification of indexes.classificationsById.values()) {
    if (classification.legacyIds?.includes(classificationId)) {
      return classification;
    }
  }

  return undefined;
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

function listClassificationLineage(
  classificationId: string | undefined,
  indexes: RegistryIndexes,
): ClassificationRecord[] {
  const lineage: ClassificationRecord[] = [];
  const seen = new Set<string>();

  let currentId = resolveIndexedClassification(classificationId, indexes)?.id;
  while (currentId) {
    if (seen.has(currentId)) {
      break;
    }
    seen.add(currentId);

    const classification = resolveIndexedClassification(currentId, indexes);
    if (classification?.status !== "published") {
      break;
    }

    lineage.push(classification);
    currentId = classification.parentClassificationId;
  }

  return lineage;
}

function buildClassificationCollections(
  classificationIds: string[],
  indexes: RegistryIndexes,
): {
  classifications: SearchDocumentTopologyClassification[];
  ancestorClassifications: SearchDocumentTopologyClassification[];
  rootClassifications: SearchDocumentTopologyClassification[];
  classificationIds: string[];
  ancestorClassificationIds: string[];
  rootClassificationIds: string[];
} {
  const classifications: SearchDocumentTopologyClassification[] = [];
  const ancestors: SearchDocumentTopologyClassification[] = [];
  const roots: SearchDocumentTopologyClassification[] = [];
  const seenClassifications = new Set<string>();
  const seenAncestors = new Set<string>();
  const seenRoots = new Set<string>();

  for (const classificationId of classificationIds) {
    const lineage = listClassificationLineage(classificationId, indexes);
    const [self, ...ancestorLineage] = lineage;
    const selfClassification = toTopologyClassification(self);
    if (selfClassification && !seenClassifications.has(selfClassification.id)) {
      seenClassifications.add(selfClassification.id);
      classifications.push(selfClassification);
    }

    for (const ancestor of ancestorLineage) {
      const ancestorClassification = toTopologyClassification(ancestor);
      if (
        ancestorClassification &&
        !seenAncestors.has(ancestorClassification.id)
      ) {
        seenAncestors.add(ancestorClassification.id);
        ancestors.push(ancestorClassification);
      }
    }

    const root = lineage.at(-1);
    const rootClassification = toTopologyClassification(root);
    if (rootClassification && !seenRoots.has(rootClassification.id)) {
      seenRoots.add(rootClassification.id);
      roots.push(rootClassification);
    }
  }

  return {
    classifications,
    ancestorClassifications: ancestors,
    rootClassifications: roots,
    classificationIds: classifications.map(
      (classification) => classification.id,
    ),
    ancestorClassificationIds: ancestors.map(
      (classification) => classification.id,
    ),
    rootClassificationIds: roots.map((classification) => classification.id),
  };
}

function buildTopology(
  registryRecord: RegistryRecord | undefined,
  indexes: RegistryIndexes,
): SearchDocumentTopology {
  if (!registryRecord || !isOntologyParticipatingRecord(registryRecord)) {
    return { ...EMPTY_SEARCH_DOCUMENT_TOPOLOGY };
  }

  const primaryClassificationId = registryRecord.primaryClassificationId;
  const resolvedPrimaryClassificationId = resolveIndexedClassification(
    primaryClassificationId,
    indexes,
  )?.id;
  const secondaryClassificationIds = unique(
    (registryRecord.secondaryClassificationIds ?? []).map(
      (classificationId) =>
        resolveIndexedClassification(classificationId, indexes)?.id ??
        classificationId,
    ),
  );
  const primaryClassificationLineage = listClassificationLineage(
    resolvedPrimaryClassificationId ?? primaryClassificationId,
    indexes,
  );
  const primaryClassification = toTopologyClassification(
    primaryClassificationLineage[0],
  );
  const secondaryClassificationCollection = buildClassificationCollections(
    secondaryClassificationIds,
    indexes,
  );
  const secondaryClassifications =
    secondaryClassificationCollection.classifications;
  const classificationCollection = buildClassificationCollections(
    [
      ...(resolvedPrimaryClassificationId
        ? [resolvedPrimaryClassificationId]
        : []),
      ...secondaryClassificationIds,
    ],
    indexes,
  );
  const relationships = (registryRecord.relationships ?? []).map(
    (relationship) => toTopologyRelationship(relationship, indexes),
  );
  const relatedTopologyIds = unique([
    ...classificationCollection.classificationIds,
    ...classificationCollection.ancestorClassificationIds,
    ...classificationCollection.rootClassificationIds,
    ...relationships.map((relationship) => relationship.targetId),
  ]);
  const terms = unique([
    ...(primaryClassification?.terms ?? []),
    ...secondaryClassifications.flatMap(
      (classification) => classification.terms,
    ),
    ...classificationCollection.ancestorClassifications.flatMap(
      (classification) => classification.terms,
    ),
    ...classificationCollection.rootClassifications.flatMap(
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
    primaryClassificationId: resolvedPrimaryClassificationId,
    secondaryClassificationIds,
    primaryClassification,
    secondaryClassifications,
    classificationIds: classificationCollection.classificationIds,
    ancestorClassificationIds:
      classificationCollection.ancestorClassificationIds,
    ancestorClassifications: classificationCollection.ancestorClassifications,
    rootClassificationIds: classificationCollection.rootClassificationIds,
    rootClassifications: classificationCollection.rootClassifications,
    relationships,
    relatedTopologyIds,
    terms,
  };
}

function buildFacets(
  pageKind: string,
  tags: string[],
  topology: SearchDocumentTopology,
  registryRecord?: RegistryRecord,
): SearchDocumentFacets {
  const facets: SearchDocumentFacets = { kind: pageKind, tags };

  facets.primaryClassificationId = topology.primaryClassificationId;
  facets.primaryClassificationSlug = topology.primaryClassification?.slug;
  facets.classificationIds = topology.classificationIds ?? [];
  facets.classificationSlugs = [
    ...(topology.primaryClassification
      ? [topology.primaryClassification.slug]
      : []),
    ...topology.secondaryClassifications.map(
      (classification) => classification.slug,
    ),
  ];
  facets.ancestorClassificationIds = topology.ancestorClassificationIds ?? [];
  facets.ancestorClassificationSlugs = (
    topology.ancestorClassifications ?? []
  ).map((classification) => classification.slug);
  facets.rootClassificationIds = topology.rootClassificationIds ?? [];
  facets.rootClassificationSlugs = (topology.rootClassifications ?? []).map(
    (classification) => classification.slug,
  );
  facets.relatedTopologyIds = topology.relatedTopologyIds ?? [];
  facets.relationshipTypes = topology.relationships.map(
    (relationship) => relationship.relationshipType,
  );

  Object.assign(
    facets,
    resolveLegacySearchTaxonomyCompatibility(registryRecord, topology),
  );

  if (registryRecord && isModelRecord(registryRecord)) {
    facets.modelFamily = registryRecord.family;
    facets.sourceType = registryRecord.sourceType;
    facets.modalities = registryRecord.modalities;
    facets.trainingRegimeIds = registryRecord.trainingRegimeIds;
  }

  if (registryRecord && registryRecord.kind === "module") {
    facets.optimizes = registryRecord.optimizes;
  }

  return facets;
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

export function buildSearchDocument(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): SearchDocument {
  const base = buildBaseSearchDocument(page, indexes);
  const registryRecord = getRegistryRecord(
    indexes,
    page.frontmatter.registryId,
  );
  const topology = buildTopology(registryRecord, indexes);

  return {
    ...base,
    facets: buildFacets(base.kind, base.tags, topology, registryRecord),
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
