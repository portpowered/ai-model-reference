# Factory Linkage Relevant Files

Use these files when changing queue/worktree/PR linkage classification,
watchdog summaries, or planner-facing linkage reports.

## Core classification and discovery

* `src/lib/factory/queue-worktree-pr-linkage-ledger.ts` — shared lane
  discovery, linkage status, noise partitioning, and summary formatters.
* `src/lib/factory/active-pr-mergeability-watchdog.ts` — PR lookup, branch
  candidate resolution, drift/mergeability classification for active lanes.
* `src/lib/factory/planner-batch-collision-preflight.ts` — consumes linkage
  ledger data and should scope actionable gap reporting through shared helpers.
* `src/lib/factory/planner-worktree-drift-watchdog.ts` — root vs active
  worktree drift classification, including already-merged root drift and
  ownerless root dirty path recovery guidance.
* `src/lib/factory/planner-root-checkout-reconciliation.ts` — non-destructive
  root checkout reconciliation that compares dirty paths against `HEAD` and
  `origin/main`, classifies remote-present local deletions as ownerless root
  checkout drift with `present-on-origin-main` evidence, groups
  tokenizer-mismatch remote-present deletions under
  `tokenizer-mismatch-remote-present-deletions` with stale root checkout drift
  guidance, keeps other dirty paths in manual-inspection groups with
  per-change-kind counts, nests modified shared paths under
  `manual-inspection-shared-edits` with preserve guidance, and prints
  operator next actions (page-refill hold, safe cleanup path for remote-present
  deletions, manual ownership inspection) with target session
  `0fdc5077-95ed-4396-a183-06e5b16555ca`.
* `src/lib/factory/planner-merged-lane-evidence.ts` — terminal-complete and
  merged-branch evidence used to attribute stale root drift to merged page lanes.

## Planner-facing commands

| When | Command |
| --- | --- |
| Diagnose mergeability class, linkage gaps, and action queue for active PR-backed lanes | `bun run watch:active-pr-mergeability` |
| Inspect queue/worktree/PR linkage ledger with optional metadata refresh | `bun run report:queue-worktree-pr-linkage-ledger` |
| Planner batch dispatch: collision preflight before scheduling overlapping lanes | `bun run report:planner-batch-collision-preflight` |
| Planner worktree drift against active lanes | `bun run report:planner-worktree-drift-watchdog` |
| Root checkout reconciliation against HEAD and origin/main | `bun run report:planner-root-checkout-reconciliation` |

Direct script paths remain supported for fixture-driven tests:

* `bun ./scripts/active-pr-mergeability-watchdog.ts`
* `bun ./scripts/report-queue-worktree-pr-linkage-ledger.ts`

## Classification contract

* `already-merged-owned` — root drift matches dirty paths or shared surfaces
  from a terminal-complete or merged-into-main page lane; report includes PR and
  merge-commit evidence when available.
* `ownerless-root-dirty-paths` — root dirty paths with no active or merged lane
  owner; report includes preserve-policy guidance, `investigate-and-preserve`
  next action, and target session `0fdc5077-95ed-4396-a183-06e5b16555ca` in
  recovery examples.
* `pr-backed` — lane has resolved `pullRequest` evidence from live lookup,
  branch candidates, or current stamped lane metadata. Passing checks report
  `mergeability=mergeable` even when GitHub `mergeStateStatus` is `BLOCKED`.
  Stale stamped linkage surfaces as `metadata-refresh=` hints, separate from
  `risk=metadata-unavailable` (reserved for missing PR/check evidence).
* `actionable-gaps` — active/failed task or review lanes missing repairable
  worktree, branch, or PR metadata.
* `queue-only-noise` — expected queue-only missing worktree rows and stale
  failed `thoughts` loopbacks; compacted into `Noise Summary` rows.

Reuse `isQueueOnlyMissingLinkageLane`, `isStaleFailedLoopbackLane`,
`isActionableLinkageGapLane`, and `partitionLinkageLanesForSummary` instead of
duplicating filters in scripts or planner preflight.

## Fixture inputs for tests

Linkage script tests should prefer observable command output over source
inventory checks. Supported fixture flags:

* `--work-list-json`
* `--session-list-json`
* `--worktrees-dir`
* `--pr-map-json`
* `--status-output` for root checkout reconciliation fixture status porcelain
  (`mixed-dirty-status.txt`, `tokenizer-mismatch-dirty-status.txt`,
  `manual-inspection-shared-edits-dirty-status.txt`)
* `--session` for live `you work list` discovery in integration-style tests

Representative regression coverage lives in
`src/tests/discovery/linkage-classifier-report-compatibility.test.ts`,
`src/tests/discovery/planner-root-drift-pr-metadata-repair-compatibility.test.ts`
(already-merged root drift, ownerless recovery guidance, and PR-backed metadata
refresh with passing checks), and
`src/tests/discovery/planner-root-checkout-reconciliation.test.ts` with fixture
status output under `src/tests/fixtures/planner-root-checkout-reconciliation/`.

## Related process docs

* [content-page-generation-workflow-relevant-files](./content-page-generation-workflow-relevant-files.md)
  — PR-head mergeability phase for page branches.
* [factory-batch-input-relevant-files](./factory-batch-input-relevant-files.md)
  — planner batch input examples.
