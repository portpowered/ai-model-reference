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

## Implementation order (remaining PRD stories)

1. **002** — Publish page bundle (salvaged MDX, messages, assets) plus citation record, graph, and
   `citations.ts` registration.
2. **003** — Publish reconciled `training-regime.ppo` registry, alignment back-link, and discovery tests.
3. **004** — Run `make validate-data`, focused tests, browser verification, and final handoff.

## Verification commands

```bash
make typecheck
make validate-data
bun test src/lib/content/ppo-training-regime-page.test.ts
bun test src/lib/content/ppo-training-regime-record.test.ts
```
