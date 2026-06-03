# PRD: Default Pages, Search, and Tags Discovery

## Introduction

Model Atlas needs default discovery surfaces so readers can enter the reference, search across indexed content, browse architecture and glossary indexes, explore controlled tags, and land on topic pages such as `attention` before drilling into module explainers. This work item delivers Phase 1 browsing and search behavior on top of the app scaffold, registry baseline, canonical sample docs page, and token glossary page delivered by sibling Phase 1 work items.

The concrete change is to ship `/`, search entry (dialog and/or dedicated route), architecture index, glossary index, tags index, `/tags/attention`, and Fumadocs Orama search that indexes the sample grouped-query attention docs page and published glossary pages. Search must find the grouped-query attention page by `GQA`, `attention`, and `KV cache`.

## Context

### Customer ask

Phase 1: implement the default site pages and discovery surfaces — home/reference entry page, search entry, architecture index, glossary index, tags index, one attention tag landing page, and basic Fumadocs Orama search for the sample docs and glossary pages. Search must find the sample grouped-query attention page by GQA, attention, and KV cache.

### Problem

Without a home entry, architecture index, glossary index, tag index, tag landing page, and working search, readers cannot discover the first canonical docs page or move between topics using the site's intended reference workflow. Phase 1 manual review requires confirming home, search, architecture, glossary, tag routes, and that search finds `GQA`, `attention`, and `KV cache`.

### Solution

Implement registry-backed discovery routes and Fumadocs Orama search wired through the documented app structure: search document builder in `src/lib/search`, Orama API/static index, search UI in `src/features/docs/search`, index/list pages under `src/app`, and `TagResourceList` for the attention tag landing page. All surfaces use the standard docs shell, localized message keys, and dark atlas theme tokens.

## Description

Ship Phase 1 discovery surfaces for Model Atlas: a reference home page, global search dialog, architecture and glossary browse indexes, tags index, attention tag landing page, and Orama search indexing sample docs and glossary content so readers can find grouped-query attention by alias, tag, and body text.

## Goals

- Provide a docs-style home/reference entry at `/` with prominent search and links into architecture, glossary, tags, and docs.
- Enable full-text discovery of the sample grouped-query attention page and published glossary pages via Fumadocs Orama.
- Expose a consistent search entry from the app shell (keyboard shortcut, focus states, empty and loading states).
- List architecture-related reference pages at the architecture index route with a clear empty state when none exist.
- List glossary entries at the glossary index route.
- List controlled tags at `/tags` with links to tag landing pages.
- Render `/tags/attention` with resources grouped by kind from registry data.
- Meet Phase 1 manual search checks for `GQA`, `attention`, and `KV cache`.

## Project-Level Acceptance Criteria

- [ ] `/` renders the Model Atlas reference home inside the standard docs shell with localized copy, search entry, and navigation to architecture, glossary, tags, and docs.
- [ ] Search opens from the app shell, supports keyboard interaction, and returns the sample grouped-query attention page for queries `GQA`, `attention`, and `KV cache` (or `kv-cache` as indexed).
- [ ] Architecture index route (per routing contract, e.g. `/docs/architecture`) lists published architecture-related pages with title and summary; shows a clear empty state when none exist.
- [ ] Glossary index route (e.g. `/docs/glossary`) lists published glossary pages with title and summary; shows a clear empty state when none exist.
- [ ] `/tags` lists tag records with category labels and links to `/tags/<slug>`.
- [ ] `/tags/attention` lists all published resources tagged `attention`, grouped by kind, including the sample module page when present.
- [ ] Discovery pages use message keys for user-visible strings and shadcn semantic tokens per `docs/site-fundamentals.md`.
- [ ] Typecheck, lint, and tests pass via `make ci` (or equivalent project CI command once scaffold exists).

## User Stories

### default-pages-search-tags-001: Build search documents and Orama index from content layers

**Description:** As a maintainer, I need search documents derived from MDX structure, localized messages, asset metadata, and registry records so Orama can retrieve the sample docs page and glossary pages accurately.

**Acceptance Criteria:**

- [ ] `src/lib/search` exposes a builder that produces normalized search documents matching the `SearchDocument` contract in `docs/data-model.md` (title, description, bodyText, headings, aliases, tags, facets, url, kind).
- [ ] The builder indexes the published grouped-query attention sample page when present, including registry aliases (e.g. `GQA`), frontmatter tags (e.g. `attention`, `kv-cache`), and resolved default-locale message body text.
- [ ] The builder indexes published glossary pages (e.g. token) with title, description, resolved body text, aliases, and tags when sibling glossary content exists.
- [ ] A static Orama index artifact or build step is produced for Fumadocs static search mode without scraping raw MDX prose for core facets.
- [ ] Unit tests assert the sample page document contains expected title, alias, and tag values used by Phase 1 search checks.
- [ ] Typecheck passes
- [ ] Tests pass

