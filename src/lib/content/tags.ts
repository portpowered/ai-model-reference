import { loadRegistry } from "./registry";
import type { TagRecord } from "./schemas";

/** Human-readable label for a kebab-case tag slug. */
export function formatTagLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Canonical tag landing URL for a registry tag slug. */
export function tagPageHref(slug: string): string {
  return `/tags/${slug}`;
}

import { loadTagMessages } from "./tag-messages";
import type { UiMessages } from "./ui-messages.types";

const TAG_CATEGORY_ORDER = [
  "architecture",
  "module-type",
  "training",
  "inference",
  "systems",
  "modality",
  "paper-topic",
  "model-family",
  "difficulty",
] as const;

export type TagIndexEntry = {
  slug: string;
  title: string;
  summary: string;
  url: string;
  category: string;
  categoryLabel: string;
};

export type TagIndexCategoryGroup = {
  category: string;
  categoryLabel: string;
  tags: TagIndexEntry[];
};

function isPublishedTagRecord(record: TagRecord): boolean {
  return record.status === "published";
}

function categorySortIndex(category: string): number {
  const index = TAG_CATEGORY_ORDER.indexOf(
    category as (typeof TAG_CATEGORY_ORDER)[number],
  );
  return index === -1 ? TAG_CATEGORY_ORDER.length : index;
}

export function formatTagCategoryLabel(
  messages: UiMessages,
  category: string,
): string {
  return messages.tagCategories[category] ?? category;
}

export function toTagIndexEntry(
  record: TagRecord,
  messages: UiMessages,
  locale = "en",
): TagIndexEntry {
  const tagMessages = loadTagMessages(record.slug, locale);
  const categoryLabel = formatTagCategoryLabel(messages, record.category);

  return {
    slug: record.slug,
    title: tagMessages.title,
    summary: tagMessages.summary,
    url: `/tags/${record.slug}`,
    category: record.category,
    categoryLabel,
  };
}

export function sortTagIndexEntriesByTitle(
  entries: TagIndexEntry[],
): TagIndexEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

export async function loadPublishedTagIndexEntries(
  messages: UiMessages,
  locale = "en",
): Promise<TagIndexEntry[]> {
  const indexes = await loadRegistry();
  const entries = [...indexes.tagsBySlug.values()]
    .filter(isPublishedTagRecord)
    .map((record) => toTagIndexEntry(record, messages, locale));
  return sortTagIndexEntriesByTitle(entries);
}

export function groupTagIndexEntriesByCategory(
  entries: TagIndexEntry[],
): TagIndexCategoryGroup[] {
  const byCategory = new Map<string, TagIndexEntry[]>();

  for (const entry of entries) {
    const group = byCategory.get(entry.category) ?? [];
    group.push(entry);
    byCategory.set(entry.category, group);
  }

  return [...byCategory.entries()]
    .sort(
      ([categoryA], [categoryB]) =>
        categorySortIndex(categoryA) - categorySortIndex(categoryB) ||
        categoryA.localeCompare(categoryB, "en", { sensitivity: "base" }),
    )
    .map(([category, tags]) => ({
      category,
      categoryLabel: tags[0]?.categoryLabel ?? category,
      tags: sortTagIndexEntriesByTitle(tags),
    }));
}

export async function loadPublishedTagIndexGroups(
  messages: UiMessages,
  locale = "en",
): Promise<TagIndexCategoryGroup[]> {
  const entries = await loadPublishedTagIndexEntries(messages, locale);
  return groupTagIndexEntriesByCategory(entries);
}
