export {
  buildSearchDocument,
  buildSearchDocuments,
  buildSearchDocumentsForLocale,
} from "./build-documents";
export type { OramaSearchRecord, OramaSnapshotDocument } from "./orama-index";
export {
  createOramaDatabase,
  exportOramaIndexSnapshot,
  toOramaRecord,
  toOramaSnapshotDocument,
} from "./orama-index";
export { docsSearchApi } from "./search-server";
export type { DocsAdvancedSearchIndex } from "./to-advanced-index";
export {
  toAdvancedSearchIndex,
  toAdvancedSearchIndexes,
} from "./to-advanced-index";
export { toFumadocsIndexEntry, toStructuredData } from "./to-structured-data";
export type {
  FumadocsSearchIndexEntry,
  FumadocsStructuredData,
  SearchDocument,
  SearchDocumentFacets,
} from "./types";
