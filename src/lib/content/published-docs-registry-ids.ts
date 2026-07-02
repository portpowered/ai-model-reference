import {
  type PublishedDocsEntry,
  type PublishedDocsRecordRef,
  type PublishedDocsRegistryIds,
  publishedDocsHrefFromEntry,
} from "@/lib/content/published-docs-registry-contract";
import {
  GENERATED_MODULE_BACKED_CONCEPT_REGISTRY_IDS as GENERATED_MODULE_BACKED_CONCEPT_REGISTRY_IDS_DATA,
  GENERATED_PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS as GENERATED_PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS_DATA,
  GENERATED_PUBLISHED_DOCS_ENTRIES as GENERATED_PUBLISHED_DOCS_ENTRIES_DATA,
  GENERATED_PUBLISHED_DOCS_REGISTRY_IDS as GENERATED_PUBLISHED_DOCS_REGISTRY_IDS_DATA,
} from "./generated/published-docs-registry.generated";

export type {
  PublishedDocsEntry,
  PublishedDocsRecordRef,
  PublishedDocsRegistryIds,
} from "@/lib/content/published-docs-registry-contract";
export type PublishedDocsIndex = {
  entries: readonly PublishedDocsEntry[];
  byRegistryId: ReadonlyMap<string, PublishedDocsEntry>;
  bySlug: ReadonlyMap<string, readonly PublishedDocsEntry[]>;
  registryIds: PublishedDocsRegistryIds;
};

function publishedDocsRegistryEntryPriority(entry: PublishedDocsEntry): number {
  if (entry.pageKind === "concept" && entry.section === "concepts") {
    return 2;
  }

  if (entry.pageKind === "glossary" && entry.section === "glossary") {
    return 1;
  }

  return 0;
}

function resolvePublishedDocsRegistryEntryCollision(
  existingEntry: PublishedDocsEntry,
  candidateEntry: PublishedDocsEntry,
): PublishedDocsEntry {
  const existingPriority = publishedDocsRegistryEntryPriority(existingEntry);
  const candidatePriority = publishedDocsRegistryEntryPriority(candidateEntry);

  if (existingPriority === 0 || candidatePriority === 0) {
    throw new Error(
      `Duplicate published docs registryId "${existingEntry.registryId}" at "${existingEntry.docsSlug}" and "${candidateEntry.docsSlug}"`,
    );
  }

  if (existingPriority === candidatePriority) {
    throw new Error(
      `Ambiguous published docs registryId "${existingEntry.registryId}" at "${existingEntry.docsSlug}" and "${candidateEntry.docsSlug}"`,
    );
  }

  return candidatePriority > existingPriority ? candidateEntry : existingEntry;
}

function getModuleBackedConceptEntryBySlug(
  slug: string,
): PublishedDocsEntry | undefined {
  const moduleEntries = getPublishedDocsEntriesBySlug(slug).filter(
    (entry) => entry.section === "modules" && entry.pageKind === "module",
  );

  if (moduleEntries.length > 1) {
    throw new Error(
      `Multiple published module pages share concept slug "${slug}": ${moduleEntries
        .map((entry) => entry.docsSlug)
        .join(", ")}`,
    );
  }

  return moduleEntries[0];
}

function buildRuntimePublishedDocsIndex(
  entries: readonly PublishedDocsEntry[],
): PublishedDocsIndex {
  const byRegistryId = new Map<string, PublishedDocsEntry>();
  const bySlug = new Map<string, PublishedDocsEntry[]>();

  for (const entry of entries) {
    const existingEntry = byRegistryId.get(entry.registryId);
    if (existingEntry) {
      byRegistryId.set(
        entry.registryId,
        resolvePublishedDocsRegistryEntryCollision(existingEntry, entry),
      );
    } else {
      byRegistryId.set(entry.registryId, entry);
    }

    const slugEntries = bySlug.get(entry.slug);
    if (slugEntries) {
      slugEntries.push(entry);
      continue;
    }

    bySlug.set(entry.slug, [entry]);
  }

  return {
    entries,
    byRegistryId,
    bySlug,
    registryIds: new Set(entries.map((entry) => entry.registryId)),
  };
}

export const publishedDocsIndex = buildRuntimePublishedDocsIndex(
  GENERATED_PUBLISHED_DOCS_ENTRIES_DATA as readonly PublishedDocsEntry[],
);

export const PUBLISHED_DOCS_REGISTRY_IDS: ReadonlySet<string> = new Set(
  GENERATED_PUBLISHED_DOCS_REGISTRY_IDS_DATA as readonly string[],
);

export const PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS: ReadonlySet<string> =
  new Set(
    GENERATED_PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS_DATA as readonly string[],
  );

export const MODULE_BACKED_CONCEPT_REGISTRY_IDS: ReadonlySet<string> = new Set(
  GENERATED_MODULE_BACKED_CONCEPT_REGISTRY_IDS_DATA as readonly string[],
);

export function listPublishedDocsEntries(): readonly PublishedDocsEntry[] {
  return publishedDocsIndex.entries;
}

export function getPublishedDocsEntryByRegistryId(
  registryId: string,
): PublishedDocsEntry | undefined {
  return publishedDocsIndex.byRegistryId.get(registryId);
}

export function getPublishedDocsEntriesBySlug(
  slug: string,
): readonly PublishedDocsEntry[] {
  return publishedDocsIndex.bySlug.get(slug) ?? [];
}

export function hasPublishedDocsPageForRecord(
  record: PublishedDocsRecordRef,
): boolean {
  return getPublishedDocsEntryForRecord(record) !== undefined;
}

export function getPublishedDocsHrefForRecord(
  record: PublishedDocsRecordRef,
): string | null {
  const entry = getPublishedDocsEntryForRecord(record);
  if (!entry) {
    return null;
  }

  return publishedDocsHrefFromEntry(entry);
}

function getPublishedDocsEntryForRecord(
  record: PublishedDocsRecordRef,
): PublishedDocsEntry | undefined {
  const directEntry = getPublishedDocsEntryByRegistryId(record.id);
  if (directEntry) {
    return directEntry;
  }

  if (record.kind !== "concept") {
    return undefined;
  }

  return getModuleBackedConceptEntryBySlug(record.slug);
}
