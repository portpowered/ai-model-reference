# Dirty Generic PR #277 / PR #279 Conflict Refresh — Evidence Snapshot

Planner-facing evidence for the `dirty-generic-pr277-pr279-conflict-refresh` lane
(batch 074). Captured 2026-07-02T20:15Z UTC. This lane reconciles still-open
dirty generic PRs #277 and #279 after the completed batch 073 handoff lane,
without duplicating batch 066 drain ownership or broadening generic shell scope.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session omits generic-shell page lanes)

## Original work item intent

| PR | Work item | Intent |
| --- | --- | --- |
| #277 | `generic-search-ai-enrichment-plugin` | Move AI-specific search facet enrichment behind a Model Atlas-owned adapter while keeping generic topology/base enrichment in shared search code. |
| #279 | `generic-site-config-neutral-surfaces` | Make the shared `SiteConfig` contract domain-neutral while preserving `modelAtlasSiteConfig` and current header/home behavior. |

Both original worktree PRDs mark all implementation stories `passes: true`. Queue
tokens for the original lanes remain `idea:to-complete` with `task:failed` on
trace `trace-generic-shell-hardening-batch-002` because open PRs are blocked on
merge conflicts and review-loop quality gates, not incomplete implementation
stories.

## Batch 066 drain ownership (no duplicate drain work)

Batch 066 (`trace-green-pr-drain-and-conflict-triage-batch-066`) owns dedicated
drain ideas for both PRs. This batch 074 lane must not create competing drain
lanes.

| Work id | Type | State | Trace | Intended ownership |
| --- | --- | --- | --- | --- |
| `batch-green-pr-drain-and-conflict-triage-batch-066-generic-search-ai-enrichment-pr277-drain` | idea | `init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` | Inspect PR #277 queue tokens, lane metadata, and worktree state; complete review/consume, merge/hand off the green PR, or document the exact blocker. |
| `batch-green-pr-drain-and-conflict-triage-batch-066-generic-site-config-pr279-drain` | idea | `init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` | Inspect PR #279 queue tokens, lane metadata, and worktree state; complete review/consume, merge/hand off the green PR, or document the exact blocker. |

Command used:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name generic-search-ai-enrichment-pr277-drain --json
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name generic-site-config-pr279-drain --json
```

## Batch 073 handoff lane status

The prior batch 073 handoff lane (`generic-pr277-pr279-conflict-refresh-handoff`)
on trace `trace-fresh-pr-drain-and-conflict-refresh-batch-073` is **complete**
(TERMINAL): idea, plan, task (`work-task-91`), and review (`work-review-104`) all
report `complete`. Latest visible outcome: classified both PRs as
**handoff-to-batch-066** with evidence-only delivery; no branch refresh was
attempted in that lane. Evidence doc:
[generic-pr277-pr279-conflict-refresh-handoff-relevant-files](./generic-pr277-pr279-conflict-refresh-handoff-relevant-files.md).

## This lane (batch 074)

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/dirty-generic-pr277-pr279-conflict-refresh`

| Field | Value |
| --- | --- |
| Work item name | `dirty-generic-pr277-pr279-conflict-refresh` |
| Trace | `trace-pr-landing-reconciliation-and-conflict-refresh-batch-074` |
| Queue state | `idea:to-complete` / PROCESSING; `work-task-114` at `task:init` |
| Stamped PR | none yet (lane PR not created at story 001 capture) |

## Lane metadata for target PR branches

### PR #277 — `generic-search-ai-enrichment-plugin`

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/generic-search-ai-enrichment-plugin`

| Field | Value |
| --- | --- |
| Lane metadata file | present |
| Work item name | `generic-search-ai-enrichment-plugin` |
| Branch | `generic-search-ai-enrichment-plugin` |
| Stamped PR | #277 (`linkage.pullRequest.status=current`) |
| Metadata refreshed at | 2026-07-02T19:01:30.588Z |
| Branch HEAD (remote) | `6a1530a0ce11a9633760a7595b14e17038e4df39` |

### PR #279 — `generic-site-config-neutral-surfaces`

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/generic-site-config-neutral-surfaces`

| Field | Value |
| --- | --- |
| Lane metadata file | present |
| Work item name | `generic-site-config-neutral-surfaces` |
| Branch | `generic-site-config-neutral-surfaces` |
| Stamped PR | #279 (`linkage.pullRequest.status=current`) |
| Metadata refreshed at | 2026-07-02T19:01:32.641Z |
| Branch HEAD (remote) | `e5defbc8babefd3da5a1a9f4304e9763f3545e40` |

## Live GitHub PR state (2026-07-02T20:15Z UTC)

### PR #277

