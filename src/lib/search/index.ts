export {
  buildSearchDocument,
  buildSearchDocuments,
  buildSearchDocumentsForLocale,
} from "./build-documents";
export {
  createOramaDatabase,
  exportOramaIndexSnapshot,
  toOramaRecord,
} from "./orama-index";
export { toFumadocsIndexEntry, toStructuredData } from "./to-structured-data";
export type {
  FumadocsSearchIndexEntry,
  FumadocsStructuredData,
  SearchDocument,
  SearchDocumentFacets,
} from "./types";
export type { OramaSearchRecord } from "./orama-index";
