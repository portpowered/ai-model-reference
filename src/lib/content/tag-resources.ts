import type { PublishedBlogPostRecord } from "@/lib/content/blog-post-list";
import { publishedResourceMatchesTag } from "@/lib/content/phase-1-published-resources";
import {
  buildLocalizedRoute,
  defaultLocale,
  localizePath,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import type { DocsPageSource } from "./pages";
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
  publishedAt?: string;
  tags?: string[];
};

export type LoadTagResourceEntriesOptions = {
  /** Blog content root override for fixture tests (defaults to production `BLOG_ROOT`). */
  blogRoot?: string;
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

export function toBlogTagResourceEntry(
  post: PublishedBlogPostRecord,
  locale: SiteLocale = defaultLocale,
): TagResourceEntry {
  return {
    title: post.messages.title,
    summary: post.messages.description,
    url: localizePath(`/blog/${post.slug}`, locale),
    slug: post.slug,
    kind: "blog",
    publishedAt: post.frontmatter.publishedAt,
    tags: post.frontmatter.tags,
  };
}

export function publishedBlogPostMatchesTag(
  post: PublishedBlogPostRecord,
  tagSlug: string,
): boolean {
  return post.frontmatter.tags.includes(tagSlug);
}

export function sortTagResourceEntriesByTitle(
  entries: TagResourceEntry[],
  locale: SiteLocale = defaultLocale,
): TagResourceEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, locale, { sensitivity: "base" }),
  );
}

export function sortTagResourceEntriesForKind(
  entries: TagResourceEntry[],
  kind: string,
  locale: SiteLocale = defaultLocale,
): TagResourceEntry[] {
  if (kind === "blog") {
    return [...entries].sort((left, right) => {
      const dateCompare = (right.publishedAt ?? "").localeCompare(
        left.publishedAt ?? "",
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.title.localeCompare(right.title, locale, {
        sensitivity: "base",
      });
    });
  }

  return sortTagResourceEntriesByTitle(entries, locale);
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
  locale: SiteLocale = defaultLocale,
  options: LoadTagResourceEntriesOptions = {},
): Promise<TagResourceEntry[]> {
  const { loadRegistry } = await import("./registry");
  const { loadShippedLocalizedDocsPages } = await import("./pages");
  const { listPublishedBlogPosts } = await import("./blog-post-list");
  const indexes = await loadRegistry();
  const pages = (await loadShippedLocalizedDocsPages(locale)).filter((page) =>
    publishedResourceMatchesTag(page, tagSlug, indexes),
  );
  const docsEntries = pages.map(toTagResourceEntry);
  const blogEntries = (
    await listPublishedBlogPosts({ blogRoot: options.blogRoot, locale })
  )
    .filter((post) => publishedBlogPostMatchesTag(post, tagSlug))
    .map((post) => toBlogTagResourceEntry(post, locale));

  return [...docsEntries, ...blogEntries];
}

export function groupTagResourceEntriesByKind(
  entries: TagResourceEntry[],
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
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
        kindA.localeCompare(kindB, locale, { sensitivity: "base" }),
    )
    .map(([kind, resources]) => ({
      kind,
      kindLabel: formatPageKind(messages, kind),
      resources: sortTagResourceEntriesForKind(resources, kind, locale),
    }));
}

export async function loadTagResourceGroups(
  tagSlug: string,
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
  options: LoadTagResourceEntriesOptions = {},
): Promise<TagResourceKindGroup[]> {
  const entries = await loadTagResourceEntries(tagSlug, locale, options);
  return groupTagResourceEntriesByKind(entries, messages, locale);
}

export async function loadTagLandingContext(
  slug: string,
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): Promise<TagLandingContext | undefined> {
  const record = await loadPublishedTagRecord(slug);
  if (!record) {
    return undefined;
  }

  const { loadTagMessages } = await import("./tag-messages");
  const route = buildLocalizedRoute(
    { surface: "tag-page", slug: record.slug },
    locale,
  );
  const tagMessages = loadTagMessages(record.slug, locale, { route });
  const categoryLabel =
    messages.tagCategories[record.category] ?? record.category;

  return {
    slug: record.slug,
    title: tagMessages.title,
    summary: tagMessages.summary,
    categoryLabel,
  };
}
