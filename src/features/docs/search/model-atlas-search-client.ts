import type { StaticOptions } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
  resolveClassificationSearchQuery,
  resolveSearchClassificationScope,
} from "@/lib/search/classification-scope";
import type { SearchResultMetaForCollapse } from "@/lib/search/collapse-search-results-from-meta";
import {
  collapseSearchResultsWithMeta,
  documentsByUrlFromMeta,
} from "@/lib/search/collapse-search-results-from-meta";
import { rerankSearchResults } from "@/lib/search/rerank-search-results";

const DEFAULT_STATIC_SEARCH_OPTIONS = {
  limit: 120,
  groupBy: {
    maxResult: 16,
  },
} as const;

export function modelAtlasOramaSearchClient(
  options: StaticOptions,
  metaByUrl: Record<string, SearchResultMetaForCollapse>,
  searchOptions: { classification?: string | null } = {},
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
    search: mergedSearchOptions,
  });
  const documentsByUrl = documentsByUrlFromMeta(metaByUrl);
  const classificationScope = resolveSearchClassificationScope(
    searchOptions.classification,
    documentsByUrl,
  );

  return {
    deps: base.deps,
    async search(query: string) {
      const effectiveQuery = resolveClassificationSearchQuery(
        query,
        searchOptions.classification,
        classificationScope,
      );
      if (!effectiveQuery) {
        return [];
      }

      const results = await base.search(effectiveQuery);
      const rerankQuery = query.trim() || effectiveQuery;
      const reranked = rerankSearchResults(
        rerankQuery,
        results,
        documentsByUrl,
        {
          classificationScope,
        },
      );
      return collapseSearchResultsWithMeta(reranked, metaByUrl);
    },
  };
}
