# PPO Training Regime Current Main Reconciliation Notes

Reconciliation of the stale `ppo-training-regime-page` branch against `origin/main` as of
`a46a2203` (2026-07-08 UTC). Use these notes when publishing stories 002–004.

## Origin/main prerequisites (verified 2026-07-08 UTC)

| Artifact | Path / id | Status before this lane |
| --- | --- | --- |
| PPO page bundle | `src/content/docs/training/ppo/` | **absent** |
| PPO registry record | `training-regime.ppo` / `src/content/registry/training-regimes/ppo.json` | **absent** |
| PPO citation record | `citation.proximal-policy-optimization-algorithms` | **absent** |
| PPO training-flow graph | `graph.ppo-training-flow` | **absent** |
| RLHF page + registry | `training-regime.rlhf` | published |
| DPO page + registry | `training-regime.dpo` | published |
| GRPO page + registry | `training-regime.grpo` | published |
| Alignment glossary | `concept.alignment` | published (links to `training-regime.grpo`, not PPO yet) |
| RLHF citation | `citation.training-language-models-to-follow-instructions-with-human-feedback` | published |

**Not on origin/main:** dedicated reward-model page/registry record. PPO neighbor links should use
currently resolvable training-regime and concept targets only.

## Stale branch / worktree evidence

| Item | Value |
| --- | --- |
| Local worktree | `.claude/worktrees/ppo-training-regime-page` |
| Branch | `ppo-training-regime-page` |
| Stale head | `37a41343` (2026-06-20 UTC) |
| Merge-base with `origin/main` | `536cc9c9` |
| Commits ahead of merge-base | 28 |
| Commits behind `origin/main` | 1392 |

## Prior PR metadata

