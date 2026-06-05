import { type StaticOptions, useDocsSearch } from "fumadocs-core/search/client";
import type { DependencyList } from "react";
import { modelAtlasOramaSearchClient } from "./model-atlas-search-client";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

export const DOCS_SEARCH_API_PATH = "/api/search";

export const docsSearchStaticOptions = {
  type: "static",
  from: DOCS_SEARCH_API_PATH,
} as const satisfies { type: "static" } & StaticOptions;

export type ModelAtlasDocsSearchOptions = {
  metaByUrl: SearchResultMetaRecord;
  client?: StaticOptions;
};

export function createModelAtlasSearchClient({
  metaByUrl,
  client = docsSearchStaticOptions,
}: ModelAtlasDocsSearchOptions) {
  return modelAtlasOramaSearchClient(client, metaByUrl);
}

/** @deprecated Use createModelAtlasSearchClient */
export const createDocsSearchClient = createModelAtlasSearchClient;

export function useModelAtlasDocsSearch(
  { metaByUrl, client = docsSearchStaticOptions }: ModelAtlasDocsSearchOptions,
  deps?: DependencyList,
) {
  return useDocsSearch(
    {
      client: createModelAtlasSearchClient({ metaByUrl, client }),
    },
    deps,
  );
}
