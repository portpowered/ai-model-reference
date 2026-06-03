import { loadRegistry } from "./registry";
import type { TagRecord } from "./schemas";
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

function isPublishedTagRecord(
  record: ReturnType<typeof loadRegistry>["records"][number],
): record is TagRecord {
  return record.kind === "tag" && record.status === "published";
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

export function loadPublishedTagIndexEntries(
  messages: UiMessages,
  locale = "en",
): TagIndexEntry[] {
  const store = loadRegistry();
  const entries = store.records
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

export function loadPublishedTagIndexGroups(
  messages: UiMessages,
  locale = "en",
): TagIndexCategoryGroup[] {
  const entries = loadPublishedTagIndexEntries(messages, locale);
  return groupTagIndexEntriesByCategory(entries);
}
