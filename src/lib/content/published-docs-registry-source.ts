import { existsSync } from "node:fs";
import { join } from "node:path";
import { getRegistryCollectionRoot } from "@/lib/content/content-paths";
import type { DocsPageSource } from "@/lib/content/pages";
import {
  docsSectionFromSlug,
  type PublishedDocsEntry,
  type PublishedDocsRegistryIds,
} from "@/lib/content/published-docs-registry-contract";

export type ScannedPublishedDocsEntry = PublishedDocsEntry & {
  pageDir: string;
};

export type ScannedPublishedDocsIndex = {
  entries: readonly ScannedPublishedDocsEntry[];
  byRegistryId: ReadonlyMap<string, ScannedPublishedDocsEntry>;
  bySlug: ReadonlyMap<string, readonly ScannedPublishedDocsEntry[]>;
  registryIds: PublishedDocsRegistryIds;
};

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
      throw new Error(
        `Duplicate published docs registryId "${entry.registryId}" at "${existingEntry.docsSlug}" and "${entry.docsSlug}"`,
      );
    }

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
