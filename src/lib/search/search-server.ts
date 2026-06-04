import { initAdvancedSearch } from "fumadocs-core/search/server";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "./build-documents";
import { rerankSearchResults } from "./rerank-search-results";
import { toAdvancedSearchIndexes } from "./to-advanced-index";

const DEFAULT_LOCALE = "en";
const SEARCH_LANGUAGE = "english";

const indexes = await loadRegistry();
const pages = await loadPublishedDocsPages(DEFAULT_LOCALE);
const documents = buildSearchDocuments(pages, indexes);
const documentsByUrl = new Map(
  documents.map((document) => [document.url, document]),
);

const searchServer = initAdvancedSearch({
  language: SEARCH_LANGUAGE,
  indexes: toAdvancedSearchIndexes(documents),
});

function readSearchOptions(url: URL) {
  const params = url.searchParams;
  const limit = params.has("limit") ? Number(params.get("limit")) : undefined;

  return {
    tag: params.get("tag")?.split(","),
    locale: params.get("locale") ?? undefined,
    limit: Number.isInteger(limit) ? limit : undefined,
  };
}

async function search(
  query: string,
  searchOptions?: Parameters<typeof searchServer.search>[1],
) {
  const results = await searchServer.search(query, searchOptions);
  return rerankSearchResults(query, results, documentsByUrl);
}

export const docsSearchApi = {
  export: searchServer.export.bind(searchServer),
  staticGET: async () => Response.json(await searchServer.export()),
  search,
  GET: async (request: Request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query");
    if (!query) {
      return Response.json([]);
    }

    return Response.json(await search(query, readSearchOptions(url)));
  },
};
