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
  `manual-inspection-shared-edits` with preserve guidance, names generated
  table-registry drift under `generated-table-registry-drift` with
  `generated-artifact` and `table-registry-associated-runtime` families plus
  validation/regeneration guidance, names conflict-drift PRs under
  `conflict-drift-prs` with branch-refresh guidance and optional metadata-refresh
  guidance when linkage refresh is required, and prints operator next actions
  (page-refill hold or resume, merge-conflict priority guidance, safe cleanup
  path for remote-present deletions, generated drift and conflict-drift counts,
  manual ownership inspection) with target session
  `0fdc5077-95ed-4396-a183-06e5b16555ca`.
* `src/lib/factory/planner-latent-diffusion-root-deletion-reconciliation.ts` —
  read-only landed-evidence verification for the latent diffusion paper page
  repair lane: confirms PR #264 / merge `3ea842f` in `origin/main` lineage,
  checks page bundle, registry, citation, graph, and focused-test surfaces on
  `origin/main`, records root-checkout dirty paths separately from shipped
  main evidence, inspects completed `latent-diffusion-paper-page`
  worktree/branch path evidence against `origin/main`, classifies every
  reconciliation dirty path by ownership/intent, and emits root reconciliation
  outcomes for safe stale-drift restore vs operator handoff plus content-lane
  hold/release decisions. See
  [latent-diffusion-root-deletion-reconciliation-relevant-files](./latent-diffusion-root-deletion-reconciliation-relevant-files.md).
* `src/lib/factory/planner-merged-lane-evidence.ts` — terminal-complete and
  merged-branch evidence used to attribute stale root drift to merged page lanes.
* `src/lib/factory/terminal-lane-main-branch-landing-audit.ts` — read-only
  terminal or near-terminal lane candidate discovery for main-branch landing
  audits; reuse `parseTerminalCompleteWorkItems` / queue TERMINAL evidence and
  worktree metadata instead of duplicating lane parsing. Surface comparison uses
  `git cat-file -e <main-ref>:<path>` for main evidence and
  `parsePlannerRelevantDirtyPaths` for planner-root drift, keeping those signals
  separate. Expected surfaces accept explicit per-lane fixtures or derive from
  branch diff filtered to page-bundle, registry-record, and focused-test paths.
  Landing-status classification consumes `TerminalLaneLandingSurfaceComparison`
  plus optional candidate terminal-state evidence to emit
  `landed` / `remote-only` / `partial` / `reconciliation-required` with cited
  surface reasons. Full planner report output is assembled by
  `collectTerminalLaneMainBranchLandingAuditReport` with grouped human-readable
  and JSON serializers plus recommended planner actions. Mismatch regression
  tests should exercise the full collect pipeline with fixture git status and
  assert page-bundle, registry-record, and focused-test surface names in both
  human-readable and JSON report output.

## Planner-facing commands

| When | Command |
| --- | --- |
| Diagnose mergeability class, linkage gaps, and action queue for active PR-backed lanes | `bun run watch:active-pr-mergeability` |
| Inspect queue/worktree/PR linkage ledger with optional metadata refresh | `bun run report:queue-worktree-pr-linkage-ledger` |
| Planner batch dispatch: collision preflight before scheduling overlapping lanes | `bun run report:planner-batch-collision-preflight` |
| Planner worktree drift against active lanes | `bun run report:planner-worktree-drift-watchdog` |
| Terminal or near-terminal lane landing audit against main | `bun run report:terminal-lane-main-branch-landing-audit` |
| Root checkout reconciliation against HEAD and origin/main | `bun run report:planner-root-checkout-reconciliation` |
| Latent diffusion root deletion landed-evidence verification | `bun run report:planner-latent-diffusion-root-deletion-reconciliation` |
| Merged PR drain row evidence for PRs #281/#282/#284/#286 | `bun run report:merged-pr-drain-rows-reconciliation` |
| Planner concurrency floor: useful active lanes, refill guidance, and hold/stale classifications | `bun run report:planner-concurrency-floor` |

Direct script paths remain supported for fixture-driven tests:

* `bun ./scripts/active-pr-mergeability-watchdog.ts`
* `bun ./scripts/report-queue-worktree-pr-linkage-ledger.ts`
* `bun ./scripts/report-terminal-lane-main-branch-landing-audit.ts`
* `bun ./scripts/report-planner-root-checkout-reconciliation.ts`
* `bun ./scripts/report-planner-latent-diffusion-root-deletion-reconciliation.ts`
* `bun ./scripts/report-merged-pr-drain-rows-reconciliation.ts`
* `bun ./scripts/report-planner-concurrency-floor.ts`

Concurrency-floor report contract details:
[planner-concurrency-floor-signal-reconciliation-relevant-files](./planner-concurrency-floor-signal-reconciliation-relevant-files.md).

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
* `stale-clean-pr-mismatch` — open PR with `mergeability=mergeable` and
  `checks=passing` while the queue token is `failed`; surfaced as
  `lane-kind=stale-clean-pr-mismatch` with `mismatch-reason=` evidence in the
  active PR watchdog and linkage ledger `Stale PR Mismatch Summary` section,
  not counted as active page implementation depth.

