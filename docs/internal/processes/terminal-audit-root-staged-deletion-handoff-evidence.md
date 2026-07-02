# Terminal Audit Root Staged Deletion Handoff Evidence

Generated at (UTC): 2026-07-02T04:13:23.784Z

## Git Status (`git status --short --branch`)

```
## main...origin/main
M  docs/internal/processes/factory-linkage-relevant-files.md
M  package.json
D  scripts/report-terminal-lane-main-branch-landing-audit.ts
M  src/lib/factory/planner-merged-lane-evidence.ts
D  src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts
D  src/lib/factory/terminal-lane-main-branch-landing-audit.ts
```

## Cached Diff Stat (`git diff --cached --stat`)

```
.../processes/factory-linkage-relevant-files.md    |  12 +-
 package.json                                       |   1 +
 scripts/report-terminal-lane-main-branch-landing-audit.ts | 120 ------
 src/lib/factory/planner-merged-lane-evidence.ts    |  45 +++
 .../terminal-lane-main-branch-landing-audit.test.ts | 380 ---------------------
 .../terminal-lane-main-branch-landing-audit.ts      | 1620 -----------------------------------------------------------
 6 files changed, 57 insertions(+), 2121 deletions(-)
```

## Root Checkout Reconciliation Summary

- Root dirty paths: `6`
- Remote-present deletions: `3`
- Manual-inspection paths: `3`

## Root Checkout Reconciliation Report

```
Planner Root Checkout Reconciliation
remote-base-ref=origin/main root-dirty-paths=6 remote-present-deletions=3 manual-inspection=3
- location=root repo=/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/terminal-audit-root-staged-deletion-handoff
- remote-present-ownerless-deletions count=3 comparison-target=origin/main
  - tokenizer-mismatch-remote-present-deletions count=0 comparison-target=origin/main
    - guidance=Stale root checkout drift: content exists on origin/main; do not treat as missing content or request a page refill.
    - none
  - other-remote-present-deletions count=3 comparison-target=origin/main
    - path=scripts/report-terminal-lane-main-branch-landing-audit.ts status=D  change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=other-remote-present-deletions
    - path=src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts status=D  change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=other-remote-present-deletions
    - path=src/lib/factory/terminal-lane-main-branch-landing-audit.ts status=D  change=deleted comparison-target=origin/main evidence=present-on-origin-main classification=ownerless-root-checkout-drift drift-family=other-remote-present-deletions
- manual-inspection count=3
  - guidance=Review each manual-inspection path for ownership; do not revert, stage, or auto-clean these paths.
  - change-kind-counts=modified=3
  - manual-inspection-shared-edits count=0
    - guidance=Modified shared paths require explicit ownership before cleanup; do not revert, stage, or overwrite user or planner work.
    - none
  - other-manual-inspection count=3
    - path=docs/internal/processes/factory-linkage-relevant-files.md status=M  change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection
    - path=package.json status=M  change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection
    - path=src/lib/factory/planner-merged-lane-evidence.ts status=M  change=modified comparison-target=HEAD evidence=non-deletion-dirty-path classification=manual-inspection inspection-family=other-manual-inspection
- generated-table-registry-drift count=0
  - none
- conflict-drift-prs count=0
  - none
- operator-next-actions
  - page-refill-hold=Hold new page refills until the root checkout is clean or dirty-path ownership is explicit. target-session=0fdc5077-95ed-4396-a183-06e5b16555ca
  - merge-conflict-priority=Merge-conflict reduction takes priority over page refill for this batch.
  - remote-present-deletions count=3 guidance=Operator-reviewed root cleanup outside this doctor command; do not auto-revert, checkout, restore, stage, or overwrite.
  - manual-inspection count=3 guidance=Inspect each path for explicit ownership before cleanup; do not revert, stage, or overwrite user or planner work.
```

## Terminal Audit Remote-Present Deletions

- Group classification: `remote-present-local-deletion-drift`
- Comparison target: `origin/main`
- Next safe action: Human operator inspect and assign explicit ownership outside this handoff lane; do not restore, stage, unstage, checkout, or delete these paths from this implementation.

| Path | Status | Origin/Main Evidence | Presence Command | Explicit Owner |
| --- | --- | --- | --- | --- |
| `scripts/report-terminal-lane-main-branch-landing-audit.ts` | `D` | `present-on-origin-main` | `git cat-file -e origin/main:scripts/report-terminal-lane-main-branch-landing-audit.ts` | `(none)` |
| `src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts` | `D` | `present-on-origin-main` | `git cat-file -e origin/main:src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts` | `(none)` |
| `src/lib/factory/terminal-lane-main-branch-landing-audit.ts` | `D` | `present-on-origin-main` | `git cat-file -e origin/main:src/lib/factory/terminal-lane-main-branch-landing-audit.ts` | `(none)` |

## Worktree Drift Watchdog Report

```
Planner Worktree Drift Watchdog
active-lanes=0 merged-lanes=47 evaluated-worktrees=0 risk-cases=1 root-dirty-shared-paths=6 worktree-dirty-shared-paths=0 total-dirty-shared-paths=6

- risks
  - risk=already-merged-root-drift path=docs/internal/processes/factory-linkage-relevant-files.md surface=docs/internal lanes=tokens-per-second-stale-pr-follow-up next-action=investigate-and-preserve evidence=Root dirty path docs/internal/processes/factory-linkage-relevant-files.md is already-merged root drift from lane tokens-per-second-stale-pr-follow-up (PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).

- location=root repo=/repo dirty-shared-paths=6
  - path=docs/internal/processes/factory-linkage-relevant-files.md status=M  change=modified surface=docs/internal category=authored-content owner=already-merged-owned:tokens-per-second-stale-pr-follow-up merge-evidence=PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca ownership-reason=Root drift matches already-merged lane tokens-per-second-stale-pr-follow-up (PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).
```

## Factory Linkage Watchdog Evidence

Path: `docs/internal/processes/factory-linkage-relevant-files.md`

- Ownership kind: `already-merged-owned`
- Lane name: `tokens-per-second-stale-pr-follow-up`
- Merge evidence: `PR`
- Ownership reason: Root drift matches already-merged lane tokens-per-second-stale-pr-follow-up (PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).

## Read-Only Evidence Commands

Run these commands to re-gather evidence without mutating dirty root paths:

- `git status --short --branch`
- `git diff --cached --stat`
- `bun ./scripts/report-planner-root-checkout-reconciliation.ts`
- `bun ./scripts/report-planner-worktree-drift-watchdog.ts`

## Preservation Statement

No dirty root paths were modified, reverted, staged, overwritten, or regenerated as part of this handoff.
