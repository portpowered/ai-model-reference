# Content page generation workflow — scaffolding inventory and boundaries

This document inventories the existing content-generation surfaces the page-spec workflow owns, records current scaffold limitations, and defines workflow boundaries so generation improves the established path instead of introducing a parallel system.

## Generation surfaces the workflow owns

| Surface | Path | Role |
| --- | --- | --- |
| Production templates | `docs/templates/<kind>.mdx`, `<kind>.messages.en.json`, `<kind>.assets.json`, `<kind>.graph.json`, `<kind>.content.md` | Canonical page structure, default message keys, asset IDs, and graph registry templates for each supported docs kind. `.content.md` is maintainer guidance only; generators read `.mdx` and sidecars. |
| Published page bundles | `src/content/docs/**/<slug>/page.mdx` | Structural MDX with frontmatter, message keys, and asset component references. |
| Colocated messages | `src/content/docs/**/<slug>/messages/en.json` | Reader-facing title, description, folded `openingSummary`, section copy, callouts, and asset alt/caption text. |
| Colocated assets | `src/content/docs/**/<slug>/assets.json` | Page-local graph, table, chart, image, and code-schema references keyed by asset id. |
| Registry records | `src/content/registry/{concepts,modules,models,papers,training-regimes,graphs,tables}/` | Search, tags, citations, relationships, and graph/table metadata consumed by loaders and search. |
| Legacy scaffold CLI | `scripts/scaffold-doc-page.ts` | Thin entrypoint for concept and glossary scaffolding. |
| Legacy scaffold library | `src/lib/content/scaffold-doc-page.ts` | Template substitution, registry record creation, and dry-run planning for the legacy scaffold. |
| Registry validation CLI | `scripts/validate-registry.ts` | Pre-build registry and bundle alignment gate (`make validate-data`). |
| Registry validation library | `src/lib/content/validate-registry.ts` | Schema checks, relationship resolution, message-key and asset-id validation across committed content. |
| Page-spec workflow CLI | `scripts/generate-page-bundle.ts` | Preferred entrypoint: `bun run generate:page-bundle --spec <page-spec.json>`. |
| Page-spec workflow library | `src/lib/content/generate-page-bundle.ts` | Validates page specs, builds bundles in memory, enforces canonical MDX prose rules, and writes files. |
| Page-spec contract | `src/lib/content/page-spec.ts` | Zod schemas, `PAGE_SPEC_KINDS`, registry/frontmatter derivation, and pre-write validation. |
| Generated bundle validation | `src/lib/content/validate-generated-page-bundle.ts` | Proves generated output loads through standard message/asset loaders and registry validation. |
| Canonical MDX prose validation | `src/lib/content/validate-canonical-mdx-prose.ts` | Rejects hard-coded reader-facing prose in canonical docs MDX (blog posts excluded). |
| Generated canonical docs validation | `src/lib/content/validate-generated-canonical-docs.ts` | Enforces folded `openingSummary`, rejects legacy split summary keys, validates graph `assetId` placement, and composes MDX prose checks for generated bundles. |

Docs parents by page kind:

- `concept` → `src/content/docs/concepts/<slug>/`
- `glossary` → `src/content/docs/glossary/<slug>/` (registry kind remains `concept`)
- `module` → `src/content/docs/modules/<slug>/`
- `model` → `src/content/docs/models/<slug>/`
- `paper` → `src/content/docs/papers/<slug>/`
- `training-regime` → `src/content/docs/training/<slug>/`

## Current scaffold limitations

The legacy `scaffold:doc-page` path (`SCAFFOLD_DOC_PAGE_KINDS` in `scaffold-doc-page.ts`) has three constraints the page-spec workflow addresses:

1. **Kind coverage** — Scaffold supports only `concept` and `glossary`. Templates already exist for `module`, `model`, `paper`, and `training-regime`, but the legacy CLI cannot emit those bundles.
2. **Many required CLI flags** — Maintainers must pass `--kind`, `--slug`, `--title`, `--concept-type`, and optional comma-separated `--tags`, `--related-ids`, `--citation-ids`, and `--aliases` on the command line instead of one declarative input file.
3. **No compact page-spec input** — Section bodies, folded summaries, callouts, and asset message copy are not part of the legacy scaffold contract; maintainers edit generated message files by hand after scaffolding.

