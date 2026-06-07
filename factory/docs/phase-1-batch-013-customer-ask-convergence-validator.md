# Phase 1 batch-013 customer-ask convergence validator

After batch-013 repairs for reopened glossary opening-summary removal,
embedding description inline links, vector/hidden-size glossary routes, and
grouped-query-attention deduplication/graph/math land, run one planner-facing
convergence pass that exercises `make build` followed by the canonical built-app
verifier with `VERIFY_BASE_URL` unset. The workflow prints a **Phase 1 batch-013
convergence evidence summary** scoped to the reopened batch-013 inventory so
ideafy can queue one more narrow repair batch or stop and wait for customer
Phase 1 advancement.

**Prior batch-012 convergence evidence is stale for the narrower batch-013
reopened-row set.** Refresh evidence only through
`make verify-phase-1-batch-013-convergence` after batch-013 repairs land.

## Command

```sh
make verify-phase-1-batch-013-convergence
# or: bun run verify:phase-1-batch-013-convergence
```

## Prerequisites

- Bun dependencies installed (`bun install`)
- Playwright Chromium for live browser checks (`npx playwright install chromium`)
- Production build output (`.next/`) is produced inside the workflow by `make build`
- **Canonical validation must not set `VERIFY_BASE_URL`.** The validator
  deletes `VERIFY_BASE_URL` from the child process environment so the default
  spawn path on `127.0.0.1` (ports 3100–3999) is exercised. When
  `VERIFY_BASE_URL` is set in the parent shell, command-path evidence is
  `uncertain` even if checks pass.

## Workflow order

1. `make build` — production bundle plus Phase 1 static route check
2. `make verify-phase-1-ux` with `VERIFY_BASE_URL` unset — built-app manual
   gate and **Customer-ask convergence report** for the full Phase 1 inventory

Subprocess stdout and stderr stream to the terminal while being captured for
evidence parsing. If `make build` fails, the validator skips the verifier,
appends the missing-build lifecycle message, and still prints the evidence
summary.

The batch-013 summary extracts only the reopened-row inventory from the full
customer-ask report. Missing inventory slots appear as `fail` rows with reason
`missing from customer-ask convergence report`.

## Exit semantics

| Condition | Exit code |
| --- | --- |
| Verifier command-path `pass` and every batch-013 customer-ask row is `pass` or `uncertain` | `0` |
| Verifier command-path `fail` (missing `.next/`, spawn timeout, early child exit, no free port, and similar lifecycle errors) | `1` |
| Any batch-013 customer-ask row is `fail` | `1` |

`uncertain` command-path or customer-ask rows remain non-blocking for the
process exit code. Copy uncertain reasons into planner notes for manual
follow-up.

## Verifier command-path evidence

The summary includes a dedicated **verifier command-path** domain row that
answers whether `make verify-phase-1-ux` failed because the spawned-server
harness broke or because a reader-route or customer-ask assertion failed.

| Field | Value |
| --- | --- |
| `domainId` | `verifier-command-path` |
| `checklistRow` | `phase-1-built-app-verifier-harness` |

Example domain line:

```txt
[PASS] verifier-command-path — Built-app verifier command path (spawn, readiness, teardown) — checklistRow=phase-1-built-app-verifier-harness
```

## Customer-ask convergence evidence

`make verify-phase-1-ux` prints the structured **Customer-ask convergence
report** for the full Phase 1 inventory. The batch-013 convergence summary
extracts the **13 reopened rows** below, aggregates them under the
`customer-ask-convergence` domain, and repeats each `checkId` as an indented
source line.

| Field | Value |
| --- | --- |
| `domainId` | `customer-ask-convergence` |
| `checklistRow` | `phase-1-batch-013-customer-ask-convergence` |

### Report line format

Each customer-ask row prints as:

```txt
[STATUS] checkId — title (route=..., query=...) — reason — checklistRow=...
```

## Batch-013 check inventory

The batch-013 report emits **13 ordered rows** for the reopened glossary and
grouped-query-attention repair set only. Authoritative ordering lives in
`src/lib/verify/batch-013-customer-ask-check-inventory.ts`.

