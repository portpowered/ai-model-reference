# PRD: Phase 1 Entry and Index Routes

## Introduction

Model Atlas Phase 1 has canonical content (grouped-query attention module, token glossary, registry records, and search document builders) but readers still hit placeholder home copy and missing discovery routes. This work item closes the **entry and index route** gap: a docs-native home, a documented search entry route, architecture and tags indexes, and the attention tag landing page—without Phase 2 content expansion or the full Orama search UI (owned by sibling work `phase-1-search-experience-and-coverage`).

The concrete change is to replace scaffold placeholder surfaces with registry-backed index pages, wire primary navigation to those routes, link readers to grouped-query attention and token, and add route smoke tests so `next build` and CI can prove the Phase 1 browsing surface exists.

## Context

### Customer ask

Phase 1 completion: implement the missing discovery and index routes without broad Phase 2 content expansion. The app must render a docs-native Model Atlas home/reference entry instead of a placeholder; a search entry route at `/search` or an equivalent documented route; an architecture index route; a tags index route; and an attention tag landing page at `/tags/attention`. The routes should use the existing registry, tag, module, and glossary loaders, link to grouped-query attention and token, avoid raw placeholder copy, and preserve the dark technical atlas visual direction from `docs/site-fundamentals.md`. Acceptance: next build lists the new static routes, navigation exposes them, and route smoke tests cover home, architecture, glossary, tags, attention tag, token, and grouped-query attention.

### Problem

Readers opening `/` see placeholder copy and a link to a non-canonical docs path. There is no `/search` entry, no architecture index, no `/tags` index, and no `/tags/attention` landing page, so Phase 1 manual review cannot confirm discovery routes or navigation to the sample module and glossary. The factory checklist marks search entry, architecture index, tags index, and attention tag landing as incomplete.

### Solution

Add thin App Router pages and feature components that delegate to existing `src/lib/content` loaders (`loadRegistry`, glossary listing helpers, module/glossary page loaders). Extend shared UI messages and `DocsShell` navigation. Implement `TagResourceList` (or equivalent) for tag landings. Keep search **entry** at `/search` as a documented handoff surface; full query UI and Orama wiring stay in the search-experience sibling. Align visuals with the dark atlas token set and docs shell layout from site fundamentals.

## Description

Ship Phase 1 discovery **routes and navigation**: Model Atlas home at `/`, search entry at `/search`, architecture index, tags index at `/tags`, attention tag landing at `/tags/attention`, shell navigation links, and automated route smoke tests—using existing content loaders and linking to grouped-query attention and token.

## Goals

- Replace placeholder home with a docs-native Model Atlas reference entry inside the standard shell.
- Expose `/search` (or a documented equivalent) as the canonical search entry route.
- Provide an architecture index that lists published architecture-related reference entries from registry and docs data.
- Provide `/tags` and `/tags/attention` backed by registry tag records and published resources.
- Surface home, search, architecture, glossary, and tags in primary navigation.
- Ensure `next build` emits static routes for all new discovery paths.
- Add route smoke tests for home, architecture, glossary, tags, attention tag, token, grouped-query attention, and search entry.

## Project-Level Acceptance Criteria

- [ ] `/` renders a Model Atlas reference home (not placeholder copy) in the docs shell with links to search, architecture, glossary, tags, grouped-query attention, and token.
- [ ] `/search` (or documented equivalent recorded in routing notes) renders a search entry page with localized copy and a clear handoff to site search (no raw placeholder strings).
- [ ] Architecture index route lists published architecture-related entries with title, summary, and links; shows an accessible empty state when none match.
- [ ] `/tags` lists published tag registry records with category labels and links to `/tags/<slug>`.
- [ ] `/tags/attention` lists resources tagged `attention` grouped by kind, including grouped-query attention when published.
- [ ] Primary navigation on discovery routes includes Home, Search, Architecture, Glossary, and Tags.
- [ ] `next build` completes and includes static output for the new routes.
- [ ] Route smoke tests assert HTTP 200 (or successful render) for `/`, architecture index, `/docs/glossary`, `/tags`, `/tags/attention`, `/docs/glossary/token`, `/docs/modules/grouped-query-attention`, and `/search`.
- [ ] Typecheck, lint, and tests pass via `make ci`.