`formatScaffoldUsage()` now points maintainers at `generate:page-bundle` for new concept and glossary pages. The legacy scaffold remains for backward compatibility.

## Compact page-spec contract

`src/lib/content/page-spec.ts` defines the smallest maintainable input shape for one canonical bundle. Validate with `validatePageSpec` or `parsePageSpecJson` before any file writes; failures surface dotted field paths via `PageSpecValidationError.issues` and never touch the filesystem.

### Shared fields (all kinds)

| Field | Required | Maps to |
| --- | --- | --- |
| `kind` | yes | Page and registry kind (see below) |
| `slug` | yes | URL segment and registry id suffix |
| `title` | yes | `messages/en.json` `title` (via `deriveDefaultTitleKey`) |
| `summary` | yes | `messages/en.json` `description` (via `deriveDefaultSummaryKey`) |
| `openingSummary` | no | Folded summary block in messages |
| `status` | no (default `draft`) | Frontmatter and registry `status` |
| `aliases` | no | Frontmatter and registry `aliases` |
| `tags` | no | Frontmatter and registry `tags` |
| `relatedIds` | no | Registry relationships |
| `citationIds` | no | Registry citations |
| `sections` | no | Section title/body message keys |
| `callouts` | no | Callout title/body message keys |
| `assets` | no | Colocated `assets.json` graph/table/chart overrides |
| `assetMessages` | no | Reader-facing alt/caption text for asset ids |
| `graph` | no | Graph node label/summary message keys |

Glossary pages use page kind `glossary` but registry kind `concept` with ids `concept.<slug>`.

### Kind-specific required fields

| Kind | Additional required fields |
| --- | --- |
| `concept` | `conceptType` |
| `glossary` | `conceptType` |
| `module` | `moduleType` |
| `model` | `family`, `sourceType`, `modalities` (min 1) |
| `paper` | `authors` (min 1), `publishedAt`, `url` |
| `training-regime` | `regimeType` |

### Canonical frontmatter derivation

`derivePageFrontmatter(spec, updatedAt)` emits `kind`, `registryId`, `messageNamespace: local`, `assetNamespace: local`, `status`, `tags`, optional `aliases`, and `updatedAt`. Registry ids come from `registryIdForPageSpec`.

## Page bundle generation

`generatePageBundle` in `src/lib/content/generate-page-bundle.ts` is the single write path for page-spec-driven bundles.

### Inputs and outputs

Given a validated page spec, generation emits the page bundle plus matching graph registry records for graph-backed templates:

| Output | Path pattern |
| --- | --- |
| Registry record | `src/content/registry/<kind-dir>/<slug>.json` |
| Graph registry record(s) | `src/content/registry/graphs/<slug>-<graph-suffix>.json` for each graph asset in the template |
| Canonical page | `src/content/docs/<parent>/<slug>/page.mdx` |
| Colocated messages | `src/content/docs/<parent>/<slug>/messages/en.json` |
| Colocated assets | `src/content/docs/<parent>/<slug>/assets.json` |

`buildPageBundleArtifacts` assembles content in memory; `generatePageBundle` validates asset message keys and canonical MDX prose before writing. Use `dryRun: true` or `--dry-run` on the CLI to print `registryId`, route, and planned paths without touching disk.

### Template substitution

For each kind, the generator reads `docs/templates/<kind>.mdx`, `<kind>.messages.en.json`, `<kind>.assets.json`, and `<kind>.graph.json`. Maintainer guidance in `<kind>.content.md` is never copied into generated output.

Substitution rules:

- Template registry ids (`concept.example-concept`, `module.example-module`, etc.) → `registryIdForPageSpec(spec)`.
- Template graph/table ids (`graph.example-concept-map`, etc.) → slug-specific ids (glossary maps use `graph.<slug>-concept-map`, not `glossary-map`).
- Graph registry records derive from `<kind>.graph.json` with `subjectId` set to the page registry id; optional page-spec `graph.nodes` overrides template nodes and edges.
- Frontmatter is rebuilt via `derivePageFrontmatter` plus Fumadocs-required `title` and `description` from the page spec.
- Page-spec `sections`, `callouts`, `graph`, and `assetMessages` merge into template message keys; empty template strings receive draft placeholders so loaders accept generated bundles.
- Page-spec `assets` merge into template `assets.json` entries.

### Overwrite guard

