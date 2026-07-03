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
summary useful-active=<count> floor=<count> status=<below-target|at-target|above-target> refill-needed=<count> blocked-dependencies=<count> held-backlog=<count> advisory-uncertain=<count> advisory-only=true
```

Interpretation:

* `useful-active` counts live task and review queue lanes that queue-health already classifies as active work, including factory states such as `init`, `in-review`, and `to-complete`. Known stale cron noise and superseded historical loopbacks stay excluded from that count.
* `blocked-dependencies` counts queue lanes with explicit dependency blockers from queue-health. These lanes are shown separately and are not treated as useful active refill capacity.
* `held-backlog` counts planner-owned backlog tasks that are already active or explicitly held in planner temp-state notes.
* `advisory-uncertain` counts planner-owned backlog tasks whose refill recommendation is `uncertain` because collision evidence is incomplete or only partial.
* `status=below-target` means useful concurrency is under the configured floor, so the planner should review `Refill Candidates`.
* `refill-needed` is the remaining lane count needed to reach the floor.
* `Blocked Dependency Lanes` shows queue items waiting on unfinished dependencies with dependency and reason detail.
* `Held Backlog Candidates` shows planner-owned tasks that are already active or explicitly held.
* `Advisory Uncertainties` shows backlog tasks that need planner judgment before refill because evidence is incomplete or only partial.
* `Planner-Owned Backlog Candidates` shows the full scanned planner-owned task set with hold evidence and collision context.
* `Refill Candidates` shows only eligible candidates when the useful active lane count is below target.

Recommendation levels:

* `recommendation=prefer` means grounded repo-path evidence with no active alias or current dirty-surface conflict.
* `recommendation=uncertain` means evidence is incomplete or partial and needs planner judgment.
* `recommendation=hold` means the candidate is already active, explicitly held in planner temp state, or overlaps current planner dirty paths closely enough to avoid dispatch.

The JSON output carries the same result as the human summary and is versioned with `contractVersion: "planner-concurrency-floor/v1"`.

## Safety

This report is advisory only. It does not submit work, mutate queue state, or resolve holds automatically.
