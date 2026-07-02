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
2026-07-02T05:07:42Z UTC (reconfirmed 2026-07-02T06:30:00Z UTC via
`gh api …/issues/251/comments`).

## Lane decision (story 002)

**Single recovery action: safe branch refresh on PR #251 content branch**

The `tokens-per-second-serving-metric-page` content lane must refresh branch
`tokens-per-second-serving-metric-page` (worktree
`.claude/worktrees/tokens-per-second-serving-metric-page`) until project
acceptance clears on PR #251. Do **not** merge PR #251 from this merge-handoff
lane. Do **not** repair queue tokens alone while BLOCKING review remains.

### Why verification cannot proceed without refresh

| Gate | Head `381abe9a` (2026-07-02 UTC) |
| --- | --- |
| GitHub mergeability | MERGEABLE / CLEAN — insufficient alone |
| GitHub CI | 11/11 SUCCESS — insufficient alone |
| `audit:canonical-page-surface` | **FAIL** — over-budget; shared hotspot `src/lib/content/prose-auto-link-runtime.ts`; recommended action `declare-exception` / redirect shared work to throughput lane |
| Browser QA | **FAIL** — Browser-plugin QA on `/docs/glossary/tokens-per-second` not completed on current head |
| Latest PR conversation review | **BLOCKING** — 2026-07-02T03:31:22Z UTC; no newer comment supersedes it |

Merge and queue-success transitions require clearing the BLOCKING review, not
only green GitHub checks. The failed `work-task-155` token is **authoritative**
for this mismatch; `idea:to-complete` is the planner-distortion source.

### Why this action is safer than the alternatives

| Alternative | Why not chosen |
| --- | --- |
| Operator merge handoff | BLOCKING review on head `381abe9a` — merge would violate project acceptance despite MERGEABLE/CLEAN |
| Manual queue repair alone | Would reconcile `idea:to-complete` without fixing surface-budget or Browser QA blockers; masks a real failed task (rejected in stale follow-up story 002) |
| Explicit resume/refill | PR #251 still blocks planning — BLOCKING review unresolved, watchdog still emits `risk=queue-stale` |

Prior `tokens-per-second-stale-pr-follow-up` also chose refresh but did not
complete it. This merge-handoff lane records the **same action class** with
post-`381abe9a` operator steps so the planner has one verifiable recovery path
instead of ambiguous stale state.

### Operator refresh steps (content lane only; limits scope to PR #251 branch)

Work only on branch `tokens-per-second-serving-metric-page` and its worktree.
Do not edit tokens-per-second page payload from this merge-handoff worktree.

1. **Resolve shared surface on the content branch.** Either:
   - revert `src/lib/content/prose-auto-link-runtime.ts` to `origin/main` and
     keep the page-local alias strategy within budget (e.g. multi-word aliases
     without bare `throughput` auto-link collisions), **or**
   - move the `SYSTEM_ALIAS_AMBIGUITY_CANDIDATES` / bare-`throughput` prose
     auto-link work to the throughput/conflict-reduction lane required by the
     audit policy (do not hide shared runtime edits in the page-local PR).
2. **Complete Browser-plugin QA** on `/docs/glossary/tokens-per-second`; post
   observed title, metric distinctions, graph, related links, and mobile layout
   in PR #251 conversation.
3. **Re-run page-local gates** on the content worktree head and push only
   page-local fixes:
   ```bash
   bun run audit:canonical-page-surface -- --page-dir src/content/docs/glossary/tokens-per-second
   make validate-data && bun run doctor:content-pr
   bun run typecheck && bun run lint && make test
   gh pr checks 251
   ```
4. **Post PR conversation evidence** mapping each BLOCKING item to the fix;
   wait for BLOCKING review to be cleared or explicitly superseded.
5. **After refresh clears BLOCKING review**, operator may merge PR #251 and then
   reconcile queue tokens in session `0fdc5077-95ed-4396-a183-06e5b16555ca`
   (`work-task-155`, `idea:to-complete`) — queue repair is a **separate**
   post-merge operator step, not this lane's chosen action.

### Refresh scope guard

