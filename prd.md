# PRD: Content Registry and Validation Baseline

## Introduction

Model Atlas treats structured JSON registry data, colocated localized messages, and colocated asset config as the source of truth for search, relationships, citations, and page rendering. Phase 1 must prove that one canonical module page—**grouped-query attention**—can be represented end to end with validated data before UI rendering, search, and tag surfaces are built on top.

This work delivers the minimum structured content stack: TypeScript/Zod schemas, registry loaders, one module record, one tag record, one citation record, colocated message loading, colocated asset loading, the canonical page content bundle, and a validation command that fails on broken references.

## Context

### Customer ask

Phase 1: implement the minimum structured content baseline needed for one canonical docs page, including TypeScript/Zod schemas, registry loaders, one module record, one tag record, one citation record, colocated message loading, colocated asset loading, and validation.

### Problem

Without a typed content contract and validation gate, registry JSON, page frontmatter, messages, and assets can drift apart. Downstream features (docs rendering, search, tag pages, related links) would scrape prose or guess relationships instead of consuming validated structured data.

### Solution

Establish `src/lib/content` schemas and loaders, seed the grouped-query-attention baseline across registry and page-local files, and add `scripts/validate-registry.ts` plus `make validate-data` so maintainers get a clear pass/fail signal before build or deploy.

## Goals

- Define Zod-backed TypeScript schemas for base registry records, module/tag/citation kinds, page frontmatter, page messages, and page asset config.
- Load registry JSON into typed lookup maps (`id`, `slug`, `tag`) usable by future routes and features.
- Load colocated `messages/<locale>.json` and `assets.json` for a docs page directory.
- Publish one coherent baseline: `module.grouped-query-attention`, `tag.attention`, one supporting citation, and matching page files under `src/content/docs/modules/grouped-query-attention/`.
- Fail validation with actionable errors when schemas break or references do not resolve.
- Prove correctness with targeted unit tests and a runnable `make validate-data` command.

## Project-Level Acceptance Criteria

- [ ] Zod schemas in `src/lib/content/schemas.ts` cover base registry fields plus module, tag, and citation record shapes aligned with `docs/data-model.md`.
- [ ] Zod schemas also cover page frontmatter, `PageMessages`, and `PageAssetConfig` shapes used by the grouped-query-attention page.
- [ ] `src/lib/content/registry.ts` loads all registry JSON under `src/content/registry/**` and exposes typed lookups by record `id` and `slug`, plus tag lookup by tag id/slug.
- [ ] Exactly one published module record (`module.grouped-query-attention`), one tag record (`tag.attention`), and one citation record referenced by that module exist and pass schema validation.
- [ ] Colocated loaders in `src/lib/content/messages.ts` and `src/lib/content/assets.ts` resolve the grouped-query-attention page’s default-locale messages and asset IDs.
- [ ] `bun ./scripts/validate-registry.ts` exits 0 on the baseline and exits non-zero with a human-readable error when a relationship id, tag, citation, message key, or asset reference is broken.
- [ ] `make validate-data` runs the registry validation script and is documented for CI inclusion once the app scaffold exists.
- [ ] Quality gate: typecheck, lint, and tests pass for all changes in this work item.

## User Stories

### content-registry-validation-001: Registry base and kind-specific Zod schemas

**Description:** As a maintainer, I need typed Zod schemas for shared registry fields and the module, tag, and citation kinds so invalid JSON is caught before loaders or validation run.

**Acceptance Criteria:**

- [ ] `src/lib/content/schemas.ts` exports Zod schemas and inferred types for `BaseRecord`, `RegistryKind`, `RegistryStatus`, `ModuleRecord`, `TagRecord`, and `CitationRecord` matching `docs/data-model.md` field names and required enums.
- [ ] Module schema enforces `moduleType`, `optimizes`, `practicalBenefits`, and related id arrays; tag schema enforces `category` and `landingPage`; citation schema enforces `citationType`, `authors`, `title`, `url`, and `mla`.
- [ ] Invalid sample payloads (wrong enum, missing required field, malformed id) fail `safeParse` in a focused schema unit test.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-002: Page frontmatter, message, and asset Zod schemas

**Description:** As a maintainer, I need schemas for MDX frontmatter and colocated page files so the canonical page structure cannot drift from the registry contract.

**Acceptance Criteria:**

