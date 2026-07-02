# Tokens Per Second Stale PR Follow-Up — Evidence Snapshot

Planner-facing repair evidence for the `tokens-per-second-serving-metric-page`
lane. Captured 2026-07-02 UTC. This lane reconciles contradictory PR and factory
queue signals without touching the tokens-per-second page payload.

Session: `0fdc5077-95ed-4396-a183-06e5b16555ca`

## PR #251 state

| Field | Value |
| --- | --- |
| Number | 251 |
| Title | `tokens-per-second-serving-metric-page` |
| URL | https://github.com/portpowered/ai-model-reference/pull/251 |
| State | OPEN |
| Mergeability | MERGEABLE |
| Merge state status | CLEAN |
| Head branch | `tokens-per-second-serving-metric-page` |
| Base branch | `main` |
| Head SHA (worktree) | `381abe9aeee5695620218eafd5635e5f85d5df01` |
| Updated at | 2026-07-02T03:31:22Z |
| Associated work item | `tokens-per-second-serving-metric-page` |

All required CI checks on PR #251 report SUCCESS (lint, typecheck, test,
test-verify-contract, coverage, test-build-contract, build-export,
test-integration, validate-data, linkcheck, ci).

## Conflicting factory queue evidence

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-serving-metric-tokens-per-second-batch-039-tokens-per-second-serving-metric-page` | idea | `to-complete` / PROCESSING | `trace-serving-metric-tokens-per-second-batch-039` |
| `work-task-155` | task | `failed` / FAILED | `trace-serving-metric-tokens-per-second-batch-039` |
| `work-plan-154` | plan | `complete` / TERMINAL | `trace-serving-metric-tokens-per-second-batch-039` |

The mismatch: PR #251 is open, clean, and passing, while the factory still
carries `idea:to-complete` and `task:failed` tokens for the same work item name.

Command used:

```bash
you work list --session 0fdc5077-95ed-4396-a183-06e5b16555ca \
  --name tokens-per-second-serving-metric-page --json
```

## Branch and worktree metadata

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/tokens-per-second-serving-metric-page`

| Field | Value |
| --- | --- |
| Branch | `tokens-per-second-serving-metric-page` |
| Git drift vs main | diverged (ahead=10, behind=102) |
| Lane metadata | present |
| Stamped PR | #251 (linkage `current`, refreshed 2026-07-02T03:47:28.972Z) |
| Stamped branch linkage | `current` |
| Metadata session id | null |

Lane metadata file:
`.claude/worktrees/tokens-per-second-serving-metric-page/.claude/lane-metadata.json`

## Active PR mergeability watchdog output

Fixture command (read-only; uses live worktree and GitHub PR lookup):

```bash
bun ./scripts/active-pr-mergeability-watchdog.ts \
  --work-list-json /tmp/tps-stale-fixture/work-list.json \
  --worktrees-dir /Users/abdifamily/work/learn-agent-factories/.claude/worktrees
```

Fixture work list (failed task token only):

```json
{
  "results": [
    {
      "name": "tokens-per-second-serving-metric-page",
      "workId": "work-task-155",
      "workTypeName": "task",
      "state": { "name": "failed", "type": "FAILED" },
      "sessionId": "0fdc5077-95ed-4396-a183-06e5b16555ca"
    }
  ]
}
```

Observed watchdog lane row (2026-07-02 UTC):

```txt
- status=pr-backed queue=failed work-item=tokens-per-second-serving-metric-page \
  work-item-source=metadata branch=tokens-per-second-serving-metric-page \
  branch-source=metadata metadata=present \
  worktree=/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/tokens-per-second-serving-metric-page \
  pr=#251 pr-status=resolved drift=diverged(ahead=10,behind=102) \
  session=0fdc5077-95ed-4396-a183-06e5b16555ca session-source=queue \
  mergeability=mergeable checks=passing risk=queue-stale \
  next-action=open-follow-up-throughput-prd
```

Action queue entry:

```txt
1. action=open-follow-up work-item=tokens-per-second-serving-metric-page \
   pr=#251 branch=tokens-per-second-serving-metric-page
```

Classification: `stale-clean-pr-mismatch` / `merge-ready-queue-stale` — a
passing, mergeable PR with a failed queue token, not active page implementation.

