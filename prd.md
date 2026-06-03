# PRD: Phase 1 Turbopack Tracing Warning Cleanup

## Introduction

Model Atlas Phase 1 builds successfully today, but `next build` can emit a Next.js/Turbopack NFT warning about **unintentional whole-project filesystem tracing** when runtime content loaders that call `node:fs` and `process.cwd()` are pulled into the App Router server-component graph. Progress notes and prior CI hardening work trace the warning through `src/lib/content/glossary-pages.ts` and related content-loader import chains (for example loaders used by glossary index routes, tag indexes, and MDX-derived related-doc components).

This work item narrows filesystem access so Turbopack tracing stays scoped to the committed content tree (`src/content/**`), or applies the smallest acceptable documented containment if the warning cannot be eliminated cleanly in Phase 1. The goal is a cleaner, more deterministic production build—not new site features or Phase 2 content.

**Depends on:** `phase-1-fresh-checkout-typecheck-hardening` (Fumadocs codegen before typecheck; reliable `make ci` baseline).

**Enables:** Phase 1 CI hardening loopback with a build output free of unexplained tracing warnings.

## Context

### Customer ask

Phase 1 repair: address the current Next/Turbopack production-build warning caused by broad filesystem tracing from content loaders, currently surfacing through `src/lib/content/glossary-pages.ts` during `next build`. Narrow filesystem access so tracing stays scoped to the content tree, or add the smallest acceptable documented containment if the warning cannot be eliminated cleanly in Phase 1. Do not broaden site scope or add Phase 2 content; the goal is a cleaner and more deterministic Phase 1 build.

### Problem

Content listing and page-loading helpers under `src/lib/content/` use runtime filesystem APIs (`readdir`, `readFile`, `readFileSync`, `process.cwd()`) to discover MDX pages, registry JSON, and locale messages. When those modules are imported—directly or transitively—by App Router pages, layouts, or MDX server components, Turbopack's NFT (Node File Trace) step may treat the dependency graph as requiring broad project filesystem access. That produces a maintainer-visible warning during `next build` even though the build exits 0.

The warning is especially associated with `glossary-pages.ts`, which scans `src/content/docs/glossary` at runtime. Similar patterns exist in `pages.ts`, `registry.ts`, `ui-messages.ts`, `glossary-page.ts`, and `module-page.ts`. Broad tracing makes production builds less deterministic, obscures real bundler issues, and undermines Phase 1 CI hardening where `make ci` includes `next build`.

### Solution

Add a behavioral build regression gate that fails when the Turbopack NFT whole-project tracing warning reappears; centralize content filesystem roots so loaders resolve paths under `src/content/**` instead of scattering `process.cwd()`; decouple pure URL/registry helpers from filesystem scanners in the server-component import graph (following the existing `content-hrefs.ts` / `registry-runtime.ts` split); resolve or quarantine `glossary-pages.ts` so it is not part of the production server graph unless required; and, only if the warning persists after scoping, add the smallest Turbopack tracing containment in `next.config.ts` plus a short note in `progress.txt` explaining the residual behavior, root cause, and follow-up options.

## Description

Repair Phase 1 **production build determinism** by eliminating—or narrowly documenting—the Turbopack NFT filesystem tracing warning caused by content loaders, without changing Phase 1 routes, search behavior, or committed content scope.

## Goals

- `next build` (and therefore `make ci`) no longer emits the Turbopack NFT whole-project filesystem tracing warning, **or** the residual warning is explicitly documented with import trace and mitigation notes.
- Filesystem access for runtime content loaders is scoped to `src/content/**` (and test overrides), not the entire repository root.
- Pure helpers (URLs, registry lookups, derived related-doc logic) remain importable without pulling `node:fs` into the server-component graph.
- Phase 1 glossary, tags, modules, search, and discovery routes behave identically after the change.
- A build regression test catches reintroduction of the warning in `bun test`.

## Project-Level Acceptance Criteria

- [ ] Running `bun run build` after a clean `.next` removal completes with exit code 0 and does **not** print the Turbopack NFT warning about unintentional whole-project filesystem tracing from content loader import chains.
- [ ] If the warning cannot be eliminated cleanly, `progress.txt` records the residual warning with the full import trace, root cause, attempted scoping/fix, and recommended follow-up—plus the smallest acceptable Turbopack containment config in `next.config.ts` if applicable.
- [ ] Runtime content loaders resolve paths under a single shared content-root helper targeting `src/content/**`; no loader uses bare `process.cwd()` for discovery paths in the production graph.
- [ ] App Router pages and MDX server components do not statically import modules that invoke filesystem APIs at module evaluation time; filesystem scanning happens inside async loader functions or dynamically imported server-only modules.
- [ ] `glossary-pages.ts` is either removed from the production import graph (consolidated with existing glossary index loading) or scoped so it no longer triggers broad tracing.
- [ ] Existing Phase 1 route smoke tests, glossary/tag index tests, and static route verification continue to pass without content or URL changes.
- [ ] Typecheck, lint, and tests pass via `make ci`.

