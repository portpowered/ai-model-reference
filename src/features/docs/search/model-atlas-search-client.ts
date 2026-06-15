import type { StaticOptions } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import type { SearchResultMetaForCollapse } from "@/lib/search/collapse-search-results-from-meta";
import {
  collapseSearchResultsWithMeta,
  documentsByUrlFromMeta,
} from "@/lib/search/collapse-search-results-from-meta";
import { rerankSearchResults } from "@/lib/search/rerank-search-results";

/** Orama default (60) is too low once fragment hits collapse to page-level rows. */
const STATIC_SEARCH_FRAGMENT_FETCH_LIMIT = 200;

export function modelAtlasOramaSearchClient(
  options: StaticOptions,
  metaByUrl: Record<string, SearchResultMetaForCollapse>,
) {
  const base = oramaStaticClient({
    ...options,
    search: {
      limit: STATIC_SEARCH_FRAGMENT_FETCH_LIMIT,
      ...(typeof options.search === "object" ? options.search : {}),
    },
  });
  const documentsByUrl = documentsByUrlFromMeta(metaByUrl);

  return {
    deps: base.deps,
    async search(query: string) {
      const results = await base.search(query);
      const reranked = rerankSearchResults(query, results, documentsByUrl);
      return collapseSearchResultsWithMeta(reranked, metaByUrl);
    },
  };
}