| Field | Value |
| --- | --- |
| Number | 277 |
| Title | `generic-search-ai-enrichment-plugin` |
| URL | https://github.com/portpowered/ai-model-reference/pull/277 |
| State | OPEN |
| Mergeability | CONFLICTING (`mergeable: false`) |
| Merge state status | DIRTY (`mergeable_state: dirty`) |
| Head branch | `generic-search-ai-enrichment-plugin` |
| Base branch | `main` |
| Head SHA | `6a1530a0ce11a9633760a7595b14e17038e4df39` |
| Updated at | 2026-07-02T14:59:47Z |

Required CI checks (`gh pr checks 277`): **11 passed, 0 failed** — lint,
typecheck, test, test-verify-contract, coverage, test-build-contract,
build-export, test-integration, validate-data, linkcheck, ci.

Latest PR conversation feedback (blocking unless superseded):

1. **BLOCKING MERGE** (2026-07-02T14:59:47Z): review clear and CI green on head
   `6a1530a0`, but `gh pr merge 277 --merge` failed — GitHub cannot create a
   clean merge commit. Suggested repair: merge or rebase `origin/main`, resolve
   conflicts, push, rerun checks.
2. **REVIEW CLEAR** (2026-07-02T14:56:54Z): supersedes earlier `make test`
   timeout blockers; local `make test` 3411 pass / 0 fail on `6a1530a0`.

### PR #279

| Field | Value |
| --- | --- |
| Number | 279 |
| Title | `generic-site-config-neutral-surfaces` |
| URL | https://github.com/portpowered/ai-model-reference/pull/279 |
| State | OPEN |
| Mergeability | CONFLICTING (`mergeable: false`) |
| Merge state status | DIRTY (`mergeable_state: dirty`) |
| Head branch | `generic-site-config-neutral-surfaces` |
| Base branch | `main` |
| Head SHA | `e5defbc8babefd3da5a1a9f4304e9763f3545e40` |
| Updated at | 2026-07-02T13:12:04Z |

Required CI checks (`gh pr checks 279`): **11 passed, 0 failed** (same CI matrix).

Latest PR conversation feedback (blocking unless superseded):

1. **BLOCKING** (2026-07-02T13:12:04Z): local `make test` failed — one a11y
   search-page-panel smoke test timed out at 15s on head `e5defbc8`. GitHub CI
   is green; no later PR conversation comment clears this blocker.
2. Earlier merge-conflict and classification-handoff `make test` blockers were
   addressed in commits `95dd6861` and `e5defbc8` per follow-up comments; the
   latest blocking comment supersedes cleared merge-conflict feedback with a new
   local-gate failure.

## `origin/main` identity

| Field | Value |
| --- | --- |
| SHA | `209d1bd8ced0cced5fd99992fe50f23296d126e8` |
| Commit date | 2026-07-02T12:04:51-07:00 |

Fetched with `git fetch origin main` (read-only) before recording SHAs.

## Branch drift vs `origin/main` (non-mutating)

| Branch | Ahead | Behind | Merge base |
| --- | ---: | ---: | --- |
| `origin/generic-search-ai-enrichment-plugin` | 8 | 95 | `798a0c7bd709d2a38037eecd6a01323507810e1b` |
| `origin/generic-site-config-neutral-surfaces` | 6 | 107 | `9136cb1ef90e1eb5942cf811b7310191c8a5ea93` |

Non-mutating `git merge-tree` conflict paths (changed in both):

**PR #277**

- `src/lib/content/time-to-first-token-discovery.test.tsx`
- `src/tests/search/orama-index.test.ts`
- `src/tests/search/search-api.test.ts`
- `src/tests/search/search-page-panel.test.tsx`

**PR #279**

- `src/tests/search/search-page-panel.test.tsx`

Both PR branches share the conflicted `search-page-panel.test.tsx` surface.
Main has advanced since the last merge attempts on both heads (behind counts
increased vs the batch 073 handoff snapshot).

## Active generic worktree / refresh ownership

| Worktree | Queue state (session `930b51a6…`) | Owns branch refresh? |
| --- | --- | --- |
| `generic-search-ai-enrichment-plugin` | `idea:to-complete` + `task:failed` on trace `trace-generic-shell-hardening-batch-002` | **Yes** — stamped PR #277 owner worktree |
| `generic-site-config-neutral-surfaces` | `idea:to-complete` + `task:failed` on trace `trace-generic-shell-hardening-batch-002` | **Yes** — stamped PR #279 owner worktree |
| `generic-pr277-pr279-conflict-refresh-handoff` | `idea:complete` TERMINAL on trace `trace-fresh-pr-drain-and-conflict-refresh-batch-073` | No — evidence/handoff only (completed) |
| `dirty-generic-pr277-pr279-conflict-refresh` | `idea:to-complete` / `work-task-114:init` on trace `trace-pr-landing-reconciliation-and-conflict-refresh-batch-074` | **This lane** — may refresh only when story 002 selects `refresh-pr-branch` and ownership is safe |
| `batch-green-pr-drain-and-conflict-triage-batch-066-generic-search-ai-enrichment-pr277-drain` | `idea:init` INITIAL | **Yes** — batch 066 drain owns PR #277 completion |
| `batch-green-pr-drain-and-conflict-triage-batch-066-generic-site-config-pr279-drain` | `idea:init` INITIAL | **Yes** — batch 066 drain owns PR #279 completion |

