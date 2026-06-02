# PRD: Content Registry Validation (Phase 1 Baseline)

## Introduction

Model Atlas separates **meaning** (JSON registry), **structure** (MDX), **localized text** (colocated messages), and **concrete media** (colocated assets). Phase 1 needs a minimum structured content baseline so downstream work can render one canonical module page (grouped-query attention) and one basic glossary page (token) without ad hoc parsing or prose scraping.

This work item delivers TypeScript/Zod contracts, registry and colocated content loaders, four starter registry records, colocated message/asset resolution for the two Phase 1 pages, and a maintainer-facing validation command that fails fast on broken relationships or unresolved keys.

**Depends on:** `site-app-scaffold` (Next.js/Bun/Biome/TypeScript/Makefile baseline must exist).

**Enables:** `docs-template-rendering`, `basic-token-glossary-page`, and `default-pages-search-tags`.

## Context

### Customer ask

Phase 1: implement the minimum structured content baseline needed for one canonical module page and one basic glossary page, including TypeScript/Zod schemas, registry loaders, one grouped-query attention module record, one token glossary/concept record, one attention tag record, one citation record, colocated message loading, colocated asset loading, and validation.

### Problem

Without a validated registry and colocated loaders, later features (search facets, tag pills, related links, citations, MDX rendering) would infer meaning from prose or duplicate JSON parsing in multiple places. Broken `registryId`, tag, or citation references would only surface at runtime or during manual review.

### Solution

Introduce `src/lib/content` as the single owner for Zod schemas, typed registry/message/asset loaders, and validation logic. Add Phase 1 starter JSON under `src/content/registry` and colocated `messages/en.json` plus `assets.json` for the grouped-query attention module path and token glossary path. Expose `make validate-data` (running `scripts/validate-registry.ts`) so CI and local development reject invalid content before build.

## Goals

- Establish Zod schemas and inferred TypeScript types for Phase 1 registry kinds: module, concept, tag, citation, plus shared base fields, page messages, and page assets.
- Load all registry JSON into lookup maps (`id`, `slug`, tag slug) usable by routes and search builders without re-parsing files.
- Ship four interconnected starter records: grouped-query attention module, token concept, attention tag, and one supporting citation.
- Resolve colocated default-locale messages and asset config for the two Phase 1 page directories.
- Fail validation with clear, actionable errors when schemas, IDs, tags, citations, message keys, or asset references are inconsistent.
- Prove loader and validator behavior with focused unit tests (not meta-inventory scans).

## Project-Level Acceptance Criteria

- [ ] Running `make validate-data` exits 0 on the Phase 1 baseline content and exits non-zero when a required relationship or message/asset key is broken (demonstrated by at least one failing test or documented negative case in tests).
- [ ] Registry loader returns the grouped-query attention module, token concept, attention tag, and citation by stable `id` without runtime JSON parse errors.
- [ ] Colocated message loader returns English title and section keys for both Phase 1 page directories when given their docs paths.
- [ ] Colocated asset loader resolves declared asset IDs for both pages and rejects missing `altKey` targets when messages lack the referenced keys.
- [ ] Starter records cross-reference each other consistently (module and concept use `tag.attention`; module references the citation; tag record exists for `attention`).
- [ ] Typecheck, lint, and tests pass for all changes introduced by this work item.

## User Stories

### content-registry-validation-001: Phase 1 content schemas

**Description:** As a maintainer, I need Zod schemas for Phase 1 registry records and colocated page payloads so invalid JSON fails at validation time with typed errors.

**Acceptance Criteria:**

- [x] `BaseRecord` fields (`id`, `slug`, `kind`, `defaultTitleKey`, `defaultSummaryKey`, `aliases`, `tags`, `relatedIds`, `citationIds`, `status`, timestamps) are defined and validated.
- [x] Discriminated schemas exist for `module`, `concept`, `tag`, and `citation` records matching `docs/data-model.md` Phase 1 fields (module type/family/variantGroup; concept type; tag category/landingPage; citation MLA fields).
- [x] `PageMessages` and `PageAssetConfig` schemas match the module and concept template shapes under `docs/templates/`.
- [x] Exported inferred types are available for loaders and tests.
- [x] Typecheck passes
- [x] Tests pass for schema parse success on minimal valid fixtures and parse failure on intentionally invalid fixtures