- [ ] `src/lib/content/schemas.ts` exports Zod schemas for `PageFrontmatter`, `PageMessages`, and `PageAsset` / `PageAssetConfig` aligned with `docs/data-model.md`.
- [ ] Frontmatter schema requires `kind`, `registryId`, `messageNamespace`, `assetNamespace`, `tags`, `status`, and `updatedAt` for module pages.
- [ ] Message schema requires `title` and `description` and validates nested `sections` and optional `assets` alt/caption keys.
- [ ] Asset schema validates discriminated `type` unions (`image`, `graph`, `chart`, `table`, `code-schema`) and required keys per type.
- [ ] Invalid frontmatter or asset config fails `safeParse` in a focused unit test.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-003: Registry loader with typed lookup maps

**Description:** As a developer building docs features, I want a single registry loader that returns typed records and indexes so I do not parse JSON ad hoc in components.

**Acceptance Criteria:**

- [ ] `src/lib/content/registry.ts` reads JSON files from `src/content/registry/{modules,tags,citations}/` (and is structured to extend to other kinds later without API breakage).
- [ ] Loader returns maps: `byId`, `bySlug`, and `tagsById` (or equivalent) with values typed from Zod-inferred record types.
- [ ] Loading the Phase 1 baseline resolves `module.grouped-query-attention`, `tag.attention`, and the sample citation by id.
- [ ] Duplicate `id` or `slug` across loaded records throws or returns a structured error consumed by validation.
- [ ] Unit test proves all three baseline records load and are retrievable by id.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-004: Baseline module, tag, and citation registry records

**Description:** As a content author, I need real registry JSON for grouped-query attention so the canonical page has authoritative metadata, tags, and citations.

**Acceptance Criteria:**

- [ ] `src/content/registry/modules/grouped-query-attention.json` exists with `id: module.grouped-query-attention`, `kind: module`, `status: published`, attention-related `moduleType`/`variantGroup`, tags including `attention`, and `citationIds` pointing at the sample citation.
- [ ] `src/content/registry/tags/attention.json` exists with `id: tag.attention`, `kind: tag`, `category: module-type` (or appropriate enum), and aliases useful for search recall (e.g. `attention mechanisms`).
- [ ] `src/content/registry/citations/<slug>.json` exists with stable `id`, MLA text, and URL for the primary GQA reference used on the module page.
- [ ] All three files pass the Zod schemas from content-registry-validation-001 when parsed directly.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-005: Colocated message loader

**Description:** As a developer, I want to load default-locale page messages from `messages/<locale>.json` next to a docs page so MDX components can resolve `T` keys without reading files manually.

**Acceptance Criteria:**

- [ ] `src/lib/content/messages.ts` exports a function that accepts a page directory path (or slug path) and locale, reads `messages/<locale>.json`, validates against `PageMessages`, and returns typed messages.
- [ ] Missing default locale file (`en`) produces a clear error.
- [ ] Loader resolves grouped-query-attention `title`, `description`, and at least one `sections.*` key used by the module template.
- [ ] Unit test loads the baseline page messages successfully.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-006: Colocated asset loader

**Description:** As a developer, I want to load and resolve `assets.json` next to a docs page so MDX and graph components receive concrete asset config by id.

**Acceptance Criteria:**

- [ ] `src/lib/content/assets.ts` exports a function that loads and validates colocated `assets.json` against `PageAssetConfig`.
- [ ] Given an asset id (e.g. `computeFlow`), the loader returns the typed asset entry including `type`, renderer fields for graphs, and message keys for alt/caption.
- [ ] Requesting an unknown asset id returns a clear error.
- [ ] Unit test loads baseline grouped-query-attention assets and resolves at least `computeFlow`.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-007: Canonical grouped-query-attention page content bundle

**Description:** As a content maintainer, I need the canonical MDX page structure plus colocated messages and assets so validation and future rendering share one baseline page.

**Acceptance Criteria:**

- [ ] `src/content/docs/modules/grouped-query-attention/page.mdx` exists with frontmatter `registryId: module.grouped-query-attention`, `kind: module`, `messageNamespace: local`, `assetNamespace: local`, and tags that resolve to `tag.attention`.
- [ ] Page structure follows `docs/templates/module.mdx` patterns: uses `T`, `Section`, and registry-backed components; no raw user-visible prose outside approved structural wrappers.
- [ ] `messages/en.json` provides non-empty `title`, `description`, `problemStatement`, `coreIdea`, and section bodies/headings for keys referenced in `page.mdx`.
- [ ] `assets.json` declares at least `computeFlow` (and other ids referenced in MDX if present) with valid `altKey`/`captionKey` paths that exist in `messages/en.json`.
- [ ] Running message and asset loaders against this directory succeeds without error.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-008: Registry validation script

**Description:** As a CI maintainer, I want `validate-registry.ts` to fail the build when registry, page, message, or asset data is inconsistent so bad content never ships.

**Acceptance Criteria:**

