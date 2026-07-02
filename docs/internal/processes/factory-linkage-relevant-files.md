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
* `src/lib/factory/planner-merged-lane-evidence.ts` — terminal-complete and
  merged-branch evidence used to attribute stale root drift to merged page lanes.

## Planner-facing commands

| When | Command |
| --- | --- |
| Diagnose mergeability class, linkage gaps, and action queue for active PR-backed lanes | `bun run watch:active-pr-mergeability` |
| Inspect queue/worktree/PR linkage ledger with optional metadata refresh | `bun run report:queue-worktree-pr-linkage-ledger` |
| Planner batch dispatch: collision preflight before scheduling overlapping lanes | `bun run report:planner-batch-collision-preflight` |
| Planner worktree drift against active lanes | `bun run report:planner-worktree-drift-watchdog` |

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
  branch candidates, or current stamped lane metadata.
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
* `--session` for live `you work list` discovery in integration-style tests

Representative regression coverage lives in
`src/tests/discovery/linkage-classifier-report-compatibility.test.ts`.

## Related process docs

* [content-page-generation-workflow-relevant-files](./content-page-generation-workflow-relevant-files.md)
  — PR-head mergeability phase for page branches.
* [factory-batch-input-relevant-files](./factory-batch-input-relevant-files.md)
  — planner batch input examples.
