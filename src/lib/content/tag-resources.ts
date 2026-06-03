import type { DocsPageSource } from "./pages";
import { getRegistryRecord, type RegistryIndexes } from "./registry-index";
import type { TagRecord } from "./schemas";
import type { UiMessages } from "./ui-messages.types";
import { formatPageKind } from "./ui-messages.types";

const TAG_RESOURCE_KIND_ORDER = [
  "model",
  "module",
  "concept",
  "paper",
  "blog",
  "training-regime",
  "system",
  "glossary",
] as const;

export type TagResourceEntry = {
  title: string;
  summary: string;
  url: string;
  slug: string;
  kind: string;
};

export type TagResourceKindGroup = {
  kind: string;
  kindLabel: string;
  resources: TagResourceEntry[];
};

export type TagLandingContext = {
  slug: string;
  title: string;
  summary: string;
  categoryLabel: string;
};

function kindSortIndex(kind: string): number {
  const index = TAG_RESOURCE_KIND_ORDER.indexOf(
    kind as (typeof TAG_RESOURCE_KIND_ORDER)[number],
  );
  return index === -1 ? TAG_RESOURCE_KIND_ORDER.length : index;
}

function pageMatchesTag(
  page: DocsPageSource,
  tagSlug: string,
  indexes: RegistryIndexes,
): boolean {
  if (page.frontmatter.tags.includes(tagSlug)) {
    return true;
  }
  const record = getRegistryRecord(indexes, page.frontmatter.registryId);
  return record?.tags.includes(tagSlug) ?? false;
}

export function toTagResourceEntry(page: DocsPageSource): TagResourceEntry {
  const slugSegment = page.docsSlug.split("/").at(-1) ?? page.docsSlug;
  return {
    title: page.messages.title,
    summary: page.messages.description,
    url: page.url,
    slug: slugSegment,
    kind: page.frontmatter.kind,
  };
}

export function sortTagResourceEntriesByTitle(
  entries: TagResourceEntry[],
): TagResourceEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

function isPublishedTagRecord(record: TagRecord): boolean {
  return record.status === "published";
}

export async function loadPublishedTagRecord(
  slug: string,
): Promise<TagRecord | undefined> {
  const { loadRegistry } = await import("./registry");
  const indexes = await loadRegistry();
  const record = indexes.tagsBySlug.get(slug);
  if (record && isPublishedTagRecord(record)) {
    return record;
  }
  return undefined;
}

export async function loadTagResourceEntries(
  tagSlug: string,
  locale = "en",
): Promise<TagResourceEntry[]> {
  const { loadRegistry } = await import("./registry");
  const { loadPublishedDocsPages } = await import("./pages");
  const indexes = await loadRegistry();
  const pages = (await loadPublishedDocsPages(locale)).filter((page) =>
    pageMatchesTag(page, tagSlug, indexes),
  );
  return sortTagResourceEntriesByTitle(pages.map(toTagResourceEntry));
}

export function groupTagResourceEntriesByKind(
  entries: TagResourceEntry[],
  messages: UiMessages,
): TagResourceKindGroup[] {
  const byKind = new Map<string, TagResourceEntry[]>();

  for (const entry of entries) {
    const group = byKind.get(entry.kind) ?? [];
    group.push(entry);
    byKind.set(entry.kind, group);
  }

  return [...byKind.entries()]
    .sort(
      ([kindA], [kindB]) =>
        kindSortIndex(kindA) - kindSortIndex(kindB) ||
        kindA.localeCompare(kindB, "en", { sensitivity: "base" }),
    )
    .map(([kind, resources]) => ({
      kind,
      kindLabel: formatPageKind(messages, kind),
      resources: sortTagResourceEntriesByTitle(resources),
    }));
}

export async function loadTagResourceGroups(
  tagSlug: string,
  messages: UiMessages,
  locale = "en",
): Promise<TagResourceKindGroup[]> {
  const entries = await loadTagResourceEntries(tagSlug, locale);
  return groupTagResourceEntriesByKind(entries, messages);
}

export async function loadTagLandingContext(
  slug: string,
  messages: UiMessages,
  locale = "en",
): Promise<TagLandingContext | undefined> {
  const record = await loadPublishedTagRecord(slug);
  if (!record) {
    return undefined;
  }

  const { loadTagMessages } = await import("./tag-messages");
  const tagMessages = loadTagMessages(record.slug, locale);
  const categoryLabel =
    messages.tagCategories[record.category] ?? record.category;

  return {
    slug: record.slug,
    title: tagMessages.title,
    summary: tagMessages.summary,
    categoryLabel,
  };
}
