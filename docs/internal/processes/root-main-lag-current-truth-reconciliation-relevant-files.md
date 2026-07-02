# Root Main Lag and Current Truth Reconciliation — Relevant Files

Planner-truth reconciliation after the root checkout was clean but behind
`origin/main` at `2026-07-02T19:01Z`. This lane is read-first: capture live git
truth before any sync, note update, or no-update outcome.

## Core handoff module

* `src/lib/factory/planner-root-main-lag-current-truth-reconciliation.ts` —
  read-only root git truth capture plus queue/planner-report comparison against
  live git. Story 001 captures worktree cleanliness, `HEAD` and
  `origin/main` commit identities, and relationship (`aligned`, `ahead`,
  `behind`, `diverged`, `unknown`). Story 002 compares queue JSON and default
  planner report markdown against that git truth without running the factory
  runtime.
* `src/lib/factory/planner-root-main-lag-current-truth-reconciliation.test.ts` —
  fixture git repo tests for clean/aligned, behind, dirty, diverged,
  non-destructive git usage, and queue/planner-note alignment cases.
* `scripts/report-planner-root-main-lag-current-truth-reconciliation.ts` —
  planner-facing CLI with `--repo-root`, `--remote-base-ref`,
  `--status-output`, `--work-list-json`, repeated `--planner-report`,
  `--generated-at-utc`, and `--json` / `--format json`. Does not invoke `you`.

## Upstream evidence reuse

* `src/lib/factory/planner-root-checkout-reconciliation.ts` — `detectDefaultRemoteBaseRef`
* `src/lib/factory/planner-worktree-drift-watchdog.ts` — `parsePlannerRelevantDirtyPaths`
* `src/lib/factory/active-pr-mergeability-watchdog.ts` — `classifyBranchDrift` for
  `origin/main...HEAD` rev-list counts

## Planner-facing command

| When | Command |
| --- | --- |
| Capture current root vs `origin/main` git truth (story 001) | `bun run report:planner-root-main-lag-current-truth-reconciliation` |
| Compare queue state and default planner reports (story 002) | `bun run report:planner-root-main-lag-current-truth-reconciliation -- --work-list-json /path/to/work-list.json` |
| Point at the planner root checkout explicitly | `bun run report:planner-root-main-lag-current-truth-reconciliation -- --repo-root /path/to/root` |
| Override planner report inputs | `bun run report:planner-root-main-lag-current-truth-reconciliation -- --planner-report docs/internal/processes/root-main-lag-current-truth-reconciliation-relevant-files.md` |

## Fixture-backed verification

Fixtures live under
`src/tests/fixtures/planner-root-main-lag-current-truth-reconciliation/`:

* `stale-current-lag-work-list.json` — queue record still claims current 17-commit lag
* `historical-lag-work-list.json` — queue record preserves the stale observation as historical
* `stale-current-lag-planner-report.md` — planner report with present-tense lag claim
* `historical-lag-planner-report.md` — planner report with historical stale observation framing

## Stale observation reference

| Field | Value |
| --- | --- |
| Stale observation time | `2026-07-02T19:01Z` |
| Reported lag | 17 commits behind `origin/main` |
| Constants | `ROOT_MAIN_LAG_STALE_OBSERVATION_UTC`, `ROOT_MAIN_LAG_STALE_COMMIT_COUNT` |

Story 002 classifies planner-facing notes as `stale-root-lag-reference`,
`already-resolved-condition`, or `conflicting-current-condition` against live git
truth from story 001. Do not treat the stale row as current truth.

## Boundaries

* Do not run the factory runtime (`you`).
* Do not edit content pages.
* Do not revert, reset, or fast-forward the root during story 001–002 capture.
* Root sync / stale-note / no-update outcomes belong to stories 003–004.