### content-registry-validation-002: Registry loader and lookup maps

**Description:** As a downstream feature author, I need one registry loader that builds typed lookup maps so I can resolve records by `id`, `slug`, or tag without reading the filesystem myself.

**Acceptance Criteria:**

- [ ] Loader reads JSON from `src/content/registry/{modules,concepts,tags,citations}/` and returns records validated against the Phase 1 schemas.
- [ ] Exported maps support `getById`, `getBySlug`, and `getTagBySlug` (or equivalent) for Phase 1 kinds.
- [ ] Duplicate `id` or conflicting `slug` across loaded records causes loader or validation to surface an error (covered by test).
- [ ] Typecheck passes
- [ ] Tests pass for loading an in-memory or fixture registry subset and resolving records by `id` and `slug`

### content-registry-validation-003: Phase 1 starter registry records

**Description:** As a reader-facing feature owner, I need canonical starter registry data for grouped-query attention, token, attention, and one citation so Phase 1 pages and search have real structured meaning to attach to.

**Acceptance Criteria:**

- [ ] `module.grouped-query-attention` exists with `moduleType: "attention"`, `variantGroup` for attention variants, tags including `attention` and `kv-cache`, and at least one `citationIds` entry.
- [ ] `concept.token` exists as the glossary/concept record for token with appropriate `conceptType` and shared discovery tags.
- [ ] `tag.attention` exists with `category` and `landingPage` suitable for tag discovery surfaces.
- [ ] One `citation.*` record exists with MLA text and stable URL for the module’s primary reference.
- [ ] All `tags`, `relatedIds`, and `citationIds` on starter records resolve to existing Phase 1 records.
- [ ] Typecheck passes
- [ ] Tests pass asserting the four records load and cross-reference successfully via the registry loader

### content-registry-validation-004: Phase 1 colocated content fixtures for both pages

**Description:** As a downstream page implementer, I need realistic colocated `messages/en.json` and `assets.json` fixtures for grouped-query attention and token so loaders and validation reflect real page usage.

**Acceptance Criteria:**

- [ ] Grouped-query attention directory includes default-locale messages with non-empty `title`, `description`, and core module sections (`whatItIs`, `whatItOptimizes`, etc.) aligned to the module template.
- [ ] Token glossary directory includes default-locale messages with glossary-appropriate sections (`whatItIs`, `whyItMatters`, `simpleExample`, etc.).
- [ ] Each directory includes `assets.json` with at least one resolvable asset ID and message-backed alt/caption keys (image and/or graph/table per template intent).
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-005: Colocated message loading

**Description:** As a docs renderer, I need default-locale messages loaded and validated from page directories so MDX can reference stable keys like `sections.whatItIs.title`.

**Acceptance Criteria:**

- [ ] Message loader reads `messages/en.json` for `src/content/docs/modules/grouped-query-attention/` and `src/content/docs/glossary/token/` (or the scaffold’s equivalent glossary path).
- [ ] Loader validates file content against `PageMessages` and returns typed messages including `title`, `description`, and required section keys used by templates.
- [ ] Missing default-locale file or unknown top-level shape fails with a clear error (covered by test).
- [ ] Typecheck passes
- [ ] Tests pass for successful load of both Phase 1 message files and failure on a malformed fixture

### content-registry-validation-006: Colocated asset loading and key resolution

**Description:** As a docs renderer, I need asset IDs resolved from colocated `assets.json` with alt/caption keys validated against page messages.

**Acceptance Criteria:**

- [ ] Asset loader reads colocated `assets.json` for both Phase 1 page directories and returns typed `PageAsset` values per asset ID.
- [ ] For each image asset, `altKey` must resolve to a string in the loaded default-locale messages (test covers success and missing-key failure).
- [ ] Graph/chart/table asset entries declare required renderer fields per `docs/data-model.md` (web and print renderer for graphs).
- [ ] Typecheck passes
- [ ] Tests pass for resolving declared asset IDs and rejecting broken `altKey` references

### content-registry-validation-007: Registry validation CLI and Makefile target

**Description:** As a CI maintainer, I need `make validate-data` to run a single validation entrypoint that checks registry shape, relationships, and Phase 1 page/message/asset consistency.

**Acceptance Criteria:**

