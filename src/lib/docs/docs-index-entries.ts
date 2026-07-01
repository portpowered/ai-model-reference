import type { DocsIndexEntry } from "@/features/docs/components/DocsIndexEntryList";
import type { SiteLocale } from "@/lib/i18n/locale-routing";

export function toDocsIndexEntries(
  pages: Array<{
    docsSlug: string;
    url: string;
    messages: { title: string; description: string };
  }>,
  locale: SiteLocale,
  preferredSlugs: string[] = [],
  limit = 6,
): DocsIndexEntry[] {
  const sortedPages = [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, locale, {
      sensitivity: "base",
    }),
  );
  const pagesBySlug = new Map(sortedPages.map((page) => [page.docsSlug, page]));
  const preferredPages = preferredSlugs
    .map((slug) => pagesBySlug.get(slug))
    .filter((page): page is (typeof sortedPages)[number] => Boolean(page));
  const remainingPages = sortedPages.filter(
    (page) => !preferredSlugs.includes(page.docsSlug),
  );

  return [...preferredPages, ...remainingPages].slice(0, limit).map((page) => ({
    slug: page.docsSlug,
    title: page.messages.title,
    summary: page.messages.description,
    url: page.url,
  }));
}
