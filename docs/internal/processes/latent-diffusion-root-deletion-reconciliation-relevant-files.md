# Latent Diffusion Root Deletion Reconciliation — Relevant Files

Repair evidence for the `latent-diffusion-root-deletion-reconciliation` work
item. Verified against `origin/main` at `3ea842f1` (2026-07-02 UTC).

## Story 001 — Landed latent diffusion evidence on origin/main

| Check | Result |
| --- | --- |
| `origin/main` fetched | yes — `git fetch origin main` at iteration start |
| PR #264 / merge `3ea842f` in lineage | yes — `git merge-base --is-ancestor 3ea842f origin/main` |
| `origin/main` SHA | `3ea842f11a25b23d6a93b0fe703d2c18e46de855` |
| Route `/docs/papers/latent-diffusion` | yes — page bundle at `src/content/docs/papers/latent-diffusion/page.mdx` |
| `paper.latent-diffusion` | yes — `src/content/registry/papers/latent-diffusion.json` |
| `citation.latent-diffusion-models` | yes — `src/content/registry/citations/latent-diffusion-models.json` |
| `graph.latent-diffusion-contribution` | yes — `src/content/registry/graphs/latent-diffusion-contribution.json` |
| Focused discovery proof | yes — `src/lib/content/latent-diffusion-paper-page.test.ts` on `origin/main` |

**Shipped vs dirty:** All surfaces above are present on `origin/main`. Root
checkout dirty state is tracked separately by
`verifyLatentDiffusionLandedEvidence` and must not be treated as missing main
content.

At story 001 verification (2026-07-02 UTC), both the repair worktree and the
planner root checkout reported **clean** porcelain status with zero
latent-diffusion dirty paths. The PRD-listed deletion drift was not reproduced
on the current checkout head.

## Core verification module

* `src/lib/factory/planner-latent-diffusion-root-deletion-reconciliation.ts` —
  read-only landed-evidence verification for PR #264 / merge `3ea842f`,
  `origin/main` surface presence, separate root-checkout dirty-path capture,
  and completed `latent-diffusion-paper-page` worktree/branch comparison against
  `origin/main` for every reconciliation dirty path.
* `src/lib/factory/planner-latent-diffusion-root-deletion-reconciliation.test.ts`
  — fixture git repo tests for shipped-vs-dirty separation and completed-worktree
  path evidence against `origin/main`.
* `scripts/report-planner-latent-diffusion-root-deletion-reconciliation.ts` —
  human-readable and JSON report entry point.

## PRD reconciliation dirty paths (for stories 002–005)

| Path | Role |
| --- | --- |
| `src/content/docs/papers/latent-diffusion/assets.json` | page bundle |
| `src/content/docs/papers/latent-diffusion/messages/en.json` | page bundle |
| `src/content/docs/papers/latent-diffusion/page.mdx` | page bundle / route |
| `src/content/registry/citations/latent-diffusion-models.json` | citation registry |
| `src/content/registry/graphs/latent-diffusion-contribution.json` | graph registry |
| `src/content/registry/papers/latent-diffusion.json` | paper registry |
| `src/lib/content/latent-diffusion-paper-page.test.ts` | focused discovery proof |
| `src/lib/content/registry-runtime.test.ts` | shared modified root path |
| `src/lib/source.test.ts` | shared modified root path |

## Completed worktree evidence (story 002 input)

| Record | Value |
| --- | --- |
| Branch | `latent-diffusion-paper-page` |
| Worktree | `.claude/worktrees/latent-diffusion-paper-page` |
| Branch tip | `0ddfd2bc` (pre-merge reconcile commit) |
| Landing merge | PR #264 / `3ea842f` on `origin/main` |
| PR metadata | #264 merged 2026-07-02T04:04:59Z |

## Story 002 — Completed worktree evidence inspection (2026-07-02 UTC)

Read-only inspection via `inspectLatentDiffusionCompletedWorktreeEvidence` and
`bun run report:planner-latent-diffusion-root-deletion-reconciliation`.
No source, registry, test, or docs content was modified during this story.

| Path | Completed branch | Origin/main | Disposition | Mismatch with main |
| --- | --- | --- | --- | --- |
| `src/content/docs/papers/latent-diffusion/assets.json` | present | present | existed-unchanged | no |
| `src/content/docs/papers/latent-diffusion/messages/en.json` | present | present | existed-unchanged | no |
| `src/content/docs/papers/latent-diffusion/page.mdx` | present | present | existed-unchanged | no |
| `src/content/registry/citations/latent-diffusion-models.json` | present | present | existed-unchanged | no |
| `src/content/registry/graphs/latent-diffusion-contribution.json` | present | present | existed-unchanged | no |
| `src/content/registry/papers/latent-diffusion.json` | present | present | existed-unchanged | no |
| `src/lib/content/latent-diffusion-paper-page.test.ts` | present | present | existed-unchanged | no |
| `src/lib/content/registry-runtime.test.ts` | present | present | existed-modified | **yes** |
| `src/lib/source.test.ts` | present | present | existed-unchanged | no |

**Completed-vs-main mismatch:** only `src/lib/content/registry-runtime.test.ts`
differs between the completed `latent-diffusion-paper-page` branch tip and
current `origin/main`. The branch tip retains pre-reconcile assertions (for
example `concept.self-attention` expectations) that main advanced past during
unrelated merges. This is shared-test drift, not missing latent-diffusion page
content.

**Intentional removal check:** none of the listed latent-diffusion page bundle,
registry, citation, graph, or focused-test paths were removed on the completed
branch; all remain present and content-identical to `origin/main`.

## Verification commands

| When | Command |
| --- | --- |
| Landed evidence report | `bun run report:planner-latent-diffusion-root-deletion-reconciliation` |
| JSON report | `bun run report:planner-latent-diffusion-root-deletion-reconciliation -- --json` |
| Module tests | `bun test src/lib/factory/planner-latent-diffusion-root-deletion-reconciliation.test.ts` |
| Focused discovery proof | `bun test src/lib/content/latent-diffusion-paper-page.test.ts` |
| Structural proof | `make typecheck` |

## Related process docs

* [factory-linkage-relevant-files](./factory-linkage-relevant-files.md) —
  root checkout reconciliation and terminal lane landing audit patterns.
