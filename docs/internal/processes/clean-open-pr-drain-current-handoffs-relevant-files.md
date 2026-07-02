# Clean Open PR Drain — Current Handoffs — Evidence Snapshot

Planner-facing evidence for the `clean-open-pr-drain-current-handoffs` lane.
Captured 2026-07-02T20:47Z UTC. This lane drains or hands off currently clean
open PRs (#290, #273, #271, #268, #251) and records already-consumed PR #294
without duplicating content generation or broad repair work.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session `0c392c83-a136-48be-a2ad-efa42151f448` omits page lanes;
documented session `0fdc5077-95ed-4396-a183-06e5b16555ca` returns 404 in this
environment)

## `origin/main` identity (pre-mutation)

| Field | Value |
| --- | --- |
| `origin/main` SHA | `a502405d49badc50b8b3c0ea49cd8d35a402738e` |
| Commit date | 2026-07-02 13:23:30 -0700 |
| Subject | Merge pull request #298 from portpowered/merged-pr-drain-rows-274-276-278-280-reconciliation |
| Root repo path | `/Users/abdifamily/work/learn-agent-factories` |
| Root branch | `main` |
| Root HEAD | `a502405d49badc50b8b3c0ea49cd8d35a402738e` (matches `origin/main`) |
| Root dirty paths | 0 |

PR #294 merge commit `209d1bd8ced0cced5fd99992fe50f23296d126e8` is an ancestor of
current `origin/main`.

## This lane queue row (active)

Command:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name clean-open-pr-drain-current-handoffs --json
```

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-current-main-and-open-pr-convergence-batch-075-clean-open-pr-drain-current-handoffs` | idea | `to-complete` / PROCESSING | `trace-current-main-and-open-pr-convergence-batch-075` |
| `work-plan-128` | plan | `complete` / TERMINAL | same |
| `work-task-129` | task | `init` / PROCESSING | same |

## GitHub PR truth (live, 2026-07-02T20:47Z UTC)