- Branch: `tokens-per-second-serving-metric-page` only.
- Worktree: `.claude/worktrees/tokens-per-second-serving-metric-page` only.
- PR: #251 only.
- This merge-handoff lane (`tokens-per-second-pr251-merge-handoff`) records
  evidence and decision only; it does not push content-branch commits.

## Planner report classification (story 003)

Captured 2026-07-02 UTC. Normal planner-facing reports must treat PR #251 as
**merge/queue recovery**, not useful active page implementation, while batch 061
page lanes remain useful active work.

### Compact meta-planner loopback

```txt
recovery-item=pr-251-merge-handoff work-item=tokens-per-second-serving-metric-page pr=#251
recovery-class=stale-clean-pr-mismatch recovery-action=safe-branch-refresh
useful-active-lanes=stable-diffusion-model-page,relative-position-bias-concept-page,prefill-decode-split-concept-page
excluded-from-useful-active=tokens-per-second-serving-metric-page
watchdog-next-action=open-follow-up-throughput-prd ledger-section=Stale PR Mismatch Summary
```

### Report separation rules

| Lane | Planner classification | Counted as useful active? | Report section |
| --- | --- | --- | --- |
| `tokens-per-second-serving-metric-page` (PR #251) | `stale-clean-pr-mismatch` / `risk=queue-stale` | **No** — recovery only | Watchdog action queue + ledger `Stale PR Mismatch Summary` |
| `stable-diffusion-model-page` | `active-page-implementation` | Yes | Watchdog actionable rows + concurrency-floor `Useful Active Lanes` |
| `relative-position-bias-concept-page` | `active-page-implementation` | Yes | same |
| `prefill-decode-split-concept-page` | `active-page-implementation` | Yes | same |

PR #251 maps back to recovery action **safe branch refresh** (story 002). Failed
`work-task-155` and non-active `idea:to-complete` tokens do not inflate
`useful-active`; only batch 061 `in-progress` task tokens do.

### Fixture-backed verification

```bash
unset TMPDIR
bun test src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts \
  -t "planner reports separate PR #251 recovery"
```

Observed (fixture, 2026-07-02 UTC):

- Ledger: `stale-clean-pr-mismatch=1`; PR #251 under `Stale PR Mismatch Summary`
  with `lane-kind=stale-clean-pr-mismatch` and `next-action=open-follow-up-throughput-prd`.
- Watchdog: `action=open-follow-up` for PR #251 only; batch 061 lanes in
  actionable rows without `open-follow-up`.
- Concurrency floor: `useful-active=3` listing batch 061 lanes only; PR #251 absent.

Proof does not require source inventories, docs link topology, route
registrations, or broad queue scans.

## Verification for story 001

| Gate | Result |
| --- | --- |
| Typecheck | `bun run typecheck` — required when code changes land |
| Focused command verification | `gh pr view 251`, `gh pr checks 251`, `you work list --session …`, fixture watchdog/ledger above |
| Focused tests | `bun test src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts` |
| Content page payload | not modified by this lane |

## Verification for story 002

| Gate | Result |
| --- | --- |
| Typecheck | not rerun — handoff-only decision; no code changes |
| Focused command verification | `gh pr view 251` (OPEN, MERGEABLE, CLEAN, head `381abe9a`), `gh api …/issues/251/comments` (latest BLOCKING 2026-07-02T03:31:22Z), `you work list --session …` |
| Decision recorded | **safe branch refresh** on `tokens-per-second-serving-metric-page` with operator steps above |
| Content page payload | not modified |

## Verification for story 003

| Gate | Result |
| --- | --- |
| Typecheck | `bun run typecheck` — required when code changes land |
| Focused tests | `bun test src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts -t "planner reports separate PR #251 recovery"` |
| Planner classification | PR #251 `stale-clean-pr-mismatch`; batch 061 lanes `active-page-implementation`; concurrency floor excludes PR #251 |
| Content page payload | not modified |

## Non-page scope preservation and handoff verification (story 004)

Captured 2026-07-02 UTC. This merge-handoff lane mutates only planner handoff
artifacts and fixture-backed discovery tests; it does not reconcile root checkout
drift, edit the tokens-per-second page payload, or touch active batch 061 page
lanes.

### Allowlisted branch diff (`main...HEAD`)

Only these paths differ on branch `tokens-per-second-pr251-merge-handoff`:

| Path | Category |
| --- | --- |
| `docs/internal/processes/tokens-per-second-pr251-merge-handoff-relevant-files.md` | planner handoff artifact |
| `docs/internal/processes/factory-linkage-relevant-files.md` | planner observability index (link only) |
| `src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts` | fixture-backed scope and classification tests |

Verification:

```bash
git diff main...HEAD --name-only
```

Observed (2026-07-02 UTC): exactly 3 allowlisted paths; no other branch diff
files.

### Prohibited paths (must remain absent from this branch diff)

| Pattern | Examples | Branch diff |
| --- | --- | --- |
| Tokens-per-second page payload | `src/content/docs/glossary/tokens-per-second/**` | absent |
| Batch 061 page lanes | `stable-diffusion-model-page`, `relative-position-bias-concept-page`, `prefill-decode-split-concept-page` content paths | absent |
| Content / registry / navigation | `src/content/**`, `src/lib/content/**` | absent |
| Unrelated factory runtime edits | `scripts/**`, `src/lib/factory/**` (except via pre-existing main history) | absent from this lane diff |

```bash
git diff main...HEAD --name-only | grep -E \
  'src/content/|src/lib/content/|stable-diffusion|relative-position-bias|prefill-decode-split|tokens-per-second/' \
  || echo "no prohibited paths in branch diff"
```

### Root dirty-path baseline preserved (main repo checkout)

The planner root at `/Users/abdifamily/work/learn-agent-factories` had
`root-dirty-paths=6` at story-004 capture time. This merge-handoff lane did not
revert, reset, checkout, stage, delete, or overwrite any root dirty paths.

Root reconciliation command (read-only evidence):

```bash
cd /Users/abdifamily/work/learn-agent-factories && \
  bun ./scripts/report-planner-root-checkout-reconciliation.ts
```

Observed: `remote-present-deletions=4`, `manual-inspection=2`, preserve guidance
unchanged. No destructive git commands (`reset --hard`, `checkout --`, forced
push, branch deletion) were used from this merge-handoff worktree.

### Content PR lane and batch 061 lanes untouched

PR #251 branch `tokens-per-second-serving-metric-page` and its worktree were
inspected read-only for evidence. Active batch 061 lanes
(`stable-diffusion-model-page`, `relative-position-bias-concept-page`,
`prefill-decode-split-concept-page`) were not edited from this worktree.

### Final handoff completeness (meta-planner loopback)

| Required evidence | Recorded in this artifact |
| --- | --- |
| PR #251 state (open, mergeable, checks, base/head) | [PR #251 state](#pr-251-state) — OPEN, MERGEABLE, CLEAN, head `381abe9a` |
| Queue token state | [Conflicting factory queue evidence](#conflicting-factory-queue-evidence) — `work-task-155:failed`, `idea:to-complete` |
| Branch/worktree metadata | [Branch and worktree metadata](#branch-and-worktree-metadata) |
| Watchdog/linkage state | [Active PR mergeability watchdog output](#active-pr-mergeability-watchdog-output), [Queue/worktree linkage ledger output](#queueworktree-pr-linkage-ledger-output) |
| Prior stale follow-up outcome | [Prior tokens-per-second-stale-pr-follow-up outcome](#prior-tokens-per-second-stale-pr-follow-up-outcome) |
| Chosen recovery action | [Lane decision (story 002)](#lane-decision-story-002) — **safe branch refresh** |
| Planner classification | [Planner report classification (story 003)](#planner-report-classification-story-003) |

### Fixture-backed scope verification

```bash
unset TMPDIR
bun test src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts \
  -t "merge handoff lane preserves non-page scope"
```

## Verification for story 004

| Gate | Result |
| --- | --- |
| Typecheck | `bun run typecheck` — required when code changes land |
| Lint | `bun run lint` — required when code changes land |
| Focused tests | `bun test src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts -t "merge handoff lane preserves non-page scope"` |
| Branch diff scope | only 3 allowlisted paths on `main...HEAD` |
| Prohibited paths | absent from branch diff |
| Root dirty paths | preserved; no destructive git commands |
| Content page payload | not modified |
| Batch 061 page lanes | not modified |
| Handoff completeness | PR #251 state, queue tokens, metadata, recovery action, and planner classification recorded above |
