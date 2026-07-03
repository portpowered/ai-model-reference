# Diffusion Training Objective Page — Reconciliation Notes

Reconciliation for the `diffusion-training-objective-current-main-page` work item.
Verified against `origin/main` at `e0c20103` (2026-07-01 UTC).

## Stale branch inspection

| Branch | Status | Reusable artifacts |
| --- | --- | --- |
| `diffusion-training-objective-training-regime-page` | 749 commits behind `origin/main`, no unique commits ahead | None — no `diffusion-training-objective` page bundle, registry record, graph, or tests |
| `diffusion-training-objective-current-main-page` | Matches `origin/main` head | Clean current-main slice; no prior page work to revive |

No stale content was ported. Later stories should create the page bundle and registry
record from current-main contracts only.

## Slice scope (page-local)

| Path | Purpose |
| --- | --- |
| `src/content/docs/training/diffusion-training-objective/` | Page bundle (`page.mdx`, `messages/en.json`, `assets.json`, optional graph) |
| `src/content/registry/training-regimes/diffusion-training-objective.json` | `training-regime.diffusion-training-objective` registry record |
| `src/lib/content/diffusion-training-objective*.test.ts` | Focused discovery/route tests only when scanner validation is insufficient |

Do not add placeholder records or broaden into a diffusion taxonomy rewrite.

## Adjacent canonical records on current main

Link only when these published records exist in the implementation branch:

| Record | Status on main | Notes |
| --- | --- | --- |
| `concept.diffusion-model` | Published | Glossary page at `/docs/glossary/diffusion-model` |
| `concept.denoising-generation` | Published | Glossary page at `/docs/glossary/denoising-generation` |
| `concept.latent-space` | Published | Concept page at `/docs/concepts/latent-space` |
| `concept.autoregressive-generation` | Published | Contrast target for autoregressive next-token pretraining |
| `training-regime.pretraining` | Published | Nearby language-model pretraining regime for comparison |
| `citation.denoising-diffusion-probabilistic-models` | Published | DDPM citation for diffusion objective claims |
| Stable Diffusion model record | **Not on main** | Do not link or create placeholder |
| Latent diffusion paper record | **Not on main** | Do not link or create placeholder |

## Reference patterns

Copy structure from existing training-regime slices:

* Page MDX: `src/content/docs/training/dpo/page.mdx`, `src/content/docs/training/pretraining/page.mdx`
* Registry: `src/content/registry/training-regimes/pretraining.json` (pretraining-oriented regime metadata)
* Training-flow graph: `src/content/registry/graphs/pretraining-training-flow.json` with page `assets.json` + `messages/en.json` asset and `graph.nodes` labels
* Focused test: `src/lib/content/pretraining-training-regime.test.ts`
* Templates: `docs/templates/training-regime.*`
* Template conformance: add `training/diffusion-training-objective/page.mdx` exception in `page-template-conformance.ts` when using `LocalizedLinkList` in the comparison section (same as pretraining/post-training)

Use `getDocsPageDir("training", "diffusion-training-objective")` in tests — do not add
a new `*_PAGE_DIR` export.

## Classification guidance

No diffusion-specific `classification.training.*` record exists yet. Use
`classification.training.pretraining` with `regimeType: "pretraining"` and
`variantGroup: "language-model-training-stages"` only if the record contract fits a
general pretraining-oriented diffusion denoising objective; otherwise follow the
current canonical classification contract for diffusion/pretraining-oriented training
regimes without introducing legacy taxonomy fields.

## Verification commands

| When | Command |
| --- | --- |
| After registry and page bundle land | `make validate-data` |
| Structural proof before review | `bun run typecheck` and `bun run lint` |
| Focused slice tests | `bun test src/lib/content/diffusion-training-objective*.test.ts` |
