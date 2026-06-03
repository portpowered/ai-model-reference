# PRD: Phase 1 Search Experience and Coverage

## Introduction

Model Atlas Phase 1 already has a search document builder, Orama advanced index, `/api/search` static export, and a global Fumadocs search dialog wired through `RootProvider`. Readers still cannot complete the Phase 1 manual gate: there is no dedicated `/search` experience that runs queries and lists rich results, token discovery is not covered by search API tests, and result rows do not consistently expose every field the customer asked for (title, summary, kind, tags, and URL).

This work item turns the Orama/search-document baseline into a **usable search experience** for the Phase 1 sample surface (grouped-query attention module and token glossary only). It delivers a search page and/or dialog entry that queries static search documents, satisfies the required GQA and token discovery checks, and adds deterministic Bun tests at the builder, index, API/client, and UI-helper layers.

## Context

### Customer ask

Phase 1 completion: turn the existing Orama/search-document baseline into a usable search experience for the sample site surface. Implement a search page or dialog entry that queries the static search documents for the Phase 1 records and displays result title, summary, kind, tags, and URL. Search must find grouped-query attention by title, alias GQA, tag attention, and body text KV cache, and must find token by title and body/alias text. Add deterministic Bun tests for the search document builder/index and UI-facing search helper behavior. Do not add Phase 2 glossary pages.

### Problem

The search stack indexes Phase 1 content and passes partial automated checks for grouped-query attention (`GQA`, `attention`, `KV cache`), but readers lack a first-class search surface at `/search` with visible results metadata, token queries are not asserted in the search API/client test suite, and the global dialog does not show canonical URLs—blocking checklist items for search entry and “search finds GQA, attention, and KV cache.” Tag landings and home can open search, yet there is no durable page for bookmarking, sharing, or no-JS-friendly discovery.

### Solution

Extend the existing `src/lib/search` pipeline and `src/features/docs/search` UI without new content types: keep indexing limited to published Phase 1 docs pages, add explicit ranking tests for GQA and token queries, introduce a shared result presentation component (title, summary, kind badge, tags, URL), upgrade the global search dialog to use it, and implement `/search` as an inline query + results page that reuses the same static Orama client and result meta map. Wire shell navigation, home search entry, and tag handoffs to open search with optional `?q=` / `?tag=` prefill. Do not author Phase 2 glossary or architecture pages.

## Description

Deliver Phase 1 search **experience and coverage**: query static Orama search documents for grouped-query attention and token, show full result metadata in the dialog and on `/search`, meet GQA/token discovery acceptance checks, and lock behavior with deterministic Bun tests—building on the sibling `phase-1-entry-and-index-routes` work for the documented `/search` route shell and navigation links.

## Goals

- Provide a usable search entry via global dialog (Cmd/Ctrl+K) and a dedicated `/search` page with inline query and results.
- Return grouped-query attention for queries against its title, alias `GQA`, tag `attention`, and body text `KV cache` (including normalized variants).
- Return the token glossary for queries against its title and body/alias text (e.g. `tokenizer`, `tokens`).
- Display each result’s title, summary (description), kind, tags, and canonical URL in both dialog and page views.
- Keep the index limited to Phase 1 published docs pages (sample module + token glossary); no Phase 2 glossary expansion.
- Add deterministic Bun tests for document building, Orama snapshot export, search API/client ranking, and UI-facing search helpers.

## Project-Level Acceptance Criteria

- [ ] Global search dialog opens from the shell trigger and keyboard shortcut, with loading, empty, and success states.
- [ ] `/search` renders inside the docs shell, accepts a query (and optional `?q=` / `?tag=` prefill), and lists results with title, summary, kind, tags, and URL for each hit.
- [ ] Query `Grouped-Query Attention` or `GQA` returns grouped-query attention as a top result; query `attention` includes it among relevant results; query `KV cache` (and normalized `kv cache` / `kv-cache`) includes it among relevant results.
- [ ] Query `Token` returns the token glossary as a top result; queries `tokens` or `tokenizer` include the token glossary among relevant results.
- [ ] Search indexes only published Phase 1 docs pages (at minimum grouped-query attention and token); no new Phase 2 glossary pages are added.
- [ ] Bun tests cover `buildSearchDocuments`, Orama snapshot export, `docsSearchApi` ranking for GQA and token cases, and UI search helpers (`createDocsSearchClient`, result meta resolution).
- [ ] Typecheck, lint, and tests pass via `make ci`.

