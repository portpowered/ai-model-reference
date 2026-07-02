# Content Page Generation Workflow Relevant Files

Use these files when adding or updating routine canonical docs pages (model,
concept, module, system, paper, training, or glossary). The goal is to add page
bundles and registry records without editing shared helper surfaces for
page-specific directory paths.

## Derived page directory contract

Routine canonical pages live under `src/content/docs/<section>/<slug>`. Resolve
the page directory with `getDocsPageDir(section, slug)` instead of adding a new
exported `*_PAGE_DIR` constant to `src/lib/content/content-paths.ts`.

## Routine preflight for ordinary page branches

| When | Command |
| --- | --- |
| Page bundle and registry shape are aligned | `make validate-data` — primary derived page-bundle validation proof |
| Structural proof passes and the review commit is ready | `bun run audit:canonical-page-surface` — owned-surface budget check before review |
| Review commit excludes accidental generated framework drift | Inspect the diff and drop root `next-env.d.ts` when the task is ordinary page content, registry, messages, or colocated assets — see [CONTRIBUTING.md#drop-accidental-next-envdts-drift-before-review](../../contributors/CONTRIBUTING.md#drop-accidental-next-envdts-drift-before-review) |

Derived validation contract and exceptions:
[derived-page-validation-relevant-files.md](./derived-page-validation-relevant-files.md).
Contributor-facing walkthrough:
[CONTRIBUTING.md#review-preflight-before-opening-a-page-pr](../../contributors/CONTRIBUTING.md#review-preflight-before-opening-a-page-pr).

## Routine review checklist for ordinary page PRs

| When | Check |
| --- | --- |
| Ordinary page PR includes root `next-env.d.ts` changes unrelated to page behavior | Reject or request removal — see [review-standards.md#drop-accidental-next-envdts-drift](../../review-standards.md#drop-accidental-next-envdts-drift) |

## Page-local scope versus shared hotspot redirects

Routine canonical page branches should stay page-local unless the requested
behavior requires shared infrastructure changes.

**Page-local (routine):**

- Page bundle under `src/content/docs/<section>/<slug>/`
- Matching primary registry record and page-specific supporting graph/table
  records

**Shared hotspot (redirect):**

- Shared helpers such as `src/lib/content` and `src/lib/search`
- Generated runtime artifacts checked in as authored changes
- Shared test suites and broad `validate-*.ts` churn
- Registry-manifest rewrites beyond the page's primary record

Do not hide shared hotspot churn inside an ordinary page slice. When
`bun run audit:canonical-page-surface` reports `redirect-to-throughput-prd`, or
when the work item is fundamentally cross-surface, open or redirect to a broader
throughput/conflict-reduction PRD.

Owned-surface audit: `bun run audit:canonical-page-surface`. Contributor
contract:
[CONTRIBUTING.md#routine-canonical-page-pr-surface-budget](../../contributors/CONTRIBUTING.md#routine-canonical-page-pr-surface-budget).

Compatible with narrow, reviewer-verifiable changes in
[code standards](../../code-standards.md) and
[review standards](../../review-standards.md).

## Glossary bridge plus concept canonical route (dual registry id)

When a new concept page shares an existing `concept.<slug>` registry id with a
published glossary bridge at `/docs/glossary/<slug>`, the page bundle can stay
page-local but CI will require narrowly-scoped shared updates:

- Resolve glossary-chain validation by `glossaryPageHref(slug)` plus
  `registryId`, not `pages.find(registryId)` alone.
- Route curated links, search ranking, and auto-linked prose to
  `/docs/concepts/<slug>` via generated `PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS`.
- Keep glossary-chain gates validating `/docs/glossary/<slug>`.
- Add one behavioral discovery test (for example `embedding-concept-discovery.test.ts`)
  using `getDocsPageDir("concepts", "<slug>")`; update only convergence fixtures
  whose expectations change because of the dual route.

Document the exception explicitly in the work-item PRD when this collision is
inherent to the slice.

## Glossary-derived browse and sidebar sections

When glossary decomposition needs new reader-facing top-level areas such as
Model Types or Inference without changing canonical `/docs/glossary/<slug>`
routes:

- Add or extend ontology classifications under `classification.concept.*` (for
  example `classification.concept.model-type`, `classification.concept.module`).
- Derive browse cards through `buildDocsBrowseSections` and
  `src/lib/docs/glossary-derived-browse-sections.ts`, using
  `primaryClassificationId` / `secondaryClassificationIds` membership rather
  than new docs collection route slugs.
- Split sidebar folders through `src/lib/navigation/docs-sidebar-sections.ts`
  and keep the remaining glossary pages in the `Glossary` folder.
- Pass `config.starterSlugs.length` into `toDocsIndexEntries` for derived browse
  sections when starter slugs exceed the default six-entry preview cap.
- Sidebar reconciliation tests that previously compared every glossary page to the
  `Glossary` folder must union `Model Types`, `Inference`, `Module Components`, and remaining
  `Glossary` URLs, or filter out `isGlossaryPageAssignedToDerivedSection`
  pages when asserting the residual glossary folder.
- Inference terms with canonical concept routes (`concepts/prefill`,
  `concepts/quantization`, `concepts/kv-cache-quantization`,
  `concepts/post-training-quantization`) still expose inference classification
  in search even when they are absent from glossary-derived browse sections.
- Update `browseIndex.*Section*` copy in `src/content/messages/*/common.json`
  and extend `DOCS_BROWSE_SECTION_ORDER` when introducing another derived area.
- Classify every remaining published glossary concept with `primaryClassificationId`;
  align `conceptType` with `classification.concept.architecture`, and rely on ontology
  sidebar resolution for math/training/evaluation before editorial `sidebarGrouping`
  fallbacks for generation-and-diffusion or sequence-and-attention subgroups.
- `validatePublishedGlossaryClassification` in `validate-glossary-classification.ts`
  blocks published glossary pages that lack `primaryClassificationId` unless
  `sidebarGrouping.glossary` provides an explicit editorial fallback; wired through
  `validateDerivedPublishedPageBundles` and `make validate-data`.
- Story-006 gates: `glossary-decomposition-validation.test.ts` for browse/search
  placement fixtures and `glossary-decomposition-browse-built-app.test.tsx` for
  desktop and narrow `/browse` category verification when integration tests run.

## PR-head mergeability for page branches (process executors)

When a routine canonical page branch has finished its page PRD stories but the
current blocker is PR-head mergeability—failed required checks, merge
conflicts, inherited test failures, or a non-mergeable PR head—do not stall in
passive continue states. Follow the existing process workstation mergeability
phase in
[factory/workstations/process/AGENTS.md](../../../factory/workstations/process/AGENTS.md)
(rules 5.2.1–5.2.5). Attempt the smallest disciplined mergeability fix those
rules allow before returning continue.

| When | Command |
| --- | --- |
| Diagnose mergeability class, linkage gaps, and action queue for active PR-backed lanes | `bun run watch:active-pr-mergeability` |
| Planner batch dispatch: collision preflight before scheduling overlapping page lanes | `bun run report:planner-batch-collision-preflight` |

These are existing owned commands. Do not invent a second mergeability policy,
new command, or new enforcement mechanism—the process workstation owns
mergeability phase expectations.

Valid mergeability work on the current PR head includes fixing required test,
lint, typecheck, build, contract, or browser-check failures; resolving merge
conflicts or merging the current base branch; and updating shared files outside
the original page slice when they are the concrete reason the reviewed head is
blocked. Document mergeability-only follow-ups in `progress.txt` and PR
conversation comments.

**Do not add** page-specific directory exports for ordinary page work. A focused
guard in `content-paths.test.ts` fails when new `export const *_PAGE_DIR`
constants appear outside the grandfathered allowlist.

**Still allowed** when you need tree-wide or section-wide paths:

* `getDocsRoot`, `getContentRoot`, `getProjectRoot`
* Section roots such as `getModulesDocsRoot`, `getGlossaryDocsRoot`, and
  `getDocsSectionRoot(section)`
* Registry, generated, and message roots such as `getRegistryRoot`,
  `getRegistryCollectionRoot`, `getMessagesRoot`, and generated docs roots

### Replacement pattern

```ts
import { getDocsPageDir } from "@/lib/content/content-paths";

const pageDir = getDocsPageDir("modules", "grouped-query-attention");
```

Supported `section` values: `glossary`, `concepts`, `modules`, `models`,
`papers`, `training`, `systems`.

For page tests that read bundle files, keep the same assertions after switching
from a `*_PAGE_DIR` import or `join(sectionRoot, slug)` to the derived lookup.

## Core content paths

* `src/lib/content/content-paths.ts`
  Canonical path helpers. Module JSDoc documents the derived page directory
  contract. Add shared roots or section helpers here only when the path is not
  an ordinary single-page directory.
* `src/lib/content/content-paths-page-dir-guard.ts`
  Grandfathered allowlist for legacy `*_PAGE_DIR` exports and the guard failure
  message that points reviewers to `getDocsPageDir(section, slug)`.
* `src/lib/content/content-paths.test.ts`
  Contract tests for derived directories across every docs section, exported
  production roots, and the no-new-page-constants guard.

## Page bundle and registry workflow

* `docs/templates/*.content.md`
  Authoring templates for model, module, concept, glossary, paper, training, and
  system pages.
* `docs/guide-to-writing-pages.md`
  High-level page authoring steps, graph requirements, and code/documentation
  separation expectations.
* `src/content/docs/<section>/<slug>/`
  Canonical page bundle layout (`page.mdx`, `messages/`, `assets.json`, graphs,
  and related colocated files).
* `src/content/registry/`
  Registry JSON records that connect published pages to taxonomy, graphs, and
  runtime loaders.
* `scripts/validate-registry.ts`
  Maintainer and CI entrypoint for registry validation after adding records.

## Representative migrated consumers

These files show the preferred `getDocsPageDir` pattern in page tests without
requiring a broad rewrite of every legacy `*_PAGE_DIR` import:

* `src/lib/content/module-page.test.ts`
* `src/lib/content/page-bundle.test.ts`
* `src/lib/content/validate-registry.ts`
* `src/lib/content/vocabulary-size-glossary-page.test.ts`
* `src/lib/content/prefill-concept.test.ts`
* `src/lib/content/sparse-attention-module-page.test.ts`
* `src/lib/content/attention-module-page.test.ts`
* `src/lib/content/pretraining-training-regime.test.ts`
* `src/lib/content/memory-system-page.test.ts`

When adding a new page test, follow the same module-level
`const pageDir = getDocsPageDir("<section>", "<slug>")` pattern instead of
importing a page-specific constant.

## Stale-branch reconciliation before publishing

When a page slice was drafted on an older branch that predates current
`origin/main`, reconcile before copying artifacts:

1. `git fetch origin main` and inspect prerequisite registry records and page
   bundles on main (papers, citations, modules the slice should link to).
2. Inspect the stale branch/worktree for salvageable page bundle, registry,
   graph, and test files only — do not merge the stale branch wholesale.
3. Document gaps in `docs/internal/processes/<work-item>-reconciliation-notes.md`
   (missing `relatedIds`, empty `paperIds`, modules that landed on main after
   the stale branch).
4. Drop stale assumptions when the target does not exist or has changed on main
   (for example omit `model.stable-diffusion` when no canonical record exists).
5. Port tests with updated relationship expectations rather than copying stale
   assertions blindly.

Representative reconciliation: [clip-model-current-main-reconciliation-notes.md](./clip-model-current-main-reconciliation-notes.md).

## Paired model slice discoverability

When shipping the final story in a multi-model family PRD, keep discovery
registry-backed instead of hand-maintaining related prose:

* Bidirectional sibling links in each model record's `relatedIds`
* Aliases on both registry records and page frontmatter (`Mixtral 8x7B`,
  `open-mixtral-8x7b`, etc.)
* Back-links on shared module/system records:
  `module.mixture-of-experts` `usedByModelIds` and `system.routing`
  `relatedModelIds`
* A focused `*-discovery.test.tsx` patterned after
  `src/lib/content/qwen-3-6-discovery.test.tsx` or
  `src/lib/content/glm-family-discovery.test.tsx`

Representative paired-slice verification:

* `src/lib/content/mixtral-moe-discovery.test.tsx`
* `src/lib/content/qwen-3-6-discovery.test.tsx`
* `src/lib/content/glm-family-discovery.test.tsx`

## Reviewer-facing verification

* `bun test src/lib/content/content-paths.test.ts`
  Proves derived lookup across sections and rejects new ordinary page directory
  exports.
* `bun run typecheck`
  Required after touching shared content helpers or page tests that import them.
