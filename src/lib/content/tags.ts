import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { tagPageHref } from "./content-hrefs";
import type { TagRecord } from "./schemas";
import { formatTagLabel } from "./tag-labels";

export { formatTagLabel, tagPageHref };

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

export async function toTagIndexEntry(
  record: TagRecord,
  messages: UiMessages,
  locale: SiteLocale,
): Promise<TagIndexEntry> {
  const { loadTagMessages } = await import("./tag-messages");
  const url = tagPageHref(record.slug, locale);
  const tagMessages = loadTagMessages(record.slug, locale, { route: url });
  const categoryLabel = formatTagCategoryLabel(messages, record.category);

  return {
    slug: record.slug,
    title: tagMessages.title,
    summary: tagMessages.summary,
    url,
    category: record.category,
    categoryLabel,
  };
}

export function sortTagIndexEntriesByTitle(
  entries: TagIndexEntry[],
  locale: SiteLocale = defaultLocale,
): TagIndexEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, locale, { sensitivity: "base" }),
  );
}

export async function loadPublishedTagIndexEntries(
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): Promise<TagIndexEntry[]> {
  const { loadRegistry } = await import("./registry");
  const indexes = await loadRegistry();
  const entries = await Promise.all(
    [...indexes.tagsBySlug.values()]
      .filter(isPublishedTagRecord)
      .map((record) => toTagIndexEntry(record, messages, locale)),
  );
  return sortTagIndexEntriesByTitle(entries, locale);
}

export function groupTagIndexEntriesByCategory(
  entries: TagIndexEntry[],
  locale: SiteLocale = defaultLocale,
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
        categoryA.localeCompare(categoryB, locale, { sensitivity: "base" }),
    )
    .map(([category, tags]) => ({
      category,
      categoryLabel: tags[0]?.categoryLabel ?? category,
      tags: sortTagIndexEntriesByTitle(tags, locale),
    }));
}

export async function loadPublishedTagIndexGroups(
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): Promise<TagIndexCategoryGroup[]> {
  const entries = await loadPublishedTagIndexEntries(messages, locale);
  return groupTagIndexEntriesByCategory(entries, locale);
}