Before any write, `assertPathDoesNotExist` refuses generation when a registry record, graph registry record, `page.mdx`, `messages/en.json`, or `assets.json` already exists. Delete or relocate existing targets before re-running `generate:page-bundle`.

## Generated bundle loader alignment

`validateGeneratedPageBundle` in `src/lib/content/validate-generated-page-bundle.ts` proves a generated bundle behaves like a hand-authored canonical page through the existing loaders and registry validation path—no special runtime loaders.

### Validation layers

| Layer | Function | What it proves |
| --- | --- | --- |
| Colocated bundle | `validateColocatedPageBundle` (`validate-registry.ts`) | `loadPageMessages` and `loadPageAssets` accept the generated sidecars; MDX message keys and asset ids resolve. |
| Registry ↔ frontmatter | `validateRegistryFrontmatterAlignment` | `registryId`, kind (including glossary→concept), slug, `defaultTitleKey`, `defaultSummaryKey`, tags, aliases, status, and `updatedAt` agree between registry JSON and `page.mdx` frontmatter; default keys resolve to `messages.title` / `messages.description`. |
| Search text | `validateGeneratedSearchText` | `buildSearchDocument` title, description, and `bodyText` come from resolved messages via `collectMessageBodyText`, not MDX prose. |
| Registry graph | `validateGeneratedPageBundleRegistryContent` | `validateRegistryContent` accepts generated records when referenced tags, citations, relationships, graphs, and tables exist. |

Generated registry records carry `relatedIds` and `citationIds` from the page spec. Full registry validation runs when fixture records for those references exist on disk.

### When to run

- Integration tests call `validateGeneratedPageBundle` after `generatePageBundle` for each supported kind (`validate-generated-page-bundle.test.ts`).
- The committed sample page uses the same validator in `page-spec-workflow-sample.test.ts` before React render checks.
- `make validate-data` (`scripts/validate-registry.ts`) still validates the full committed registry and page inventory; generated bundles must pass both bundle-level and site-wide gates.

## Generated canonical docs validation

`validateGeneratedCanonicalDocs` in `src/lib/content/validate-generated-canonical-docs.ts` is the generator-path gate for writing standards and graphing rules on generated bundles. It runs inside `generatePageBundle` (before writes) and `validateGeneratedPageBundle` (after generation).

### Folded openingSummary

- Concept, module, model, paper, and training-regime bundles must render `<T k="openingSummary" />` in MDX and include non-empty `messages.openingSummary`.
- Glossary bundles must not render openingSummary in MDX.
- Legacy split summary keys (`problemStatement`, `coreIdea`, `callouts.readerShortcut`) and matching MDX markers are rejected.

### Graph placement

- Graph components (`ModuleGraph`, `ConceptMap`, `ModelArchitectureGraph`, `PaperContributionGraph`, `TrainingRegimeFlow`) must reference graph assets through `assetId`.
- Module pages allow exactly one primary `ModuleGraph` in the `how-it-works` section and forbid graphs under `math-or-compute-schema`.
- Other page kinds enforce template section placement (for example concept graphs under `where-it-appears`, model graphs under `architecture`).

### MDX prose

- Composes `validateCanonicalMdxProse` for headings, hard-coded attributes, residual body prose, and message/asset text copied into MDX (blog posts excluded).

## Supported page kinds (page-spec workflow)

`PAGE_SPEC_KINDS` in `src/lib/content/page-spec.ts` defines the supported workflow kinds, reusing the existing template inventory:

- `concept`
- `glossary`
- `module`
- `model`
- `paper`
- `training-regime`

`blog-post` templates under `docs/templates/blog-post.*` are intentionally excluded; blog posts follow a separate authoring path.

## Workflow boundary

**Content tooling (generation and validation)** — Owns page-spec parsing, template substitution, file writes, dry-run planning, canonical MDX prose checks, generated canonical docs validation, and generated-bundle alignment tests. Modules: `page-spec.ts`, `generate-page-bundle.ts`, `generate-page-bundle-cli.ts`, `validate-generated-page-bundle.ts`, `validate-canonical-mdx-prose.ts`, `validate-generated-canonical-docs.ts`, plus the `scripts/generate-page-bundle.ts` and `scripts/validate-registry.ts` entrypoints.

