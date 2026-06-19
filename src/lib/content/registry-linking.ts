import {
  getPublishedDocsHrefForRecord,
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

export function registryRecordHref(
  record: LinkableRegistryRecord,
): string | undefined {
  if (
    record.kind === "module" ||
    record.kind === "concept" ||
    record.kind === "model" ||
    record.kind === "paper" ||
    record.kind === "training-regime" ||
    record.kind === "system"
  ) {
    return getPublishedDocsHrefForRecord(record) ?? undefined;
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
