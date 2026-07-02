# Newly Merged PR Rows #287/#289/#291 — Evidence Snapshot

Planner-facing evidence for the
`newly-merged-pr-rows-287-289-291-reconciliation` lane. Captured
2026-07-02 UTC. This lane reconciles stale planner snapshot rows for PRs
already merged into current `origin/main` without editing page content or
reverting user/root work.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session omits page lanes)

## `origin/main` identity and root checkout (pre-mutation)

| Field | Value |
| --- | --- |
| `origin/main` SHA | `a502405d49badc50b8b3c0ea49cd8d35a402738e` |
| Commit date | 2026-07-02 13:23:30 -0700 |
| Subject | Merge pull request #298 from portpowered/merged-pr-drain-rows-274-276-278-280-reconciliation |
| Root repo path | `/Users/abdifamily/work/learn-agent-factories` |
| Root branch | `main` |
| Root HEAD | `a502405d49badc50b8b3c0ea49cd8d35a402738e` (matches `origin/main`) |
| Root dirty paths | 0 |

All three target PR merge commits are ancestors of current `origin/main`:

| PR | Merge commit | On `origin/main` |
| --- | --- | --- |
| #287 | `b5716eff4e9ff86631e96db6a6c04d8c8944ead5` | yes |
| #289 | `2d0b21c49ed6148f6dda80578003d12f2887d9b2` | yes |
| #291 | `5cc5f1a4cdceb07bb8df65dd8c983b26ef45e86a` | yes |

## GitHub PR truth (live, 2026-07-02T20:42Z UTC)

