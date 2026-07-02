# CLIP Model Main Landing Repair — Evidence Notes

Repair evidence for the `clip-model-main-landing-repair` work item. Verified
against `origin/main` at `1d259781` (2026-07-02 UTC).

## Planner re-entry baseline (`e0c20103`)

At the merge-base used by `origin/clip-model-current-main-reconciliation`, the
canonical CLIP model landing artifacts were **absent** from main:

| Artifact | Path | Status at `e0c20103` |
| --- | --- | --- |
| CLIP model page bundle | `src/content/docs/models/clip/` | absent |
| CLIP model registry | `src/content/registry/models/clip.json` | absent |
| CLIP architecture graph | `src/content/registry/graphs/clip-architecture.json` | absent |
| Focused CLIP model tests | `clip-model-page.test.tsx`, `clip-model-record.test.ts`, `clip-model-discovery.test.tsx` | absent |

Prerequisites already on main at re-entry: CLIP paper page, CLIP citation,
`module.clip-image-tokenization`, and supporting concept pages (see
[clip-model-current-main-reconciliation-notes.md](./clip-model-current-main-reconciliation-notes.md)).

## Completed reconciliation branch inspection

`origin/clip-model-current-main-reconciliation` tip: `2c3f8fe6` (2026-07-02 UTC).

| Commit | Message |
| --- | --- |
| `c20ead0e` | Reconcile CLIP source material against current main |
| `9b25f8a9` | Publish the canonical CLIP model page bundle |
| `c01d651a` | Prove CLIP rendering and discovery with focused validation |
| `2c3f8fe6` | Branch-tip note: CLIP discovery test uses curated related docs not glossary back-links |

Salvage inventory and registry reconciliation guidance remain in
[clip-model-current-main-reconciliation-notes.md](./clip-model-current-main-reconciliation-notes.md).

## Landing status on current main

