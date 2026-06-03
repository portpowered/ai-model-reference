# PRD: Basic Token Glossary Page

## Introduction

Implement the Phase 1 **token** glossary page so readers can open a foundational ML term reference at `/docs/glossary/token`, browse to it from the glossary index, and find it through site search by title or body text. The page follows the same message-key, registry-backed, colocated asset/message pattern established by the grouped-query attention module page.

**Intent:** Prove the glossary content path end-to-end (`page.mdx` + colocated `messages/en.json` + `assets.json` + `concept.token` registry record → rendered glossary page discoverable from index and search) without expanding into Phase 2 foundational glossary coverage.

## Context

### Customer ask

Phase 1: implement one basic glossary page for token using the same message-key, registry-backed, colocated asset/message pattern. Ensure it renders at its docs route, appears in the glossary index, and is searchable by title/body text without adding broader Phase 2 glossary coverage.

### Problem

Model Atlas already ships baseline colocated messages, assets, and a `concept.token` registry record from `content-registry-validation`, and canonical docs rendering components from `docs-template-rendering`. Readers still cannot open `/docs/glossary/token`, see localized glossary copy composed in the docs shell, find **Token** on the glossary index, or search for terms like “subword token” and reach the page. Phase 1 manual review requires a working glossary route alongside the sample module page.

### Solution

Publish `src/content/docs/glossary/token/page.mdx` following `docs/templates/concept.mdx` with `kind: glossary` and `registryId: concept.token`. Add the missing `graph.token-concept-map` registry record referenced by colocated assets. Register the page in the Fumadocs docs tree. Expose a glossary discovery helper and search-document builder entry so the glossary index and Orama search (completed in sibling `default-pages-search-tags`) can list and retrieve the token page from structured content—not prose scraping.

## Description

Deliver one published glossary page for **token**: structural MDX with message-key components, resolved concept map asset, registry-backed tag pills, minimal related-documents section, Fumadocs registration, glossary index discoverability, and search indexing for title, aliases, and body text.

## Goals

- Render a complete token glossary page at `/docs/glossary/token` inside the standard docs shell.
- Keep MDX structural; resolve all reader-facing copy through colocated message keys.
- Resolve the `conceptMap` graph asset from colocated `assets.json` with message-backed alt/caption text.
- Surface registry-backed tags and a minimal derived related-documents section.
- Expose token as a discoverable glossary entry for the glossary index (title, summary, URL).
- Include token in search documents so queries on title, aliases, and body text return the page.
- Scope strictly to the token glossary—no Phase 2 terms (embedding, logit, softmax, etc.).

## Project-Level Acceptance Criteria

- [ ] A reader can open `/docs/glossary/token` locally and see a complete glossary reference inside the standard docs shell (top nav, sidebar, article column, on-this-page rail).
- [ ] Title, problem statement, core idea, and section copy resolve from colocated `messages/en.json` via message-key components—no raw user-visible prose in `page.mdx`.
- [ ] The `conceptMap` asset renders (graph shell or static placeholder) with alt text from messages; broken asset config fails validation or development builds clearly.
- [ ] The glossary index lists **Token** with its summary and a link to `/docs/glossary/token` when the index route is rendered.
- [ ] Search for `token`, `subword token`, or distinctive body phrases (e.g. `128k context`) returns the token glossary page in relevant results.
- [ ] Tag pills on the page link to tag landing or search destinations for tags on `concept.token` (e.g. `attention`).
- [ ] Typecheck, lint, and tests pass for all changes in this work item.

## User Stories

### basic-token-glossary-page-001: Publish and render the token glossary page

**Description:** As a reader learning ML fundamentals, I want a token glossary page at its docs route so I can understand what a token is before reading module pages like grouped-query attention.

**Acceptance Criteria:**

- [ ] `src/content/docs/glossary/token/page.mdx` exists with `kind: glossary`, `registryId: concept.token`, `messageNamespace: local`, `assetNamespace: local`, and `status: published`.
- [ ] MDX follows `docs/templates/concept.mdx` structure using `T`, `Section`, `TagPillList`, `DerivedRelatedDocs`, `RelatedDocs`, and `CitationList`—no raw user-visible prose.
- [ ] Navigating to `/docs/glossary/token` returns HTTP 200 with the standard docs shell in a local dev build.
- [ ] Title, `problemStatement`, and `coreIdea` render from colocated messages below the page heading.
- [ ] Typecheck passes
- [ ] Verify in browser: title and opening paragraphs match `messages/en.json`, not hard-coded MDX prose.