No third-party generic lane is actively mutating search, sidebar, route, or
site-config surfaces in parallel. Collision risk is the **shared**
`search-page-panel.test.tsx` conflict surface across both PRs plus **batch 066
drain ownership** for completion.

## Story 001 verification

- Evidence gathered with read-only `git fetch`, `gh pr view`, `gh pr checks`,
  `gh api` mergeability, `you work list`, and non-mutating `git merge-tree`.
- **No branch mutation**, queue movement, staging, committing, or conflict
  resolution occurred in this story.
- Local quality gate: `bun run typecheck` passed on this lane worktree
  (2026-07-02T20:15Z UTC).

## Story 002 — Outcome classification per dirty PR

Captured 2026-07-02T21:30Z UTC. Read-only refresh of live PR state, batch 066
drain ownership, batch 073 handoff completion, and non-mutating `git merge-tree`
conflict paths. No branch mutation, queue movement, or target-PR file edits.

### Fresh drift vs `origin/main` (`209d1bd8`)

| Branch | Ahead | Behind | Merge base |
| --- | ---: | ---: | --- |
| `origin/generic-search-ai-enrichment-plugin` | 8 | 95 | `798a0c7bd709d2a38037eecd6a01323507810e1b` |
| `origin/generic-site-config-neutral-surfaces` | 6 | 107 | `9136cb1ef90e1eb5942cf811b7310191c8a5ea93` |

Behind counts increased vs story 001 (95/107 vs prior 95/107 snapshot) as
`origin/main` held at `209d1bd8`. Both PRs remain `mergeable: false` /
`mergeable_state: dirty` with 11/11 required CI checks SUCCESS.

### Conflict paths (`git merge-tree`, changed in both)

**PR #277** — four paths, all within search/test surfaces aligned with the PR
intent (enrichment adapter + search contract tests):

