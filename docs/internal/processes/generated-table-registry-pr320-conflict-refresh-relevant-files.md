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
* `--json` or `--format json`

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
