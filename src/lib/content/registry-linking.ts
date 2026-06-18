import {
  conceptPageHref,
  glossaryPageHref,
  modelPageHref,
  modulePageHref,
  paperPageHref,
  systemPageHref,
  trainingPageHref,
} from "@/lib/content/content-hrefs";
import {
  MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  type PublishedDocsRegistryIds,
} from "@/lib/content/published-docs-registry-ids";
import type {
  CitationRecord,
  ConceptRecord,
  DatasetRecord,
  GraphRecord,
  ModelRecord,
  ModuleRecord,
  OrganizationRecord,
  PaperRecord,
  SystemRecord,
  TagRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";

export type LinkableRegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord
  | OrganizationRecord
  | CitationRecord
  | TagRecord
  | GraphRecord;

function formatSlugLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function registryDisplayTitle(record: LinkableRegistryRecord): string {
  return record.aliases[0] ?? formatSlugLabel(record.slug);
}

function conceptRecordPageHref(record: ConceptRecord): string {
  if (MODULE_BACKED_CONCEPT_REGISTRY_IDS.has(record.id)) {
    return modulePageHref(record.slug);
  }
  if (PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(record.id)) {
    return conceptPageHref(record.slug);
  }
  return glossaryPageHref(record.slug);
}

export function registryRecordHref(
  record: LinkableRegistryRecord,
): string | undefined {
  if (record.kind === "concept") {
    return conceptRecordPageHref(record);
  }
  if (record.kind === "module") {
    return modulePageHref(record.slug);
  }
  if (record.kind === "model") {
    return modelPageHref(record.slug);
  }
  if (record.kind === "paper") {
    return paperPageHref(record.slug);
  }
  if (record.kind === "training-regime") {
    return trainingPageHref(record.slug);
  }
  if (record.kind === "system") {
    return systemPageHref(record.slug);
  }
  return undefined;
}

export function hasPublishedDocsPageForRecord(
  record: LinkableRegistryRecord,
  publishedRegistryIds: PublishedDocsRegistryIds,
): boolean {
  if (record.kind === "dataset" || record.kind === "organization") {
    return false;
  }
  return publishedRegistryIds.has(record.id);
}