## User Stories

### phase-1-entry-and-index-routes-001: Add browse helpers for architecture entries and tag resources

**Description:** As a maintainer, I need shared loaders that list architecture-related registry entries and resolve tag membership so index routes stay thin and testable.

**Acceptance Criteria:**

- [ ] `src/lib/content` exposes a function to list published architecture-related browse entries (e.g. concept records with `conceptType: "architecture"` and/or published docs whose registry metadata qualifies), each with resolved title, summary, and canonical URL.
- [ ] `src/lib/content` exposes a function to list published tag records with slug, localized title/summary, and category.
- [ ] `src/lib/content` exposes a function to list published resources for a tag slug, grouped by record kind (modules, concepts, glossary, etc.), using registry tags and published page frontmatter—omitting empty groups.
- [ ] For tag `attention`, the grouped-query attention module appears under modules when its registry/frontmatter includes `attention`.
- [ ] Unit tests cover attention tag membership and at least one architecture browse entry (token concept or linked glossary).
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-entry-and-index-routes-002: Extend UI messages and primary navigation

**Description:** As a reader, I want consistent navigation labels and links so I can reach discovery routes from any shell-wrapped page.

**Acceptance Criteria:**

- [ ] `src/content/messages/en/common.json` defines message keys for nav labels and discovery page titles (no hard-coded nav strings in route files).
- [ ] `DocsShell` primary navigation includes links to `/`, `/search`, architecture index, `/docs/glossary`, and `/tags` with visible focus rings using the `ring` token.
- [ ] Navigation removes placeholder-only targets (e.g. “Open docs placeholder” is not linked from the shell).
- [ ] Typecheck passes
- [ ] Verify in browser: header shows Home, Search, Architecture, Glossary, and Tags on the home route.

### phase-1-entry-and-index-routes-003: Render Model Atlas home reference entry

**Description:** As a reader, I want the site root to explain Model Atlas and point me to search, indexes, and the Phase 1 sample pages.

**Acceptance Criteria:**

- [ ] `/` uses `DocsShell` (or equivalent docs layout) with dark atlas tokens per `docs/site-fundamentals.md`.
- [ ] Home content resolves from localized message keys; the route component does not contain raw marketing or placeholder prose.
- [ ] Home includes the brush-stroke header treatment behind title/subtitle and article-flow sections (not a dashboard grid).
- [ ] Home links to `/search`, architecture index, `/docs/glossary`, `/tags`, `/docs/modules/grouped-query-attention`, and `/docs/glossary/token`.
- [ ] No “placeholder” copy appears in the rendered home page body or primary CTA.
- [ ] Typecheck passes
- [ ] Verify in browser: `/` shows Model Atlas branding, sample links, and dark documentation styling.

### phase-1-entry-and-index-routes-004: Add documented search entry route

**Description:** As a reader, I want a dedicated search entry URL so bookmarks and tag handoffs can target search consistently.

**Acceptance Criteria:**

- [ ] `/search` renders inside the docs shell with localized title and description from message keys.
- [ ] The page documents that it is the canonical search entry (recorded in code comment or `docs/architectural-checklist.md` routing notes if path differs).
- [ ] The page provides a visible search handoff control (e.g. button or link) suitable for wiring to the global search dialog in the sibling search work item; until then it must not 404 and must not show placeholder lorem text.
- [ ] Tag landing pages can link to `/search` with a tag query parameter per data-model handoff pattern when applicable.
- [ ] Typecheck passes
- [ ] Verify in browser: `/search` loads with accessible heading and handoff affordance.

