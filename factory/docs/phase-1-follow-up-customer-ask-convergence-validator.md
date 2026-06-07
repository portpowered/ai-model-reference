# Phase 1 batch-011 follow-up customer-ask convergence validator

After batch-011 follow-up repairs for home brevity, nav theme toggle removal,
search row hover/selection contrast, and related reader-visible polish land,
run one planner-facing convergence pass that exercises `make build` followed by
the canonical built-app verifier with `VERIFY_BASE_URL` unset. The workflow
prints a **Phase 1 batch-011 follow-up convergence evidence summary** that
separates verifier command-path health from the expanded batch-011 customer-ask
inventory so ideafy can queue one more narrow repair batch or stop and wait for
customer Phase 1 advancement.

**Prior batch-008 and batch-010 all-pass evidence is stale for this inventory.**
The follow-up ask adds observable expectations (home brevity, broken nav theme
toggle, search row hover coherence, matched-text selection contrast) that are
not fully represented in earlier convergence reports. Refresh evidence only
through `make verify-phase-1-follow-up-convergence` after batch-011 repairs land.

## Command

```sh
make verify-phase-1-follow-up-convergence
# or: bun run verify:phase-1-follow-up-convergence
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
   gate and **Customer-ask convergence report** for the batch-011 inventory

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

`make verify-phase-1-ux` prints the structured **Customer-ask convergence
report** with one line per batch-011 inventory check (`checkId`, route or
query, `pass` / `fail` / `uncertain`, reason, `checklistRow`). The follow-up
convergence summary aggregates those rows under the `customer-ask-convergence`
domain and repeats each `checkId` as an indented source line.

| Field | Value |
| --- | --- |
| `domainId` | `customer-ask-convergence` |
| `checklistRow` | `phase-1-follow-up-customer-ask-convergence` |

### Report line format

Each customer-ask row prints as:

```txt
[STATUS] checkId — title (route=..., query=...) — reason — checklistRow=...
```

Example:

```txt
Customer-ask convergence report
[PASS] home.brevity — Home brush header omits excess bottom margin and verbose inline search copy (route=/) — checklistRow=phase-1-home-header-polish
[FAIL] search.page.row-hover-coherence — Search page first result row applies hover styling across meta details (route=/search, query=GQA) — first visible result row is missing group hover class — checklistRow=phase-1-search-surface
[UNCERTAIN] glossary.footer-hover — Glossary footer previous/next label and sublabel hover styles pair (route=/docs/glossary/token) — footer nav present but hover pairing not observable in built HTML — checklistRow=phase-1-glossary-page
```

## Check inventory

The batch-011 follow-up inventory reuses unchanged batch-008 check ids for tag
lists, glossary, docs footer, and GQA module surfaces. It adds follow-up-only
ids for home brevity, browse links, nav theme toggle, and search row
hover/selection contrast. Search surface checks expand per query (GQA,
attention, KV cache).

| checkId | Route / surface | Queries (when applicable) | checklistRow | Origin |
| --- | --- | --- | --- | --- |
| `home.header-search-entry` | `/` | — | `phase-1-home-header-polish` | batch-008 reused |
| `home.primary-nav-no-duplicate-search` | `/` | — | `phase-1-home-header-polish` | batch-008 reused |
| `home.command-k-affordance` | `/` | — | `phase-1-home-header-polish` | batch-008 reused |
| `home.command-k-hover-contrast` | `/` | — | `phase-1-home-header-polish` | batch-008 reused |
| `home.brevity` | `/` | — | `phase-1-home-header-polish` | batch-011 follow-up |
| `home.browse-links` | `/` | — | `phase-1-home-header-polish` | batch-011 follow-up |
| `nav.no-broken-theme-toggle` | `/docs/modules/grouped-query-attention` | — | `phase-1-home-header-polish` | batch-011 follow-up |
| `tags.grouped-list-spacing` | `/tags` | — | `phase-1-tag-list-styling` | batch-008 reused |
| `tags.list-disc` | `/tags` | — | `phase-1-tag-list-styling` | batch-008 reused |
| `tags.attention.grouped-list-spacing` | `/tags/attention` | — | `phase-1-tag-list-styling` | batch-008 reused |
| `tags.attention.list-disc` | `/tags/attention` | — | `phase-1-tag-list-styling` | batch-008 reused |
| `search.page.page-level-hits` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` | batch-008 reused |
| `search.page.no-matched-tags` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` | batch-008 reused |
| `search.page.row-hover-coherence` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` | batch-011 follow-up |
| `search.page.matched-text-selection-contrast` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` | batch-011 follow-up |
| `search.dialog.no-matched-tags` | header search dialog | GQA, attention, KV cache | `phase-1-search-surface` | batch-008 reused |
| `search.dialog.row-hover-coherence` | header search dialog | GQA, attention, KV cache | `phase-1-search-surface` | batch-011 follow-up |
| `search.dialog.matched-text-selection-contrast` | header search dialog | GQA, attention, KV cache | `phase-1-search-surface` | batch-011 follow-up |
| `search.api.gqa-canonical-first-hit` | `/api/search` | GQA | `phase-1-search-surface` | batch-008 reused |
| `glossary.presentation` | `/docs/glossary/token` | — | `phase-1-glossary-page` | batch-008 reused |
| `glossary.chrome-links` | `/docs/glossary/token` | — | `phase-1-glossary-page` | batch-008 reused |
| `glossary.footer-hover` | `/docs/glossary/token` | — | `phase-1-glossary-page` | batch-008 reused |
| `glossary.embedding-description-links` | `/docs/glossary/embedding` | — | `phase-1-glossary-page` | glossary bridge repair |
| `glossary.vector-description-links` | `/docs/glossary/vector` | — | `phase-1-glossary-page` | glossary bridge repair |
| `glossary.hidden-size-description-links` | `/docs/glossary/hidden-size` | — | `phase-1-glossary-page` | glossary bridge repair |
| `docs.footer-hover-focus-parity` | `/docs/glossary/token` | — | `phase-1-docs-footer` | batch-008 reused |
| `module.presentation` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` | batch-008 reused |
| `module.graph-build-markers` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` | batch-008 reused |
| `module.list-disc` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` | batch-008 reused |
| `module.mha-gqa-comparison` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` | batch-008 reused |

The report emits **41 ordered rows** (including per-query search expansions).
Authoritative ordering lives in
`src/lib/verify/batch-011-follow-up-customer-ask-check-inventory.ts`.

For batch-008-only inventory semantics and shared surface modules, see
[`factory/docs/phase-1-customer-ask-convergence-validator.md`](./phase-1-customer-ask-convergence-validator.md).

## Follow-up convergence evidence summary

After the verifier finishes, the workflow prints a **Phase 1 batch-011 follow-up
convergence evidence summary** with:

| Section | Content |
| --- | --- |
| Header | `Phase 1 batch-011 follow-up convergence evidence summary` |
| Command-path row | Aggregated verifier harness `pass`, `fail`, or `uncertain` |
| Customer-ask domain row | Aggregated status across all parsed customer-ask rows |
| Per-checkId source lines | One indented line per `checkId` from `make verify-phase-1-ux` |
| Recommendation | Actionable loopback decision |
| Rationale | Human-readable explanation tied to failing or uncertain evidence |

Example:

```txt
Phase 1 batch-011 follow-up convergence evidence summary
[PASS] verifier-command-path — Built-app verifier command path (spawn, readiness, teardown) — checklistRow=phase-1-built-app-verifier-harness
[FAIL] customer-ask-convergence — Customer-ask convergence checks — checklistRow=phase-1-follow-up-customer-ask-convergence
  [PASS] make verify-phase-1-ux — home.brevity
  [FAIL] make verify-phase-1-ux — search.page.row-hover-coherence — first visible result row is missing group hover class
