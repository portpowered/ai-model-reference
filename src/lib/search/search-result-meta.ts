import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "./build-documents";
import type { SearchDocument } from "./types";

export type SearchResultMeta = {
  kind: string;
  description: string;
  tags: string[];
};

const DEFAULT_LOCALE = "en";

export function buildSearchResultMetaMap(
  documents: SearchDocument[],
): Map<string, SearchResultMeta> {
  const map = new Map<string, SearchResultMeta>();
  for (const document of documents) {
    map.set(document.url, {
      kind: document.kind,
      description: document.description,
      tags: document.tags,
    });
  }
  return map;
}

export function loadSearchResultMetaMap(): Map<string, SearchResultMeta> {
  const registry = loadRegistry();
  const pages = loadPublishedDocsPages(DEFAULT_LOCALE);
  const documents = buildSearchDocuments(pages, registry);
  return buildSearchResultMetaMap(documents);
}
