# Generated Table Registry PR320 Conflict Refresh — Relevant Files

Use these files when changing the narrow PR #320 conflict-refresh evidence lane.
This lane is read-only during evidence capture: it must not mutate source,
generated registry, content, or unrelated planner-report files.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes)

## Target PR and branch

| Field | Value |
| --- | --- |
| Pull request | #320 |
| Title | `generated-table-registry-root-drift-cleanup-proof` |
| URL | https://github.com/portpowered/ai-model-reference/pull/320 |
| Head branch | `generated-table-registry-root-drift-cleanup-proof` |
| Original work item | `generated-table-registry-root-drift-cleanup-proof` |
| Conflict-refresh work item | `generated-table-registry-pr320-conflict-refresh` |

## Core evidence module

* `src/lib/factory/generated-table-registry-pr320-conflict-refresh.ts` —
  read-only evidence capture for PR #320 mergeability/check state, base and head
  SHAs, `origin/main` identity, branch ahead/behind relationship, queue-token
  state for the original and conflict-refresh lanes, and worktree metadata for
  both worktrees. Resolves the main repo root from nested worktrees via
  `resolveMainRepoRoot`.
* `scripts/report-generated-table-registry-pr320-conflict-refresh.ts` —
  planner-facing CLI with fixture flags aligned to other factory reports.

## Planner-facing command

| When | Command |
| --- | --- |
| Capture read-only PR #320 conflict-refresh evidence | `bun run report:generated-table-registry-pr320-conflict-refresh` |

Fixture flags:

* `--repo-root`
* `--remote-base-ref`
* `--work-list-json`
* `--pr320-pull-request-json`
* `--evidence-only` (skip outcome classification; story 001 capture only)
* `--json` or `--format json`

Default CLI output includes `[scope]` when outcome classification runs (story 003).

## Story 002 — Selected outcome (2026-07-03T12:15:00Z UTC)

Live classification from `bun run report:generated-table-registry-pr320-conflict-refresh`
with non-mutating `git merge-tree origin/main origin/generated-table-registry-root-drift-cleanup-proof`
and proof-on-main marker checks.

| Field | Value |
| --- | --- |
| Selected outcome | **merge-ready** |
| Proof on main | false (`generated-table-registry-root-drift-cleanup-proof.ts` and report script absent on `origin/main`) |
| GitHub mergeability | MERGEABLE / CLEAN |
| Check health | passing (11/11 on head `87538e37`) |
| Merge-tree conflicts | 0 paths |
| Branch drift | 10 ahead / 48 behind `origin/main` (`89a395a9`) |
| Refresh recommended | yes (optional merge-refresh in original worktree before merge) |
| Operator handoff | none |

**Next safe action:** PR #320 conflict drift is cleared; no automated conflict-refresh
is required from this lane. Optional merge-refresh against current `origin/main`
belongs in the `generated-table-registry-root-drift-cleanup-proof` worktree.
Unresolved PR #320 conversation **BLOCKING** feedback (local `make test` accessibility
smoke timeout on head `87538e37`) remains with the original review lane, not this
conflict-refresh classifier.

### Outcome selection rules

| Outcome | When |
| --- | --- |
| `consumed-on-main` | All `PR320_PROOF_ON_MAIN_MARKER_PATHS` exist on `origin/main` |
| `merge-ready` | PR mergeable, checks passing, merge-tree reports zero conflicts |
| `operator-handoff` | merge-tree conflicts, failing checks, unavailable PR evidence, or GitHub/merge-tree mismatch |

Handoffs name each `conflictingFile=` path and a `operatorHandoffNextAction` that
preserves generated-table-registry cleanup-proof intent in the original worktree.

## Story 003 — Scope-preserving merge refresh (2026-07-03T12:35:00Z UTC)

Merged `origin/main` (`89a395a9`) into `generated-table-registry-root-drift-cleanup-proof`
in the owner worktree. `factory-linkage-relevant-files.md` and `package.json` auto-merged;
no manual conflict edits were required.

### Post-refresh PR #320 branch diff (`origin/main...HEAD`)

| Path | Category |
| --- | --- |
| `docs/internal/processes/generated-table-registry-root-drift-cleanup-proof-relevant-files.md` | proof planner doc |
| `docs/internal/processes/factory-linkage-relevant-files.md` | minimum planner linkage |
| `package.json` | proof CLI script entry |
| `scripts/report-generated-table-registry-root-drift-cleanup-proof.ts` | proof CLI |
| `src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts` | proof module |
| `src/lib/factory/generated-table-registry-root-drift-cleanup-proof.test.ts` | proof tests |
| `src/tests/fixtures/generated-table-registry-root-drift-cleanup-proof/*` | proof fixtures |

Scope proof: `preserved=true` — no `src/content/**`, no `src/lib/content/generated/**`,
no adjacent page content, and no broad generated registry runtime edits in the refreshed diff.

### Post-refresh PR #320 state