- `src/lib/content/time-to-first-token-discovery.test.tsx`
- `src/tests/search/orama-index.test.ts`
- `src/tests/search/search-api.test.ts`
- `src/tests/search/search-page-panel.test.tsx` (**shared with PR #279**)

**PR #279** — sole conflict path outside core site-config contract files:

- `src/tests/search/search-page-panel.test.tsx` (**shared with PR #277**)

### Batch 066 drain duplication check (re-verified)

| Drain idea | State | Trace |
| --- | --- | --- |
| `generic-search-ai-enrichment-pr277-drain` | `idea:init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` |
| `generic-site-config-pr279-drain` | `idea:init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` |

Both drain ideas remain the established owners for review/consume, branch refresh,
conflict resolution, and merge completion. Batch 073 handoff lane is TERMINAL
complete with prior **handoff-to-batch-066** outcome; no competing in-flight
refresh lane exists, but refreshing from this batch 074 lane would still
duplicate batch 066 drain ownership.

### Latest blocking PR conversation (unresolved unless noted)

| PR | Latest blocking comment | Cleared? |
| --- | --- | --- |
| #277 | **BLOCKING MERGE** (2026-07-02T14:59:47Z): review clear, CI green, local `make test` passed on `6a1530a0`, but `gh pr merge 277 --merge` failed — GitHub cannot create a clean merge commit. | **No** — no later PR conversation comment supersedes the merge blocker. Prior REVIEW CLEAR (14:56:54Z) cleared `make test` blockers only. |
| #279 | **BLOCKING** (2026-07-02T13:12:04Z): local `make test` failed — `search-page-panel.a11y.test.tsx` smoke timed out at 15s on head `e5defbc8`. Live GitHub now also DIRTY/CONFLICTING. | **No** — no later clearing comment. Merge-conflict fix in `e5defbc8` was superseded by this a11y timeout blocker before main advanced again. |

### Selected outcome per PR

| PR | Classification | Rationale |
| --- | --- | --- |
| #277 | **active-review-handoff** | Sole remaining blocker is DIRTY merge drift (95 commits behind `209d1bd8`). Review is clear, CI and prior local `make test` passed on head `6a1530a0`. Conflicts are in-scope search/test files and resolvable within PR intent, but batch 066 `generic-search-ai-enrichment-pr277-drain` already owns refresh/merge completion. Shared `search-page-panel.test.tsx` conflict requires coordinated judgment with PR #279 drain lane. `refresh-pr-branch` is **not** selected: no third party is actively refreshing, but duplicating batch 066 drain work violates ownership rules. `blocked` is **not** selected: drain owner exists and blockers are in-scope merge conflicts, not workflow-repair gaps. |
| #279 | **active-review-handoff** | Two stacked blockers on head `e5defbc8`: unresolved **BLOCKING** local `make test` a11y timeout (no clearing comment) plus DIRTY merge drift (107 commits behind `209d1bd8`). Sole conflict path is shared `search-page-panel.test.tsx`. Batch 066 `generic-site-config-pr279-drain` owns completion. `refresh-pr-branch` is **not** selected for the same ownership and cross-PR coordination reasons as #277. `blocked` is **not** selected: blockers are concrete and actionable by the batch 066 drain owner (a11y timeout stabilization + main merge), not missing metadata or out-of-scope conflicts. |

### Story routing

| PR | Story 002 outcome | Story 003 (refresh) | Story 004 (handoff) | Story 005 (blocked record) |
| --- | --- | --- | --- | --- |
| #277 | active-review-handoff | does not run | **runs** | does not run |
| #279 | active-review-handoff | does not run | **runs** | does not run |

### Cross-PR coordination (for story 004 handoff)

Recommended drain order unchanged from batch 073: refresh PR #277 first (more
conflict paths, search-surface owner), then PR #279 against updated
`origin/main` and the resolved shared test file.

### Story 002 verification

- Classification cites story 001 evidence plus fresh `git fetch`, `gh pr checks`,
  `gh api` mergeability, `you work list`, and non-mutating `git merge-tree`.
- **No branch mutation**, queue movement, staging, committing, or conflict
  resolution on target PR branches.
- Local quality gate: `bun run typecheck` passed on this lane worktree
  (2026-07-02T21:30Z UTC).

## Story 003 — in-lane refresh outcome (N/A)

Captured 2026-07-02T23:20Z UTC. Story 003 runs only when story 002 selects
**refresh-pr-branch** for a target PR. Story 002 classified both PR #277 and PR
#279 as **active-review-handoff**, so no in-lane branch refresh was attempted in
this batch 074 lane.

### Precondition check

| PR | Story 002 classification | Story 003 runs? |
| --- | --- | --- |
| #277 | active-review-handoff | no |
| #279 | active-review-handoff | no |

### Actions not taken (by design)

- No merge or rebase of `origin/main` into
  `generic-search-ai-enrichment-plugin` or `generic-site-config-neutral-surfaces`.
- No conflict resolution in
  `.claude/worktrees/generic-search-ai-enrichment-plugin` or
  `.claude/worktrees/generic-site-config-neutral-surfaces`.
- No push to `origin/generic-search-ai-enrichment-plugin` or
  `origin/generic-site-config-neutral-surfaces`.
- No queue movement or manual drain-lane creation from this batch 074 lane.

### Live PR state at story 003 close (unchanged heads)

Fresh read-only evidence gathered 2026-07-02T23:20Z UTC (`git fetch`,
`gh api` mergeability, `gh pr checks`).

| PR | Head SHA | Mergeable | Merge state | CI | Latest blocking PR conversation |
| --- | --- | --- | --- | --- | --- |
| #277 | `6a1530a0` | CONFLICTING | DIRTY | 11/11 SUCCESS | **BLOCKING MERGE** (2026-07-02T14:59:47Z): review clear, CI green, local `make test` passed on `6a1530a0`, but `gh pr merge 277 --merge` failed — needs main merge/rebase and conflict resolution in the owned drain lane. |
| #279 | `e5defbc8` | CONFLICTING | DIRTY | 11/11 SUCCESS | **BLOCKING** (2026-07-02T13:12:04Z): local `make test` a11y timeout on `search-page-panel.a11y.test.tsx`; no later clearing comment. Also DIRTY/CONFLICTING on live GitHub. |

`origin/main` remains at `209d1bd8ced0cced5fd99992fe50f23296d126e8` (2026-07-02T12:04:51-07:00). Branch drift unchanged: PR #277 95 behind / 8 ahead; PR #279 107 behind / 6 ahead. Non-mutating `git merge-tree` conflict paths unchanged (four on #277, one shared `search-page-panel.test.tsx` on #279).

Batch 066 drain items remain the owners for any future branch refresh:

- `generic-search-ai-enrichment-pr277-drain` → PR #277 (`idea:init` / INITIAL, re-verified)
- `generic-site-config-pr279-drain` → PR #279 (`idea:init` / INITIAL, re-verified)

Story 004 records the exact handoff payload for batch 066 drain lanes.
