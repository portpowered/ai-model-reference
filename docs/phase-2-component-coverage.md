# Reusable component coverage contract

Shared MDX building blocks under `src/components/**`,
`src/features/**/components/**`, and documented search UI paths under
`src/features/docs/search/` must meet the architecture checklist coverage rule:
**at least 90% reachable line coverage** per listed reusable component. There
are no repository-wide coverage thresholds—enforcement is scoped to the
machine-readable manifest in `src/lib/docs/component-manifest.ts`.

## Running the gate

Local and CI runs use the same deterministic entry point:

```sh
make coverage
# equivalent:
bun run coverage
```

Both run `bun test --coverage` with fixed flags (including
`--path-ignore-patterns` for the manifest integration test), then print a
per-component summary with **label | path | line % | PASS/FAIL** and exit
non-zero when a listed non-thin-wrapper component is below its minimum.

`make ci` includes the same manifest gate after `make test` so GitHub Actions
(`.github/workflows/ci.yml` → `make ci`) enforces identical behavior locally
and in CI.

## Reachable coverage

Bun reports **line %** in the coverage table. That percentage is the
**reachable** metric for this contract: only lines exercised by the current
test suite count. The default minimum for manifest entries is **90%** unless
documented otherwise.

## Allowed manifest paths

Add components only when their source file matches one of:

- `src/components/**`
- `src/features/**/components/**`
- Search UI exceptions already listed under `src/features/docs/search/` (see
  `SEARCH_UI_MANIFEST_PREFIX` in `src/lib/docs/component-coverage-gate.ts`)
- Tag list UI exceptions under `src/features/docs/tags/` (see
  `DOCS_TAG_LIST_MANIFEST_PREFIX` in `src/lib/docs/component-coverage-gate.ts`)

## Thin-wrapper exception

Some reusable components only forward props to a primitive or design-system
component and add no branching of their own—for example a styled `Button` that
passes through to `@/components/ui/button`.

For those **thin wrappers**:

1. List the component in `REUSABLE_THIN_WRAPPERS` inside
   `src/lib/docs/component-manifest.ts` with the primitive it forwards to.
2. Name the **smoke tests** that prove default render and accessibility (unit
   render smoke and/or `src/tests/a11y/*` axe smoke).
3. Do **not** require 90% line coverage on the wrapper file itself—the gate
   skips the line threshold but fails when a listed smoke test path is missing.

Listed MDX building blocks below are **not** thin wrappers; they resolve
messages, registry data, or search metadata and must meet the 90% reachable
line target.

## Component inventory

| Component | Source | Line coverage target | Unit tests | A11y smoke |
| --- | --- | --- | --- | --- |
| Callout | `src/features/docs/components/Callout.tsx` | ≥ 90% | `Callout.test.tsx` | `docs-components.a11y.test.tsx` |
| Section | `src/features/docs/components/Section.tsx` | ≥ 90% | `Section.test.tsx` | `docs-components.a11y.test.tsx` |
| T | `src/features/docs/components/T.tsx` | ≥ 90% | `T.test.tsx` | component-examples registry smoke |
| TagPillList | `src/features/docs/components/TagPillList.tsx` | ≥ 90% | `TagPillList.test.tsx` | `docs-components.a11y.test.tsx` |
| DerivedRelatedDocs | `src/features/docs/components/DerivedRelatedDocs.tsx` | ≥ 90% | `DerivedRelatedDocs.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResults | `src/features/docs/search/SearchResults.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResultRow | `src/features/docs/search/SearchResultRow.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResultTitle | `src/features/docs/search/SearchResultTitle.tsx` | ≥ 90% | `SearchResults.test.tsx` | — |
| SearchResultMetaDetails | `src/features/docs/search/SearchResultMetaDetails.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |
| ProseAutoLinkText | `src/features/docs/components/ProseAutoLinkText.tsx` | ≥ 90% | `ProseAutoLinkText.test.tsx` | — |
| TBlockMath | `src/features/docs/components/TBlockMath.tsx` | ≥ 90% | `TBlockMath.test.tsx` | — |
| ModuleAttentionSchemaComparison | `src/features/models/components/ModuleAttentionSchemaComparison.tsx` | ≥ 90% | `ModuleAttentionSchemaComparison.test.tsx` | — |
| RegistryComparisonTable | `src/features/models/components/RegistryComparisonTable.tsx` | ≥ 90% | `RegistryComparisonTable.test.tsx` | — |
| RegistryGraphFlow | `src/features/models/components/RegistryGraphFlow.tsx` | ≥ 90% | `RegistryGraphFlow.test.tsx` | — |
| PageAsset | `src/features/docs/components/PageAsset.tsx` | ≥ 90% | `PageAsset.test.tsx` | — |
| ModuleMetadataCard | `src/features/models/components/ModuleMetadataCard.tsx` | ≥ 90% | `ModuleMetadataCard.test.tsx` | — |
| ModuleAtAGlance | `src/features/models/components/ModuleAtAGlance.tsx` | ≥ 90% | `ModuleAtAGlance.test.tsx` | — |
| MissingGraphRecord | `src/features/docs/components/MissingGraphRecord.tsx` | ≥ 90% | `RegistryGraphFlow.test.tsx` | — |
| MissingTableRecord | `src/features/models/components/MissingTableRecord.tsx` | ≥ 90% | `RegistryComparisonTable.test.tsx` | — |