### basic-token-glossary-page-002: Resolve and render the token concept map asset

**Description:** As a reader, I want a visual concept map on the token page so I can see how text becomes token IDs before the transformer stack.

**Acceptance Criteria:**

- [ ] `graph.token-concept-map` registry record exists and satisfies Phase 1 graph schema requirements referenced by `assets.json`.
- [ ] `ConceptMap` (or equivalent docs component) renders the `conceptMap` asset ID with alt text and caption resolved from message keys.
- [ ] Invalid or missing graph/asset references fail `make validate-data` or surface a clear development error—not a silent empty slot in production.
- [ ] Automated tests cover asset resolution for the token page `conceptMap` graph asset.
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Verify in browser: concept map section is visible with accessible alt text.

### basic-token-glossary-page-003: Register token in the Fumadocs docs tree

**Description:** As a reader browsing the docs sidebar, I want the token glossary page registered in navigation so I can reach it without typing the URL.

**Acceptance Criteria:**

- [ ] Fumadocs `meta.json` (or equivalent source config) includes the token glossary page under the glossary section so it appears in the docs sidebar/navigation.
- [ ] Page frontmatter `title` and `description` align with resolved message keys for SEO/metadata where Fumadocs reads frontmatter.
- [ ] Internal links to `/docs/glossary/token` from navigation resolve without 404 in the test harness.
- [ ] Typecheck passes
- [ ] Verify in browser: token page is reachable from docs sidebar navigation.

### basic-token-glossary-page-004: Expose token for glossary index listing

**Description:** As a reader on the glossary index, I want **Token** listed with its summary so I can browse defined terms in one place.

**Acceptance Criteria:**

- [ ] `src/lib/content` exposes a helper (e.g. `listPublishedGlossaryPages`) that returns published glossary pages with resolved title, summary, slug, and URL.
- [ ] The helper includes the token page when `status: published` and returns entries sorted alphabetically by title.
- [ ] Glossary index route (when present) renders **Token** with summary linking to `/docs/glossary/token`; if the index route is not yet implemented, an automated test asserts the helper output includes the token entry with expected title and URL.
- [ ] When no glossary pages exist, the helper returns an empty list (no throw).
- [ ] Typecheck passes
- [ ] Tests pass

### basic-token-glossary-page-005: Index token page for search by title and body text

**Description:** As a reader using site search, I want to find the token glossary by typing the term or phrases from its explanation.

**Acceptance Criteria:**

- [ ] Search document builder produces a normalized document for the token glossary page including title, description, resolved default-locale body text, headings, aliases (`tokens`, `token id`, `subword token`), tags, kind `glossary`, and URL `/docs/glossary/token`.
- [ ] Querying `token` or `subword token` against the built index returns the token glossary page among relevant results in automated tests.
- [ ] Querying a distinctive body phrase from messages (e.g. `128k context` from the reader shortcut callout) returns the token page in relevant results.
- [ ] Search facets use registry fields for the page; body text is not scraped from raw MDX prose.
- [ ] Typecheck passes
- [ ] Tests pass

### basic-token-glossary-page-006: Registry-backed tags and minimal related documents on token page

**Description:** As a reader exploring related topics, I want tag pills and nearby related docs on the token page so I can jump to attention-tagged resources without hand-maintained link lists.

**Acceptance Criteria:**

- [ ] `TagPillList` renders tags from `concept.token` as keyboard-focusable links to `/tags/<slug>` or equivalent tag-filter URLs.
- [ ] Tag pills use restrained monochrome styling per `docs/site-fundamentals.md`.
- [ ] `DerivedRelatedDocs` renders at least `shared-tags` and/or `same-concept-type` groups when matching registry records exist; empty groups are omitted.
- [ ] `CitationList` renders without broken markup when `citationIds` is empty (omits or shows concise empty state).
- [ ] Typecheck passes
- [ ] Verify in browser: attention tag pill navigates to a working destination; related section omits empty groups.