Reuse `isQueueOnlyMissingLinkageLane`, `isStaleFailedLoopbackLane`,
`isStaleCleanPrMismatchLane`, `isActionableLinkageGapLane`, and
`partitionLinkageLanesForSummary` instead of duplicating filters in scripts or
planner preflight.

## Fixture inputs for tests

Linkage script tests should prefer observable command output over source
inventory checks. Supported fixture flags:

* `--work-list-json`
* `--session-list-json`
* `--worktrees-dir`
* `--pr-map-json`
* `--status-output` for root checkout reconciliation fixture status porcelain
  (`mixed-dirty-status.txt`, `tokenizer-mismatch-dirty-status.txt`,
  `manual-inspection-shared-edits-dirty-status.txt`,
  `table-registry-drift-dirty-status.txt`)
* `--session` for live `you work list` discovery in integration-style tests

Representative regression coverage lives in
`src/tests/discovery/linkage-classifier-report-compatibility.test.ts`,
`src/tests/discovery/tokens-per-second-stale-pr-follow-up-compatibility.test.ts`
(PR #251 stale-clean mismatch fixture for watchdog action queue and ledger
`Stale PR Mismatch Summary`),
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
* [tokens-per-second-stale-pr-follow-up-relevant-files](./tokens-per-second-stale-pr-follow-up-relevant-files.md)
  — stale PR #251 vs failed `work-task-155` / `idea:to-complete` evidence snapshot
  and watchdog `risk=queue-stale` classification for the serving-metric lane.
  Story 003 drift proof: branch diff limited to `docs/internal/processes/*`;
  verify with `git diff main...HEAD --name-only` and
  `bun run report:planner-root-checkout-reconciliation` on the planner root.
* [generic-pr277-pr279-conflict-refresh-handoff-relevant-files](./generic-pr277-pr279-conflict-refresh-handoff-relevant-files.md)
  — PR #277/#279 conflict-refresh evidence: batch 066 drain ownership on session
  `930b51a6-07ce-44e6-a639-7a6217f6e864`, stamped lane metadata for both target
  branches, DIRTY/CONFLICTING GitHub state with passing CI, and non-mutating
  merge-tree conflict paths for story 002 classification.
* [clean-open-pr-drain-current-handoffs-relevant-files](./clean-open-pr-drain-current-handoffs-relevant-files.md)
  — live evidence for open/merged handoff PRs #294/#290/#273/#271/#268/#251:
  queue row mapping on session `930b51a6-07ce-44e6-a639-7a6217f6e864`, mergeability
  and CI status, PR #294 merged/consumed proof, conflict-drift on #290/#273,
  merge-ready #271/#268, queue-stale and review-blocked #251, read-only capture
  boundary for story 001, story 002 per-PR convergence outcomes
  (`already-consumed`, `merge-ready-handoff`, `blocked-owner-handoff`,
  `duplicate-or-stale`) with duplicate-content guard table, and story 003 content
  PR handoffs for #271 (merge-ready), #290 (duplicate-or-stale close), and #251
  (blocked-owner) with browser verification on consumed #289 main surface and
  merge-ready #271 owner worktree, story 004 non-content repair handoffs for
  #273 (blocked merge/queue recovery), #268 (merge-ready terminal-audit), and
  #294 (already-consumed generic conflict refresh) with dirty-root and
  no-new-content scope guards, and story 005 final planner drain report with
  per-PR outcome table, planner action buckets (consume/review/blocked), scope
  safety confirmation, and quality-gate evidence.
* [dirty-generic-pr277-pr279-conflict-refresh-relevant-files](./dirty-generic-pr277-pr279-conflict-refresh-relevant-files.md)
  — batch 074 follow-up after completed batch 073 handoff: fresh DIRTY/CONFLICTING
  state on heads `6a1530a0` / `e5defbc8`, batch 066 drain still `idea:init`,
  expanded merge-tree conflict set on #277 (four paths), and PR conversation
  blocking feedback status for story 002 classification.
* [merged-pr-drain-rows-274-276-278-280-reconciliation-relevant-files](./merged-pr-drain-rows-274-276-278-280-reconciliation-relevant-files.md)
  — merged PR drain evidence for PRs #274/#275/#276/#278/#280: live queue tokens
  on session `930b51a6-07ce-44e6-a639-7a6217f6e864`, stamped lane metadata,
  merge-commit ancestry on `origin/main`, explicit separation of merged PR
  truth from queue completion truth, story 002 per-row consume/complete/no-op
  classification, story 003 consume execution for `rlvr-pr275-drain`
  (`you work move` to `complete` on session `930b51a6-07ce-44e6-a639-7a6217f6e864`),
  story 004 zero-target complete handoff (no completion transitions required),
  story 005 no-op handoffs for five already-terminal primary lanes plus
  `ownerless-rlvr-navigation-root-dirty-handoff` (unfinished root-dirty classification),
  and story 006 final verification (root clean, docs-only branch diff, one queue
  consume before/after recorded, content worktree drift untouched).