### phase-1-entry-and-index-routes-005: Render architecture index route

**Description:** As a reader, I want one page listing architecture-related reference material so I can browse structural concepts before opening individual docs.

**Acceptance Criteria:**

- [x] Architecture index route exists (e.g. `/docs/architecture` or `/architecture`—choose one, document it, and use it consistently in nav).
- [x] The page lists browse entries from the architecture helper with title, summary, and link; entries sort alphabetically by title.
- [x] When the token glossary or token concept qualifies, it appears with a correct link to `/docs/glossary/token` or its canonical docs URL.
- [x] When no entries qualify, the page shows an accessible empty state with guidance to return home or open search.
- [x] User-visible strings use message keys; styling uses semantic shadcn tokens.
- [x] Typecheck passes
- [x] Verify in browser: architecture index lists at least the Phase 1 token entry when published.

### phase-1-entry-and-index-routes-006: Render tags index route

**Description:** As a reader, I want to browse all controlled tags and open tag landing pages without knowing slugs in advance.

**Acceptance Criteria:**

- [ ] `/tags` lists published tag records with localized title/summary, category label, and link to `/tags/<slug>`.
- [ ] Tags sort or group by `category` from the tag schema; tag chips remain monochrome by default.
- [ ] Published tags `attention` and `kv-cache` (when present in registry) appear with working links.
- [ ] Typecheck passes
- [ ] Verify in browser: `/tags` shows attention and kv-cache entries linking to their landing pages.

### phase-1-entry-and-index-routes-007: Render attention tag landing page

**Description:** As a reader exploring attention mechanisms, I want a tag page listing every published resource tagged `attention`.

**Acceptance Criteria:**

- [x] `/tags/attention` resolves the `attention` tag record and renders resources grouped by kind via `TagResourceList` (or equivalent feature component under `src/features/docs/components`).
- [x] Grouped-query attention appears under modules with title, summary, and link to `/docs/modules/grouped-query-attention`.
- [x] Token glossary or token concept appears when tagged `attention` in registry/frontmatter.
- [x] Page includes a search handoff link to `/search` (optionally `?tag=attention`) and uses message keys for headings and empty copy.
- [x] Typecheck passes
- [x] Verify in browser: `/tags/attention` lists GQA and related attention-tagged resources.

### phase-1-entry-and-index-routes-008: Align glossary index with shell and message keys

**Description:** As a reader, I want the glossary index to match other discovery pages in navigation, localization, and empty-state behavior.

**Acceptance Criteria:**

- [ ] `/docs/glossary` uses the same docs shell and navigation as other discovery routes (not an isolated unlinked page).
- [ ] Glossary index copy resolves from message keys; token entry remains listed with title, summary, and link to `/docs/glossary/token`.
- [ ] Empty state matches the accessible pattern used on architecture and tags indexes.
- [ ] Typecheck passes
- [ ] Verify in browser: glossary index is reachable from primary nav and lists Token.

### phase-1-entry-and-index-routes-009: Add route smoke tests and build route verification

**Description:** As a maintainer, I want automated checks that Phase 1 discovery routes exist so regressions are caught before manual review.

**Acceptance Criteria:**

- [ ] A Bun test suite smoke-checks that App Router page modules exist and export default components for `/`, `/search`, architecture index, `/docs/glossary`, `/tags`, `/tags/attention`, `/docs/glossary/token`, and `/docs/modules/grouped-query-attention`.
- [ ] Tests assert browse helpers return non-empty attention tag resources including grouped-query attention in the Phase 1 baseline fixture.
- [ ] `next build` succeeds locally; implementer verifies build output includes the new static routes (no manual route inventory assertion beyond confirming build success and spot-check paths).
- [ ] Typecheck passes
- [ ] Tests pass

## Functional Requirements

