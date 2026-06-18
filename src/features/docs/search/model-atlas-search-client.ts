import type { StaticOptions } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import type { SearchResultMetaForCollapse } from "@/lib/search/collapse-search-results-from-meta";
import {
  collapseSearchResultsWithMeta,
  documentsByUrlFromMeta,
} from "@/lib/search/collapse-search-results-from-meta";
import { rerankSearchResults } from "@/lib/search/rerank-search-results";
import { createModelAtlasSearchDatabase } from "@/lib/search/tokenizer";

const DEFAULT_STATIC_SEARCH_OPTIONS = {
  limit: 120,
  groupBy: {
    maxResult: 16,
  },
} as const;

export function modelAtlasOramaSearchClient(
  options: StaticOptions,
  metaByUrl: Record<string, SearchResultMetaForCollapse>,
) {
  const mergedSearchOptions = {
    ...DEFAULT_STATIC_SEARCH_OPTIONS,
    ...options.search,
    groupBy: {
      ...DEFAULT_STATIC_SEARCH_OPTIONS.groupBy,
      ...(options.search?.groupBy ?? {}),
    } as NonNullable<NonNullable<StaticOptions["search"]>["groupBy"]>,
  } as NonNullable<StaticOptions["search"]>;

  const base = oramaStaticClient({
    ...options,
    initOrama: options.initOrama ?? createModelAtlasSearchDatabase,
    search: mergedSearchOptions,
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