### default-pages-search-tags-002: Wire Fumadocs Orama search API and client configuration

**Description:** As a reader, I want the site to query the Orama index through Fumadocs so search works in the static Phase 1 deployment.

**Acceptance Criteria:**

- [ ] `src/app/api/search/route.ts` is created from the Fumadocs source using `createFromSource` or `createSearchAPI`, exposes `staticGET` for static export, and serves results for indexed docs pages.
- [ ] `src/features/docs/search/search-client.ts` centralizes `useDocsSearch` with `type: "static"` (or documented fetch mode if static payload is impractical).
- [ ] Querying `GQA` through the search client returns the grouped-query attention sample page as the top relevant docs result in tests.
- [ ] Querying `attention` returns the grouped-query attention sample page among relevant results in tests.
- [ ] Querying `KV cache` (or normalized `kv cache`) returns the grouped-query attention sample page among relevant results in tests.
- [ ] Typecheck passes
- [ ] Tests pass

### default-pages-search-tags-003: Add global search dialog and shell trigger

**Description:** As a reader, I want to open search from anywhere in the site so I can jump to reference pages without browsing the sidebar first.

**Acceptance Criteria:**

- [ ] `SearchDialog` and `SearchTrigger` live under `src/features/docs/search` and register through `RootProvider` in the app layout.
- [ ] Keyboard shortcut (e.g. Cmd/Ctrl+K) opens the dialog; Escape closes it; arrow keys move between results; focus ring uses `ring` token.
- [ ] Dialog shows loading, empty (“no results”), and success states; each result shows title, page kind, short summary, and matched tags when available.
- [ ] A visible search affordance appears in the top navigation on home, architecture index, glossary, tags, and docs routes.
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### default-pages-search-tags-004: Render Model Atlas home/reference entry page

**Description:** As a reader, I want a reference home page that explains what Model Atlas is and gives me immediate search and browse entry points.

**Acceptance Criteria:**

- [ ] `/` uses the standard docs shell (top nav, left sidebar, article column, right “On this page” rail when applicable) per `docs/site-fundamentals.md`.
- [ ] Home header uses the irregular brush-stroke treatment behind title and subtitle; search input and primary sections follow in article flow (not a marketing dashboard layout).
- [ ] User-visible strings resolve from localized message keys (no raw prose in the route component).
- [ ] Home links to architecture index, glossary index, tags index, and the docs index or sample module.
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### default-pages-search-tags-005: Render architecture index page

**Description:** As a reader, I want an architecture index so I can browse architecture-related reference pages in one place.

**Acceptance Criteria:**

- [ ] Architecture index route matches the routing contract (e.g. `/docs/architecture`) and lists published architecture-related pages with title and summary from resolved messages or registry (e.g. concept pages with `conceptType: architecture` or pages under the architecture content grouping).
- [ ] Each row links to its docs route; entries are sorted alphabetically by title.
- [ ] When no architecture pages exist, the page shows an accessible empty state with guidance to return home or open search.
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### default-pages-search-tags-006: Render glossary index page

**Description:** As a reader, I want a glossary index so I can browse defined ML terms in one place.

**Acceptance Criteria:**

- [ ] Glossary index route matches the routing contract (e.g. `/docs/glossary`) and lists published glossary pages with title and summary from resolved messages/registry.
- [ ] Each row links to the glossary entry route; entries are sorted alphabetically by title.
- [ ] When no glossary pages exist, the page shows an accessible empty state with guidance to return home or open search.
- [ ] When the token glossary page exists from sibling work, it appears in the index with correct title and link.
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### default-pages-search-tags-007: Render tags index page

**Description:** As a reader, I want to browse all controlled tags so I can discover topics like attention and kv-cache without knowing exact page slugs.

**Acceptance Criteria:**

- [ ] `/tags` lists published tag registry records with localized title/summary, category label, and link to `/tags/<slug>`.
- [ ] Tags are grouped or sorted by `category` from the tag record schema.
- [ ] Tag pills on the page use monochrome styling by default (not rainbow chips).
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### default-pages-search-tags-008: Render attention tag landing page

**Description:** As a reader searching for attention mechanisms, I want a tag landing page that lists every published resource tagged `attention` grouped by kind.

**Acceptance Criteria:**

- [ ] `/tags/attention` resolves the `attention` tag record and renders `TagResourceList` grouped by kind (modules, concepts, models, papers, glossary, blog, training, systems — omit empty groups).
- [ ] The grouped-query attention sample module appears under modules when its registry/frontmatter includes the `attention` tag.
- [ ] Page includes a search handoff (e.g. link or button pre-filtering search for `attention`) and uses localized message keys for headings and empty copy.
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### default-pages-search-tags-009: Verify Phase 1 search discovery behavior end to end