- [ ] `scripts/validate-registry.ts` validates all Phase 1 registry JSON against schemas, enforces unique `id`/`slug`, resolves `tags`, `relatedIds`, and `citationIds`, and checks Phase 1 pages have default-locale messages and resolvable asset keys.
- [ ] `make validate-data` invokes the script and is documented in the root Makefile help or README command list.
- [ ] Running `make validate-data` on the committed Phase 1 baseline exits with code 0.
- [ ] Validation reports human-readable errors including record `id` or page path when a check fails (verified by test with a temporary invalid fixture or inline negative case).
- [ ] Typecheck passes
- [ ] Tests pass for at least one validation failure path and the happy path against Phase 1 fixtures

## Functional Requirements

- **FR-1:** Registry JSON lives under `src/content/registry/{modules,concepts,tags,citations}/` with kebab-case filenames matching record `id` suffix.
- **FR-2:** Stable IDs: `module.grouped-query-attention`, `concept.token`, `tag.attention`, and one `citation.*` record for Phase 1.
- **FR-3:** `src/lib/content/schemas.ts` owns Zod schemas; `registry.ts`, `messages.ts`, and `assets.ts` own loaders; no duplicate parsing in feature folders.
- **FR-4:** Validation covers schema match, ID/slug uniqueness, tag resolution, relationship ID resolution, default-locale message presence for Phase 1 pages, asset ID presence, and alt/caption key resolution.
- **FR-5:** Phase 1 pages use `messageNamespace: local` and `assetNamespace: local` conventions when MDX stubs are added by sibling work; this item provides the colocated files loaders consume.
- **FR-6:** Starter module record includes aliases discoverable by search (`GQA`, `grouped-query attention`) for downstream Orama work.

## Non-Goals

- Rendering MDX pages, tag landing UI, search UI, or home/glossary index pages (sibling work items).
- Implementing Orama search indexing or search document builders.
- Full registry coverage for models, papers, training regimes, datasets, hardware, organizations, or graphs beyond what Phase 1 pages reference.
- PDF export validation (`validate-pdf`) or link checking (`validate-links`).
- Secondary locales beyond English for Phase 1 (structure may allow `vi.json` later).
- Requiring published MDX pages to exist in this branch if sibling work adds them immediately after; validation may treat missing pages as errors only when matching `page.mdx` files are present in the tree (draft records remain valid until publish).

## High-Level Technical Design

```txt
src/content/registry/**/*.json
        |
        v
schemas.ts (Zod) --> registry.ts (load + maps)
        |
        +--> messages.ts <-- messages/en.json (per page dir)
        |
        +--> assets.ts <-- assets.json (per page dir)
        |
        v
scripts/validate-registry.ts
        |
        v
make validate-data  -->  CI / local gate
```

**Package ownership:** `src/lib/content` is the only import surface for content loading in app and scripts. Validation script imports loaders/schemas; it does not reimplement parsing.

**Phase 1 page paths (conventional):**

```txt
src/content/docs/modules/grouped-query-attention/
  messages/en.json
  assets.json
src/content/docs/glossary/token/
  messages/en.json
  assets.json
```

**Record relationships (minimum):**

```txt
module.grouped-query-attention
  tags: [attention, kv-cache, ...]
  citationIds: [citation.<gqa-paper>]
concept.token
  tags: [attention, ...]  # as appropriate for discovery
tag.attention
  # landing metadata for /tags/attention
citation.<id>
  # MLA + URL for module references
```

## Supporting Technical Considerations

- Align field names and enums with `docs/data-model.md` and `docs/architecture.md`; do not invent parallel naming.
- Prefer Zod `.strict()` or equivalent for registry records to catch typos early.
- Validation errors should name the failing `id`, tag, or page path—avoid stack-only failures.
- Keep starter copy concise but realistic; downstream rendering work will bind MDX structure to these keys.
- This branch should not modify unrelated factory or planning files except when required by scaffold conventions.

## Success Metrics

- `make validate-data` completes in under a few seconds on Phase 1 content.
- A maintainer can add a broken `citationIds` reference and get a single clear error without running the full site build.
- Downstream `docs-template-rendering` can import registry and colocated loaders without new parsing code.

## Open Questions

None for Phase 1 scope; glossary page path follows scaffold conventions from `site-app-scaffold` (`glossary/token` vs `concepts/token`—implementers should match the scaffold’s docs tree and keep `registryId` consistent).
