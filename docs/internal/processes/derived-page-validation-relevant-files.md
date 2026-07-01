# Derived page validation — relevant files

## Contract implementation

- `src/lib/content/validate-derived-published-page-bundles.ts` — scanner-backed derived validation for ordinary published page bundles (frontmatter, default-locale messages, route metadata, registry alignment, tags, citations, local assets).
- `src/lib/content/validate-derived-published-page-bundles.test.ts` — focused fixture tests for the derived contract, including failure cases.
- `src/lib/content/validate-registry.ts` — `validateRegistryContent` calls `validateDerivedPublishedPageBundles` after registry and per-page MDX validation.

## When derived coverage is enough

Ordinary content-only published pages should **not** add new per-page tests that only re-check:

- `registryId` resolution and page-kind alignment
- default-locale `messages/en.json`
- declared frontmatter tags
- registry-backed `citationIds`
- local `assets.json` message-key wiring

Use `make validate-data` or `validateDerivedPublishedPageBundles` for that evidence instead.

## When to keep per-page tests

Retain or add per-page tests only for special behavior:

- rendered HTML / component contracts
- search and discovery wiring for representative queries
- related-doc navigation graphs
- graph/table asset registry runtime (`validateColocatedPageBundle` table/graph refs)
- page-generation workflow validation (`validateGeneratedPageBundle`)
- focused regression guards that cannot be expressed as derived bundle invariants

Fence retained tests with a file- or describe-level comment explaining why the coverage is special.

## Consolidated routine patterns

- `src/lib/content/content-reconciliation-registry.test.ts` — site-wide published-page bundle loop replaced by a single `validateDerivedPublishedPageBundles` assertion.
- `src/lib/content/block-sparse-attention-page-contract.test.ts`, `local-attention-page-contract.test.tsx`, `wordpiece-page-contract.test.ts` — routine bundle checks removed or fenced; tests focus on discovery/rendering/generation contracts.
