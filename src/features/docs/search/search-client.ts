import { type StaticOptions, useDocsSearch } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import type { DependencyList } from "react";

export const DOCS_SEARCH_API_PATH = "/api/search";

export const docsSearchStaticOptions = {
  type: "static",
  from: DOCS_SEARCH_API_PATH,
} as const satisfies { type: "static" } & StaticOptions;

export function createDocsSearchClient(
  options: StaticOptions = docsSearchStaticOptions,
) {
  return oramaStaticClient(options);
}

export function useModelAtlasDocsSearch(
  overrides: Partial<StaticOptions> = {},
  deps?: DependencyList,
) {
  return useDocsSearch(
    {
      ...docsSearchStaticOptions,
      ...overrides,
    },
    deps,
  );
}