## User Stories

### phase-1-turbopack-tracing-warning-cleanup-001: Add build regression gate for Turbopack tracing warning

**Description:** As a CI maintainer, I want an automated test that fails when `next build` reintroduces the Turbopack NFT whole-project tracing warning so regressions are caught before merge.

**Acceptance Criteria:**

- [ ] A Bun test runs `bun run build` from the repository root (with `.next` removed beforehand) and expects exit code 0.
- [ ] The test fails if combined build stdout/stderr matches the known Turbopack NFT whole-project filesystem tracing warning pattern associated with content loader import chains.
- [ ] The test documents the warning substring(s) it guards against in a short comment so future Next.js message changes are easy to update.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-turbopack-tracing-warning-cleanup-002: Centralize content filesystem roots under `src/content`

**Description:** As a maintainer, I want all runtime content loaders to resolve filesystem paths through one shared content-root helper so Turbopack tracing targets the content tree instead of the whole repository.

**Acceptance Criteria:**

- [ ] A shared module (for example `src/lib/content/content-paths.ts`) exports stable roots for `src/content`, docs, glossary, modules, registry, and messages derived from the project directory—not ad hoc `process.cwd()` joins in each loader.
- [ ] `glossary-pages.ts`, `pages.ts`, `registry.ts`, `ui-messages.ts`, `glossary-page.ts`, `module-page.ts`, and related loaders consume the shared roots (tests may still override roots via options or fixtures).
- [ ] Existing glossary, pages, registry, and UI message loader tests pass with unchanged behavioral expectations (same published entries, titles, and URLs).
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-turbopack-tracing-warning-cleanup-003: Keep filesystem scanners out of the static server-component import graph

**Description:** As a maintainer, I want App Router pages and MDX server components to import only pure helpers or thin async facades so Turbopack does not trace broad filesystem access through the React server graph.

**Acceptance Criteria:**

- [ ] Route modules under `src/app/**` and server MDX components such as `DerivedRelatedDocs` do not have static import chains that evaluate `node:fs` APIs at module load time.
- [ ] Filesystem scanning for glossary index, tag index, architecture index, and per-page loaders occurs inside async functions or dynamically imported server-only modules invoked at request/build time.
- [ ] Pure modules (`content-hrefs.ts`, `related-docs.ts`, `registry-runtime.ts`, schema/types) remain free of filesystem imports.
- [ ] `/docs/glossary`, `/docs/glossary/token`, `/docs/modules/grouped-query-attention`, `/tags`, and `/tags/attention` still render published Phase 1 content with the same titles and links as before the change.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-turbopack-tracing-warning-cleanup-004: Resolve `glossary-pages.ts` tracing surface

**Description:** As a maintainer, I want the loader called out in the Turbopack warning (`glossary-pages.ts`) removed from the production server graph or consolidated with the existing glossary index path so build tracing no longer flags it.

**Acceptance Criteria:**

- [ ] Production App Router and MDX import graphs no longer statically depend on `glossary-pages.ts`, **or** `listPublishedGlossaryPages` is consolidated with `loadPublishedGlossaryEntries` / `loadPublishedDocsPages` so only one glossary scanner exists in the server graph.
- [ ] Glossary index behavior is unchanged: published token entry appears with title, summary, and `/docs/glossary/token` URL; draft entries remain excluded.
- [ ] `glossary-pages.test.ts` continues to pass (updated imports/paths if consolidation moves the implementation).
- [ ] The build regression test from story 001 no longer detects a tracing warning whose import trace includes `glossary-pages.ts`.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-turbopack-tracing-warning-cleanup-005: Apply Turbopack containment fallback or document residual warning

**Description:** As a maintainer, I want either a warning-free build or the smallest documented containment when scoping alone cannot eliminate the Turbopack NFT warning in Phase 1.

**Acceptance Criteria:**

- [ ] If stories 002–004 eliminate the warning, no additional Turbopack tracing config beyond existing `turbopack.root` is required and `progress.txt` needs no residual-warning entry.
- [ ] If the warning persists after scoping, add the smallest acceptable tracing containment in `next.config.ts` (for example `outputFileTracingRoot` / includes limited to `src/content/**`) and record in `progress.txt` the import trace, root cause, attempted fixes, chosen containment, and follow-up recommendation.
- [ ] `bun run build` exits 0 in either outcome.
- [ ] The build regression test from story 001 passes, or—only when documentation is the chosen outcome—the test is updated to assert the documented accepted residual is absent from stdout while containment config is present.
- [ ] Typecheck passes
- [ ] Tests pass

### phase-1-turbopack-tracing-warning-cleanup-006: Verify Phase 1 CI and discovery surface unchanged

**Description:** As a Phase 1 maintainer, I want full quality gates green and discovery routes unchanged after tracing cleanup so CI hardening remains trustworthy.

