import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { DocsPageSource } from "./pages";

export type GlossaryEntry = {
  title: string;
  summary: string;
  url: string;
  slug: string;
};

export type GlossaryPageListing = {
  slug: string;
  title: string;
  summary: string;
  url: string;
};

export type ListPublishedGlossaryPagesOptions = {
  /** Glossary docs root override for fixture tests (defaults to published content). */
  contentRoot?: string;
  locale?: SiteLocale;
};

function isEnoent(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function glossarySlugFromDocsSlug(docsSlug: string): string {
  const slash = docsSlug.lastIndexOf("/");
  return slash === -1 ? docsSlug : docsSlug.slice(slash + 1);
}

function toGlossaryPageListing(entry: GlossaryEntry): GlossaryPageListing {
  return {
    slug: glossarySlugFromDocsSlug(entry.slug),
    title: entry.title,
    summary: entry.summary,
    url: entry.url,
  };
}

export function toGlossaryEntry(page: DocsPageSource): GlossaryEntry {
  return {
    title: page.messages.title,
    summary: page.messages.description,
    url: page.url,
    slug: page.docsSlug,
  };
}

export function sortGlossaryEntriesByTitle(
  entries: GlossaryEntry[],
  locale: SiteLocale = defaultLocale,
): GlossaryEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, locale, { sensitivity: "base" }),
  );
}

export async function loadPublishedGlossaryEntries(
  locale: SiteLocale = defaultLocale,
): Promise<GlossaryEntry[]> {
  const { loadShippedLocalizedDocsPages } = await import("./pages");
  const pages = (await loadShippedLocalizedDocsPages(locale)).filter(
    (page) => page.frontmatter.kind === "glossary",
  );
  return sortGlossaryEntriesByTitle(pages.map(toGlossaryEntry), locale);
}

/**
 * Lists published glossary pages via the shared `loadPublishedDocsPages` scanner.
 * Consolidates the former `glossary-pages.ts` filesystem walk with glossary index loading.
 */
export async function listPublishedGlossaryPages(
  options: ListPublishedGlossaryPagesOptions = {},
): Promise<GlossaryPageListing[]> {
  const locale = options.locale ?? defaultLocale;

  if (options.contentRoot) {
    const { loadShippedLocalizedDocsPages } = await import("./pages");
    try {
      const pages = (
        await loadShippedLocalizedDocsPages(locale, options.contentRoot)
      ).filter((page) => page.frontmatter.kind === "glossary");
      return sortGlossaryEntriesByTitle(pages.map(toGlossaryEntry), locale).map(
        toGlossaryPageListing,
      );
    } catch (error) {
      if (isEnoent(error)) {
        return [];
      }
      throw error;
    }
  }

  const entries = await loadPublishedGlossaryEntries(locale);
  return entries.map(toGlossaryPageListing);
}
