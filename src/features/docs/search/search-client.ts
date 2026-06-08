import { type StaticOptions, useDocsSearch } from "fumadocs-core/search/client";
import type { DependencyList } from "react";
import { DOCS_SEARCH_API_PATH } from "@/lib/search/docs-search-bootstrap-path";
import { modelAtlasOramaSearchClient } from "./model-atlas-search-client";
import type { SearchResultMetaRecord } from "./search-result-meta-client";

export { DOCS_SEARCH_API_PATH } from "@/lib/search/docs-search-bootstrap-path";

/**
 * Literal `process.env.NEXT_PUBLIC_*` access so Next.js inlines the bootstrap path
 * from `next.config.ts` into static export client bundles.
 */
const bakedDocsSearchBootstrapFrom =
  process.env.NEXT_PUBLIC_DOCS_SEARCH_BOOTSTRAP_FROM ?? DOCS_SEARCH_API_PATH;

export const docsSearchStaticOptions = {
  type: "static",
  from: bakedDocsSearchBootstrapFrom,
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
