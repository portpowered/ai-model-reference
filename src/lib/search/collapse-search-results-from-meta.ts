import type { SortedResult } from "fumadocs-core/search";
import { collapseSearchResultsToPageHits } from "./collapse-search-results-to-page-hits";
import type { SearchDocument } from "./types";

export type SearchResultMetaForCollapse = {
  title: string;
  aliases?: string[];
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
      kind: "page",
      description: "",
      bodyText: "",
      headings: [],
      aliases: meta.aliases ?? [],
      tags: [],
      relatedIds: [],
      facets: { kind: "page", tags: [] },
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
