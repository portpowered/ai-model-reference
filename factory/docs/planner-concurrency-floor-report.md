# Planner Concurrency-Floor Report

Use the repo-local planner capacity summary when you need one advisory snapshot of live useful concurrency, the target floor, and the safest planner-owned refill candidates.

## Command

```sh
bun run report:planner-concurrency-floor
```

Useful flags:

```sh
bun run report:planner-concurrency-floor -- --floor 4 --session ~planner
bun run report:planner-concurrency-floor -- --format json
bun run report:planner-concurrency-floor -- --help
```

## Inputs

By default the command reads:

* live queue evidence from `you work list --session <session>`
* planner-owned backlog task markdown under `tasks/`
* optional hold evidence under `docs/temp/`
* planner-root dirty-surface evidence from `git status --porcelain=v1 --untracked-files=all`

For tests or offline inspection, replace live sources with:

* `--work-list-json <path>`
* `--tasks-root <path>`
* `--temp-root <path>`
* `--root-git-status-file <path>`

## How To Read The Report

The summary line is the stable top-level contract for human output:

```txt
summary useful-active=<count> floor=<count> status=<below-target|at-target|above-target> refill-needed=<count> blocked-dependencies=<count> held-backlog=<count> advisory-uncertain=<count> stale-backlog=<count> page-refill-hold=<true|false> advisory-only=true
```

Interpretation:

* `useful-active` counts live task and review queue lanes that queue-health already classifies as active work, including factory states such as `init`, `in-review`, and `to-complete`. Known stale cron noise and superseded historical loopbacks stay excluded from that count.
* `blocked-dependencies` counts queue lanes with explicit dependency blockers from queue-health. These lanes are shown separately and are not treated as useful active refill capacity.
* `held-backlog` counts planner-owned backlog tasks that are already active or explicitly held in planner temp-state notes.
* `advisory-uncertain` counts planner-owned backlog tasks whose refill recommendation is `uncertain` because collision evidence is incomplete or only partial.
* `stale-backlog` counts planner-owned backlog tasks classified as stale because they match terminal-complete queue lanes or explicit stale-backlog markers in the task file.
* `status=below-target` means useful concurrency is under the configured floor, so the planner should review `Refill Candidates`.
* `refill-needed` is the remaining lane count needed to reach the floor.
* `Blocked Dependency Lanes` shows queue items waiting on unfinished dependencies with dependency and reason detail.
* `Held Backlog Candidates` shows planner-owned tasks that are already active or explicitly held.
* `Advisory Uncertainties` shows backlog tasks that need planner judgment before refill because evidence is incomplete or only partial.
* `Stale Backlog Candidates` shows terminal-complete or explicitly marked backlog tasks for planner awareness. They are not preferred refill work and do not increase `refill-needed`.
* `page-refill-hold=true` means explicit root generated-artifact drift is present and page-oriented refill candidates are suppressed until generated artifacts are reconciled.
* `Root Generated-Artifact Drift Hold` shows blocking paths and guidance when page refill is held for generated-artifact drift.
* `Planner-Owned Backlog Candidates` shows the full scanned planner-owned task set with hold evidence and collision context.
* `Refill Candidates` shows only eligible candidates when the useful active lane count is below target.

Recommendation levels:

* `recommendation=prefer` means grounded repo-path evidence with no active alias or current dirty-surface conflict.
* `recommendation=uncertain` means evidence is incomplete or partial and needs planner judgment.
* `recommendation=hold` means the candidate is already active, explicitly held in planner temp state, overlaps current planner dirty paths closely enough to avoid dispatch, or page refill is held because root generated-artifact drift is present.

The JSON output carries the same result as the human summary and is versioned with `contractVersion: "planner-concurrency-floor/v1"`.

## Report Contract

Human and JSON output share one advisory contract. The summary line counts are derived from the same arrays that appear in the sectioned body and JSON payload.

### Classification buckets

