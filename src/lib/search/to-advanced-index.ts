import { toStructuredData } from "./to-structured-data";
import type { SearchDocument } from "./types";

function toAdvancedPageId(documentId: string): string {
  return `page:${documentId}#page`;
}

export type DocsAdvancedSearchIndex = {
  id: string;
  title: string;
  description?: string;
  url: string;
  structuredData: ReturnType<typeof toStructuredData>;
  tag?: string | string[];
};

export function toAdvancedSearchIndex(
  document: SearchDocument,
): DocsAdvancedSearchIndex {
  return {
    id: toAdvancedPageId(document.id),
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
