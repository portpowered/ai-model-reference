import { existsSync } from "node:fs";
import { join } from "node:path";
import { REGISTRY_ROOT } from "@/lib/content/content-paths";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import type { PageKind } from "@/lib/content/schemas";

export const PUBLISHED_DOCS_SECTIONS = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
] as const;

export type PublishedDocsSection = (typeof PUBLISHED_DOCS_SECTIONS)[number];
export type PublishedDocsRegistryIds = ReadonlySet<string>;

export type PublishedDocsEntry = {
  registryId: string;
  slug: string;
  docsSlug: string;
  url: string;
  pageDir: string;
  pageKind: PageKind;
  section: PublishedDocsSection;
};

export type PublishedDocsIndex = {
  entries: readonly PublishedDocsEntry[];
  byRegistryId: ReadonlyMap<string, PublishedDocsEntry>;
  bySlug: ReadonlyMap<string, readonly PublishedDocsEntry[]>;
  registryIds: PublishedDocsRegistryIds;
};

function docsSectionFromSlug(docsSlug: string): PublishedDocsSection {
  const [section] = docsSlug.split("/");
  if (!section) {
    throw new Error(`Cannot derive docs section from empty docs slug`);
  }

  if (PUBLISHED_DOCS_SECTIONS.includes(section as PublishedDocsSection)) {
    return section as PublishedDocsSection;
  }

  throw new Error(
    `Unsupported published docs section "${section}" for docs slug "${docsSlug}"`,
  );
}

function toPublishedDocsEntry(page: DocsPageSource): PublishedDocsEntry {
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
): PublishedDocsIndex {
  const entries = pages.map(toPublishedDocsEntry);
  const byRegistryId = new Map<string, PublishedDocsEntry>();
  const bySlug = new Map<string, PublishedDocsEntry[]>();

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
  return existsSync(join(REGISTRY_ROOT, "concepts", `${slug}.json`));
}

function derivePublishedConceptSectionRegistryIds(
  index: PublishedDocsIndex,
): ReadonlySet<string> {
  return new Set(
    index.entries
      .filter(
        (entry) => entry.pageKind === "concept" && entry.section === "concepts",
      )
      .map((entry) => entry.registryId),
  );
}

function deriveModuleBackedConceptRegistryIds(
  index: PublishedDocsIndex,
): ReadonlySet<string> {
  const conceptIds = new Set<string>();

  for (const entry of index.entries) {
    if (entry.section !== "modules" || !hasConceptRegistryRecord(entry.slug)) {
      continue;
    }

    conceptIds.add(`concept.${entry.slug}`);
  }

  return conceptIds;
}

const publishedDocsIndex = buildPublishedDocsIndex(
  loadPublishedDocsPagesSync("en"),
);

export const PUBLISHED_DOCS_INDEX = publishedDocsIndex;
export const PUBLISHED_DOCS_REGISTRY_IDS = publishedDocsIndex.registryIds;
export const PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS =
  derivePublishedConceptSectionRegistryIds(publishedDocsIndex);
export const MODULE_BACKED_CONCEPT_REGISTRY_IDS =
  deriveModuleBackedConceptRegistryIds(publishedDocsIndex);

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