## User Stories

### phase-1-search-experience-and-coverage-001: Lock Phase 1 search document builder coverage

**Description:** As a maintainer, I need deterministic tests proving Phase 1 search documents include the fields Orama uses for GQA and token discovery.

**Acceptance Criteria:**

- [ ] `buildSearchDocuments` produces a document for `/docs/modules/grouped-query-attention` with title `Grouped-Query Attention`, description mentioning `KV cache`, aliases including `GQA`, tags including `attention` and `kv-cache`, and body text containing `GQA` and KV-cache-related prose.
- [ ] `buildSearchDocuments` produces a document for `/docs/glossary/token` with title `Token`, glossary kind, aliases including `tokens` / `token id`, tags including `attention` when present in registry, and body text containing `tokenizer` and `token IDs`.
- [ ] Document count for the default locale equals the count of published docs pages (no extra Phase 2 glossary records).
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-search-experience-and-coverage-002: Verify Orama snapshot export for Phase 1 records

**Description:** As a maintainer, I need a static Orama snapshot that includes every Phase 1 indexed page so static search mode works in CI and production builds.

**Acceptance Criteria:**

- [ ] `exportOramaIndexSnapshot` returns version `1` with an Orama payload and documents array containing URLs for grouped-query attention and token glossary.
- [ ] Snapshot document metadata preserves title, description, kind, tags, and url for each indexed page.
- [ ] `scripts/build-search-index.ts` (or equivalent build step) writes a generated snapshot without failing when only Phase 1 pages exist.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-search-experience-and-coverage-003: Add search API ranking tests for GQA and token queries

**Description:** As a maintainer, I need API-level tests that prove Orama ranking finds grouped-query attention and token for the Phase 1 manual gate queries.

**Acceptance Criteria:**

- [ ] `docsSearchApi.search("GQA")` ranks `/docs/modules/grouped-query-attention` first among results.
- [ ] `docsSearchApi.search("Grouped-Query Attention")` includes grouped-query attention as a top result.
- [ ] `docsSearchApi.search("attention")` includes grouped-query attention among results (token may also match when tagged).
- [ ] `docsSearchApi.search("KV cache")`, `kv cache`, and `kv-cache` each include grouped-query attention among results.
- [ ] `docsSearchApi.search("Token")` ranks `/docs/glossary/token` first among results.
- [ ] `docsSearchApi.search("tokens")` and `docsSearchApi.search("tokenizer")` include the token glossary among results.
- [ ] `docsSearchApi.staticGET()` returns an advanced index payload suitable for the static client.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-search-experience-and-coverage-004: Add UI-facing search client and meta helper tests

**Description:** As a maintainer, I need tests on the client wrapper and result-meta helpers so UI regressions are caught without browser automation.

**Acceptance Criteria:**

- [ ] `createDocsSearchClient` fetches from `/api/search` and ranks grouped-query attention first for `GQA`; includes it for `attention` and `KV cache` queries using a mocked static export.
- [ ] `createDocsSearchClient` includes the token glossary for `Token` and for alias/body-style queries `tokens` and `tokenizer` using the same mocked export pattern.
- [ ] `loadSearchResultMetaMap` / `resolveSearchResultMeta` return kind, description, and tags for grouped-query attention and token URLs.
- [ ] `getMatchedTags` highlights `attention` when the query matches tag slugs or aliases.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-search-experience-and-coverage-005: Shared search result presentation with full metadata

