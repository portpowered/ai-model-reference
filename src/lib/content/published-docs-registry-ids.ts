import {
  type PublishedDocsEntry,
  type PublishedDocsRecordRef,
  type PublishedDocsRegistryIds,
  publishedDocsHrefFromEntry,
} from "@/lib/content/published-docs-registry-contract";
import {
  GENERATED_MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  GENERATED_PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  GENERATED_PUBLISHED_DOCS_ENTRIES,
  GENERATED_PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-manifest";

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
    byRegistryId.set(entry.registryId, entry);

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
    bySlug: new Map(
      [...bySlug.entries()].map(([slug, slugEntries]) => [slug, slugEntries]),
    ),
    registryIds: new Set(GENERATED_PUBLISHED_DOCS_REGISTRY_IDS),
  };
}

const publishedDocsIndex = buildRuntimePublishedDocsIndex(
  GENERATED_PUBLISHED_DOCS_ENTRIES,
);

export const PUBLISHED_DOCS_INDEX = publishedDocsIndex;
export const PUBLISHED_DOCS_REGISTRY_IDS: PublishedDocsRegistryIds =
  new Set<string>(GENERATED_PUBLISHED_DOCS_REGISTRY_IDS);
export const PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS: ReadonlySet<string> =
  new Set<string>(GENERATED_PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS);
export const MODULE_BACKED_CONCEPT_REGISTRY_IDS: ReadonlySet<string> =
  new Set<string>(GENERATED_MODULE_BACKED_CONCEPT_REGISTRY_IDS);

export function listPublishedDocsEntries(): readonly PublishedDocsEntry[] {
  return PUBLISHED_DOCS_INDEX.entries;
}

export function getPublishedDocsEntryByRegistryId(
  registryId: string,
): PublishedDocsEntry | undefined {
  return PUBLISHED_DOCS_INDEX.byRegistryId.get(registryId);
}

export function getPublishedDocsEntriesBySlug(
  slug: string,
): readonly PublishedDocsEntry[] {
  return PUBLISHED_DOCS_INDEX.bySlug.get(slug) ?? [];
}

export function getPublishedDocsEntryForRecord(
  record: PublishedDocsRecordRef,
): PublishedDocsEntry | undefined {
  const exactEntry = getPublishedDocsEntryByRegistryId(record.id);
  if (exactEntry) {
    return exactEntry;
  }

  if (record.kind === "concept") {
    return getModuleBackedConceptEntryBySlug(record.slug);
  }

  return undefined;
}

export function getPublishedDocsHrefForRecord(
  record: PublishedDocsRecordRef,
): string | undefined {
  const entry = getPublishedDocsEntryForRecord(record);
  return entry ? publishedDocsHrefFromEntry(entry) : undefined;
}
