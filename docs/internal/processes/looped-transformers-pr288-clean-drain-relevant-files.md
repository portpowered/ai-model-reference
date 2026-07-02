# Looped Transformers PR #288 Clean Drain — Evidence Snapshot

Planner-facing evidence for the `looped-transformers-pr288-clean-drain` lane.
Captured 2026-07-02 UTC. This lane decides whether PR #288 should be merged and
consumed, left for active review to finish, or blocked — without broadening into
adjacent model pages or shared runtime surfaces.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session omits page lanes)

## PR #288 state (live GitHub, 2026-07-02T17:23Z UTC)

| Field | Value |
| --- | --- |
| Number | 288 |
| Title | `looped-transformers` |
| URL | https://github.com/portpowered/ai-model-reference/pull/288 |
| State | OPEN |
| Mergeability | MERGEABLE |
| Merge state status | CLEAN |
| Head branch | `looped-transformers` |
| Base branch | `main` |
| Head SHA | `fc575f9e5a6dd8ad4c8fd3478ef5000e320b8b78` |
| Base SHA (GitHub) | `3469da8362a9ce6eeb9c8b3b4a1eaabfb2fcf95a` |
| Updated at | 2026-07-02T17:10:16Z |
| Associated work item | `looped-transformers` |
| Formal GitHub review decision | empty (no APPROVED/CHANGES_REQUESTED rollup) |

All required CI checks on PR #288 report SUCCESS (lint, typecheck, test,
test-verify-contract, coverage, test-build-contract, build-export,
test-integration, validate-data, linkcheck, ci).

PR conversation comments (authoritative review channel):

1. **BLOCKING / REJECTED** review for `work-task-64` by `AndreasAbdi`
   (2026-07-02T17:10:15Z). CI is green and the page renders, but the branch
   fails `bun run audit:canonical-page-surface` (`over-budget` /
   `redirect-to-throughput-prd`) and adds page-specific meta/marker tests in
   shared verification paths. Required fix: keep the PR page-local or move
   shared-helper/test/runtime work to the throughput lane; remove or replace
   meta tests with behavioral coverage.

Planner snapshot at PRD creation (2026-07-02T10:01:49-0700) reported
`task:in-review` and `review:init`. Live queue inspection no longer shows a
review work token; the BLOCKING PR conversation comment is the active review
signal.

## Factory queue evidence

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-request-9ed3acd68ca337334c41f16e188a7ad7-looped-transformers` | idea | `to-complete` / PROCESSING | `trace-9cdd2042478eb49698d0d9b5491db0fe` |
| `work-task-64` | task | `init` / PROCESSING | `trace-9cdd2042478eb49698d0d9b5491db0fe` |
| `work-plan-63` | plan | `complete` / TERMINAL | `trace-9cdd2042478eb49698d0d9b5491db0fe` |
| `batch-fresh-pr-drain-and-conflict-refresh-batch-073-looped-transformers-pr288-clean-drain` | idea | `to-complete` / PROCESSING | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |
| `work-task-88` | task | `init` / PROCESSING | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |
| `work-plan-87` | plan | `complete` / TERMINAL | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |

No `review` work token is present for `looped-transformers` on the live queue.
The content task is `init`, not `in-review` or `failed`.

Command used:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name looped-transformers --json
```

Default-session lookup (`you work list --name looped-transformers --json`)
returns empty. Documented session `0fdc5077-95ed-4396-a183-06e5b16555ca` returns
404 (`factory session not found`).

## Target lane metadata and branch drift

Content worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/looped-transformers`

| Field | Value |
| --- | --- |
| Lane metadata file | present |
| Work item name | `looped-transformers` |
| Branch | `looped-transformers` |
| Stamped PR | #288 (`linkage.pullRequest.status=current`) |
| Stamped branch linkage | `current` |
| Metadata session id | null |
| Metadata refreshed at | 2026-07-02T17:01:23.169Z |
| Remote branch HEAD | `fc575f9e5a6dd8ad4c8fd3478ef5000e320b8b78` (PR head) |
| Local worktree HEAD | `440f077ffc962887af596a5cb25303776b49b26a` (dirty WIP) |
| Git drift vs `origin/main` | diverged (ahead=5, behind=31) after `git fetch origin main` |
| Merge base with `origin/main` | `c59b4c31cd8be7dce8307cb1b038b42d71fa4eb2` |

Lane metadata file:
`.claude/worktrees/looped-transformers/.claude/lane-metadata.json`

Drain worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/looped-transformers-pr288-clean-drain`