**Description:** As a reader, I want every search hit to show title, summary, kind, tags, and URL so I can choose the right page before navigating.

**Acceptance Criteria:**

- [ ] A shared component under `src/features/docs/search` renders page results with visible title (from search hit), summary line from result meta description, localized kind label, tag chips for matched tags, and the canonical URL path.
- [ ] Non-page result types fall back to the default Fumadocs list item without breaking layout.
- [ ] Strings for kind labels and empty copy resolve from localized UI messages, not hard-coded English in the component.
- [ ] Typecheck passes
- [ ] Tests pass (unit test asserting rendered text includes URL, kind label, and summary for a fixture meta map)

### phase-1-search-experience-and-coverage-006: Upgrade global search dialog experience

**Description:** As a reader, I want to open search from anywhere via keyboard shortcut and see rich, accessible results immediately.

**Acceptance Criteria:**

- [ ] `ModelAtlasSearchDialog` uses the shared result component and shows loading, empty (`noResults`), and success states via localized messages.
- [ ] Cmd/Ctrl+K opens the dialog from `RootProvider`; Escape closes; arrow keys navigate the result list; focus rings use the `ring` token.
- [ ] Querying `GQA` in the dialog shows grouped-query attention with kind, summary, tags, and URL visible without selecting the row.
- [ ] `SearchTrigger` remains available in `docs-shell` header on discovery routes.
- [ ] Typecheck passes
- [ ] Verify in browser: open search with keyboard shortcut, search `GQA`, and confirm grouped-query attention row shows title, summary, kind, tags, and URL.

### phase-1-search-experience-and-coverage-007: Implement `/search` page with inline query and results

**Description:** As a reader, I want a bookmarkable search page that runs the same static index as the dialog and lists full result metadata.

**Acceptance Criteria:**

- [ ] `/search` renders inside `DocsShell` with localized title and description from message keys (route shell provided by sibling entry-routes work or implemented here if missing).
- [ ] The page includes a search input bound to the static Orama client (`useModelAtlasDocsSearch` or `createDocsSearchClient` pattern) and debounced query updates.
- [ ] Results list reuses the shared result component, showing title, summary, kind, tags, and URL for each hit; selecting a row navigates to the docs URL.
- [ ] Initial query reads `?q=` from the URL when present; optional `?tag=` prefill seeds the input (e.g. `attention`).
- [ ] Empty state copy suggests trying `GQA` or browsing `/tags/attention`; loading state does not shift layout abruptly.
- [ ] Typecheck passes
- [ ] Verify in browser: visit `/search?q=GQA` and `/search?q=Token`, confirm correct top results and visible URL paths.

### phase-1-search-experience-and-coverage-008: Wire discovery handoffs to search entry

**Description:** As a reader coming from home or tag landings, I want one-click paths into search with a helpful prefilled query.

**Acceptance Criteria:**

- [ ] Home search entry opens the dialog or links to `/search` consistently with the chosen primary entry pattern documented in the route.
- [ ] Tag search handoff on `/tags/attention` opens search or navigates to `/search` with `attention` prefilled.
- [ ] Primary navigation includes a Search link to `/search` when sibling entry-routes work lands nav updates.
- [ ] Typecheck passes
- [ ] Verify in browser: from `/tags/attention`, use the search handoff and confirm the query is prefilled with `attention` and grouped-query attention appears in results.

## Functional Requirements

- FR-1: Search documents derive from published docs pages, default-locale messages, and registry records per `docs/data-model.md` and `docs/architecture.md`.
- FR-2: Orama advanced static mode serves queries through `/api/search` (`GET` and `staticGET`); no alternate search engine in Phase 1.
- FR-3: Indexed records are limited to Phase 1 published pages (grouped-query attention module, token glossary, and any other already-published Phase 1 docs)—no new Phase 2 glossary MDX.
- FR-4: Results display title, summary (`description`), localized kind, tags (highlighting query matches when applicable), and canonical `url`.
- FR-5: Grouped-query attention must be discoverable by title, alias `GQA`, tag `attention`, and body text containing KV-cache concepts.
- FR-6: Token glossary must be discoverable by title `Token` and body/alias text such as `tokenizer` and `tokens`.
- FR-7: `/search` and the global dialog share the same client, index, and result presentation components.
- FR-8: User-visible strings use `src/content/messages` / `loadUiMessages`; route files stay thin.
- FR-9: Automated tests assert observable query outcomes (ranking and metadata), not source-file inventories or route registration lists.

