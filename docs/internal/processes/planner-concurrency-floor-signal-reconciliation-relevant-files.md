# Planner Concurrency-Floor Signal Reconciliation — Relevant Files

Use these files when changing useful-active lane counting, refill guidance,
blocked/hold/stale classifications, or the planner concurrency-floor report
contract.

## Core report and queue alignment

* `src/lib/factory/planner-concurrency-floor-report.ts` — report discovery,
  classification buckets, human/JSON serializers, and refill candidate ranking.
* `src/lib/factory/planner-queue-health.ts` — queue-health discovery reused for
  useful-active lanes, blocked dependencies, and terminal-complete alias maps.
* `src/lib/factory/planner-root-checkout-reconciliation.ts` — generated-artifact
  path helpers (`isTableRegistryGeneratedArtifactPath`) and page-refill hold
  guidance reused for drift suppression.
* `scripts/report-planner-concurrency-floor.ts` — planner-facing CLI that
  assembles live or fixture-backed evidence into the report contract.

## Documentation and tests

* `factory/docs/planner-concurrency-floor-report.md` — operator-facing report
  contract, classification taxonomy, and verification commands.
* `src/lib/factory/planner-concurrency-floor-report.test.ts` — focused unit
  fixtures for useful-active counting, blocked/hold/uncertainty separation,
  generated-artifact drift holds, and stale backlog visibility.
* `src/tests/ci/planner-concurrency-floor-command.test.ts` — CLI integration
  tests for human/JSON parity, backlog refill ranking, drift holds, and stale
  backlog output.

## Planner-facing command

```bash
bun run report:planner-concurrency-floor
```

Fixture-backed verification:

```bash
bun test src/lib/factory/planner-concurrency-floor-report.test.ts
bun test src/tests/ci/planner-concurrency-floor-command.test.ts
```

## Classification contract

* Derive `usefulActiveLaneCount` from queue-health `activeWork`, not
  keyword-only queue-state parsing. Include `task` and `review` work types plus
  untyped `PROCESSING` lanes; exclude backlog `idea` rows and non-lane
  `thoughts` loopbacks unless they are untyped processing evidence.
* Surface `expectedBlockedItems` as `blockedDependencyLanes`, temp-state and
  already-active holds as `heldBacklogCandidates`, and
  `refillRecommendation=uncertain` backlog rows as `advisoryUncertainties`.
* Derive `rootGeneratedArtifactDriftHold` from dirty
  `src/lib/content/generated/table-registry.generated.ts`; when
  `pageRefillHold=true`, downgrade page-oriented backlog candidates to `hold`
  and exclude them from `refillCandidates`.
* Classify stale backlog via `buildQueueTerminalCompleteAliasMap` plus explicit
  stale markers in task markdown; expose `staleBacklogCandidates` separately,
  exclude `status=stale` from `refillCandidates`, and bound human stale output
  with `STALE_BACKLOG_CANDIDATE_HUMAN_DISPLAY_LIMIT`.

## Factory linkage index

See also [factory-linkage-relevant-files](./factory-linkage-relevant-files.md)
for shared queue/worktree/PR linkage helpers that feed dirty-surface evidence
into planner reports.