## Lane decision (story 002)

**Single next action: refresh PR #251**

The `tokens-per-second-serving-metric-page` lane should return to the content
branch and address the outstanding BLOCKING review on PR #251 before any merge
or queue-success transition. Do not merge PR #251 from this follow-up lane.

### Why clean GitHub PR evidence does not supersede `work-task-155:failed`

| Signal | Observation |
| --- | --- |
| GitHub mergeability | MERGEABLE, merge state CLEAN, 11/11 CI checks SUCCESS on head `381abe9a` |
| Project acceptance | Latest BLOCKING review (2026-07-02T03:31:22Z) on head `381abe9a` — do not merge |
| `work-task-155` | `failed` / FAILED — consistent with the blocking review, not a stale success token |
| Idea token | `to-complete` / PROCESSING — inconsistent with the failed task; planner distortion source |

GitHub mergeability reflects conflict and required-check state only. The failed
task token matches the reviewer’s project-level acceptance gate failures:

- `audit:canonical-page-surface` reports **over-budget** with shared hotspot
  `src/lib/content/prose-auto-link-runtime.ts` (bare `throughput` ambiguity);
  recommended action `declare-exception` / redirect shared work to the
  throughput/conflict-reduction lane.
- Required Browser QA on `/docs/glossary/tokens-per-second` did not complete
  locally on head `381abe9a`.

The watchdog `risk=queue-stale` label therefore describes a **GitHub-clean vs
queue-failed mismatch**, not proof that the queue failure is obsolete. Here the
failed queue token is authoritative; the misleading part is treating CI-green
mergeability as merge-ready.

### Conditions to verify immediately before any later merge attempt

Run these on PR #251 head immediately before an operator merge (outside this
follow-up lane):

1. `gh pr checks 251` — all required checks terminal SUCCESS on the reviewed head.
2. `bun run audit:canonical-page-surface -- --page-dir src/content/docs/glossary/tokens-per-second` — **within-budget** (no shared hotspot on `prose-auto-link-runtime.ts`; no `redirect-to-throughput-prd` / `declare-exception` recommendation).
3. Browser QA on `/docs/glossary/tokens-per-second` completed with evidence posted in PR conversation.
4. Latest PR conversation BLOCKING feedback cleared or explicitly superseded by a newer reviewer comment.

### Operator refresh steps (content lane, not this follow-up)

1. On branch `tokens-per-second-serving-metric-page`, keep the tokens-per-second
   slice page-local: remove or relocate the shared
   `prose-auto-link-runtime.ts` edit to the throughput/conflict-reduction lane
   required by the audit.
2. Complete Browser QA and post verification in PR #251 conversation.
3. Re-run the audit and focused quality gates; push only page-local fixes.
4. After refresh evidence is posted, re-dispatch or manually reconcile queue
   tokens (`idea:to-complete` vs `work-task-155:failed`) in session
   `0fdc5077-95ed-4396-a183-06e5b16555ca` — that queue repair is a separate
   operator action once PR evidence and task state align.

### Actions explicitly not chosen

| Action | Reason |
| --- | --- |
| Merge PR #251 | BLOCKING review on head `381abe9a`; surface-budget and Browser QA incomplete |
| Manually repair queue metadata alone | Would not fix the underlying acceptance blockers; risks masking a real failed task |
| Queue move now | Premature while PR #251 still needs content refresh; revisit after refresh evidence is posted |

## Scope guardrails (unchanged by this lane)

Do not edit tokens-per-second page payload, registry, navigation, validation, or
ownerless root dirty paths named in the customer ask. This snapshot is a
planner handoff artifact only.

## Verification for story 001

| Gate | Result |
| --- | --- |
| Typecheck | required on branch when code changes land; handoff-only snapshot needs no new code |
| Focused command verification | `gh pr view 251`, `you work list --session …`, watchdog fixture above |
| Content page payload | not modified |

## Verification for story 002

| Gate | Result |
| --- | --- |
| Typecheck | not rerun — handoff-only decision; no code changes |
| Focused command verification | `gh pr view 251`, `gh api …/issues/251/comments` (latest BLOCKING review 2026-07-02T03:31:22Z), `you work list --session …` |
| Decision recorded | **refresh PR #251** with pre-merge conditions above |
| Content page payload | not modified |