| Bucket | Source | Counted in `useful-active` | Affects `refill-needed` | Preferred refill |
| --- | --- | --- | --- | --- |
| Useful active lanes | Queue-health `activeWork` filtered to `task`, `review`, and untyped `PROCESSING` lanes | yes | reduces gap | n/a |
| Blocked dependency lanes | Queue-health `expectedBlockedItems` | no | no | no |
| Held backlog candidates | Temp-state holds and already-active alias collisions | no | no | no |
| Advisory uncertainties | Backlog tasks with `refillRecommendation=uncertain` | no | no | no |
| Stale backlog candidates | Terminal-complete alias matches or explicit stale markers | no | no | no |
| Ignored stale noise | Superseded loopbacks and cron failure noise | no | no | no |
| Root generated-artifact drift hold | Dirty `table-registry.generated.ts` on planner root | no | no | suppresses page-oriented refill |

Useful active counting aligns with queue-health rather than keyword-only queue-state parsing. Factory states such as `init`, `in-review`, and `to-complete` count when the lane is active task, review, or processing work.

### JSON fields

Top-level JSON fields mirror the human summary and sectioned output:

* `contractVersion` — always `"planner-concurrency-floor/v1"`.
* `advisoryOnly` — always `true`.
* `usefulActiveLaneCount`, `concurrencyFloor`, `floorStatus`, `lanesNeededToReachFloor` — summary counts.
* `usefulActiveLanes` — active task, review, and processing lanes with `workItemName`, `rawState`, and optional `sessionId`.
* `blockedDependencyLanes` — dependency blockers with `dependencies`, `reasons`, and queue identity fields.
* `heldBacklogCandidates` — held or already-active backlog tasks with `holdReasons` and `status`.
* `advisoryUncertainties` — uncertain backlog tasks with `uncertaintyReasons` and evidence quality.
* `staleBacklogCandidates` — stale backlog tasks with `staleReasons` and terminal alias evidence when present.
* `ignoredStaleNoise` — grouped cron and superseded loopback noise excluded from useful-active counts.
* `plannerOwnedBacklogCandidates` — full scanned backlog set with refill recommendation, hold reasons, and collision context.
* `refillCandidates` — eligible preferred refill work when below floor; excludes `hold`, `stale`, and ineligible rows.
* `rootGeneratedArtifactDriftHold` — `pageRefillHold`, `blockingPaths`, and human-readable `guidance` when page refill is held.
* `issues` — queue-health collection issues, if any.

When `rootGeneratedArtifactDriftHold.pageRefillHold=true`, page-oriented backlog tasks downgrade to `recommendation=hold` and are omitted from `refillCandidates`. Non-page factory backlog tasks may still appear as refill candidates.

Stale backlog candidates remain in `staleBacklogCandidates` and JSON for planner awareness but never increase `refill-needed` or appear under `Refill Candidates`. Human output bounds the stale section to `STALE_BACKLOG_CANDIDATE_HUMAN_DISPLAY_LIMIT` rows while JSON retains the full list.

## Verification

Focused contract tests live beside the report implementation:

```sh
bun test src/lib/factory/planner-concurrency-floor-report.test.ts
bun test src/tests/ci/planner-concurrency-floor-command.test.ts
```

Fixture coverage map:

* queue-health-style active `task`, `review`, and `processing` lanes produce a nonzero `usefulActiveLaneCount` and matching human/JSON summary fields
* blocked dependencies, held backlog, and advisory uncertainty stay separate from useful-active counts
* root generated-artifact drift suppresses page-oriented refill recommendations while keeping factory backlog candidates eligible
* stale backlog candidates stay visible without becoming preferred refill work or increasing `refill-needed`

Process executors should also read [planner-concurrency-floor-signal-reconciliation-relevant-files](../../docs/internal/processes/planner-concurrency-floor-signal-reconciliation-relevant-files.md) for file ownership and queue-health alignment notes.

## Safety

This report is advisory only. It does not submit work, mutate queue state, or resolve holds automatically.
