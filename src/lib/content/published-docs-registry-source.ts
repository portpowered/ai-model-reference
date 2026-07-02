import { existsSync } from "node:fs";
import { join } from "node:path";
import { getRegistryCollectionRoot } from "@/lib/content/content-paths";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import {
  docsSectionFromSlug,
  type PublishedDocsEntry,
  type PublishedDocsRegistryIds,
} from "@/lib/content/published-docs-registry-contract";
import type { SiteLocale } from "@/lib/i18n/locale-routing";

export type ScannedPublishedDocsEntry = PublishedDocsEntry & {
  pageDir: string;
};

export type ScannedPublishedDocsIndex = {
  entries: readonly ScannedPublishedDocsEntry[];
  byRegistryId: ReadonlyMap<string, ScannedPublishedDocsEntry>;
  bySlug: ReadonlyMap<string, readonly ScannedPublishedDocsEntry[]>;
  registryIds: PublishedDocsRegistryIds;
};

export type PublishedDocsRuntimeManifest = {
  entries: readonly PublishedDocsEntry[];
  registryIds: readonly string[];
  publishedConceptSectionRegistryIds: readonly string[];
  moduleBackedConceptRegistryIds: readonly string[];
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
  existingEntry: ScannedPublishedDocsEntry,
  candidateEntry: ScannedPublishedDocsEntry,
): ScannedPublishedDocsEntry {
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

function toScannedPublishedDocsEntry(
  page: DocsPageSource,
): ScannedPublishedDocsEntry {
  const slug = page.docsSlug.split("/").at(-1);
  if (!slug) {
    throw new Error(
      `Cannot derive page slug from docs slug "${page.docsSlug}"`,
    );
  }

  return {
    registryId: page.frontmatter.registryId,
    slug,
    docsSlug: page.docsSlug,
    url: page.url,
    pageDir: page.pageDir,
    pageKind: page.frontmatter.kind,
    section: docsSectionFromSlug(page.docsSlug),
  };
}

export function buildPublishedDocsIndex(
  pages: readonly DocsPageSource[],
): ScannedPublishedDocsIndex {
  const entries = pages.map(toScannedPublishedDocsEntry);
  const byRegistryId = new Map<string, ScannedPublishedDocsEntry>();
  const bySlug = new Map<string, ScannedPublishedDocsEntry[]>();

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
    bySlug: new Map(
      [...bySlug.entries()].map(([slug, slugEntries]) => [slug, slugEntries]),
    ),
    registryIds: new Set(entries.map((entry) => entry.registryId)),
  };
}

function hasConceptRegistryRecord(slug: string): boolean {
  return existsSync(
    join(getRegistryCollectionRoot("concepts"), `${slug}.json`),
  );
}

export function derivePublishedConceptSectionRegistryIds(
  index: ScannedPublishedDocsIndex,
): readonly string[] {
  return index.entries
    .filter(
      (entry) => entry.pageKind === "concept" && entry.section === "concepts",
    )
    .map((entry) => entry.registryId)
    .sort();
}

export function deriveModuleBackedConceptRegistryIds(
  index: ScannedPublishedDocsIndex,
): readonly string[] {
  const conceptIds = new Set<string>();

  for (const entry of index.entries) {
    if (entry.section !== "modules" || !hasConceptRegistryRecord(entry.slug)) {
      continue;
    }

    conceptIds.add(`concept.${entry.slug}`);
  }

  return [...conceptIds].sort();
}

export function derivePublishedDocsRegistryIds(
  index: ScannedPublishedDocsIndex,
): readonly string[] {
  const registryIds = new Set(index.entries.map((entry) => entry.registryId));

  for (const conceptId of deriveModuleBackedConceptRegistryIds(index)) {
    registryIds.add(conceptId);
  }

  return [...registryIds].sort();
}

export function derivePublishedDocsRuntimeManifest(
  index: ScannedPublishedDocsIndex,
): PublishedDocsRuntimeManifest {
  return {
    entries: index.entries.map(({ pageDir: _pageDir, ...entry }) => entry),
    registryIds: derivePublishedDocsRegistryIds(index),
    publishedConceptSectionRegistryIds:
      derivePublishedConceptSectionRegistryIds(index),
    moduleBackedConceptRegistryIds: deriveModuleBackedConceptRegistryIds(index),
  };
}

export function loadPublishedDocsRuntimeManifestSync(
  locale: SiteLocale,
): PublishedDocsRuntimeManifest {
  return derivePublishedDocsRuntimeManifest(
    buildPublishedDocsIndex(loadPublishedDocsPagesSync(locale)),
  );
}
