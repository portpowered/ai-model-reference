# Byte-Level Tokenization PR #289 Conflict Refresh — Evidence Snapshot

Planner-facing evidence for the `byte-level-tokenization-pr289-conflict-refresh`
lane. Captured 2026-07-02 UTC. This lane decides whether PR #289 can be safely
refreshed, must be handed off, or is stale/duplicate — without broadening
tokenizer scope.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session omits page lanes)

## PR #289 state (live GitHub, 2026-07-02T17:19Z UTC)

| Field | Value |
| --- | --- |
| Number | 289 |
| Title | `byte-level-tokenization-page` |
| URL | https://github.com/portpowered/ai-model-reference/pull/289 |
| State | OPEN |
| Mergeability | MERGEABLE |
| Merge state status | CLEAN |
| Head branch | `byte-level-tokenization-page` |
| Base branch | `main` |
| Head SHA | `efcf4dc554c38ad97a9ecbd29a363a85b3a39050` |
| Updated at | 2026-07-02T17:03:30Z |
| Associated work item | `byte-level-tokenization-page` |

All required CI checks on PR #289 report SUCCESS (lint, typecheck, test,
test-verify-contract, coverage, test-build-contract, build-export,
test-integration, validate-data, linkcheck, ci).

Planner snapshot at PRD creation (2026-07-02T10:01:49-0700) reported PR #289 as
DIRTY. A later mergeability follow-up on commit `85dfc333` merged `origin/main`
into `byte-level-tokenization-page`; live inspection now shows CLEAN/MERGEABLE.

PR conversation comments (no BLOCKING/REJECTED/FAIL markers):

1. Story `byte-level-tokenization-page-005` completion on `4d124e59` (2026-07-02T16:37:47Z).
2. Mergeability follow-up on `85dfc333` documenting conflict resolutions in
   `messages/en.json`, `citations.ts`, timeout constants, and
   `byte-level-tokenization-registry.test.ts` (2026-07-02T17:02:14Z).

## Factory queue evidence

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-tokenizer-and-attention-refill-batch-064-byte-level-tokenization-page` | idea | `to-complete` / PROCESSING | `trace-tokenizer-and-attention-refill-batch-064` |
| `work-task-70` | task | `init` / PROCESSING | `trace-tokenizer-and-attention-refill-batch-064` |
| `work-plan-69` | plan | `complete` / TERMINAL | `trace-tokenizer-and-attention-refill-batch-064` |

The queue still matches the planner snapshot: `idea:to-complete` with matching
`task:init`. The content PRD in the `byte-level-tokenization-page` worktree
marks all five page stories `passes: true`, so the queue `idea:to-complete`
signal is stale relative to completed page work and the open PR.

Command used:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name byte-level-tokenization-page --json
```

Default-session lookup (`you work list --name byte-level-tokenization-page --json`)
returns empty. Documented session `0fdc5077-95ed-4396-a183-06e5b16555ca` returns
404 (`factory session not found`).

## Target lane metadata and branch drift

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/byte-level-tokenization-page`

| Field | Value |
| --- | --- |
| Lane metadata file | present |
| Work item name | `byte-level-tokenization-page` |
| Branch | `byte-level-tokenization-page` |
| Stamped PR | null (`linkage.pullRequest.status=missing`) |
| Stamped branch linkage | `current` |
| Metadata session id | null |
| Branch HEAD | `efcf4dc554c38ad97a9ecbd29a363a85b3a39050` |
| Git drift vs `origin/main` | diverged (ahead=12, behind=7) after `git fetch origin main` |
| Merge base with `origin/main` | `52cfeb699497dac6fac560a367efaed021135582` |

Lane metadata file:
`.claude/worktrees/byte-level-tokenization-page/.claude/lane-metadata.json`

Linkage gap: lane metadata does not stamp PR #289 even though GitHub resolves
the branch to an open PR with passing checks.

## `origin/main` identity

| Field | Value |
| --- | --- |
| SHA | `d9ef966b7ecaa46cc19699033ec7d8bfdca16e24` |
| Commit date | 2026-07-02 10:15:15 -0700 |
| Subject | Merge pull request #281 from portpowered/ltx-23 |

`origin/main` already ships a published byte-level tokenization module page at
`src/content/docs/modules/byte-level-tokenization/page.mdx` bound to
`module.byte-level-tokenization`. PR #289 still carries incremental page-bundle
and focused-test deltas on top of that baseline.

PR-only diff vs `origin/main` (byte-level surfaces):

```txt
src/content/docs/modules/byte-level-tokenization/messages/en.json
src/content/registry/tables/byte-level-tokenization-comparison.json
src/lib/content/byte-level-tokenization-discovery.test.tsx
src/lib/content/byte-level-tokenization-module-page.test.ts
src/lib/content/byte-level-tokenization-page-contract.test.ts
src/lib/content/byte-level-tokenization-registry.test.ts
src/lib/content/content-reconciliation-single-title.test.ts
src/lib/content/glossary-opening-convergence.test.tsx
src/lib/content/glossary-shell-description-auto-link.test.tsx
```

## Active tokenizer and root-drift lane collision scan

Collision preflight (read-only):

```bash
bun run report:planner-batch-collision-preflight \
  --candidate "byte-level-tokenization-page=src/content/docs/modules/byte-level-tokenization,src/content/registry/modules/byte-level-tokenization.json"