**Acceptance Criteria:**

- [ ] `make ci` exits 0 (lint, typecheck, test, build with Phase 1 static route verification, validate-data).
- [ ] `scripts/verify-phase-1-static-routes.ts` passes against the production build manifest.
- [ ] No new Phase 2 routes, registry records, or content pages are added; only loader/import/tracing changes allowed.
- [ ] Typecheck passes
- [ ] Tests pass

## Functional Requirements

- **FR-1:** A Bun build regression test guards against Turbopack NFT whole-project filesystem tracing warnings during `next build`.
- **FR-2:** Shared content-path roots constrain runtime loader filesystem access to `src/content/**`.
- **FR-3:** App Router and MDX server components import filesystem scanners only through async or dynamic server-only boundaries.
- **FR-4:** `glossary-pages.ts` is consolidated or removed from the production import graph per the customer-identified warning surface.
- **FR-5:** Residual warnings, if any, are documented in `progress.txt` with actionable context; optional minimal Turbopack containment is limited to the content tree.
- **FR-6:** Phase 1 public URLs, search indexing, and committed content records remain unchanged.

## Non-Goals

- Adding Phase 2 content, routes, or registry records.
- Broad content-loader architecture rewrite beyond tracing scope (for example full build-time codegen of all indexes).
- Committing `.source/`, `.next/`, or generated search indexes to git.
- Changing `make ci` step order or removing `validate-data`.
- Meta-tests that inventory every import path, file name, or module registration unless tied to an observable build warning or route outcome.
- Browser E2E suites for this build-only repair (existing route smoke and static render tests suffice).

## High-Level Technical Design

### Observed warning pattern (target to eliminate)

Turbopack NFT warns when modules in the server-component graph use runtime filesystem discovery rooted at `process.cwd()`, causing tracing to expand beyond `src/content/**`. Prior notes cite a trace similar to:

```txt
./src/lib/content/glossary-pages.ts
  -> content loader / related-doc import chain
  -> MDX server component
  -> Phase 1 module page
```

Even when the exact import chain shifts, the underlying issue is the same: **filesystem scanners statically reachable from the React server graph**.

### Mitigation ladder

```txt
1. Regression test (story 001)
        |
        v
2. Centralize content paths under src/content (story 002)
        |
        v
3. Split pure helpers vs fs scanners; async/dynamic boundaries (story 003)
        |
        v
4. Quarantine or consolidate glossary-pages.ts (story 004)
        |
        v
5. If warning remains: minimal next.config containment + progress.txt (story 005)
        |
        v
6. make ci + Phase 1 route verification (story 006)
```

### Module ownership

| Concern | Owner module(s) | Tracing-safe role |
|--------|------------------|-------------------|
| URL helpers | `content-hrefs.ts` | Pure string paths; safe to import anywhere |
| Registry lookups | `registry-runtime.ts` | Static JSON imports; no fs |
| Derived related docs | `related-docs.ts` | Pure functions over in-memory records |
| Docs discovery | `pages.ts`, `glossary.ts`, `tags.ts`, `architecture.ts` | Filesystem scanners—server-only async boundary |
| Glossary scanner (warning surface) | `glossary-pages.ts` | Consolidate or exclude from production graph |
| Content roots | new `content-paths.ts` (or equivalent) | Single project-root resolver for `src/content/**` |
| Build gate | new build regression test under `src/tests/` or `src/lib/build/` | Subprocess `next build` warning assertion |

### Async/dynamic boundary pattern

Server route modules should follow:

```txt
page.tsx  -->  thin async facade (glossary.ts)
                    |
                    +--> dynamic import() or inline async call
                         to fs scanner (pages.ts)
```

Pure types and href helpers stay in modules imported by both tests and components; scanners stay behind async loader functions not evaluated at module init.

## Supporting Technical and UX Considerations

- Prefer consolidating duplicate glossary scanners (`glossary-pages.ts` vs `pages.ts`/`glossary.ts`) over maintaining parallel implementations.
- Test overrides (`contentRoot` options, temp dirs) must continue working for negative/fixture cases in `glossary-pages.test.ts` and registry validation tests.
- Do not move filesystem loaders into client components; keep scanners server-only.
- If Turbopack containment is used, limit includes/roots to `src/content/**`—never the repository root or `node_modules` wildcards.
- Existing `turbopack.root` in `next.config.ts` should remain compatible with any tracing additions.

## Success Metrics

- `make ci` build step produces no unexplained Turbopack NFT tracing warnings.
- A deliberate reintroduction of `process.cwd()`-based scanning in a server-imported module fails the build regression test in CI.
- Phase 1 glossary and tag index pages render the same published entries before and after the change.
- Contributor build logs are shorter and actionable; real bundler errors are easier to spot.

## Open Questions

None for Phase 1 scope. If full elimination requires build-time index generation for all discovery pages, document the residual warning and defer deeper loader architecture to a follow-up item rather than expanding this batch.