| Work item | PR | State | Head branch | Base | Mergeable | Merge state | Head SHA | Updated (UTC) | URL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `generic-pr277-pr279-conflict-refresh-handoff` | [#294](https://github.com/portpowered/ai-model-reference/pull/294) | **MERGED** | `generic-pr277-pr279-conflict-refresh-handoff` | `main` | UNKNOWN | UNKNOWN | `124808d8` | 2026-07-02T19:04:52Z | merged at `209d1bd8` |
| `byte-level-tokenization-pr289-conflict-refresh` | [#290](https://github.com/portpowered/ai-model-reference/pull/290) | OPEN | `byte-level-tokenization-pr289-conflict-refresh` | `main` | CONFLICTING | DIRTY | `344126c2` | 2026-07-02T17:43:14Z | handoff lane PR |
| `tokens-per-second-pr251-merge-handoff` | [#273](https://github.com/portpowered/ai-model-reference/pull/273) | OPEN | `tokens-per-second-pr251-merge-handoff` | `main` | CONFLICTING | DIRTY | `9a2bf86e` | 2026-07-02T05:42:29Z | merge/queue recovery lane |
| `relative-position-bias-concept-page` | [#271](https://github.com/portpowered/ai-model-reference/pull/271) | OPEN | `relative-position-bias-concept-page` | `main` | MERGEABLE | CLEAN | `956bacb2` | 2026-07-02T05:18:49Z | content concept page |
| `terminal-audit-root-staged-deletion-handoff` | [#268](https://github.com/portpowered/ai-model-reference/pull/268) | OPEN | `terminal-audit-root-staged-deletion-handoff` | `main` | MERGEABLE | CLEAN | `d6afe796` | 2026-07-02T05:30:14Z | root-drift handoff lane |
| `tokens-per-second-serving-metric-page` | [#251](https://github.com/portpowered/ai-model-reference/pull/251) | OPEN | `tokens-per-second-serving-metric-page` | `main` | MERGEABLE | CLEAN | `381abe9a` | 2026-07-02T03:31:22Z | content glossary page |

### Required CI checks (all open PRs)

All six target PRs report SUCCESS on required CI jobs when checks are available
(lint, typecheck, test, test-verify-contract, coverage, test-build-contract,
build-export, test-integration, validate-data, linkcheck, ci). PRs #290 and #273
are CONFLICTING with `main` despite passing CI on their current heads.

Commands:

```bash
for pr in 294 290 273 271 268 251; do
  gh pr view $pr --json number,state,headRefName,baseRefName,mergeable,mergeStateStatus,headRefOid,updatedAt,url,mergedAt
  gh pr checks $pr
done
```

## PR → queue row mapping

### PR #294 — `generic-pr277-pr279-conflict-refresh-handoff` (already merged)

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-fresh-pr-drain-and-conflict-refresh-batch-073-generic-pr277-pr279-conflict-refresh-handoff` | idea | `complete` / TERMINAL | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |
| `work-plan-90` | plan | `complete` / TERMINAL | same |
| `work-review-104` | review | `complete` / TERMINAL | same |
| `work-task-91` | task | `complete` / TERMINAL | same |

**Row status:** completed / consumed — PR merged 2026-07-02T19:04:52Z. Do not
reopen or duplicate the generic PR #277/#279 conflict-refresh handoff; batch 066
drain ideas (`generic-search-ai-enrichment-pr277-drain`,
`generic-site-config-pr279-drain`) retain ownership for the underlying generic
shell PRs.

Lane metadata (worktree
`.claude/worktrees/generic-pr277-pr279-conflict-refresh-handoff/.claude/lane-metadata.json`):
stamped PR #294, linkage `current`.

### PR #290 — `byte-level-tokenization-pr289-conflict-refresh`

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-fresh-pr-drain-and-conflict-refresh-batch-073-byte-level-tokenization-pr289-conflict-refresh` | idea | `complete` / TERMINAL | `trace-fresh-pr-drain-and-conflict-refresh-batch-073` |
| `work-plan-85` | plan | `complete` / TERMINAL | same |
| `work-review-93` | review | `complete` / TERMINAL | same |
| `work-task-86` | task | `complete` / TERMINAL | same |

**Related content lane** (`byte-level-tokenization-page`, PR #289):

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-tokenizer-and-attention-refill-batch-064-byte-level-tokenization-page` | idea | `complete` / TERMINAL | `trace-tokenizer-and-attention-refill-batch-064` |
| `work-plan-69` | plan | `complete` / TERMINAL | same |
| `work-review-105` | review | `complete` / TERMINAL | same |
| `work-task-70` | task | `complete` / TERMINAL | same |

PR #289 (`byte-level-tokenization-page`) **merged** 2026-07-02T18:18:04Z. PR #290
remains open on the handoff branch with merge conflicts vs current `main`
(`baseRefOid=d22d1e0d`, behind current `origin/main` at `a502405d`).

**Row status:** handoff lane queue TERMINAL-complete; open PR #290 is **stale
conflict-drift** relative to post-#289/post-#298 `main`. Content ownership sits
with merged PR #289 — do not regenerate byte-level tokenization page content.

Lane metadata: PR #290 stamped `current` on handoff worktree
`byte-level-tokenization-pr289-conflict-refresh`.

### PR #273 — `tokens-per-second-pr251-merge-handoff`

**Factory queue row:** none in sessions `930b51a6-07ce-44e6-a639-7a6217f6e864` or
`0c392c83-a136-48be-a2ad-efa42151f448` (`you work list --name
tokens-per-second-pr251-merge-handoff --json` returns empty).

Handoff worktree PRD (`tokens-per-second-pr251-merge-handoff/prd.json`): all
stories `passes: true`. Lane metadata PR linkage `missing` (not refreshed).

**Row status:** queue-absent / worktree-complete — open PR #273 is
CONFLICTING/DIRTY vs `main` (`baseRefOid=05852b8d`, stale base). Recovery target
is PR #251 content branch per handoff lane story 002; not a new tokens-per-second
content implementation lane.

Evidence artifact:
`docs/internal/processes/tokens-per-second-pr251-merge-handoff-relevant-files.md`
(sibling worktree).

### PR #271 — `relative-position-bias-concept-page`

**Factory queue row:** none in either live session (`you work list --name
relative-position-bias-concept-page --json` returns empty).

Content worktree PRD: all four page stories `passes: true`. Lane metadata PR
linkage `missing` (GitHub resolves branch → PR #271).

**Row status:** queue-absent / worktree-complete — open PR #271 is MERGEABLE/CLEAN
with all CI checks SUCCESS. Head `956bacb2`; drift vs `origin/main` is
behind=184/ahead=5 (content branch needs rebase or operator merge timing).

PR conversation: mergeability follow-up posted 2026-07-02T06:30Z UTC; no
BLOCKING/REJECTED/FAIL markers on latest comments.

### PR #268 — `terminal-audit-root-staged-deletion-handoff`

**Factory queue row:** none in either live session.

Handoff worktree PRD: all stories `passes: true`. Lane metadata: PR #268 stamped
`current`.

**Row status:** queue-absent / worktree-complete — open PR #268 is MERGEABLE/CLEAN
with all CI checks SUCCESS. Prior BLOCKING review (package.json in diff, dirty-root
allowlist) addressed in PR conversation 2026-07-02 UTC with scope-guard fixes.

Evidence artifact:
`docs/internal/processes/terminal-audit-root-staged-deletion-handoff-evidence.md`
(sibling worktree). Root dirty-path ownership boundaries remain outside this drain
lane.

### PR #251 — `tokens-per-second-serving-metric-page`

**Factory queue row (documented, session unavailable):**

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-serving-metric-tokens-per-second-batch-039-tokens-per-second-serving-metric-page` | idea | `to-complete` / PROCESSING | `trace-serving-metric-tokens-per-second-batch-039` |
| `work-task-155` | task | `failed` / FAILED | same |
| `work-plan-154` | plan | `complete` / TERMINAL | same |

Session `0fdc5077-95ed-4396-a183-06e5b16555ca` returns 404 (`factory session not
found`). Prior capture in
[tokens-per-second-stale-pr-follow-up-relevant-files](./tokens-per-second-stale-pr-follow-up-relevant-files.md).

Content worktree lane metadata: PR #251 stamped `current`. Drift vs `origin/main`:
behind=303/ahead=10.

**Row status:** queue-stale vs clean PR — PR #251 is MERGEABLE/CLEAN with passing
CI, but documented queue carries `idea:to-complete` + `task:failed`. PR
conversation still has unresolved **BLOCKING** review feedback (canonical-page-surface
over-budget on `prose-auto-link-runtime.ts`; incomplete browser QA). Do not merge
or regenerate tokens-per-second content from this drain lane.

Related recovery lane: `tokens-per-second-pr251-merge-handoff` (PR #273).

## Row disposition summary (story 001)

| PR | Work item | Queue row | Row disposition | PR disposition |
| --- | --- | --- | --- | --- |
| #294 | `generic-pr277-pr279-conflict-refresh-handoff` | batch-073 TERMINAL | **completed** | **merged** — already consumed |
| #290 | `byte-level-tokenization-pr289-conflict-refresh` | batch-073 TERMINAL | **completed** (handoff lane) | open **conflict-drift** after #289 merge |
| #273 | `tokens-per-second-pr251-merge-handoff` | queue-absent | worktree-complete | open **conflict-drift** |
| #271 | `relative-position-bias-concept-page` | queue-absent | worktree-complete | open **merge-ready** (rebase timing) |
| #268 | `terminal-audit-root-staged-deletion-handoff` | queue-absent | worktree-complete | open **merge-ready** (review addressed) |
| #251 | `tokens-per-second-serving-metric-page` | batch-039 stale (session 404) | **queue-stale** vs green PR | open **review-blocked** |

## PR conversation feedback (blocking scan)

| PR | Latest blocking signal | Status for drain lane |
| --- | --- | --- |
| #294 | none (merged; review approved) | N/A — consumed |
| #290 | none | no BLOCKING comments |
| #273 | none | no BLOCKING comments |
| #271 | none | no BLOCKING comments |
| #268 | prior BLOCKING addressed in conversation | addressed on PR #268 head |
| #251 | BLOCKING: surface budget + browser QA | **unresolved** on PR #251 |

Command:

```bash
gh pr view <number> --comments
```

## Scope boundary (unchanged)

This drain lane must not:

- create duplicate byte-level tokenization, relative position bias, or
  tokens-per-second content pages while PRs #289/#271/#251 remain owners,
- reopen or duplicate the merged generic PR #277/#279 conflict-refresh handoff,
- clean, revert, stage, or mutate unrelated root dirty paths for terminal-audit
  ownership,
- perform broad planner, factory, route, search, registry, or root-cleanup refactors.

Evidence capture for story 001 was read-only: no branch mutation, queue movement,
staging, committing content edits, or destructive git operations occurred while
gathering this snapshot.

## Quality gate (story 001)

```bash
bun run typecheck
```

Result: PASS (2026-07-02T20:47Z UTC).

## Story 002 — per-PR convergence classification

Captured 2026-07-02T21:00Z UTC. Classifications use story 001 evidence only; no
queue rows, page content, registry content, root work, worktree files, or branch
history were mutated during classification.

### Classification rules applied

| Outcome | When selected |
| --- | --- |
| **already-consumed** | GitHub or `origin/main` ancestry proves the PR is merged or the change is already represented on current main; queue handoff purpose is fulfilled. |
| **merge-ready-handoff** | PR is open, non-draft, checks are terminal SUCCESS (or explicitly pending final operator confirmation), GitHub reports MERGEABLE/CLEAN, no duplicate active lane owns different content for the same surface, and no unresolved BLOCKING conversation feedback remains on the PR head. |
| **review-consume-handoff** | PR is clean enough for maintainer review and queue consumption, but operator merge or final review is outside this drain lane's authority and merge-ready criteria are not fully met (for example behind-main drift without operator rebase timing). |
| **blocked-owner-handoff** | Merge or consume is not currently safe; names the exact blocker, owning row or worktree, and next operator action. |
| **duplicate-or-stale** | A newer merged PR, remote-main representation, or terminal-complete handoff lane supersedes the open PR; cites exact evidence rather than queue drift alone. |

### Selected outcome per target PR

| PR | Work item | Observed PR state | Observed queue / row state | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| [#294](https://github.com/portpowered/ai-model-reference/pull/294) | `generic-pr277-pr279-conflict-refresh-handoff` | **MERGED** (`209d1bd8` on `origin/main`) | batch-073 idea/plan/review/task all `complete` / TERMINAL | **already-consumed** | Merge commit is an ancestor of current `origin/main` (`a502405d`); lane metadata stamps PR #294 `current`; batch 066 drain ideas retain ownership for underlying PR #277/#279 shells — do not reopen this handoff. |
| [#290](https://github.com/portpowered/ai-model-reference/pull/290) | `byte-level-tokenization-pr289-conflict-refresh` | OPEN **CONFLICTING** / DIRTY; CI SUCCESS on head `344126c2` | batch-073 handoff lane TERMINAL-complete | **duplicate-or-stale** | Content owner PR [#289](https://github.com/portpowered/ai-model-reference/pull/289) **merged** 2026-07-02T18:18:04Z; byte-level tokenization page is on `main` via #289; open #290 is post-#289/post-#298 conflict drift on a fulfilled handoff branch — close or operator-refresh only; do not regenerate page content. |
| [#273](https://github.com/portpowered/ai-model-reference/pull/273) | `tokens-per-second-pr251-merge-handoff` | OPEN **CONFLICTING** / DIRTY; CI SUCCESS on head `9a2bf86e` | queue-absent; handoff worktree PRD all `passes: true` | **blocked-owner-handoff** | **Blocker:** stale base (`baseRefOid=05852b8d`) vs current `origin/main` (`a502405d`); GitHub merge state DIRTY. **Owner:** `tokens-per-second-pr251-merge-handoff` worktree (lane metadata PR linkage `missing`). **Next action:** conflict refresh on the existing handoff branch to recover PR #251 merge path — not a new tokens-per-second content lane. |
| [#271](https://github.com/portpowered/ai-model-reference/pull/271) | `relative-position-bias-concept-page` | OPEN **MERGEABLE** / CLEAN; all 11 CI checks SUCCESS on head `956bacb2` | queue-absent; content worktree PRD all stories `passes: true` | **merge-ready-handoff** | No duplicate active lane owns relative-position-bias content; declared canonical-page-surface exception documented in PR conversation 2026-07-02T06:15Z UTC; mergeability follow-up merged `origin/main` 2026-07-02T06:30Z UTC with no later BLOCKING comments. **Operator action:** maintainer review and merge (or timed rebase if behind-main drift grows). |
| [#268](https://github.com/portpowered/ai-model-reference/pull/268) | `terminal-audit-root-staged-deletion-handoff` | OPEN **MERGEABLE** / CLEAN; all 11 CI checks SUCCESS on head `d6afe796` | queue-absent; handoff worktree PRD all `passes: true` | **merge-ready-handoff** | Prior BLOCKING review (package.json in diff, dirty-root allowlist) addressed in PR conversation with mapped fixes and `bun test` validation; no newer BLOCKING conversation comments. **Operator action:** maintainer review and merge; root dirty-path ownership stays outside this drain lane. |
| [#251](https://github.com/portpowered/ai-model-reference/pull/251) | `tokens-per-second-serving-metric-page` | OPEN **MERGEABLE** / CLEAN; all 11 CI checks SUCCESS on head `381abe9a` | batch-039 `idea:to-complete` + `task:failed` (session 404); lane metadata PR #251 `current` | **blocked-owner-handoff** | **Blocker:** unresolved **BLOCKING** PR conversation review — shared `prose-auto-link-runtime.ts` edit breaks page-local surface budget (`audit:canonical-page-surface` over-budget) and browser QA incomplete. **Owner:** `tokens-per-second-serving-metric-page` content lane / `work-task-155`. **Next action:** keep slice page-local or move shared auto-link work to throughput/conflict-reduction lane; rerun audit and browser QA; related recovery lane PR #273. Do not merge or regenerate content from this drain lane. |

No target PR received **review-consume-handoff** in this classification pass:
#271 and #268 meet merge-ready criteria (MERGEABLE/CLEAN, terminal green CI, no
unresolved BLOCKING feedback). #290 and #273 are not review-clean; #294 is
consumed; #251 remains review-blocked.

### Classification summary

| Outcome | Count | Targets |
| --- | ---: | --- |
| **already-consumed** | 1 | PR #294 |
| **merge-ready-handoff** | 2 | PR #271, PR #268 |
| **review-consume-handoff** | 0 | — |
| **blocked-owner-handoff** | 2 | PR #273, PR #251 |
| **duplicate-or-stale** | 1 | PR #290 |

Stories 003–005 execute handoffs for merge-ready, blocked, and duplicate/stale
targets respectively. This lane (`clean-open-pr-drain-current-handoffs`) remains
in `to-complete` / PROCESSING until those handoffs finish.

### Duplicate-content guard (classification boundary)

| Surface | Owning PR / lane | Drain-lane action |
| --- | --- | --- |
| Byte-level tokenization page | PR #289 merged | Do not regenerate; #290 is stale handoff only |
| Relative position bias concept | PR #271 open | Hand off for merge; no new concept lane |
| Tokens per second glossary | PR #251 open (blocked) | No new content lane; recovery via #273 handoff |
| Generic PR #277/#279 conflict refresh | PR #294 merged | Already consumed; batch 066 retains shell ownership |
| Terminal-audit root staged deletion | PR #268 open | Hand off for merge; no root cleanup from drain lane |

## Quality gate (story 002)

Handoff-only classification; no page content, registry content, root work,
worktree files, queue rows, staging area, or branch history were changed.

```bash
bun run typecheck
```

Result: PASS (2026-07-02T21:05Z UTC).
