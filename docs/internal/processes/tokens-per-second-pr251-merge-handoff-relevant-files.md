# Tokens Per Second PR #251 Merge Handoff — Evidence Snapshot

Planner-facing merge/queue recovery evidence for the `tokens-per-second-serving-metric-page`
lane. Captured 2026-07-02 UTC. This lane records PR #251 and factory queue state so
the meta-planner can choose one recovery action without editing the tokens-per-second
page payload.

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
test-integration, validate-data, linkcheck, ci) on head `381abe9a`.

Commands:

```bash
gh pr view 251 --json number,title,state,mergeable,mergeStateStatus,baseRefName,headRefName,headRefOid,statusCheckRollup
gh pr checks 251
```

## Conflicting factory queue evidence

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-serving-metric-tokens-per-second-batch-039-tokens-per-second-serving-metric-page` | idea | `to-complete` / PROCESSING | `trace-serving-metric-tokens-per-second-batch-039` |
| `work-task-155` | task | `failed` / FAILED | `trace-serving-metric-tokens-per-second-batch-039` |
| `work-plan-154` | plan | `complete` / TERMINAL | `trace-serving-metric-tokens-per-second-batch-039` |

The mismatch: PR #251 is open, mergeable, and CI-green, while the factory still
carries `idea:to-complete` and `task:failed` tokens for the same work item name.

Command used:

```bash
you work list --session 0fdc5077-95ed-4396-a183-06e5b16555ca \
  --name tokens-per-second-serving-metric-page --json
```

## Branch and worktree metadata

Content lane worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/tokens-per-second-serving-metric-page`

| Field | Value |
| --- | --- |
| Branch | `tokens-per-second-serving-metric-page` |
| Git drift vs main | diverged (ahead=10, behind=119) |
| Lane metadata | present |
| Stamped PR | #251 (linkage `current`, refreshed 2026-07-02T05:01:30.864Z) |
| Stamped branch linkage | `current` |
| Metadata session id | null |

Lane metadata file:
`.claude/worktrees/tokens-per-second-serving-metric-page/.claude/lane-metadata.json`

Merge-handoff lane worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/tokens-per-second-pr251-merge-handoff`

| Field | Value |
| --- | --- |
| Branch | `tokens-per-second-pr251-merge-handoff` |
| Role | planner recovery lane (no content page edits) |

## Active PR mergeability watchdog output

Fixture command (read-only; representative PR #251 stale mismatch):

```bash
bun ./scripts/active-pr-mergeability-watchdog.ts \
  --work-list-json /tmp/tps-pr251-fixture/work-list.json \
  --session-list-json /tmp/tps-pr251-fixture/session-list.json \
  --worktrees-dir /tmp/tps-pr251-fixture/.claude/worktrees \
  --pr-map-json /tmp/tps-pr251-fixture/pr-map.json
```

Fixture work list (failed task + processing idea):

```json
{
  "items": [
    {
      "name": "tokens-per-second-serving-metric-page",
      "workId": "work-task-155",
      "workTypeName": "task",
      "state": "failed",
      "sessionId": "0fdc5077-95ed-4396-a183-06e5b16555ca"
    },
    {
      "name": "tokens-per-second-serving-metric-page",
      "workId": "batch-serving-metric-tokens-per-second-batch-039-tokens-per-second-serving-metric-page",
      "workTypeName": "idea",
      "state": "to-complete",
      "sessionId": "0fdc5077-95ed-4396-a183-06e5b16555ca"
    }
  ]
}
```

Observed watchdog summary (2026-07-02 UTC):

```txt
Active PR Mergeability Watchdog
lanes=1 pr-backed=1 actionable-gaps=0 queue-only-noise=0

Action Queue
1. action=open-follow-up work-item=tokens-per-second-serving-metric-page pr=#251 branch=tokens-per-second-serving-metric-page
```

Classification: `stale-clean-pr-mismatch` — open PR with `mergeability=mergeable` and
`checks=passing` while queue token is `failed`; `risk=queue-stale`;
`next-action=open-follow-up-throughput-prd`.

## Queue/worktree linkage ledger output

```bash
bun ./scripts/report-queue-worktree-pr-linkage-ledger.ts \
  --work-list-json /tmp/tps-pr251-fixture/work-list.json \
  --session-list-json /tmp/tps-pr251-fixture/session-list.json \
  --worktrees-dir /tmp/tps-pr251-fixture/.claude/worktrees \
  --pr-map-json /tmp/tps-pr251-fixture/pr-map.json