- FR-1: `/` is the Model Atlas reference home, not a marketing landing page.
- FR-2: `/search` is the canonical search entry route unless an equivalent is documented and linked from navigation.
- FR-3: Architecture index derives entries from registry and published docs loaders, not hand-maintained URL lists.
- FR-4: `/tags` derives from published tag registry records via `loadRegistry`.
- FR-5: `/tags/<slug>` derives membership from registry tags and MDX frontmatter via shared browse helpers.
- FR-6: Discovery routes consume localized UI messages from `src/content/messages` and page message loaders; route files stay thin.
- FR-7: Visual presentation follows dark semantic tokens and docs shell layout in `docs/site-fundamentals.md`.
- FR-8: Primary navigation exposes all Phase 1 discovery routes listed in the customer ask.
- FR-9: Route smoke tests verify the Phase 1 surface without meta-tests that scan unrelated source trees.

## Non-Goals

- Full Orama search dialog, static index API wiring, and search query ranking (sibling: `phase-1-search-experience-and-coverage`).
- Fresh-checkout CI workflow and registry validation expansion (sibling: `phase-1-fresh-ci-and-smoke-tests`).
- New Phase 2 glossary, architecture, or module pages beyond listing what Phase 1 already published.
- Blog index, model pages, PDF export, localization beyond English.
- Benchmark leaderboards, paper downloads, or React Flow graph interactivity beyond existing module page.
- Broad refactors of Fumadocs source config, duplicate `(site)` vs root route cleanup beyond what is required to ship a single canonical home.

## High-Level Technical Design

### Route map (Phase 1 completion target)

| Route | Purpose |
|-------|---------|
| `/` | Model Atlas reference home |
| `/search` | Documented search entry / handoff |
| `/docs/architecture` (or chosen index path) | Architecture browse index |
| `/docs/glossary` | Glossary index (existing; shell alignment) |
| `/tags` | Tag index |
| `/tags/attention` | Attention tag landing |
| `/docs/modules/grouped-query-attention` | Sample module (existing) |
| `/docs/glossary/token` | Sample glossary (existing) |

### Data flow

```txt
loadRegistry + glossary/module loaders
        -> browse helpers (architecture list, tag list, tag resources)
        -> feature components (TagResourceList, index lists)
        -> src/app/* thin route pages
        -> DocsShell navigation
```

### Package ownership

- `src/lib/content` — browse helpers and tag/architecture resolution (pure data).
- `src/features/docs/components` — `TagResourceList`, shared index list presentation.
- `src/components/layout` — `DocsShell` navigation.
- `src/app` — route composition only.
- `src/content/messages/en/common.json` — shared nav and index copy.

### Dependencies

Assumes Phase 1 baseline content and loaders already exist: grouped-query attention module page, token glossary, `tag.attention`, registry loaders, and glossary listing (`listPublishedGlossaryPages`).

## Supporting Technical and UX Considerations

- Consolidate duplicate home implementations (`src/app/page.tsx` vs `src/app/(site)/page.tsx`) into one canonical `/` route wrapped by `DocsShell`.
- Reuse `TagPillList` link pattern (`/tags/<slug>`) on index pages where tags are shown inline.
- Empty states should suggest search or home navigation; avoid dead-end copy.
- Loading: index pages are static; no client fetch required for Phase 1 lists.
- Accessibility: index lists use semantic headings, list markup or cards with focusable links, and `aria-label` on primary nav.
- Search entry page should remain useful before the search dialog ships (clear copy + handoff target).

## Success Metrics

- A new reader can reach grouped-query attention from `/` in two clicks or fewer.
- `/tags/attention` surfaces GQA without manual curation lists.
- `make ci` passes with new route smoke tests.
- Phase 1 checklist items for search entry, architecture index, tags index, and attention tag landing can be marked complete after sibling search/CI items land.

## Open Questions

None for Phase 1 route scope. Exact architecture index path (`/docs/architecture` vs top-level) is an implementer choice documented once in navigation and tests.