The completed reconciliation slice **already landed** on `origin/main` via
[PR #255](https://github.com/portpowered/ai-model-reference/pull/255) merge commit
`f6a092a3` (merged 2026-07-02T01:26:13Z). Current main (`1d259781`) includes:

| Artifact | Present on main |
| --- | --- |
| `src/content/docs/models/clip/page.mdx` | yes |
| `src/content/docs/models/clip/messages/en.json` | yes |
| `src/content/docs/models/clip/assets.json` | yes |
| `src/content/registry/models/clip.json` | yes |
| `src/content/registry/graphs/clip-architecture.json` | yes |
| `src/lib/content/clip-model-page.test.tsx` | yes |
| `src/lib/content/clip-model-record.test.ts` | yes |
| `src/lib/content/clip-model-discovery.test.tsx` | yes |

`git diff origin/main origin/clip-model-current-main-reconciliation` for the CLIP
slice paths above is **empty** — no remaining content delta between the completed
branch and main for the canonical landing artifacts.

## Clean-apply assessment

Direct merge of `origin/clip-model-current-main-reconciliation` onto current main
is **not required**: the reconciliation commits are already squashed into main via
PR #255. The reconciliation branch tip (`2c3f8fe6`) is four commits ahead of
`e0c20103` but those commits are contained in `f6a092a3`; main has since advanced
with unrelated work (`1d259781`).

**Blocker for clean landing:** none for the CLIP slice. Remaining repair stories
should verify runtime behavior and registry/discovery contracts rather than
re-land duplicate content.

## Verification commands

| When | Command |
| --- | --- |
| Structural proof | `make typecheck` |
| Registry and page bundle | `make validate-data` |
| Focused CLIP tests | `bun test src/lib/content/clip-model-record.test.ts src/lib/content/clip-model-page.test.tsx src/lib/content/clip-model-discovery.test.tsx` |
| Route smoke (local) | `PORT=<unique> bun run start -- -p $PORT` then `curl --max-time 10 http://127.0.0.1:$PORT/docs/models/clip` |

## Story 002 runtime verification (2026-07-02 UTC)

Canonical CLIP landing slice already present on branch head (`5a224ab0` atop
`f6a092a3`). No duplicate content re-port required.

| Check | Result |
| --- | --- |
| `make typecheck` | pass |
| `make validate-data` | pass |
| Focused CLIP tests (12 cases) | pass |
| `bun run build` | pass; `/docs/models/clip` in static output |
| Route smoke (`PORT=3471`) | HTTP 200; body includes `Contrastive Language-Image Pre-training`, `graph.clip-architecture`, `important-modules` |

Page bundle uses current-main model-page contracts: `kind: model`,
`registryId: model.clip`, `ModelArchitectureGraph`, `ModelModuleList`,
`DerivedRelatedDocs`, and `CitationList` components.

## Story 003 registry and discovery verification (2026-07-02 UTC)

`model.clip` is published on branch head with slug `clip`, resolving to
`/docs/models/clip` via `published-docs-registry.generated.ts`. Registry
relationships use current-main ids only (`concept.conditioning`, `concept.encoder`,
`concept.patch`, `concept.multimodal-model`, `module.clip-image-tokenization`,
`paper.learning-transferable-visual-models-from-natural-language-supervision`);
no stale `clip-model-page` or Stable Diffusion links.

| Check | Result |
| --- | --- |
| `make typecheck` | pass |
| `make validate-data` | pass |
| `clip-model-record.test.ts` (3 cases) | pass — published status, aliases, related ids resolve to published records |
| `clip-model-discovery.test.tsx` (6 cases) | pass — search documents, query ranking for CLIP / contrastive text image / text-image conditioning / multimodal encoder, curated related navigation to tokenization module, paper, and glossary conditioning/multimodal-model |
| Browser build smoke | skipped — host disk full (`ENOSPC`); discovery behavior verified programmatically via `docsSearchApi.search` and `deriveCuratedRelatedItems` in focused tests |

Representative discovery queries confirmed in tests:

| Query | CLIP page in results | First result when required |
| --- | --- | --- |
| `CLIP` | yes | yes |
| `contrastive text image model` | yes | yes |
| `text-image conditioning` | yes | no (still surfaced) |
| `multimodal encoder` | yes | yes |

## Story 004 focused CLIP test retention (2026-07-02 UTC)

Three focused `clip-model-*.test.*` files remain on branch head from PR #255.
No stale reconciliation-branch tests were re-ported; no separate graph-only test
was added because `graph.clip-architecture` render surface is covered by
`clip-model-page.test.tsx`.

| File | Cases | Retained behavior (not covered by derived validation) |
| --- | --- | --- |
| `clip-model-page.test.tsx` | 3 | Static render of architecture graph (`graph.clip-architecture`), module list, inline glossary links, CLIP acronym lead copy |
| `clip-model-record.test.ts` | 3 | Reconciled `model.clip` aliases, current-main `relatedIds`/`moduleIds`/`paperIds`, no stale Stable Diffusion link |
| `clip-model-discovery.test.tsx` | 6 | Search document metadata, representative query ranking (`CLIP_DISCOVERY_QUERIES`), curated related navigation |

Omitted by design (not CLIP model landing scope or redundant with derived validation):

| Omitted surface | Reason |
| --- | --- |
| `clip-paper-*.test.*`, `clip-image-tokenization-module-page.test.ts` | Separate paper/module lanes; not part of the CLIP model landing slice |
| Broad route or link-topology inventories | Forbidden by derived-page-validation policy |
| Generated registration list scans | Covered by `make validate-data` / `validateDerivedPublishedPageBundles` |
| Standalone `clip-architecture` graph test | Graph render asserted in page test via `data-graph-id="graph.clip-architecture"` |

| Check | Result |
| --- | --- |
| `make typecheck` | pass |
| `make validate-data` | pass |
| Focused CLIP model tests (12 cases) | pass |

## Slice scope (do not broaden)

Limit changes to the CLIP model page bundle, `model.clip` registry record,
`graph.clip-architecture`, and focused `clip-model-*.test.*` files. Do not edit
unrelated model-release, paper, training-regime, shared runtime, search, or
generated-manifest surfaces unless a concrete mergeability blocker requires it.
