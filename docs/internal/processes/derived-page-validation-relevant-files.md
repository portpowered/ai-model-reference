# Derived page validation — relevant files

## Contract implementation

- `src/lib/content/validate-derived-published-page-bundles.ts` — scanner-backed derived validation for ordinary published page bundles (frontmatter, default-locale messages, route metadata, registry alignment, tags, citations, local assets).
- `src/lib/content/validate-derived-published-page-bundles.test.ts` — focused fixture tests for the derived contract, including failure cases.
- `src/lib/content/validate-registry.ts` — `validateRegistryContent` calls `validateDerivedPublishedPageBundles` after registry and per-page MDX validation.

## Failure proof

The `derived published-page bundle contract failure proof` describe block in
`validate-derived-published-page-bundles.test.ts` proves observable diagnostics
for standard page-bundle relationships without scanning full site inventories:

| Relationship | Error code |
| --- | --- |
| Unresolved `registryId` | `unresolved-registry-id` |
| Missing default-locale messages | `missing-default-locale-messages` |
| Unresolved frontmatter tag | `unresolved-tag` |
| Unresolved declared citation | `unresolved-citation` |
| Missing local asset message key | `missing-asset-message-key` |

A companion test proves `validateRegistryContent` (the `make validate-data` path)
surfaces derived failures for published pages.

## Policy (contributors and factory executors)

Ordinary content-only published page bundles are covered by derived
published-page validation. Do **not** add a new per-page test for an ordinary
page unless it introduces new rendering behavior, a new component contract, or
a focused regression guard.

Derived coverage is process-focused. It does not require agents to maintain broad
route inventories, docs link topology inventories, or asset-bundle internals
unless those surfaces are the product behavior under test.

## Validation evidence

Run these commands for touched content and validation infrastructure:

| When | Command |
| --- | --- |
| Ordinary page bundle or registry record edits | `make validate-data` |
| Internal docs links after content shape is stable | `make linkcheck` |
| Changes to the derived contract module or its fixtures | `bun test src/lib/content/validate-derived-published-page-bundles.test.ts` |
| Pre-PR full gate (includes derived coverage via `validate-data`) | `make ci` |
| Narrow content-branch proof before review | `bun run doctor:content-pr` |

Focused doctor behavior tests live in `src/tests/ci/content-pr-doctor.test.ts`.
They inject `runCommand` and `verifyRuntimeCompleteness` to assert stage order,
failure stages, drifted paths, and repair guidance without running real git or
generation.

`make validate-data` is the primary evidence that ordinary page bundles satisfy
the derived contract. Prefer it over adding shared per-page tests that only
duplicate registry, message, tag, citation, or local-asset checks.

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
- `src/lib/content/dynamic-batching-slice-verification.test.ts` — consolidated review-facing proof for a serving system slice: route/registry alignment, graph/citation resolution, alias search, tag landing, and curated-related render surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/alignment-concept-slice-verification.test.ts` — consolidated review-facing proof for the alignment concept slice: route/registry alignment, citation resolution, alias search, nearby-regime boundary checks, tag landing, and rendered concept surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/normalization-concept-slice-verification.test.ts` — consolidated review-facing proof for the normalization concept slice: route/registry alignment, alias search with variant co-discovery, variant related-doc handoff back to the broad concept route, and rendered concept surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/qwen3-0-6b-slice-verification.test.tsx` — consolidated review-facing proof for the Qwen3-0.6B model slice: routable page/registry alignment, local assets and citation resolution, architecture graph render surface, rendered references, and search/related-doc discovery handoffs; routine bundle invariants stay on story-scoped identity, reader-page, architecture-graph, and discovery tests plus `validateDerivedPublishedPageBundles`.
- `src/lib/content/qwen3-5-0-8b-slice-verification.test.tsx` — consolidated review-facing proof for the Qwen3.5-0.8B model slice: route/registry alignment, Qwen-controlled citation resolution and rendered references, architecture graph surface, and related-doc plus search discovery paths; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/cosmos-3-slice-verification.test.tsx` — consolidated review-facing proof for the Cosmos 3 model slice: route/registry alignment, primary-source citation resolution and rendered references, architecture graph surface, representative alias search, derived-related discovery paths, and optional served-page browser verification; routine bundle invariants stay on story-scoped identity, registry-relationships, reader-page, and architecture-graph tests plus `validateDerivedPublishedPageBundles`.
- `src/lib/content/instruction-tuning-training-regime-slice-verification.test.ts` — consolidated review-facing proof for the instruction tuning training-regime slice: route/registry alignment, graph/citation resolution, alias search, curated-related and tag landing, and rendered training-flow surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/grpo-training-regime-slice-verification.test.ts` — consolidated review-facing proof for the GRPO training-regime slice: route/registry alignment, graph/citation resolution, alias search, curated-related and tag landing, and rendered grouped-optimization surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/regularization-dropout-slice-verification.test.ts` — consolidated review-facing proof for the regularization concept and dropout training-regime slice: route/registry alignment, graph/citation resolution, one search discovery path per page, bidirectional curated-related wiring, and rendered concept/training surfaces; alias and href discovery contracts stay in `regularization-concept-discovery.test.ts`; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/cross-attention-page-contract.test.ts` — consolidated review-facing proof for the cross-attention module slice: route/registry alignment, graph/table/citation resolution, alias search, curated-related href order, and rendered module shell surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/diffusion-transformer-block-page-contract.test.ts` — consolidated review-facing proof for the diffusion transformer block slice: route/registry alignment, compute-flow graph and citation resolution, alias search, curated-related hrefs, convergence markers, and Playwright viewport probes via `diffusion-transformer-block-module-graph-viewport-http`; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/mamba-selective-state-space-page-contract.test.ts` — consolidated review-facing proof for the Mamba selective state-space module slice: route/registry alignment, graph/table/citation resolution, alias search, curated-related hrefs, convergence markers, and Playwright desktop/mobile browser probes; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/clip-model-page.test.tsx`, `clip-model-record.test.ts`, `clip-model-discovery.test.tsx` — focused CLIP model landing proof: architecture graph render surface, reconciled registry relationships, representative search ranking, and curated related navigation; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.
- `src/lib/content/page-template-conformance.ts` — system pages may add optional `#how-it-differs` between `#how-it-works` and `#practical-impact` for serving-boundary teaching without a template exception list entry.
- `src/lib/content/temperature-concept.test.ts`, `src/lib/content/temperature-slice-verification.test.tsx` — consolidated review-facing proof for the temperature concept slice: curated related-link hrefs, alias search ranking, app-route render resolution, sampling-neighbor links, and rendered concept surface; routine bundle invariants stay on `validateDerivedPublishedPageBundles`.

## Contributor and factory entrypoints

- `docs/contributors/CONTRIBUTING.md` — [Derived published-page validation](../contributors/CONTRIBUTING.md#derived-published-page-validation) for human contributors.
- `factory/docs/overview.md` — factory read-first list references this file for executor page-validation policy.