| Field | Value |
| --- | --- |
| PR | [#130](https://github.com/portpowered/ai-model-reference/pull/130) |
| Title | `ppo-training-regime-page` |
| State | OPEN |
| Base branch | `main` |
| Head branch | `ppo-training-regime-page` |
| Last updated | 2026-06-19T18:56:32Z |
| Mergeable | `CONFLICTING` / `DIRTY` |

PR #130 is stale against current main. Do **not** merge or rebase that branch wholesale; recover
only the page-local slice documented below.

### PR #130 blocking review findings (unresolved on stale head)

1. `src/lib/content/citations.ts` does not register `citation.proximal-policy-optimization-algorithms`,
   so the PPO page references section omits the PPO paper even though the registry declares it.
2. `ppo-training-regime-page.test.ts` lacks behavioral coverage for rendered citation output.
3. Branch has unresolved merge conflicts with `main`.

This reconciliation lane must fix (1) and (2) when publishing; do not repeat the stale omission.

## Stale branch salvage inventory

### Recoverable page-local artifacts

| Artifact | Stale path | Verdict |
| --- | --- | --- |
| Page bundle | `src/content/docs/training/ppo/page.mdx` | salvage — matches current training-regime template |
| Messages | `src/content/docs/training/ppo/messages/en.json` | salvage — expands PPO acronym, explains clipped updates and operational cost |
| Assets | `src/content/docs/training/ppo/assets.json` | salvage — wires `graph.ppo-training-flow` |
| Registry record | `src/content/registry/training-regimes/ppo.json` | reconcile — expand `relatedIds` to current-main neighbors |
| Citation record | `src/content/registry/citations/proximal-policy-optimization-algorithms.json` | salvage — new on main |
| Training-flow graph | `src/content/registry/graphs/ppo-training-flow.json` | salvage |
| Page tests | `src/lib/content/ppo-training-regime-page.test.ts` | reconcile — add rendered-citation assertions |
| Record tests | `src/lib/content/ppo-training-regime-record.test.ts` | reconcile — update neighbor expectations |

### Registry reconciliation gaps

The stale `training-regime.ppo` record predates main's shipped RLHF, DPO, and GRPO pages. When
publishing, update relationships rather than copying the stale record blindly:

| Field | Stale value | Reconciled target |
| --- | --- | --- |
| `relatedIds` | `["concept.alignment"]` only | add `training-regime.rlhf`, `training-regime.dpo`, `training-regime.grpo`, keep `concept.alignment` |
| `citationIds` | PPO paper + RLHF citation | keep both; ensure citation runtime resolves PPO paper |
| `tags` | `["foundations", "taxonomy"]` | consider `["alignment", "foundations"]` to match RLHF/DPO/GRPO |

Bidirectional discovery: add `training-regime.ppo` to `concept.alignment` `relatedIds` (main
currently links alignment → GRPO only).

### Excluded — do not copy stale diffs wholesale

| Path | Reason |
| --- | --- |
| `src/lib/content/registry-runtime.generated.ts` | generated — regenerate from published registry inputs |
| `src/lib/content/graph-registry-runtime.generated.ts` | generated — regenerate |
| `src/lib/content/published-docs-registry-manifest.ts` | generated manifest — regenerate |
| `src/app/(site)/site-renderers.tsx` | shared runtime — only touch if current main still requires a PPO-specific renderer hook |
| `src/features/docs/components/PageMathFormula.tsx` | shared component — verify current main already supports `ppoClipObjective` math id |
| `src/lib/content/mdx-components.tsx` | shared MDX wiring — verify against current training-regime pages |
| `src/lib/content/page-template-conformance.ts` | shared helper — verify current conformance list |
| `src/lib/content/graph-registry-runtime.test.ts` | regenerate-driven — update only if graph publish requires it |
| `src/lib/content/training-behavior-glossary.test.ts` | unrelated breadth — add PPO only if glossary contract demands it |
| `src/lib/navigation/generated-docs-page-tree.test.ts` | navigation snapshot — let derived validation prove route |
| `src/lib/source.test.ts` | source inventory — avoid broad churn |
| `src/tests/discovery/search-discovery.test.tsx` | add focused PPO discovery only if derived search validation is insufficient |

### Minimal shared change still required

| Path | Why |
| --- | --- |
| _(none for citations on July 2026 main)_ | `src/lib/content/citations.ts` delegates to generated `registry-runtime`; publishing `src/content/registry/citations/proximal-policy-optimization-algorithms.json` plus `bun run prepare:content-runtime` is sufficient. PR #130 blocking finding about `citations.ts` applied to the stale branch pattern only. |

## Implementation order (completed)

1. **002** — Published page bundle, citation record, graph, and reconciled registry record.
2. **003** — Published reconciled `training-regime.ppo` relationships, alignment back-link, and discovery tests.
3. **004** — Final slice verification, browser check, and this handoff (2026-07-08 UTC).

## Final slice verification handoff (story 004)

### Validation commands and outcomes (2026-07-08 UTC)

| Command | Outcome |
| --- | --- |
| `make validate-data` | pass — registry validation passed after `prepare:content-runtime` |
| `make typecheck` | pass |
| `make lint` | pass (3 pre-existing warnings in unrelated phase-1 tests) |
| `make test` | pass — 4250 tests, 0 failures |
| `bun test src/lib/content/ppo-training-regime.test.ts` | pass — 12 tests, 82 assertions |
| `bun run audit:canonical-page-surface` | over-budget (expected for reconciliation lane touching alignment back-link, citation record, and colocated tests) |
| `bun run build` + HTTP verify on port 3785 | pass — title, operational-cost copy, training-flow graph, neighbor links, citations, related docs, and tag pills render |

### Browser verification

HTTP verification against production build on port 3785 confirmed:

- Page title **Proximal Policy Optimization** renders.
- Operational-cost narrative (`operationally heavy`) is visible.
- Training-flow graph (`data-graph-id="graph.ppo-training-flow"`) is present.
- Neighbor links resolve (`/docs/training/rlhf`, curated related docs, tag pills).
- PPO paper citation (**Proximal Policy Optimization Algorithms**) appears in references.

Playwright integration test in `ppo-training-regime.test.ts` gates on
`shouldRunVerifyProductionIntegrationTests` for desktop/mobile viewport checks when CI enables
production integration verification.

### Focused tests versus derived validation

Routine bundle alignment (frontmatter, messages, registryId, asset keys) is proven by
`make validate-data` / `validateDerivedPublishedPageBundles`. The colocated
`ppo-training-regime.test.ts` file adds focused behavioral coverage only where derived validation
does not directly prove reader-visible behavior:

- rendered page sections, math variable definitions, and neighbor links,
- citation list output for the PPO paper and RLHF citation,
- search documents, live search aliases (`ppo`, `proximal policy optimization`, `rlhf ppo`),
- tag landing and alignment back-link discovery,
- graph registry record wiring.

No additional route-inventory or navigation-snapshot tests were added; derived validation and the
focused file above are sufficient.

### Page-local diff inventory (branch vs `origin/main`)

| Path | Classification |
| --- | --- |
| `src/content/docs/training/ppo/page.mdx` | page-owned |
| `src/content/docs/training/ppo/messages/en.json` | page-owned |
| `src/content/docs/training/ppo/assets.json` | page-owned |
| `src/content/registry/training-regimes/ppo.json` | page-owned primary record |
| `src/content/registry/graphs/ppo-training-flow.json` | page-owned support record |
| `src/content/registry/citations/proximal-policy-optimization-algorithms.json` | required citation input |
| `src/content/registry/concepts/alignment.json` | minimal back-link (`training-regime.ppo` in `relatedIds`) |
| `src/lib/content/ppo-training-regime.test.ts` | colocated behavioral tests |
| `docs/internal/processes/ppo-training-regime-current-main-reconciliation-notes.md` | reconciliation handoff |

**Excluded from this lane (not in diff):** model-page rows, blog/U-Net/diffusion work, shared MDX
helpers, generated registry runtime commits, broad search/runtime code, locale infrastructure, and
unrelated training pages.

### Stale work resolution

| Stale finding (PR #130) | Reconciled outcome |
| --- | --- |
| Missing `citations.ts` registration for PPO paper | July 2026 main resolves citations from registry JSON via generated runtime — publishing citation JSON + `prepare:content-runtime` is sufficient |
| Missing behavioral citation-render tests | `ppo-training-regime.test.ts` includes `CitationList` render assertions |
| Branch CONFLICTING with main | This lane reimplemented page-local slice on current main instead of merging stale branch |

Salvaged from stale worktree: page MDX/messages/assets, citation JSON, graph JSON, and test patterns.
Reconciled on main: expanded `relatedIds`, alignment back-link, tags, and discovery tests.

## Verification commands

```bash
make typecheck
make validate-data
make test
bun test src/lib/content/ppo-training-regime.test.ts
bun run audit:canonical-page-surface
```