Recommendation: queue-one-narrow-repair-batch
Rationale: Batch-011 follow-up evidence failed: customer-ask checkId(s): search.page.row-hover-coherence. Queue one narrow repair batch before Phase 1 stop-and-wait.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Verifier command-path `fail` or any customer-ask row `fail` | `queue-one-narrow-repair-batch` |
| Command-path `pass`, no customer-ask `fail`, and all rows `pass` or `uncertain` | `stop-and-wait-for-phase-advancement` |

When only non-blocking `uncertain` evidence remains (for example footer hover
paint not observable in static HTML), the recommendation is still
`stop-and-wait-for-phase-advancement` with rationale calling out uncertain rows
for manual follow-up notes.

Unlike batch-010 built-app convergence, batch-011 follow-up does **not** emit
`close-verifier-harness-regression`. The follow-up pass closes the batch-011
repair loop by stopping inside Phase 1 when automatable evidence passes.

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/batch-011-follow-up-customer-ask-check-inventory.ts` | Authoritative check inventory, report slot ordering, closure helpers |
| `src/lib/verify/batch-011-follow-up-home-nav-checks.ts` | Follow-up home/nav check metadata |
| `src/lib/verify/batch-011-follow-up-search-checks.ts` | Follow-up search check metadata |
| `src/lib/verify/customer-ask-home-nav-follow-up-convergence.ts` | Home brevity, browse links, nav theme row builders |
| `src/lib/verify/customer-ask-search-follow-up-convergence.ts` | Search row hover/selection contrast row builders |
| `src/lib/verify/customer-ask-convergence-orchestrator.ts` | Aggregates batch-011 inventory rows in deterministic order |
| `src/lib/verify/phase-1-follow-up-convergence-evidence.ts` | Evidence summary, recommendation rules, exit semantics |
| `src/lib/verify/phase-1-follow-up-convergence-closure.ts` | Fail-before / pass-after closure helpers for tests |
| `scripts/run-phase-1-follow-up-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-follow-up-convergence` |
| `scripts/verify-phase-1-route-search-ux.ts` | Existing built-app verifier (unchanged second stage) |

## Loopback usage

During batch-011 follow-up loopback:

1. Run `make verify-phase-1-follow-up-convergence` after follow-up repairs
   land. Do not export `VERIFY_BASE_URL` for the canonical gate.
2. Record the process exit code.
3. Copy the **follow-up convergence evidence summary** (command-path row,
   customer-ask domain row, per-`checkId` source lines, recommendation, and
   rationale) into planner notes with `domainId` or `checkId` and
   `checklistRow`.
4. Follow the printed recommendation:
   - `queue-one-narrow-repair-batch` when command-path or any customer-ask
     row failed — scope repairs to failing `checkId` rows only
   - `stop-and-wait-for-phase-advancement` when command-path passed and no
     customer-ask row failed — copy any `uncertain` reasons into manual
     follow-up notes and wait for customer Phase 1 advancement

When command-path fails, use the printed lifecycle reason to scope a single
bounded repair without re-investigating spawn, port selection, or readiness.

For keyboard shortcut gaps when `VERIFY_SEARCH_SHORTCUT_SKIP=1`, follow the
manual check in
[`factory/docs/phase-1-built-app-verifier-keyboard-fallback.md`](./phase-1-built-app-verifier-keyboard-fallback.md).