```

Observed ledger row (2026-07-02 UTC):

```txt
Stale PR Mismatch Summary
- lane=tokens-per-second-serving-metric-page queue=failed linkage=linked ... pr=#251 ...
  mergeability=mergeable checks=passing risk=queue-stale
  lane-kind=stale-clean-pr-mismatch
  mismatch-reason=clean-passing-open-pr-with-queue-failed pr=#251 queue=failed(failed) ...
  next-action=open-follow-up-throughput-prd
```

## Prior `tokens-per-second-stale-pr-follow-up` outcome

Merged planner artifact:
[docs/internal/processes/tokens-per-second-stale-pr-follow-up-relevant-files.md](./tokens-per-second-stale-pr-follow-up-relevant-files.md)
(PR #267 on `main`).

| Prior lane output | Value |
| --- | --- |
| Chosen action | **Refresh PR #251** on content branch (not merge, not queue repair alone) |
| Watchdog routing | `next-action=open-follow-up-throughput-prd` opened the stale follow-up lane |
| Scope guard | Did not edit tokens-per-second page payload; read-only inspection of content worktree |

### Why the stale follow-up did not clear PR #251 queue-stale state

1. **Project acceptance still blocks merge.** Latest BLOCKING PR conversation review
   (2026-07-02T03:31:22Z UTC) on head `381abe9a` remains unresolved. Blockers:
   - `audit:canonical-page-surface` reports **over-budget** with shared hotspot
     `src/lib/content/prose-auto-link-runtime.ts`; recommended action
     `declare-exception` (bare `throughput` alias vs page-local surface policy).
   - Required Browser-plugin QA on `/docs/glossary/tokens-per-second` did not
     complete locally on that head.
2. **Queue tokens were not reconciled.** The follow-up lane recorded evidence and
   routed refresh to the content branch; it did not merge PR #251 or transition
   `work-task-155` / `idea:to-complete` in session
   `0fdc5077-95ed-4396-a183-06e5b16555ca`.
3. **Watchdog signal unchanged.** Fixture-backed reports still emit
   `risk=queue-stale` and `next-action=open-follow-up-throughput-prd`, which
   opened this merge-handoff lane for a single planner-verifiable recovery action.

Current page-surface audit on content worktree head `381abe9a` (2026-07-02 UTC):

```bash
cd .claude/worktrees/tokens-per-second-serving-metric-page && \
  bun run audit:canonical-page-surface -- --page-dir src/content/docs/glossary/tokens-per-second
```

Observed: `Budget status: over-budget`, `Recommended action: declare-exception`,
shared hotspot `src/lib/content/prose-auto-link-runtime.ts`.

## Root checkout and worktree drift evidence

Root reconciliation (planner root checkout, read-only):

```bash
cd /Users/abdifamily/work/learn-agent-factories && \
  bun ./scripts/report-planner-root-checkout-reconciliation.ts
```

Observed at capture (2026-07-02 UTC): `root-dirty-paths=12`,
`remote-present-deletions=2`, `manual-inspection=10`. This merge-handoff lane does
not revert or reconcile root dirty paths.

Worktree drift watchdog from merge-handoff worktree:

```bash
bun run report:planner-worktree-drift-watchdog
```

Observed: `active-lanes=0`, `root-dirty-shared-paths=0` for this worktree checkout;
content lane drift is captured separately via git `ahead=10, behind=119` on branch
`tokens-per-second-serving-metric-page`.

## Latest PR #251 conversation blocker (evidence only)

Most recent BLOCKING review in PR conversation (not review threads):
2026-07-02T03:31:22Z UTC on head `381abe9a`.

Summary for planner:

| Blocker | Status on head `381abe9a` |
| --- | --- |
| Page-local surface budget | FAIL — shared `prose-auto-link-runtime.ts` edit |
| Browser QA | FAIL — local Browser-plugin QA incomplete |
| GitHub CI | PASS — 11/11 checks SUCCESS |
| GitHub mergeability | PASS — MERGEABLE / CLEAN |

No newer PR conversation comment supersedes or clears this BLOCKING review as of
2026-07-02T05:07:42Z UTC.

## Verification for story 001

| Gate | Result |
| --- | --- |
| Typecheck | `bun run typecheck` — required when code changes land |
| Focused command verification | `gh pr view 251`, `gh pr checks 251`, `you work list --session …`, fixture watchdog/ledger above |
| Focused tests | `bun test src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts` |
| Content page payload | not modified by this lane |