## Non-Goals

- New Phase 2 glossary, architecture, or module pages beyond what Phase 1 already published.
- Advanced facet filters (model family, module type chips) beyond tag display on results.
- Fetch-mode search, server-side live indexing, or external search services.
- Blog index, model pages, PDF export, or localization beyond English.
- Replacing Fumadocs `RootProvider` search integration or rewriting the Orama schema without a behavioral reason.
- Broad unrelated refactors of discovery index routes (owned by `phase-1-entry-and-index-routes`).
- Fresh-checkout CI workflow changes (owned by `phase-1-fresh-ci-and-smoke-tests`).

## High-Level Technical Design

### Dependencies

| Dependency | Provides |
|------------|----------|
| Existing `src/lib/search/*` | `buildSearchDocuments`, `exportOramaIndexSnapshot`, `docsSearchApi`, result meta map |
| `phase-1-entry-and-index-routes` | `/search` route shell, nav Search link, tag/architecture index handoffs |
| Phase 1 content | `grouped-query-attention` module, `token` glossary, registry aliases/tags |

### Search pipeline (unchanged core, new presentation + page)

```txt
published docs pages + registry + messages
        -> buildSearchDocuments()
        -> toAdvancedSearchIndexes()
        -> docsSearchApi (/api/search staticGET)
        -> createDocsSearchClient / useModelAtlasDocsSearch
        -> SearchResultCard (shared)
        -> ModelAtlasSearchDialog + /search page
```

### Package ownership

- `src/lib/search` — document builder, Orama snapshot, server API, result meta map (pure data + server).
- `src/features/docs/search` — dialog, trigger, shared result row, `/search` page components, prefill helpers.
- `src/app/search/page.tsx` (or `(site)/search/page.tsx`) — thin route composing shell + search page feature.
- `src/tests/search` — builder, index, API, client tests (deterministic, no network).
- `src/tests/features` — UI helper and presentation tests.

### UX states

| State | Dialog | `/search` page |
|-------|--------|----------------|
| Loading | Localized loading copy in list area | Same; stable min-height |
| Empty | `noResults` message | Suggests `GQA` / tag browse |
| Success | Rich result rows with URL | Same component, link navigation |
| Error | Fumadocs client error surface or graceful empty | Show retry-safe empty copy |

## Supporting Technical and UX Considerations

- Reuse `search-prefill` helpers for `?q=` and tag handoffs; consume on dialog open and search page mount.
- Tag chips stay monochrome; kind badge uses muted secondary styling per `docs/site-fundamentals.md`.
- Keep keyboard navigation: dialog list from Fumadocs; `/search` results as a focusable list or links.
- No-JS: `/search` should still render static shell copy and a link to browse glossary/tags even if client search requires hydration.
- Do not index draft or unpublished pages; `loadPublishedDocsPages` remains the page source gate.

## Success Metrics

- A reader can open `/search`, type `GQA`, and reach grouped-query attention in one interaction after results load.
- Searching `tokenizer` surfaces the token glossary without browsing the glossary index first.
- Phase 1 checklist items for search entry and “search finds GQA, attention, and KV cache” can be marked complete after this work and sibling route work land.
- `make ci` search test suite completes deterministically with no network calls.

## Open Questions

None for Phase 1 search scope. If both dialog and `/search` remain enabled, treat the dialog as the global quick entry and `/search` as the bookmarkable full-page experience—document the choice in the PR description only if non-obvious.