| Field | Value |
| --- | --- |
| Head SHA | `2ac49388` (merge commit) |
| Merge state | `CLEAN` |
| Branch drift vs `origin/main` | 0 behind (10 ahead with proof commits) |
| Local `make test` a11y smoke | pass — empty-results test completed in ~2.1s (was BLOCKING timeout on `87538e37`) |
| Proof tests | 35 pass |

### Scope verification command

`bun run report:generated-table-registry-pr320-conflict-refresh` now emits a `[scope]`
section with `preserved=`, `changedPath=`, `prohibitedPath=`, and `outOfScopePath=` lines
from `capturePr320ConflictRefreshScopeProof` / `buildPr320ConflictRefreshScopeProof`.

## Live evidence snapshot (2026-07-03T12:05:51Z UTC)

Captured with `bun run report:generated-table-registry-pr320-conflict-refresh`
from this worktree before any conflict-resolution edits.

### GitHub PR #320

| Field | Value |
| --- | --- |
| State | OPEN |
| Head SHA | `87538e3756c09199e3691f67175a505eefe92981` |
| Base SHA | `3d4311b1ddc8c1b5b099a7ef375d31230af3f394` |
| Mergeable | MERGEABLE |
| Merge state status | CLEAN |
| Mergeability class | mergeable |
| Check health | passing (lint, typecheck, test, validate-data, linkcheck, ci all SUCCESS on head `87538e37`) |
| Updated at | 2026-07-03T09:25:25Z |

**Note:** The PRD customer ask reported `mergeability=CONFLICTING`; live capture
shows the conflict was already cleared on head `87538e37` (merge from
`origin/main` in `54f7b791` plus checkout-target fix in `87538e37`). Story 002
should classify this as merge-ready rather than requiring another automated
refresh unless `origin/main` advances again.

### `origin/main` and branch drift

| Field | Value |
| --- | --- |
| `origin/main` SHA | `89a395a99e4408415680397b377db41d1731dc6b` |
| Merge base with PR branch | `3d4311b1ddc8c1b5b099a7ef375d31230af3f394` |
| PR branch ahead / behind | 10 / 48 (diverged) |

PR #320 remains 48 commits behind current `origin/main` while GitHub reports
CLEAN mergeability against the recorded base SHA. Story 002 should decide
whether another merge-refresh against current `origin/main` is needed before
merge.

### Queue tokens (session `930b51a6-07ce-44e6-a639-7a6217f6e864`)

| Work item | Token | State |
| --- | --- | --- |
| `generated-table-registry-root-drift-cleanup-proof` | idea | `to-complete` / PROCESSING |
| `generated-table-registry-root-drift-cleanup-proof` | task (`work-task-214`) | `failed` / FAILED |
| `generated-table-registry-root-drift-cleanup-proof` | plan | `complete` / TERMINAL |
| `generated-table-registry-pr320-conflict-refresh` | idea | `to-complete` / PROCESSING |
| `generated-table-registry-pr320-conflict-refresh` | task (`work-task-262`) | `init` / PROCESSING |
| `generated-table-registry-pr320-conflict-refresh` | plan | `complete` / TERMINAL |

### Worktree metadata

| Work item | Worktree path | Stamped PR | Branch HEAD | Linkage |
| --- | --- | --- | --- | --- |
| `generated-table-registry-root-drift-cleanup-proof` | `.claude/worktrees/generated-table-registry-root-drift-cleanup-proof` | #320 current | `87538e37` | branch/current, PR/current |
| `generated-table-registry-pr320-conflict-refresh` | `.claude/worktrees/generated-table-registry-pr320-conflict-refresh` | missing | `1a134d79` (main-aligned) | branch/current, PR/missing |

### Latest PR #320 conversation feedback (historical)

1. **BLOCKING** (2026-07-03T05:01:17Z): stale checked-in proof evidence — cleared in `218a6915`.
2. **BLOCKING** (2026-07-03T05:15:47Z onward, head `54f7b791`): root/worktree proof-target mismatch — cleared in `87538e37`.
3. **BLOCKING** (head `87538e37`): local `make test` timeout on search accessibility smoke test — unresolved on PR #320; outside this conflict-refresh lane's story 001 scope but relevant for story 002 merge-ready vs handoff classification.

## Fixture-backed verification

When report or evidence logic changes, extend
`src/lib/factory/generated-table-registry-pr320-conflict-refresh.test.ts`
using fixtures in
`src/tests/fixtures/generated-table-registry-pr320-conflict-refresh/`. Tests
should assert observable emitted behavior (PR mergeability class, check health,
branch drift counts, queue-token states, worktree availability) without meta
inventories of routes or command lists.

## Related process docs

* [factory-linkage-relevant-files](./factory-linkage-relevant-files.md) —
  active PR mergeability watchdog and queue/worktree linkage surfaces.
* [ownerless-generated-table-registry-drift-relevant-files](./ownerless-generated-table-registry-drift-relevant-files.md) —
  adjacent generated table registry drift classification lane.
* [generated-table-registry-root-drift-cleanup-proof-relevant-files](./generated-table-registry-root-drift-cleanup-proof-relevant-files.md) —
  original PR #320 proof lane (when present on the branch).
