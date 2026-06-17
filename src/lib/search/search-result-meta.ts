import { defaultLocale } from "@/lib/i18n/locale-routing";
import { buildSearchDocuments } from "./build-documents";
import type { SearchDocument } from "./types";

export type SearchResultMeta = {
  title: string;
  kind: string;
  description: string;
  tags: string[];
  aliases: string[];
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
      aliases: document.aliases,
    });
  }
  return map;
}

export async function loadSearchResultMetaMap(): Promise<
  Map<string, SearchResultMeta>
> {
  const { loadRegistry } = await import("@/lib/content/registry");
  const { loadPublishedDocsPages } = await import("@/lib/content/pages");
  const indexes = await loadRegistry();
  const pages = await loadPublishedDocsPages(defaultLocale);
  const documents = buildSearchDocuments(pages, indexes);
  return buildSearchResultMetaMap(documents);
}
