# Search Domain Relevant Files

Use these files when changing search document construction, AI enrichment,
Orama indexing, or `/api/search` behavior.

## Core search boundary

* `src/lib/search/build-base-document.ts`
  Generic base search document construction from localized docs pages and
  registry fields. Produces page-derived fields with empty topology and
  kind/tag facets only; AI enrichment runs afterward in `build-documents.ts`.
* `src/lib/search/build-documents.ts`
  Composes base documents with AI-specific topology and facet enrichment before
  returning catalog `SearchDocument` records consumed by `search-server.ts`.
* `src/lib/search/to-advanced-index.ts`
  Projects `SearchDocument` records into Fumadocs advanced search indexes.
* `src/lib/search/search-server.ts`
  Localized search catalog, `/api/search` query handling, classification scope,
  and reranking.
* `src/app/api/search/route.ts`
  Public search API route; re-exports `docsSearchApi.GET`.

## Parity and regression tests

* `src/tests/search/search-behavior-parity.test.ts`
  Focused baseline for attention, GQA alias, tag, and classification-scoped
  search before/after the generic base + AI enrichment boundary split. Extend
  this file when adding new parity assertions for the enrichment refactor.
* `src/lib/search/build-base-document.test.ts`
  Generic base document field contract and empty topology/facet guarantees.
* `src/tests/search/build-documents.test.ts`
  Document construction and topology normalization coverage.
* `src/tests/search/search-api.test.ts`
  `/api/search` HTTP contract and `docsSearchApi` ranking regressions.
* `src/tests/search/helpers.ts`
  Shared search test URLs and result assertion helpers.
