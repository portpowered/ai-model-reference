# Ownerless Root Drift Operator Handoff Relevant Files

Planner-facing operator handoff for root checkout drift ownership classification.

## Core modules

- `src/lib/factory/planner-root-drift-operator-handoff.ts` — evidence discovery, supplied ownership constants, watchdog discrepancy classification, and report formatters.
- `scripts/report-planner-root-drift-operator-handoff.ts` — CLI entrypoint with human, JSON, and markdown output plus `--write-artifact`.

## Fixtures

- `src/tests/fixtures/planner-root-drift-operator-handoff/nine-dirty-paths-status.txt` — nine-path porcelain snapshot used when live root evidence is unavailable.

## Artifacts

- `docs/internal/processes/ownerless-root-drift-operator-handoff-evidence.md` — committed handoff evidence artifact (not one of the nine dirty root paths).

## Patterns

- Split supplied ownership into `PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS` (3 paths) and `PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS` (6 paths) attributed to `tokenizer-mismatch-root-drift-reconciliation`.
- When watchdog ownerless evidence is absent, default to treating all dirty paths as watchdog-reported ownerless so batch-054-owned paths surface as `requires-operator-verification`.
- Pass `watchdogSnapshot` or `watchdogOwnerlessPaths` to override the default watchdog classification input.