**Existing runtime (loading, rendering, search)** — Generated bundles load through the same local-docs path as hand-authored concept, glossary, and module pages. `parseLocalDocsPageRef` and `loadLocalDocsPage` in `local-docs-page.ts` cover `concepts`, `glossary`, `modules`, `models`, `papers`, and `training`; `src/lib/source.ts` maps those page bundles to Fumadocs slugs; `src/app/docs/[[...slug]]/page.tsx` renders them through `ModulePageProviders`. Kind-specific disk loaders live in `concept-page-load.ts`, `glossary-page-load.ts`, `module-page-load.ts`, `model-page-load.ts`, `paper-page-load.ts`, and `training-regime-page-load.ts`.

Shared loader surfaces:

- `loadPageMessages` / `loadPageAssets` (`page-messages-load.ts`, `page-assets-load.ts`)
- `loadRegistry` and registry-backed search (`registry.ts`, Orama index builders)
- Fumadocs docs routing and MDX components (`src/app/docs/**`, shared page components)

Draft local bundles (`messageNamespace: local`, `status !== published`) are excluded from Fumadocs routing via `excludeNonPublishedLocalDocsPlugin` in `src/lib/source.ts` while remaining on disk for generator tests. Proving alignment is the responsibility of `validateGeneratedPageBundle`, `local-docs-page.test.ts`, and integration tests such as `page-spec-workflow-sample.test.ts`.

## CLI review flow and sample proof

Use dry-run before writing files, then review one small committed sample to prove the workflow end to end.

### Safe review flow

1. Author or edit a page spec under `page-specs/<slug>.json`.
2. Preview planned output without writes:
   `bun run generate:page-bundle --spec page-specs/<slug>.json --dry-run`
   The plan prints `registryId`, docs route, and each output path (registry record, `page.mdx`, `messages/en.json`, `assets.json`).
3. Fix validation errors reported by `classifyGeneratePageBundleFailure` categories:
   `invalid-input`, `unresolved-reference`, `missing-template`, or `existing-target`.
4. Generate when dry-run looks correct:
   `bun run generate:page-bundle --spec page-specs/<slug>.json`
5. For published concept/glossary samples, also update `meta.json`, `published-docs-registry-ids.ts`, graph-registry runtime imports, and inventory tests when the page enters published inventories. Maintainer proof bundles should stay `status: draft` and validate through generator/bundle tests only.

`formatScaffoldUsage()` and `formatGeneratePageBundleUsage()` document the migration from legacy `scaffold:doc-page` flags to one page-spec file.

### Draft maintainer bundles and routing

Non-published local docs bundles (`messageNamespace: local` with `status` other than `published`) are excluded from Fumadocs `source.getPage()` / `generateParams()` via `excludeNonPublishedLocalDocsPlugin` in `src/lib/source.ts`. Draft proof artifacts can stay committed under `src/content/docs/**` for generator replay and `loadConceptPageFromDisk` tests without becoming customer-facing routes.

### Committed sample bundle

| Artifact | Path |
| --- | --- |
| Page spec input | `page-specs/page-spec-workflow-sample.json` |
| Page bundle | `src/content/docs/concepts/page-spec-workflow-sample/` |
| Registry record | `src/content/registry/concepts/page-spec-workflow-sample.json` |
| Graph registry | `src/content/registry/graphs/page-spec-workflow-sample-concept-map.json` |

The sample is `status: draft` with maintainer/process copy so it stays out of customer-facing inventories (`meta.json`, `PUBLISHED_*_REGISTRY_IDS`, tag landing pages, search-index URL fixtures) and Fumadocs docs routing. Reviewers replay generation with `--dry-run` and validate the committed bundle through tests.

`page-spec-workflow-sample.test.ts` validates the committed bundle with `validateGeneratedPageBundle`, renders message-driven sections and the concept map through `ModulePageProviders`, and asserts no `Draft placeholder`, `data-missing-graph-id`, or missing message/asset markers.

Draft bundles are not served at `/docs/**`; use `page-spec-workflow-sample.test.ts` for render proof instead of browser routing.

## Maintainer entrypoints

```bash
# Preferred: one page-spec file → full canonical bundle
bun run generate:page-bundle --spec page-specs/my-page.json

# Dry-run (no writes)
bun run generate:page-bundle --spec page-specs/my-page.json --dry-run

# Legacy concept/glossary scaffold (backward compatible)
bun run scaffold:doc-page --kind concept --slug my-slug --title "My Title" --concept-type architecture

# Registry validation (also run via make validate-data)
bun ./scripts/validate-registry.ts
```
