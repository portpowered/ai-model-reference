import type { DocsPageSource } from "@/lib/content/pages";
import type { RegistryIndexes } from "@/lib/content/registry";
import { buildBaseSearchDocument } from "./build-base-document";
import { enrichSearchDocument } from "./enrich-search-document";
import { enrichSearchDocumentWithModelAtlasAiFacets } from "./model-atlas-ai-search-enrichment-adapter";
import type { SearchDocument } from "./types";

export function buildSearchDocument(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): SearchDocument {
  const base = buildBaseSearchDocument(page, indexes);
  const generic = enrichSearchDocument(base, indexes);
  return enrichSearchDocumentWithModelAtlasAiFacets(generic, indexes);
}

export function buildSearchDocuments(
  pages: DocsPageSource[],
  indexes: RegistryIndexes,
): SearchDocument[] {
  return pages.map((page) => buildSearchDocument(page, indexes));
}

export function buildSearchDocumentsForLocale(
  locale: string,
  indexes: RegistryIndexes,
  pages: DocsPageSource[],
): SearchDocument[] {
  if (locale.trim() === "") {
    throw new Error("Search document locale must be non-empty.");
  }

  return buildSearchDocuments(pages, indexes);
}
