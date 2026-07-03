import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { loadBlogSearchPostSources } from "./build-blog-search-document";
import { buildSearchDocumentsForLocale } from "./build-documents";
import type { SearchDocument, SearchDocumentTopology } from "./types";

export type SearchResultMeta = {
  title: string;
  kind: string;
  description: string;
  tags: string[];
  directAliases: string[];
  aliases: string[];
  topology: SearchDocumentTopology;
};

export function buildSearchResultMetaMap(
  documents: SearchDocument[],
): Map<string, SearchResultMeta> {
  const map = new Map<string, SearchResultMeta>();
  for (const document of documents) {
    map.set(document.url, {
      title: document.title,
      kind: document.kind,
      description: document.description,
      tags: document.tags,
      directAliases: document.directAliases,
      aliases: document.aliases,
      topology: document.topology,
    });
  }
  return map;
}

export async function loadSearchResultMetaMap(): Promise<
  Map<string, SearchResultMeta>
>;
export async function loadSearchResultMetaMap(
  locale: SiteLocale,
): Promise<Map<string, SearchResultMeta>>;
export async function loadSearchResultMetaMap(
  locale: SiteLocale = defaultLocale,
): Promise<Map<string, SearchResultMeta>> {
  const indexes = await loadRegistry();
  const [pages, blogPosts] = await Promise.all([
    loadShippedLocalizedDocsPages(locale),
    loadBlogSearchPostSources({ locale }),
  ]);
  const documents = buildSearchDocumentsForLocale(
    locale,
    indexes,
    pages,
    blogPosts,
  );
  return buildSearchResultMetaMap(documents);
}