**Description:** As a maintainer, I want automated checks that Phase 1 search discovery works so regressions are caught in CI.

**Acceptance Criteria:**

- [ ] Integration or search-layer tests assert queries `GQA`, `attention`, and `KV cache` (or normalized `kv cache`) return the sample grouped-query attention page in the top results.
- [ ] A smoke test (or render test) confirms `/`, architecture index, glossary index, `/tags`, and `/tags/attention` routes return HTTP 200 in the test harness.
- [ ] Typecheck passes
- [ ] Tests pass

## Functional Requirements

- FR-1: Search index derives from MDX page structure, default-locale messages, colocated asset metadata, and registry records per `docs/architecture.md`.
- FR-2: Orama is the only Phase 1 search engine; use Fumadocs static search mode when practical.
- FR-3: `/` is the primary reference entry, not a marketing landing page.
- FR-4: Architecture index lists published architecture-related docs with title, summary, and link.
- FR-5: Glossary index lists published glossary docs with title, summary, and link.
- FR-6: Tags index lists published tag records from `src/content/registry/tags`.
- FR-7: Tag landing pages derive membership from registry tags and MDX frontmatter, not hand-maintained page lists.
- FR-8: Search dialog meets accessible keyboard and focus requirements from the architectural checklist.
- FR-9: Discovery routes consume validated loaders from `src/lib/content`; route files stay thin and delegate to `src/features/docs`.

## Non-Goals

- Canonical grouped-query attention MDX page authoring — sibling work item `docs-template-rendering`.
- Token glossary page content — sibling work item `basic-token-glossary-page` (this item consumes it for index/search only).
- Registry/schema scaffold — sibling work item `content-registry-validation`.
- App/toolchain scaffold — sibling work item `site-app-scaffold`.
- Advanced search facets UI (model family, module type filters) beyond basic tag/text retrieval for Phase 1.
- Blog index, model pages, PDF export, localization beyond English.
- Benchmark leaderboards or paper download features.
- Full Phase 2/3 architecture pages (transformer architecture, architectures overview, etc.) — index only; content comes later.

## High-Level Technical Design

### Dependencies

This work item assumes sibling Phase 1 items are complete or merged on the branch:

| Dependency | Provides |
|------------|----------|
| `site-app-scaffold` | Next.js App Router, Fumadocs, layout shell, Makefile/CI |
| `content-registry-validation` | Registry loaders, `tag.attention`, sample module record, `concept.token` |
| `docs-template-rendering` | Sample `grouped-query-attention` docs page with messages |
| `basic-token-glossary-page` | Token glossary page and glossary discovery helper (optional at index render time) |

### Search pipeline

```txt
page.mdx + messages/en.json + assets.json + registry record
        -> buildSearchDocuments()
        -> Orama index (static)
        -> /api/search (staticGET) + useDocsSearch
        -> SearchDialog / SearchTrigger
```

### Routing

| Route | Purpose |
|-------|---------|
| `/` | Reference home with search entry |
| `/docs/architecture` | Architecture index (per routing contract) |
| `/docs/glossary` | Glossary index |
| `/tags` | Tag index |
| `/tags/attention` | Attention tag landing |
| `/api/search` | Fumadocs Orama endpoint |

### Components

- `src/lib/search` — index builder, query normalization helpers
- `src/lib/content` — browse helpers for architecture and glossary indexes
- `src/features/docs/search/*` — dialog, trigger, client wrapper
- `src/features/docs/components/TagResourceList.tsx` — tag landing lists
- `src/app/page.tsx`, `src/app/tags/*`, architecture and glossary index routes

## Supporting Technical and UX Considerations

- Reuse `TagPillList` for inline tags linking to `/tags/<slug>`.
- Keep tag chips monochrome; use `primary` for focus and `accent` sparingly per site fundamentals.
- Search empty state should suggest trying aliases (e.g. “GQA”) or browsing `/tags/attention`.
- No-JS fallback: search trigger links to `/docs` or a simple search route if the dialog cannot run without JavaScript.
- Loading states must not shift layout abruptly (skeleton or stable min-height).
- Architecture and glossary indexes share the same docs shell and card/list presentation patterns for consistency.

## Success Metrics

- A new reader can open `/`, search `GQA`, and reach the sample module page in under two interactions.
- `/tags/attention` surfaces the sample module without manual curation lists.
- Phase 1 manual gate search checks pass locally and in CI tests for `GQA`, `attention`, and `KV cache`.
- Architecture and glossary indexes render without error even when only zero or one entries exist in Phase 1.
- No increase in `make ci` time beyond acceptable static index build cost.

## Open Questions

None for Phase 1 scope. Search mode (static vs fetch) may be chosen by the implementer based on index size; document the choice in code comments only if non-obvious.
