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
