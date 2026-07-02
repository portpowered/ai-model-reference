# Planner Root Reconciliation Drift Handoff Relevant Files

Use these files when changing the narrow eight-path root reconciliation drift
handoff lane. This lane is read-only: it must not mutate the eight target root
paths listed in the PRD.

## Target paths (exact scope)

The handoff classifies exactly these eight root dirty paths:

* `docs/internal/processes/factory-linkage-relevant-files.md`
* `scripts/report-planner-root-checkout-reconciliation.ts`
* `src/lib/factory/planner-root-checkout-reconciliation.test.ts`
* `src/lib/factory/planner-root-checkout-reconciliation.ts`
* `src/tests/discovery/planner-root-checkout-reconciliation.test.ts`
* `src/tests/fixtures/planner-root-checkout-reconciliation/manual-inspection-shared-edits-dirty-status.txt`
* `src/tests/fixtures/planner-root-checkout-reconciliation/table-registry-drift-dirty-status.txt`
* `src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt`

## Core handoff module

* `src/lib/factory/planner-root-reconciliation-drift-handoff.ts` — read-only
  evidence capture for the eight paths: scoped
  `git status --short --branch -- <paths>`, root checkout reconciliation
  excerpts, worktree drift excerpts, active PR linkage summary, merged-lane
  metadata summary, per-path ownership classification with one next safe
  action, non-destructive scope boundaries, and page-refill gate guidance.
  Records `unavailable` when an evidence source cannot be collected. Page-refill
  clearance is withheld until all eight paths are `clean` or
  `existing-lane-owned`.
* `scripts/report-planner-root-reconciliation-drift-handoff.ts` — planner-facing
  CLI with fixture flags aligned to other factory reports.

## Upstream evidence sources

Reuse existing reports instead of duplicating git or lane parsing:

* `src/lib/factory/planner-root-checkout-reconciliation.ts`
* `src/lib/factory/planner-worktree-drift-watchdog.ts`
* `src/lib/factory/active-pr-mergeability-watchdog.ts`
* `src/lib/factory/planner-merged-lane-evidence.ts`

## Planner-facing command

| When | Command |
| --- | --- |
| Capture read-only drift evidence and per-path ownership classification for the eight root reconciliation paths | `bun ./scripts/report-planner-root-reconciliation-drift-handoff.ts` |

## Fixture-backed verification

When report, parser, or classifier logic changes, add or extend fixture-backed
tests under `src/lib/factory/planner-root-reconciliation-drift-handoff.test.ts`
using fixtures in
`src/tests/fixtures/planner-root-reconciliation-drift-handoff/`. Tests should
assert observable emitted behavior (path-level classifications, evidence source
labels, scope boundaries, page-refill gate) for the eight-path drift shape
without meta inventories of routes, docs links, or command lists.

Fixture flags mirror other planner reports:

* `--status-output`
* `--work-list-json`
* `--session-list-json`
* `--worktrees-dir`
* `--pr-map-json`
* `--skip-lane-discovery`
* `--skip-worktree-drift`
* `--skip-merged-lane-metadata`
* `--reported-drift-at-utc`

## Related process docs

* [factory-linkage-relevant-files](./factory-linkage-relevant-files.md) —
  upstream reconciliation and linkage classification surfaces.
