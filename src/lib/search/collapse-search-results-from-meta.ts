import type { SortedResult } from "fumadocs-core/search";
import { collapseSearchResultsToPageHits } from "./collapse-search-results-to-page-hits";
import type { SearchDocument, SearchDocumentTopology } from "./types";

export type SearchResultMetaForCollapse = {
  title: string;
  kind: string;
  tags: string[];
  directAliases?: string[];
  aliases?: string[];
  topology?: SearchDocumentTopology;
};

const emptyTopology: SearchDocumentTopology = {
  secondaryClassificationIds: [],
  secondaryClassifications: [],
  relationships: [],
  terms: [],
};

export function documentsByUrlFromMeta(
  metaByUrl: Record<string, SearchResultMetaForCollapse>,
): Map<string, SearchDocument> {
  const map = new Map<string, SearchDocument>();
  for (const [url, meta] of Object.entries(metaByUrl)) {
    map.set(url, {
      id: url,
      url,
      title: meta.title,
      kind: meta.kind,
      description: "",
      bodyText: "",
      headings: [],
      directAliases: meta.directAliases ?? meta.aliases ?? [],
      aliases: meta.aliases ?? [],
      tags: meta.tags,
      relatedIds: [],
      facets: { kind: meta.kind, tags: meta.tags },
      topology: meta.topology ?? emptyTopology,
    });
  }
  return map;
}

export function collapseSearchResultsWithMeta(
  results: SortedResult[],
  metaByUrl: Record<string, SearchResultMetaForCollapse>,
): SortedResult[] {
  return collapseSearchResultsToPageHits(
    results,
    documentsByUrlFromMeta(metaByUrl),
  );
}
