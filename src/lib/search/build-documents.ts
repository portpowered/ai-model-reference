import type { DocsPageSource } from "@/lib/content/pages";
import type { RegistryIndexes } from "@/lib/content/registry";
import { buildBaseSearchDocument } from "./build-base-document";
import {
  type BlogSearchPostSource,
  buildBlogSearchDocuments,
} from "./build-blog-search-document";
import { enrichSearchDocument } from "./enrich-search-document";
import type { SearchDocument } from "./types";

export function buildSearchDocument(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): SearchDocument {
  const base = buildBaseSearchDocument(page, indexes);
  return enrichSearchDocument(base, indexes);
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
  blogPosts: BlogSearchPostSource[] = [],
): SearchDocument[] {
  if (locale.trim() === "") {
    throw new Error("Search document locale must be non-empty.");
  }

  return [
    ...buildSearchDocuments(pages, indexes),
    ...buildBlogSearchDocuments(blogPosts, indexes),
  ];
}