- [ ] `scripts/validate-registry.ts` validates all registry JSON against kind schemas, enforces unique `id` and `slug`, and verifies `relatedIds`, `citationIds`, and tag references resolve to existing records for the Phase 1 baseline.
- [ ] Script validates the grouped-query-attention page: frontmatter `registryId` exists, default-locale messages exist, MDX-referenced message keys exist in `en.json`, and MDX/asset-referenced asset ids exist in `assets.json`.
- [ ] Script exits with code 1 and prints the offending file/id when a baseline record is mutated to reference a missing tag or citation (covered by a test or script invocation test).
- [ ] Script exits 0 on the committed baseline.
- [ ] Typecheck passes
- [ ] Tests pass

### content-registry-validation-009: Make validate-data target and validation tests

**Description:** As a developer running local CI, I want `make validate-data` and automated tests so registry validation stays wired and regressions are caught quickly.

**Acceptance Criteria:**

- [ ] Root `Makefile` defines `validate-data` to run `bun ./scripts/validate-registry.ts`.
- [ ] `make validate-data` succeeds on a clean checkout after this work item.
- [ ] Test suite includes cases for: successful baseline validation, schema rejection, and unresolved reference failure (at least one negative path).
- [ ] Typecheck passes
- [ ] Tests pass

## Functional Requirements

- FR-1: Registry records use stable kebab-case ids namespaced by kind (`module.*`, `tag.*`, `citation.*`).
- FR-2: Zod is the schema library; inferred TypeScript types are exported alongside schemas.
- FR-3: Registry loader is the only supported path for reading registry JSON in application code introduced by this work item.
- FR-4: Message and asset loaders validate before returning data.
- FR-5: Phase 1 baseline uses grouped-query-attention as the canonical module page path under `src/content/docs/modules/grouped-query-attention/`.
- FR-6: `scripts/validate-registry.ts` is the authority for data correctness checks scoped to registry, colocated messages, and colocated assets (not docs link topology or bundle internals).
- FR-7: Validation errors name the failing record id, page path, message key, or asset id.

## Non-Goals

- No Next.js route or Fumadocs rendering implementation (handled by `docs-template-rendering` and `site-app-scaffold`).
- No Orama search index builder or search UI.
- No home, glossary, or tag landing pages.
- No graph registry records, React Flow rendering, or PDF export validation.
- No additional registry kinds beyond module, tag, and citation for Phase 1 baseline (schemas may be extensible, but only these three records are required).
- No Vietnamese or additional locales beyond proving default `en` for the sample page.
- No broad refactors of unrelated factory or documentation files.

## High-Level Technical Design

```txt
src/content/registry/          JSON source of truth
  modules/grouped-query-attention.json
  tags/attention.json
  citations/<slug>.json

src/content/docs/modules/grouped-query-attention/
  page.mdx                       structure + registryId
  messages/en.json               localized display text
  assets.json                    asset id -> config

src/lib/content/
  schemas.ts                     Zod + inferred types
  registry.ts                    load + index registry JSON
  messages.ts                    load + validate page messages
  assets.ts                      load + validate page assets

scripts/validate-registry.ts     CLI validation orchestrator
```

**Dependency note:** This work item assumes the `site-app-scaffold` work item provides Bun, TypeScript, Biome, and `src/lib/content` directory placement. If scaffold is incomplete, stories 001–003 may land package wiring first, but must not duplicate full app UI work.

**Validation flow:**

1. Load and schema-parse all registry JSON.
2. Build indexes; detect duplicate ids/slugs.
3. Resolve cross-record references for baseline records.
4. For each published canonical docs page in scope (grouped-query-attention only in Phase 1): validate frontmatter, load messages/assets, check key and id resolution.

## Supporting Technical and UX Considerations

- Follow `docs/data-model.md` and `docs/architecture.md` for field names, id conventions, and file layout.
- Prefer throwing structured errors with record/page context over silent coercion.
- Keep loaders pure (read filesystem, parse, validate, return) so unit tests do not require a running Next server.
- Message keys referenced in MDX must exist in default locale; this is user-visible correctness even before UI stories land.
- Tag and citation records should include aliases that later support search queries like `GQA`, `attention`, and `KV cache` without prose scraping.

## Success Metrics

- `make validate-data` completes in under a few seconds on the baseline.
- A maintainer can add a broken `citationIds` reference and see a single clear validation failure without running the full site.
- All three baseline registry records and the page bundle load through typed APIs with zero `any` escapes in public loader return types.
- Negative-path test fails in CI when validation regresses.

## Open Questions

None for Phase 1 baseline scope; grouped-query-attention is the canonical page per `factory/internal/customer-ask.md` and `docs/documentation-site-pages-needed.md`.
