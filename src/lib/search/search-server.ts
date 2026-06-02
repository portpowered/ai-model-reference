import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { createSearchAPI } from "fumadocs-core/search/server";
import { buildSearchDocuments } from "./build-documents";
import { toAdvancedSearchIndexes } from "./to-advanced-index";

const DEFAULT_LOCALE = "en";
const SEARCH_LANGUAGE = "english";

function loadSearchIndexes() {
  const registry = loadRegistry();
  const pages = loadPublishedDocsPages(DEFAULT_LOCALE);
  const documents = buildSearchDocuments(pages, registry);
  return toAdvancedSearchIndexes(documents);
}

export const docsSearchApi = createSearchAPI("advanced", {
  language: SEARCH_LANGUAGE,
  indexes: loadSearchIndexes(),
});
