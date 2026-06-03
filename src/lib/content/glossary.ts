import { type DocsPageSource, loadPublishedDocsPages } from "./pages";

export type GlossaryEntry = {
  title: string;
  summary: string;
  url: string;
  slug: string;
};

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
): GlossaryEntry[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

export async function loadPublishedGlossaryEntries(
  locale = "en",
): Promise<GlossaryEntry[]> {
  const pages = (await loadPublishedDocsPages(locale)).filter(
    (page) => page.frontmatter.kind === "glossary",
  );
  return sortGlossaryEntriesByTitle(pages.map(toGlossaryEntry));
}
