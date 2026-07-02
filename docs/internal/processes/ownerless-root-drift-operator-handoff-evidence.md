# Ownerless Root Drift Operator Handoff Evidence

Generated at (UTC): 2026-07-02T03:16:49.172Z

## Head Relationship

- `HEAD`: `0cd67a88`
- `origin/main`: `0cd67a88`
- Ahead/behind counts: `0` ahead, `0` behind
- Aligned: `true`
- Branch status line: `## main...origin/main`

## Dirty Root Paths

Paths observed from `git status --short --branch` porcelain output:

| Path | Status | Change |
| --- | --- | --- |
| `docs/internal/processes/derived-page-validation-relevant-files.md` | ` M` | `modified` |
| `docs/internal/processes/factory-linkage-relevant-files.md` | ` M` | `modified` |
| `package.json` | ` M` | `modified` |
| `scripts/report-planner-root-checkout-reconciliation.ts` | ` M` | `modified` |
| `src/lib/factory/planner-root-checkout-reconciliation.test.ts` | ` M` | `modified` |
| `src/lib/factory/planner-root-checkout-reconciliation.ts` | ` M` | `modified` |
| `src/tests/ci/content-pr-doctor.test.ts` | ` M` | `modified` |
| `src/tests/discovery/planner-root-checkout-reconciliation.test.ts` | ` M` | `modified` |
| `src/tests/fixtures/planner-root-checkout-reconciliation/mixed-dirty-status.txt` | ` M` | `modified` |

## Read-Only Evidence Commands

Run these commands to re-gather evidence without mutating dirty root paths:

- `git status --short --branch`
- `git rev-parse --short HEAD`
- `git rev-parse --short origin/main`
- `git rev-list --left-right --count HEAD...origin/main`
- `bun ./scripts/report-planner-worktree-drift-watchdog.ts`
- `bun ./scripts/report-queue-worktree-pr-linkage-ledger.ts --refresh-metadata`
- `bun ./scripts/active-pr-mergeability-watchdog.ts`
- `bun ./scripts/report-planner-queue-health.ts`
- `bun ./scripts/report-planner-concurrency-floor.ts`

## Preservation Statement

No dirty root paths were modified, reverted, staged, overwritten, or regenerated as part of this handoff.
