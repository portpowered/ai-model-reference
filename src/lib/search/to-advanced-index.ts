import { toStructuredData } from "./to-structured-data";
import type { SearchDocument } from "./types";

export type DocsAdvancedSearchIndex = {
  id: string;
  title: string;
  description?: string;
  url: string;
  structuredData: ReturnType<typeof toStructuredData>;
  tag?: string | string[];
};

/**
 * Fumadocs derives child Orama ids as `${pageId}-${counter}`. URL-shaped page
 * ids such as `/docs/models/glm-5` therefore collide with sibling routes like
 * `/docs/models/glm-5-2` once the parent page emits enough chunks. Registry ids
 * are not unique across surfaces, so the page URL is the stable per-route key.
 */
export function toAdvancedSearchPageId(document: SearchDocument): string {
  return `${document.url}#search-page`;
}

export function toAdvancedSearchIndex(
  document: SearchDocument,
): DocsAdvancedSearchIndex {
  return {
    id: toAdvancedSearchPageId(document),
    title: document.title,
    description: document.description,
    url: document.url,
    structuredData: toStructuredData(document),
    tag: document.tags.length > 0 ? document.tags : undefined,
  };
}

export function toAdvancedSearchIndexes(
  documents: SearchDocument[],
): DocsAdvancedSearchIndex[] {
  return documents.map((document) => toAdvancedSearchIndex(document));
}
