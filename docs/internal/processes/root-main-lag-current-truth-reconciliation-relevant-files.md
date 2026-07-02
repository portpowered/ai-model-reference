# Root Main Lag and Current Truth Reconciliation — Relevant Files

Planner-truth reconciliation after the root checkout was clean but behind
`origin/main` at `2026-07-02T19:01Z`. This lane is read-first: capture live git
truth before any sync, note update, or no-update outcome.

## Core handoff module

* `src/lib/factory/planner-root-main-lag-current-truth-reconciliation.ts` —
  read-only root git truth capture: worktree cleanliness, `HEAD` and
  `origin/main` commit identities, and relationship (`aligned`, `ahead`,
  `behind`, `diverged`, `unknown`). Story 001 scope only; queue/planner-report
  comparison and outcomes land in later stories.
* `src/lib/factory/planner-root-main-lag-current-truth-reconciliation.test.ts` —
  fixture git repo tests for clean/aligned, behind, dirty, diverged, and
  non-destructive git usage.
* `scripts/report-planner-root-main-lag-current-truth-reconciliation.ts` —
  planner-facing CLI with `--repo-root`, `--remote-base-ref`,
  `--status-output`, `--generated-at-utc`, and `--json` / `--format json`.

## Upstream evidence reuse

* `src/lib/factory/planner-root-checkout-reconciliation.ts` — `detectDefaultRemoteBaseRef`
* `src/lib/factory/planner-worktree-drift-watchdog.ts` — `parsePlannerRelevantDirtyPaths`
* `src/lib/factory/active-pr-mergeability-watchdog.ts` — `classifyBranchDrift` for
  `origin/main...HEAD` rev-list counts

## Planner-facing command

| When | Command |
| --- | --- |
| Capture current root vs `origin/main` git truth (story 001) | `bun run report:planner-root-main-lag-current-truth-reconciliation` |
| Point at the planner root checkout explicitly | `bun run report:planner-root-main-lag-current-truth-reconciliation -- --repo-root /path/to/root` |

## Stale observation reference

| Field | Value |
| --- | --- |
| Stale observation time | `2026-07-02T19:01Z` |
| Reported lag | 17 commits behind `origin/main` |
| Constants | `ROOT_MAIN_LAG_STALE_OBSERVATION_UTC`, `ROOT_MAIN_LAG_STALE_COMMIT_COUNT` |

Future stories compare queue state and planner reports against the live git
truth emitted by story 001; do not treat the stale row as current truth.

## Boundaries

* Do not run the factory runtime.
* Do not edit content pages.
* Do not revert, reset, or fast-forward the root during story 001 capture.
* Root sync / stale-note / no-update outcomes belong to stories 003–004.