| Work item | PR | State | Merged at (UTC) | Merge commit | Head SHA at merge |
| --- | --- | --- | --- | --- | --- |
| `block-sparse-attention-module-page` | [#287](https://github.com/portpowered/ai-model-reference/pull/287) | MERGED | 2026-07-02T18:58:19Z | `b5716eff` | `f6c0946b` |
| `byte-level-tokenization-page` | [#289](https://github.com/portpowered/ai-model-reference/pull/289) | MERGED | 2026-07-02T18:18:04Z | `2d0b21c4` | `f010c064` |
| `pr-surface-module-linked-support-records` | [#291](https://github.com/portpowered/ai-model-reference/pull/291) | MERGED | 2026-07-02T18:02:14Z | `5cc5f1a4` | `aa3d14c6` |

PR conversation comments on all three PRs end with reviewer merge approval; no
unresolved BLOCKING/REJECTED/FAIL conversation comments remain on the merged PRs.

## Factory queue evidence (session `930b51a6-07ce-44e6-a639-7a6217f6e864`)

Command:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 --name <work-item> --json
```

Default-session lookup (`you work list --name <work-item> --json`) returns empty
for all three named rows.

### `block-sparse-attention-module-page` (PR #287)

Primary content trace (`trace-tokenizer-and-attention-refill-batch-064`):

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-tokenizer-and-attention-refill-batch-064-block-sparse-attention-module-page` | idea | `complete` / TERMINAL | `trace-tokenizer-and-attention-refill-batch-064` |
| `work-plan-72` | plan | `complete` / TERMINAL | same |
| `work-review-103` | review | `complete` / TERMINAL | same |
| `work-task-73` | task | `complete` / TERMINAL | same |

Additional stale drain idea (separate trace, not the primary content lane):

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-fresh-pr-drain-and-conflict-refresh-batch-073-block-sparse-attention-pr287-clean-drain` | idea | `init` / INITIAL | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |

Queue completion truth: primary `block-sparse-attention-module-page` trace is
terminal-complete; a separate `block-sparse-attention-pr287-clean-drain` idea
remains at `init` / INITIAL and is not inferred closed from PR #287 merge status
alone.

### `byte-level-tokenization-page` (PR #289)

Primary content trace (`trace-tokenizer-and-attention-refill-batch-064`):

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-tokenizer-and-attention-refill-batch-064-byte-level-tokenization-page` | idea | `complete` / TERMINAL | `trace-tokenizer-and-attention-refill-batch-064` |
| `work-plan-69` | plan | `complete` / TERMINAL | same |
| `work-review-105` | review | `complete` / TERMINAL | same |
| `work-task-70` | task | `complete` / TERMINAL | same |

Conflict-refresh / drain trace (`trace-fresh-pr-drain-and-conflict-refresh-batch-073`):

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-fresh-pr-drain-and-conflict-refresh-batch-073-byte-level-tokenization-pr289-conflict-refresh` | idea | `complete` / TERMINAL | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |
| `work-plan-85` | plan | `complete` / TERMINAL | same |
| `work-review-93` | review | `complete` / TERMINAL | same |
| `work-task-86` | task | `complete` / TERMINAL | same |

Queue completion truth: both the primary content trace and the
`byte-level-tokenization-pr289-conflict-refresh` drain trace are
terminal-complete.

### `pr-surface-module-linked-support-records` (PR #291)

`you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 --name pr-surface-module-linked-support-records --json`
returns **zero results**. Broader substring searches (`pr-surface`,
`module-linked`, `support-records`, `canonical-page-surface-audit`) also return
no queue row whose `name` matches this work item.

Queue completion truth: **no matching queue row** in the target session for this
work item name. PR #291 merge truth is recorded separately; queue closure cannot
be inferred from PR merge status alone.

### This reconciliation lane

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-current-main-and-open-pr-convergence-batch-075-newly-merged-pr-rows-287-289-291-reconciliation` | idea | `to-complete` / PROCESSING | `trace-current-main-and-open-pr-convergence-batch-075` |
| `work-task-126` | task | `init` / PROCESSING | same |
| `work-plan-125` | plan | `complete` / TERMINAL | same |

## Merged PR truth vs queue completion truth

| Work item | PR merged on `origin/main` | Primary queue trace terminal | Notes |
| --- | --- | --- | --- |
| `block-sparse-attention-module-page` | yes | yes (primary trace) | Separate `block-sparse-attention-pr287-clean-drain` idea at `init` / INITIAL |
| `byte-level-tokenization-page` | yes | yes (primary trace) | Conflict-refresh drain trace also terminal-complete |
| `pr-surface-module-linked-support-records` | yes | n/a (no queue row) | PR merged; target session has no row with this work item name |

Do not infer row closure from PR merge status alone when separate non-terminal
queue tokens exist (for example `block-sparse-attention-pr287-clean-drain` at
`init`) or when no queue row exists for the named work item.

## Lane / worktree metadata

| Work item | Metadata file | PR stamp | Linkage | Refreshed (UTC) |
| --- | --- | --- | --- | --- |
| `block-sparse-attention-module-page` | `.claude/worktrees/block-sparse-attention-module-page/.claude/lane-metadata.json` | none | branch `current`, PR `missing` (not refreshed) | 2026-07-02T15:06:04.990Z |
| `byte-level-tokenization-page` | `.claude/worktrees/byte-level-tokenization-page/.claude/lane-metadata.json` | none | branch `current`, PR `missing` (no open PR for merged branch) | 2026-07-02T19:01:27.995Z |
| `pr-surface-module-linked-support-records` | **metadata unavailable** — no worktree directory under `.claude/worktrees/` | n/a | n/a | n/a |

Related subsidiary worktree (conflict-refresh lane for PR #289 context, not the
primary content row):

| Work item | Metadata file | PR stamp | Linkage | Refreshed (UTC) |
| --- | --- | --- | --- | --- |
| `byte-level-tokenization-pr289-conflict-refresh` | `.claude/worktrees/byte-level-tokenization-pr289-conflict-refresh/.claude/lane-metadata.json` | #290 | branch `current`, PR `current` | 2026-07-02T18:01:23.310Z |

Content worktrees for the two page lanes exist under
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/<work-item>`.
No worktree exists for `pr-surface-module-linked-support-records`; remote branch
`origin/pr-surface-module-linked-support-records` is present.

### Branch drift vs `origin/main` (read-only, 2026-07-02T20:42Z UTC)

Counts are `git rev-list --left-right --count origin/main...HEAD` (behind|ahead).

| Work item | Local HEAD | Behind main | Ahead of main | Working tree notes |
| --- | --- | --- | --- | --- |
| `block-sparse-attention-module-page` | `f6c0946b` | 86 | 8 | untracked `progress.txt` |
| `byte-level-tokenization-page` | `f010c064` | 90 | 0 | untracked `progress.txt` |
| `pr-surface-module-linked-support-records` | n/a (no worktree) | n/a | n/a | n/a |

Content worktrees retain post-merge branch heads behind current `origin/main`;
this is expected stale worktree evidence and was not modified during evidence
gathering.

## Quality gate (story 001)

Handoff-only evidence capture; no page content, registry content, root work,
worktree files, queue rows, staging area, or branch history were changed.

```bash
bun run typecheck
```

Result: PASS (2026-07-02T20:42Z UTC).

## Story 002 — per-row outcome classification

Captured 2026-07-02T20:46Z UTC. Classifications use evidence from story 001 plus
fresh read-only queue lookups for subsidiary drain tokens; no queue rows, page
content, registry content, root work, or worktree files were mutated during
classification.

### Classification rules applied

| Outcome | When selected |
| --- | --- |
| **consume** | PR merged on current `origin/main`; row is a stale drain/handoff idea whose purpose is fulfilled; primary implementation and review are already terminal-complete; no active implementation or review would be skipped. |
| **complete** | Row is finished but requires an explicit terminal completion transition (`idea:to-complete` + `task:to-complete` pairing or equivalent valid move). |
| **no-op** | Primary content trace already terminal; unfinished implementation or review; row/PR mismatch; missing queue row; missing evidence; or unsafe root/worktree state. |

### Selected outcome per named row

| Work item | PR | Observed queue state | Observed PR state | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| `block-sparse-attention-module-page` | #287 | Primary trace `trace-tokenizer-and-attention-refill-batch-064`: idea/plan/review/task all `complete` / TERMINAL; separate `block-sparse-attention-pr287-clean-drain` idea at `init` / INITIAL on trace `trace-fresh-pr-drain-and-conflict-refresh-batch-073` (see subsidiary table) | MERGED (`b5716eff` on `origin/main`) | **no-op** (primary lane) | Primary content lane already terminal-complete with merged PR truth; stale drain idea on a separate trace is classified below and is not inferred closed from PR merge alone. |
| `byte-level-tokenization-page` | #289 | Primary trace `trace-tokenizer-and-attention-refill-batch-064`: all tokens `complete` / TERMINAL; conflict-refresh drain trace `trace-fresh-pr-drain-and-conflict-refresh-batch-073` also terminal-complete | MERGED (`2d0b21c4` on `origin/main`) | **no-op** | Primary content lane and `byte-level-tokenization-pr289-conflict-refresh` drain trace are both terminal-complete; PR merge agrees with queue; no separate stale drain ideas remain at `init` / INITIAL. |
| `pr-surface-module-linked-support-records` | #291 | Zero queue rows in session `930b51a6-07ce-44e6-a639-7a6217f6e864` for this work item name; no worktree under `.claude/worktrees/` | MERGED (`5cc5f1a4` on `origin/main`) | **no-op** | **missing-queue-row**: throughput/factory PR merged without a content-lane queue token; queue closure cannot be inferred from PR merge status alone and no consume/complete transition applies to a non-existent row. |

No row received a **complete** classification: none of the three named work items
sit in a non-terminal `to-complete` / PROCESSING pairing that still requires a
valid terminal completion transition.

### `block-sparse-attention-module-page` subsidiary stale token (explicit)

Story 001 required explicit classification of the separate `init` / INITIAL drain
idea returned by `you work list --name block-sparse-attention-pr287-clean-drain`.
This is not the primary content lane but is a stale drain row tied to PR #287.

| Work id | Trace | Observed state | Outcome | Evidence |
| --- | --- | --- | --- | --- |
| `batch-fresh-pr-drain-and-conflict-refresh-batch-073-block-sparse-attention-pr287-clean-drain` | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` | `init` / INITIAL | **consume** | PR #287 merged on `origin/main`; primary `block-sparse-attention-module-page` implementation and review are terminal-complete; drain idea scoped to green-PR merge/consume handoff is fulfilled and safe to consume without skipping unfinished work. |

### Classification summary

| Outcome | Count | Targets |
| --- | --- | --- |
| **no-op** (primary lanes) | 3 | All three named work items — primary traces already terminal or no queue row |
| **consume** | 1 | `block-sparse-attention-pr287-clean-drain` subsidiary stale drain idea |
| **complete** | 0 | — |

Stories 003–005 execute handoffs for the consume, complete, and no-op targets
respectively. This lane (`newly-merged-pr-rows-287-289-291-reconciliation`)
remains in `to-complete` / PROCESSING until those handoffs finish.

## Quality gate (story 002)

Handoff-only classification; no page content, registry content, root work,
worktree files, queue rows, staging area, or branch history were changed.

```bash
bun run typecheck
```

Result: PASS (2026-07-02T20:46Z UTC).