| checkId | Route / surface | checklistRow |
| --- | --- | --- |
| `glossary.no-rendered-opening-summary` | `/docs/glossary/token` | `phase-1-glossary-page` |
| `glossary.no-rendered-opening-summary` | `/docs/glossary/embedding` | `phase-1-glossary-page` |
| `glossary.no-rendered-opening-summary` | `/docs/glossary/vector` | `phase-1-glossary-page` |
| `glossary.no-rendered-opening-summary` | `/docs/glossary/hidden-size` | `phase-1-glossary-page` |
| `glossary.embedding-description-links` | `/docs/glossary/embedding` | `phase-1-glossary-page` |
| `pages.vector-route` | `/docs/glossary/vector` | `phase-1-glossary-page` |
| `pages.hidden-size-route` | `/docs/glossary/hidden-size` | `phase-1-glossary-page` |
| `module.no-duplicate-body-heading` | `/docs/modules/grouped-query-attention` | `phase-1-module-page` |
| `module.no-metadata-card` | `/docs/modules/grouped-query-attention` | `phase-1-module-page` |
| `module.single-tag-list` | `/docs/modules/grouped-query-attention` | `phase-1-module-page` |
| `module.graph-theme-readability` | `/docs/modules/grouped-query-attention` | `phase-1-module-page` |
| `module.no-duplicate-math-graph` | `/docs/modules/grouped-query-attention` | `phase-1-module-page` |
| `module.math-qkv-definitions` | `/docs/modules/grouped-query-attention` | `phase-1-module-page` |

Retained batch-008, batch-011, and batch-012 rows continue to run inside
`make verify-phase-1-ux` but are excluded from the batch-013 evidence summary.

## Manual visual checks

| checkId | Manual step |
| --- | --- |
| `module.graph-theme-readability` | Follow [`factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md`](./phase-1-batch-012-gqa-graph-visibility-manual-check.md) when the automated row is `uncertain` |

## Batch-013 convergence evidence summary

After the verifier finishes, the workflow prints a **Phase 1 batch-013
convergence evidence summary** with:

| Section | Content |
| --- | --- |
| Header | `Phase 1 batch-013 convergence evidence summary` |
| Command-path row | Aggregated verifier harness `pass`, `fail`, or `uncertain` |
| Customer-ask domain row | Aggregated status across extracted batch-013 rows |
| Per-checkId source lines | One indented line per reopened inventory `checkId` |
| Recommendation | Actionable loopback decision |
| Rationale | Human-readable explanation tied to failing or uncertain evidence |

Example:

```txt
Phase 1 batch-013 convergence evidence summary
[PASS] verifier-command-path — Built-app verifier command path (spawn, readiness, teardown) — checklistRow=phase-1-built-app-verifier-harness
[FAIL] customer-ask-convergence — Customer-ask convergence checks — checklistRow=phase-1-batch-013-customer-ask-convergence
  [PASS] make verify-phase-1-ux — glossary.no-rendered-opening-summary
  [FAIL] make verify-phase-1-ux — glossary.embedding-description-links — embedding description paragraph missing resolved inline links
Recommendation: queue-one-narrow-repair-batch
Rationale: Batch-013 evidence failed: customer-ask checkId(s): glossary.embedding-description-links. Queue one narrow repair batch before Phase 1 stop-and-wait.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Verifier command-path `fail` or any batch-013 customer-ask row `fail` | `queue-one-narrow-repair-batch` |
| Command-path `pass`, no batch-013 customer-ask `fail`, and all extracted rows `pass` or `uncertain` | `stop-and-wait-for-phase-advancement` |

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/batch-013-customer-ask-check-inventory.ts` | Batch-013 reopened-row inventory, report slot ordering, report extraction |
| `src/lib/verify/phase-1-batch-013-convergence-evidence.ts` | Evidence summary, recommendation rules, exit semantics |
| `scripts/run-phase-1-batch-013-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-batch-013-convergence` |
| `scripts/verify-phase-1-route-search-ux.ts` | Built-app verifier printing the full customer-ask report |

## Loopback usage

During batch-013 loopback:

1. Run `make verify-phase-1-batch-013-convergence` after batch-013 repairs land.
   Do not export `VERIFY_BASE_URL` for the canonical gate.
2. Record the process exit code.
3. Copy the **batch-013 convergence evidence summary** into planner notes with
   `domainId` or `checkId` and `checklistRow`.
4. Follow the printed recommendation:
   - `queue-one-narrow-repair-batch` when command-path or any batch-013
     customer-ask row failed — scope repairs to failing reopened `checkId`
     rows only
   - `stop-and-wait-for-phase-advancement` when command-path passed and no
     batch-013 customer-ask row failed — copy any `uncertain` reasons into
     manual follow-up notes and wait for customer Phase 1 advancement

For keyboard shortcut gaps when `VERIFY_SEARCH_SHORTCUT_SKIP=1`, follow the
manual check in
[`factory/docs/phase-1-built-app-verifier-keyboard-fallback.md`](./phase-1-built-app-verifier-keyboard-fallback.md).