### Phase 1 module page thin wrappers

| Component | Source | Forwards to | Smoke tests |
| --- | --- | --- | --- |
| ModuleGraph | `src/features/models/components/ModuleGraph.tsx` | `PageAsset` | `module-page.test.ts` |
| ModuleComparisonTable | `src/features/models/components/ModuleComparisonTable.tsx` | `PageAsset` | `module-page.test.ts` |

### Phase 1 shell surfaces (home, header, tags)

| Component | Source | Line coverage target | Unit tests | A11y smoke |
| --- | --- | --- | --- | --- |
| HomeBrushHeader | `src/components/home/home-brush-header.tsx` | ≥ 90% | `home-brush-header.test.tsx` | — |
| HomeArticle | `src/components/home/home-article.tsx` | ≥ 90% | `home-page.test.tsx` | — |
| HomeBrowseLink | `src/components/home/home-browse-link.tsx` | ≥ 90% | `home-browse-link.test.tsx` | — |
| Primary navigation | `src/components/layout/primary-nav.ts` | ≥ 90% | `primary-nav.test.ts` | `primary-navigation.a11y.test.tsx` |
| ModelAtlasDocsHeader | `src/components/layout/model-atlas-docs-header.tsx` | ≥ 90% | `model-atlas-docs-header.test.tsx` | `primary-navigation.a11y.test.tsx` |
| CanonicalDocsLayout | `src/components/layout/canonical-docs-layout.tsx` | ≥ 90% | `docs-sidebar-navigation.a11y.test.tsx` | `docs-sidebar-navigation.a11y.test.tsx` |
| SearchTrigger | `src/features/docs/search/SearchTrigger.tsx` | ≥ 90% | `SearchTrigger.test.tsx` | `primary-navigation.a11y.test.tsx` |
| DocsIndexEntryList | `src/features/docs/components/DocsIndexEntryList.tsx` | ≥ 90% | `DocsIndexEntryList.test.tsx` | — |
| TagResourceList | `src/features/docs/components/TagResourceList.tsx` | ≥ 90% | `TagResourceList.test.tsx` | — |
| TagsIndexList | `src/features/docs/tags/TagsIndexList.tsx` | ≥ 90% | `TagsIndexList.test.tsx` | — |

Consolidated styling contracts: `src/tests/layout/phase-1-home-shell-styling-contract.test.tsx`.

### Phase 1 search presentation (dialog and `/search` rows)

| Component | Source | Line coverage target | Unit tests | A11y smoke |
| --- | --- | --- | --- | --- |
| SearchPagePanel | `src/features/docs/search/SearchPagePanel.tsx` | ≥ 90% | `search-page-panel.test.tsx`, `static-export-search-surfaces.test.tsx` | `search-page-panel.a11y.test.tsx` |
| SearchDialog | `src/features/docs/search/SearchDialog.tsx` | ≥ 90% | `search-dialog-panel.test.tsx`, `static-export-search-surfaces.test.tsx` | `search-dialog.a11y.test.tsx` |
| SearchResults | `src/features/docs/search/SearchResults.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResultRow | `src/features/docs/search/SearchResultRow.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResultTitle | `src/features/docs/search/SearchResultTitle.tsx` | ≥ 90% | `SearchResults.test.tsx` | — |
| SearchResultMetaDetails | `src/features/docs/search/SearchResultMetaDetails.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |

Coverage contract: `src/tests/search/phase-1-search-coverage-contract.test.ts`.

Module page coverage contract: `src/tests/layout/phase-1-module-page-coverage-contract.test.ts` (see `PHASE_1_MODULE_PAGE_COVERAGE_COMPONENTS` in the manifest).

Thin wrappers: `ModuleGraph` and `ModuleComparisonTable` forward to `PageAsset` (see `REUSABLE_THIN_WRAPPERS` in the manifest).

## Adding a reusable component

1. Add an entry to `REUSABLE_COVERAGE_COMPONENTS` or `REUSABLE_THIN_WRAPPERS` in
   `src/lib/docs/component-manifest.ts`.
2. Add unit tests and, when the component is user-facing chrome or MDX UI,
   accessibility smoke under `src/tests/a11y/`.
3. Update the table in this file.
4. Run `make coverage` and confirm the manifest gate passes.

Do not add global coverage thresholds—keep enforcement scoped to this manifest
and the `make coverage` / `make ci` gate.
