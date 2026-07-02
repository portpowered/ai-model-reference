import { initAdvancedSearch } from "fumadocs-core/search/server";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  defaultLocale,
  resolveLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { buildSearchDocumentsForLocale } from "./build-documents";
import {
  resolveClassificationSearchQuery,
  resolveSearchClassificationScope,
} from "./classification-scope";
import { collapseSearchResultsToPageHits } from "./collapse-search-results-to-page-hits";
import { rerankSearchResults } from "./rerank-search-results";
import { toAdvancedSearchIndexes } from "./to-advanced-index";
import type { SearchDocument } from "./types";

const SEARCH_LANGUAGE = "english";

type SearchCatalog = {
  searchServer: ReturnType<typeof initAdvancedSearch>;
  documentsByUrl: Map<string, SearchDocument>;
};

const searchCatalogs = new Map<SiteLocale, Promise<SearchCatalog>>();

async function loadSearchCatalog(locale: SiteLocale): Promise<SearchCatalog> {
  const indexes = await loadRegistry();
  const pages = await loadShippedLocalizedDocsPages(locale);
  const documents = buildSearchDocumentsForLocale(locale, indexes, pages);

  return {
    searchServer: initAdvancedSearch({
      language: SEARCH_LANGUAGE,
      indexes: toAdvancedSearchIndexes(documents),
    }),
    documentsByUrl: new Map(
      documents.map((document) => [document.url, document]),
    ),
  };
}

async function getSearchCatalog(locale: SiteLocale): Promise<SearchCatalog> {
  const existing = searchCatalogs.get(locale);
  if (existing) {
    return existing;
  }

  const pending = loadSearchCatalog(locale);
  searchCatalogs.set(locale, pending);
  return pending;
}

function readSearchOptions(url: URL) {
  const params = url.searchParams;
  const limit = params.has("limit") ? Number(params.get("limit")) : undefined;
  const localeParam = params.get("locale");

  return {
    tag: params.get("tag")?.split(","),
    classification: params.get("classification") ?? undefined,
    locale: localeParam ? resolveLocale(localeParam) : undefined,
    limit: Number.isInteger(limit) ? limit : undefined,
  };
}

async function search(
  query: string,
  searchOptions?: {
    tag?: string[];
    classification?: string;
    locale?: SiteLocale;
    limit?: number;
  },
) {
  const locale = searchOptions?.locale ?? defaultLocale;
  const { searchServer, documentsByUrl } = await getSearchCatalog(locale);
  const classificationScope = resolveSearchClassificationScope(
    searchOptions?.classification,
    documentsByUrl,
  );
  const effectiveQuery = resolveClassificationSearchQuery(
    query,
    searchOptions?.classification,
    classificationScope,
  );
  if (!effectiveQuery) {
    return [];
  }

  const { tag, limit } = searchOptions ?? {};
  const results = await searchServer.search(effectiveQuery, { tag, limit });
  const rerankQuery = query.trim() || effectiveQuery;
  const reranked = rerankSearchResults(rerankQuery, results, documentsByUrl, {
    classificationScope,
  });
  return collapseSearchResultsToPageHits(reranked, documentsByUrl);
}

export const docsSearchApi = {
  export: async (locale: SiteLocale = defaultLocale) =>
    (await getSearchCatalog(locale)).searchServer.export(),
  staticGET: async (locale: SiteLocale = defaultLocale) =>
    Response.json(await docsSearchApi.export(locale)),
  search,
  GET: async (request: Request) => {
    const url = new URL(request.url);
    const searchOptions = readSearchOptions(url);
    const query = url.searchParams.get("query");
    if (!query && !searchOptions.classification) {
      return Response.json(
        await docsSearchApi.export(searchOptions.locale ?? defaultLocale),
      );
    }

    return Response.json(await search(query ?? "", searchOptions));
  },
};