```

Observed (2026-07-02T17:19:23Z UTC):

- `collision-risk=medium`
- `active-lane-overlap=none`
- `recommendation=split the batch` (registry hotspot concentration, not active-lane ownership)

Nearby tokenizer worktrees under `.claude/worktrees/`:

| Worktree | Branch drift vs main | PR linkage | Notes |
| --- | --- | --- | --- |
| `bpe-page` | ahead=13, behind=0 | PR #286 MERGED | separate BPE lane; no ownership overlap confirmed |
| `wordpiece-page` | ahead=737, behind=2 | none stamped | stale relative to main |
| `wordpiece-module-page` | ahead=935, behind=8 | — | stale relative to main |
| `tokenizers-overview-concept-page` | ahead=955, behind=5 | — | stale relative to main |
| `tokenizer-mismatch-root-drift-reconciliation` | ahead=135, behind=5 | PR #265 | root-drift repair lane |

Active PR mergeability watchdog on default session reports only
`queue-only-missing-linkage` noise (15 lanes) and no `pr-backed` byte-level lane
rows — consistent with missing stamped PR linkage in lane metadata.

## Scope boundary (unchanged)

This conflict-refresh lane must not:

- create new tokenizer pages beyond the existing byte-level tokenization slice,
- touch WordPiece or BPE unless a direct merge conflict requires it,
- modify shared page-generation policy.

## Drain outcome (story 002, 2026-07-02T17:30Z UTC)

**Selected outcome:** `refresh-safe`

No new tokenizer pages, WordPiece/BPE work, or shared page-generation policy
changes are in scope for this lane.

### Evidence for `refresh-safe`

| Criterion | Result |
| --- | --- |
| Unsafe active-lane collision | none (`active-lane-overlap=none` from collision preflight 2026-07-02T17:22:40Z) |
| Conflicts limited to PR-lane files | yes — merge commit `85dfc333` resolved only lane-owned surfaces (`messages/en.json`, `citations.ts`, timeout constants, `byte-level-tokenization-registry.test.ts`) |
| Shared policy / root-drift / WordPiece / BPE without ownership | not observed — nearby tokenizer worktrees (`bpe-page`, `wordpiece-page`, `tokenizer-mismatch-root-drift-reconciliation`) show no active ownership overlap |
| PR #289 mergeability | MERGEABLE, merge state CLEAN, all required checks SUCCESS (re-fetched 2026-07-02T17:19Z) |
| PR #289 head | `efcf4dc554c38ad97a9ecbd29a363a85b3a39050` on `byte-level-tokenization-page` |

The prior DIRTY state from the planner snapshot (2026-07-02T10:01:49-0700) was
cleared when the page lane merged `origin/main` at `85dfc333` and pushed lint
fix `efcf4dc5`. Live GitHub now reports a clean merge path.

### Why not `handoff-required`

- Collision preflight reports `active-lane-overlap=none`; no active tokenizer or
  root-drift lane owns the byte-level tokenization surfaces under refresh.
- Merge conflicts from the `origin/main` integration were lane-owned and already
  resolved in the `byte-level-tokenization-page` worktree; no partial hidden
  resolution remains on the conflict-refresh lane.
- No WordPiece, BPE, or shared page-generation policy files appear in the
  unresolved PR diff vs `origin/main`.

### Why not `stale-or-duplicate`

`origin/main` at `d9ef966b7ecaa46cc19699033ec7d8bfdca16e24` ships the baseline
byte-level tokenization page bundle (`page.mdx`, registry binding), but PR #289
still carries incremental lane intent not on main:

- `src/lib/content/byte-level-tokenization-page-contract.test.ts` (absent on main)
- expanded focused tests and message/comparison-table deltas across nine paths
  (`+421 / -43` vs `origin/main` on 2026-07-02T17:30Z)

Queue `idea:to-complete` + `task:init` is stale relative to completed page PRD
stories and the open PR; that queue drift alone does not prove duplicate work.

### Next operator action

Story 003 may verify the existing `85dfc333` / `efcf4dc5` refresh is current
against live `origin/main`, capture final mergeability, and run page-level
validation. No handoff or stale/duplicate closure is required.

## Refresh completion (story 003, 2026-07-02T18:05Z UTC)

**Outcome executed:** `refresh-safe` — merged current `origin/main` into
`byte-level-tokenization-page` in the page lane worktree.

| Field | Value |
| --- | --- |
| Merge commit | `f010c06496df7e7b3b91e2a86aede0f56a9ca9d5` |
| Prior head | `efcf4dc554c38ad97a9ecbd29a363a85b3a39050` |
| `origin/main` at merge | `d9ef966b7ecaa46cc19699033ec7d8bfdca16e24` |
| Merge strategy | `git merge origin/main` (ort, no conflicts) |
| Branch drift after merge | ahead=13, behind=0 vs `origin/main` |
| WordPiece / BPE / policy files touched | none — merge brought in `ltx-23` model lane only |

Conflict-free merge integrated seven `origin/main` commits (LTX-2.3 model page
bundle, search-panel timeout stabilization, and related discovery tests) without
touching byte-level tokenization surfaces.

### Page-level validation (local, 2026-07-02T18:05Z UTC)

- `bun run typecheck` — pass
- `bun run lint` — pass (3 pre-existing warnings in unrelated files)
- `bun test src/lib/content/byte-level-tokenization` — 22 pass, 0 fail
- `bun run validate-data` — pass

### PR #289 post-refresh state

Re-fetch after push of `f010c064` to `origin/byte-level-tokenization-page`.
CI re-run expected on the updated head.

## Evidence commands (read-only)

```bash
git fetch origin main
git rev-parse origin/main
git -C .claude/worktrees/byte-level-tokenization-page rev-list --left-right --count origin/main...HEAD
gh pr view 289 --json number,mergeable,mergeStateStatus,headRefOid,statusCheckRollup
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 --name byte-level-tokenization-page --json
bun run report:planner-batch-collision-preflight --candidate "byte-level-tokenization-page=..."
```
