# Phase 2 reusable component coverage contract

Phase 2 foundation pages rely on shared MDX building blocks under
`src/features/docs/components/` and `src/features/docs/search/`. This document
records how those components meet the architecture checklist coverage rule
(**at least 90% reachable line coverage** per reusable component) without
turning on repository-wide coverage thresholds in `make ci`.

## Reachable coverage

Run coverage locally when touching a listed component:

```sh
bun test --coverage
```

Bun reports **line %** in the coverage table. That percentage is the
**reachable** metric for this contract: only lines exercised by the current
test suite count. CI does **not** run `make coverage` or fail on global
thresholds; `src/tests/docs/phase-2-component-coverage.test.ts` asserts each
manifest entry still meets its minimum after `bun test --coverage`.

## Thin-wrapper exception

Some reusable components only forward props to a primitive or design-system
component and add no branching of their own—for example a styled `Button` that
passes through to `@/components/ui/button`.

For those **thin wrappers**:

1. List the component in `PHASE_2_THIN_WRAPPERS` inside
   `src/lib/docs/phase-2-component-manifest.ts` with the primitive it forwards to.
2. Name the **smoke tests** that prove default render and accessibility (unit
   render smoke and/or `src/tests/a11y/*` axe smoke).
3. Do **not** require 90% line coverage on the wrapper file itself—the wrapper
   has little reachable logic; smoke tests are the contract.

Phase 2 MDX building blocks below are **not** thin wrappers; they resolve
messages, registry data, or search metadata and must meet the 90% reachable
line target.

## Phase 2 component inventory

| Component | Source | Line coverage target | Unit tests | A11y smoke |
| --- | --- | --- | --- | --- |
| Callout | `src/features/docs/components/Callout.tsx` | ≥ 90% | `Callout.test.tsx` | `docs-components.a11y.test.tsx` |
| Section | `src/features/docs/components/Section.tsx` | ≥ 90% | `Section.test.tsx` | `docs-components.a11y.test.tsx` |
| T | `src/features/docs/components/T.tsx` | ≥ 90% | `T.test.tsx` | component-examples registry smoke |
| TagPillList | `src/features/docs/components/TagPillList.tsx` | ≥ 90% | `TagPillList.test.tsx` | `docs-components.a11y.test.tsx` |
| DerivedRelatedDocs | `src/features/docs/components/DerivedRelatedDocs.tsx` | ≥ 90% | `DerivedRelatedDocs.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResults | `src/features/docs/search/SearchResults.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |
| SearchResultMetaDetails | `src/features/docs/search/SearchResultMetaDetails.tsx` | ≥ 90% | `SearchResults.test.tsx` | `docs-components.a11y.test.tsx` |

Thin wrappers for Phase 2: **none** (see `PHASE_2_THIN_WRAPPERS` in the manifest).

## Adding a new Phase 2 component

1. Add an entry to `PHASE_2_COVERAGE_COMPONENTS` or `PHASE_2_THIN_WRAPPERS` in
   `src/lib/docs/phase-2-component-manifest.ts`.
2. Add unit tests and, when the component is user-facing chrome or MDX UI,
   accessibility smoke under `src/tests/a11y/`.
3. Update the table in this file.
4. Run `bun test --coverage` and confirm the manifest contract test passes.

Do not add global coverage thresholds to `make ci` when expanding Phase 2
content—keep enforcement scoped to this manifest and documentation.
