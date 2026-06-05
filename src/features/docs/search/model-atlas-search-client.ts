import type { StaticOptions } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import type { SearchResultMetaForCollapse } from "@/lib/search/collapse-search-results-from-meta";
import { collapseSearchResultsWithMeta } from "@/lib/search/collapse-search-results-from-meta";

export function modelAtlasOramaSearchClient(
  options: StaticOptions,
  metaByUrl: Record<string, SearchResultMetaForCollapse>,
) {
  const base = oramaStaticClient(options);

  return {
    deps: base.deps,
    async search(query: string) {
      const results = await base.search(query);
      return collapseSearchResultsWithMeta(results, metaByUrl);
    },
  };
}
