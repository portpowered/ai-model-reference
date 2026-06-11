# Phase 1 batch-012 customer-ask convergence validator

After batch-012 repairs for responsive mobile hamburger header, glossary
opening-summary removal, tag/search decoration, missing attention/vector/hidden-size
pages, and grouped-query-attention deduplication/graph/math land, run one
planner-facing convergence pass that exercises `make build` followed by the
canonical built-app verifier with `VERIFY_BASE_URL` unset. The workflow prints a
**Phase 1 batch-012 convergence evidence summary** that separates verifier
command-path health from the expanded batch-012 customer-ask inventory (alongside
retained batch-008 and batch-011 rows) so ideafy can queue one more narrow repair
batch or stop and wait for customer Phase 1 advancement.

**Prior batch-008, batch-010, and batch-011 follow-up all-pass evidence is stale
for the batch-012 inventory.** Refresh evidence only through
`make verify-phase-1-batch-012-convergence` after batch-012 repairs land.

## Command

```sh
make verify-phase-1-batch-012-convergence
# or: bun run verify:phase-1-batch-012-convergence
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
   gate and **Customer-ask convergence report** for the expanded inventory

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
report** with one line per expanded inventory check (`checkId`, route or query,
`pass` / `fail` / `uncertain`, reason, `checklistRow`). The batch-012
convergence summary aggregates those rows under the `customer-ask-convergence`
domain and repeats each `checkId` as an indented source line.

| Field | Value |
| --- | --- |
| `domainId` | `customer-ask-convergence` |
| `checklistRow` | `phase-1-batch-012-customer-ask-convergence` |

### Report line format

Each customer-ask row prints as:

```txt
[STATUS] checkId — title (route=..., query=...) — reason — checklistRow=...
```

## Batch-012 check inventory

The expanded report emits **60 ordered rows** (41 retained batch-008/batch-011
follow-up rows plus 19 batch-012 rows including per-route tag coverage, per-query
search inline decoration, and attention discoverability on `/search` +
`/api/search`). Authoritative ordering lives in
`src/lib/verify/phase-1-customer-ask-check-inventory.ts`.

| checkId | Route / surface | Queries (when applicable) | checklistRow |
| --- | --- | --- | --- |
| `home.mobile-hamburger-menu` | `/` | — | `phase-1-header-bar` |
| `tags.resource-link-no-blanket-underline` | `/tags`, `/tags/attention` | — | `phase-1-tags-page` |
| `search.inline-result-no-list-decoration` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` |
| `glossary.no-rendered-opening-summary` | `/docs/glossary/token` | — | `phase-1-glossary-page` |
| `glossary.embedding-description-links` | `/docs/glossary/embedding` | — | `phase-1-glossary-page` |
| `pages.attention-route` | `/docs/modules/attention` | — | `phase-1-module-page` |
| `pages.vector-route` | `/docs/glossary/vector` | — | `phase-1-glossary-page` |
| `pages.hidden-size-route` | `/docs/glossary/hidden-size` | — | `phase-1-glossary-page` |
| `search.attention-discoverable` | `/search`, `/api/search` | attention | `phase-1-search-surface` |
| `module.no-duplicate-body-heading` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.no-metadata-card` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.single-tag-list` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.graph-theme-readability` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.no-duplicate-math-graph` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.math-qkv-definitions` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |

Retained batch-008 and batch-011 follow-up rows continue to run unchanged. See
[`factory/docs/phase-1-follow-up-customer-ask-convergence-validator.md`](./phase-1-follow-up-customer-ask-convergence-validator.md)
for the full retained inventory.

## Manual visual checks

| checkId | Manual step |
| --- | --- |
| `module.graph-theme-readability` | Follow [`factory/docs/phase-1-batch-012-gqa-graph-visibility-manual-check.md`](./phase-1-batch-012-gqa-graph-visibility-manual-check.md) when the automated row is `uncertain` |

## Batch-012 convergence evidence summary

After the verifier finishes, the workflow prints a **Phase 1 batch-012
convergence evidence summary** with:

| Section | Content |
| --- | --- |
| Header | `Phase 1 batch-012 convergence evidence summary` |
| Command-path row | Aggregated verifier harness `pass`, `fail`, or `uncertain` |
| Customer-ask domain row | Aggregated status across all parsed customer-ask rows |
| Per-checkId source lines | One indented line per `checkId` from `make verify-phase-1-ux` |
| Recommendation | Actionable loopback decision |
| Rationale | Human-readable explanation tied to failing or uncertain evidence |

Example:

```txt
Phase 1 batch-012 convergence evidence summary
[PASS] verifier-command-path — Built-app verifier command path (spawn, readiness, teardown) — checklistRow=phase-1-built-app-verifier-harness
[FAIL] customer-ask-convergence — Customer-ask convergence checks — checklistRow=phase-1-batch-012-customer-ask-convergence
  [PASS] make verify-phase-1-ux — home.mobile-hamburger-menu
  [FAIL] make verify-phase-1-ux — glossary.no-rendered-opening-summary — glossary-opening marker still rendered in built HTML
Recommendation: queue-one-narrow-repair-batch
Rationale: Batch-012 evidence failed: customer-ask checkId(s): glossary.no-rendered-opening-summary. Queue one narrow repair batch before Phase 1 stop-and-wait.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Verifier command-path `fail` or any customer-ask row `fail` | `queue-one-narrow-repair-batch` |
| Command-path `pass`, no customer-ask `fail`, and all rows `pass` or `uncertain` | `stop-and-wait-for-phase-advancement` |

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/batch-012-customer-ask-check-inventory.ts` | Batch-012 check inventory, report slot ordering |
| `src/lib/verify/phase-1-customer-ask-check-inventory.ts` | Expanded Phase 1 inventory ordering (batch-011 + batch-012) |
| `src/lib/verify/customer-ask-convergence-orchestrator.ts` | Aggregates all customer-ask rows in deterministic order |
| `src/lib/verify/phase-1-batch-012-convergence-evidence.ts` | Evidence summary, recommendation rules, exit semantics |
| `src/lib/verify/phase-1-batch-012-convergence-closure.ts` | Fail-before / pass-after closure helpers for tests |
| `scripts/run-phase-1-batch-012-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-batch-012-convergence` |
| `scripts/verify-phase-1-route-search-ux.ts` | Built-app verifier printing the customer-ask report |

## Loopback usage

During batch-012 loopback:

1. Run `make verify-phase-1-batch-012-convergence` after batch-012 repairs land.
   Do not export `VERIFY_BASE_URL` for the canonical gate.
2. Record the process exit code.
3. Copy the **batch-012 convergence evidence summary** into planner notes with
   `domainId` or `checkId` and `checklistRow`.
4. Follow the printed recommendation:
   - `queue-one-narrow-repair-batch` when command-path or any customer-ask row
     failed — scope repairs to failing `checkId` rows only
   - `stop-and-wait-for-phase-advancement` when command-path passed and no
     customer-ask row failed — copy any `uncertain` reasons into manual
     follow-up notes and wait for customer Phase 1 advancement

For keyboard shortcut gaps when `VERIFY_SEARCH_SHORTCUT_SKIP=1`, follow the
manual check in
[`factory/docs/phase-1-built-app-verifier-keyboard-fallback.md`](./phase-1-built-app-verifier-keyboard-fallback.md).
