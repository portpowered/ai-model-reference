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
