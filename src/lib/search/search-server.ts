import { createSearchAPI } from "fumadocs-core/search/server";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "./build-documents";
import { toAdvancedSearchIndexes } from "./to-advanced-index";

const DEFAULT_LOCALE = "en";
const SEARCH_LANGUAGE = "english";

const indexes = await loadRegistry();
const pages = await loadPublishedDocsPages(DEFAULT_LOCALE);
const documents = buildSearchDocuments(pages, indexes);

export const docsSearchApi = createSearchAPI("advanced", {
  language: SEARCH_LANGUAGE,
  indexes: toAdvancedSearchIndexes(documents),
});