| Field | Value |
| --- | --- |
| Branch | `looped-transformers-pr288-clean-drain` |
| HEAD | `d9ef966b7ecaa46cc19699033ec7d8bfdca16e24` (matches `origin/main`) |
| Stamped PR | null (`linkage.pullRequest.status=missing`) |
| Working tree | clean |

The content worktree has uncommitted local edits that begin addressing the
BLOCKING review (deleting page-specific meta tests/helpers and touching
`canonical-page-surface-audit` surfaces). Those edits are not on PR #288 head
`fc575f9e` yet.

## `origin/main` identity

| Field | Value |
| --- | --- |
| SHA | `d9ef966b7ecaa46cc19699033ec7d8bfdca16e24` |
| Commit date | 2026-07-02 10:15:15 -0700 |
| Subject | Merge pull request #281 from portpowered/ltx-23 |

`origin/main` does not yet ship the looped-transformers module page. PR #288 is
the only open lane carrying that page bundle.

PR-only diff vs `origin/main` (focused surfaces):

```txt
src/content/docs/modules/looped-transformers/assets.json
src/content/docs/modules/looped-transformers/messages/en.json
src/content/docs/modules/looped-transformers/page.mdx
src/content/registry/citations/looped-transformers-iclr-2024.json
src/content/registry/graphs/looped-transformers-compute-flow.json
src/content/registry/modules/looped-transformers.json
src/content/registry/papers/looped-transformers-learning-learning-algorithms.json
src/content/registry/tables/looped-transformers-comparison.json
src/lib/content/generated/table-registry.generated.ts
src/lib/content/looped-transformers-discovery.test.tsx
src/lib/content/looped-transformers-module-page.test.ts
src/lib/content/looped-transformers-page-contract.test.ts
src/lib/content/page-template-conformance.ts
src/lib/verify/looped-transformers-module-convergence.test.ts
src/lib/verify/looped-transformers-module-convergence.ts
src/lib/verify/looped-transformers-module-graph-viewport-http.test.ts
src/lib/verify/looped-transformers-module-graph-viewport-http.ts
```

## Active PR mergeability watchdog output

Fixture command (read-only; uses live worktree and GitHub PR lookup):

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name looped-transformers --json \
  > /tmp/lt-drain-fixture/work-list.json

bun ./scripts/active-pr-mergeability-watchdog.ts \
  --work-list-json /tmp/lt-drain-fixture/work-list.json \
  --worktrees-dir /Users/abdifamily/work/learn-agent-factories/.claude/worktrees
```

Observed output (2026-07-02T17:23Z UTC):

```txt
Active PR Mergeability Watchdog
lanes=0 pr-backed=0 actionable-gaps=0 queue-only-noise=0

No active or failed queue lanes were discovered.
```

The watchdog only classifies queue lanes in `active` or `failed` states. The live
`work-task-64` token is `init`, so the lane does not appear in watchdog output
even though PR #288 is open and mergeable on GitHub.

## Stale planner snapshot delta

| Signal | PRD snapshot (2026-07-02T10:01:49-0700) | Live evidence (2026-07-02T17:23Z UTC) |
| --- | --- | --- |
| Task lane | `task:in-review` | `work-task-64` at `init` |
| Review lane | `review:init` | no review work token |
| GitHub merge state | CLEAN | still CLEAN |
| GitHub checks | passing | still 11/11 SUCCESS |
| Branch drift | present despite CLEAN | diverged (ahead=5, behind=31) |
| Review outcome | not recorded | BLOCKING PR conversation comment |

## Quality gate (story 001)

Handoff-only evidence capture; no content or branch mutation.

```bash
bun run typecheck
```

Result: PASS (2026-07-02T17:23Z UTC).
