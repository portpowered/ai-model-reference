import type { SearchResultMeta } from "@/lib/search/search-result-meta";

export type SearchResultMetaRecord = Record<string, SearchResultMeta>;

export function resolveSearchResultMeta(
  url: string,
  metaByUrl: SearchResultMetaRecord,
): SearchResultMeta | undefined {
  return metaByUrl[url];
}

export function getMatchedTags(query: string, tags: string[]): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return tags.filter((tag) => {
    const value = tag.toLowerCase();
    return value.includes(normalized) || normalized.includes(value);
  });
}
