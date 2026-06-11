# Phase 1 batch-010 built-app convergence validator

After batch-010 repairs for the default spawned-server path in
`make verify-phase-1-ux`, run one planner-facing built-app gate that exercises
`make build` followed by the canonical verifier with `VERIFY_BASE_URL` unset.
The workflow prints a **Phase 1 batch-010 built-app convergence evidence
summary** that separates verifier command-path health (build present, spawn,
readiness, teardown) from customer-ask convergence row outcomes so loopback can
close the verifier-harness regression or queue one more narrow Phase 1 repair.

## Command

```sh
make verify-phase-1-built-app-convergence
# or: bun run verify:phase-1-built-app-convergence
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
   gate and **Customer-ask convergence report**

Subprocess stdout and stderr stream to the terminal while being captured for
evidence parsing. If `make build` fails, the validator skips the verifier,
appends the missing-build lifecycle message, and still prints the evidence
summary.

## Exit semantics

| Condition | Exit code |
| --- | --- |
| Verifier command-path `pass` and every customer-ask row is `pass` or `uncertain` | `0` |
| Verifier command-path `fail` (missing `.next/`, spawn timeout, early child exit, no free port, and similar lifecycle errors) | `1` |
| Any customer-ask row is `fail` | `1` |

`uncertain` command-path or customer-ask rows remain non-blocking for the
process exit code. Copy uncertain reasons into planner notes for manual
follow-up.

## Verifier command-path evidence

The summary includes a dedicated **verifier command-path** domain row that
answers whether `make verify-phase-1-ux` failed because the spawned-server
harness broke or because a reader-route or customer-ask assertion failed.

| `status` | Meaning |
| --- | --- |
| `pass` | Production build was present, the child server spawned, readiness succeeded, and the **Customer-ask convergence report** printed (check failures still produce the report) |
| `fail` | Lifecycle error before checks complete: missing `.next/`, server startup timeout, early child exit, no free verify port, or `make build` failure |
| `uncertain` | `VERIFY_BASE_URL` was set, or captured output lacks both lifecycle failure signals and the customer-ask report |

| Field | Value |
| --- | --- |
| `domainId` | `verifier-command-path` |
| `checklistRow` | `phase-1-built-app-verifier-harness` |

Example domain line:

```txt
[PASS] verifier-command-path — Built-app verifier command path (spawn, readiness, teardown) — checklistRow=phase-1-built-app-verifier-harness
```

When not passing, the line includes a human-readable reason after the label.

## Customer-ask convergence evidence

`make verify-phase-1-ux` continues to print the structured **Customer-ask
convergence report** with one line per batch-008 check (`checkId`, route or
query, `pass` / `fail` / `uncertain`, reason, `checklistRow`). The built-app
convergence summary aggregates those rows under the `customer-ask-convergence`
domain and repeats each `checkId` as an indented source line.

See
[`factory/docs/phase-1-customer-ask-convergence-validator.md`](./phase-1-customer-ask-convergence-validator.md)
for the full per-row check inventory, report line format, and row-level exit
semantics.

| Field | Value |
| --- | --- |
| `domainId` | `customer-ask-convergence` |
| `checklistRow` | `phase-1-customer-ask-convergence` |

## Built-app convergence evidence summary

After the verifier finishes, the workflow prints a **Phase 1 batch-010
built-app convergence evidence summary** with:

| Section | Content |
| --- | --- |
| Header | `Phase 1 batch-010 built-app convergence evidence summary` |
| Command-path row | Aggregated verifier harness `pass`, `fail`, or `uncertain` |
| Customer-ask domain row | Aggregated status across all parsed customer-ask rows |
| Per-checkId source lines | One indented line per `checkId` from `make verify-phase-1-ux` |
| Recommendation | Actionable loopback decision |
| Rationale | Human-readable explanation tied to failing or uncertain evidence |

Example:

```txt
Phase 1 batch-010 built-app convergence evidence summary
[PASS] verifier-command-path — Built-app verifier command path (spawn, readiness, teardown) — checklistRow=phase-1-built-app-verifier-harness
[FAIL] customer-ask-convergence — Customer-ask convergence checks — checklistRow=phase-1-customer-ask-convergence
  [PASS] make verify-phase-1-ux — home.header-search-entry
  [FAIL] make verify-phase-1-ux — docs.footer-hover-focus-parity — bundled app CSS missing footer sublabel hover/focus inherit rule pairing
Recommendation: queue-one-narrow-repair-batch
Rationale: Built-app gate evidence failed: customer-ask checkId(s): docs.footer-hover-focus-parity. Queue one narrow repair batch before closing the verifier-harness regression or Phase 1 stop-and-wait.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Verifier command-path `fail` or any customer-ask row `fail` | `queue-one-narrow-repair-batch` |
| Command-path `pass` and every customer-ask row `pass` (no `fail`, no `uncertain`) | `close-verifier-harness-regression` |
| No `fail` rows, but command-path or any customer-ask row is `uncertain` | `stop-and-wait-for-phase-advancement` |

`close-verifier-harness-regression` applies only when command-path and every
customer-ask row are `pass`. Any `uncertain` evidence routes to
stop-and-wait with manual follow-up notes.

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/phase-1-built-app-verifier-command-path.ts` | Command-path pass/fail/uncertain derivation from captured verifier output |
| `src/lib/verify/phase-1-built-app-convergence-evidence.ts` | Evidence summary, recommendation rules, customer-ask report parsing |
| `src/lib/verify/phase-1-convergence-evidence.ts` | Shared customer-ask report parser used by batch-009 and batch-010 summaries |
| `scripts/run-phase-1-built-app-convergence-validator.ts` | CLI entrypoint invoked by `make verify-phase-1-built-app-convergence` |
| `scripts/verify-phase-1-route-search-ux.ts` | Existing built-app verifier (unchanged second stage) |

## Loopback usage

During batch-010 loopback:

1. Run `make verify-phase-1-built-app-convergence` after verifier lifecycle
   repairs land. Do not export `VERIFY_BASE_URL` for the canonical gate.
2. Record the process exit code.
3. Copy the **built-app convergence evidence summary** (command-path row,
   customer-ask domain row, per-`checkId` source lines, recommendation, and
   rationale) into planner notes with `domainId` or `checkId` and
   `checklistRow`.
4. Follow the printed recommendation:
   - `queue-one-narrow-repair-batch` when command-path or any customer-ask
     row failed
   - `close-verifier-harness-regression` when command-path and all customer-ask
     rows passed
   - `stop-and-wait-for-phase-advancement` when only non-blocking `uncertain`
     evidence remains

When command-path fails, use the printed lifecycle reason to scope a single
bounded repair without re-investigating spawn, port selection, or readiness.