## Functional Requirements

- **FR-1:** Glossary MDX must not contain raw user-visible prose outside approved message-key and registry-backed components.
- **FR-2:** Page frontmatter uses `kind: glossary` and `registryId: concept.token`.
- **FR-3:** Colocated `messages/en.json` and `assets.json` from the Phase 1 baseline are the authoritative text and asset sources.
- **FR-4:** Route contract is `/docs/glossary/token` per `docs/architectural-checklist.md`.
- **FR-5:** Glossary discovery helper returns title, summary, slug, and URL for each published glossary page.
- **FR-6:** Search documents for glossary pages include resolved message body text, registry aliases, and tags.
- **FR-7:** Only the token glossary page is in scope—no additional glossary entries or Phase 2 foundational pages.

## Non-Goals

- Phase 2 glossary pages (embedding, logit, softmax, patch, latent, etc.).
- Home page, search dialog UI, tags index, attention tag landing page (`default-pages-search-tags`—depends on this work item).
- Grouped-query attention module page authoring (`docs-template-rendering`).
- Registry schemas, baseline loaders, or `make validate-data` core logic (`content-registry-validation`).
- Full interactive React Flow graph behavior beyond Phase 1 placeholder/shell rendering.
- Localization beyond default `en`.
- PDF/print routes for the token page.
- Glossary page generation templates or batch authoring tooling for Phase 2.

## High-Level Technical Design

### Dependencies

| Dependency | Provides |
|------------|----------|
| `site-app-scaffold` | Next.js App Router, Fumadocs routing, docs shell, Makefile/CI |
| `content-registry-validation` | `concept.token` record, colocated messages/assets, loaders, validation |
| `docs-template-rendering` | `T`, `Section`, `TagPillList`, `CitationList`, `DerivedRelatedDocs`, asset resolution |

**Enables:** `default-pages-search-tags` (glossary index UI, global search dialog, Orama wiring for GQA + token).

### Content pipeline

```txt
page.mdx + messages/en.json + assets.json + concept.token
        -> localized page model
        -> /docs/glossary/token (rendered)
        -> listPublishedGlossaryPages() (index input)
        -> buildSearchDocuments() (Orama input)
```

### Package ownership

| Concern | Owner |
|--------|--------|
| Page MDX, colocated messages/assets | `src/content/docs/glossary/token/` |
| Graph record | `src/content/registry/graphs/` |
| Glossary discovery + search document shape | `src/lib/content` or `src/lib/search` |
| MDX components | `src/features/docs/components`, `src/features/models/components` |
| Route wiring | Fumadocs docs catch-all under `src/app/docs` |

### Phase 1 glossary scope (token only)

**Included:** title, problem statement, core idea, core explanatory sections from concept template, reader shortcut callout, concept map asset slot, tag pills, minimal derived related docs, references section.

**Deferred:** populated citation records for token, rich concept-map interactivity, links to Phase 2 prerequisite concepts (embedding, logit) until those pages exist.

## Supporting Technical and UX Considerations

- **Accessibility:** Logical heading outline from `Section` components; tag pills and links keyboard-operable; focus rings use `ring` token.
- **States:** Loading placeholder for graph asset; empty states for citations and related groups; development errors for missing message keys must not ship as blank sections.
- **Styling:** Standard docs shell, dark atlas theme, monochrome tag chips per `docs/site-fundamentals.md`.
- **Testing:** Target message resolution, glossary discovery output, search document content, and route smoke tests—not repo file inventories or link-topology scans.

## Success Metrics

- A reviewer opens `/docs/glossary/token`, confirms message-driven copy, clicks an attention tag pill, and reaches a tag destination in under three interactions.
- Glossary index lists **Token** as the sole Phase 1 glossary entry (until more are added in later phases).
- Search queries `token` and `subword token` surface the glossary page in CI tests.
- The next glossary page can copy the token folder pattern without a new rendering approach.

## Open Questions

None blocking Phase 1. Graph interactivity depth can follow once `graph.token-concept-map` nodes mature; Phase 1 requires a resolvable asset slot and message-backed alt/caption text only.
