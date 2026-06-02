import type { SearchResultMeta } from "./search-result-meta";

export function searchResultMetaMapToRecord(
  map: Map<string, SearchResultMeta>,
): Record<string, SearchResultMeta> {
  return Object.fromEntries(map.entries());
}
