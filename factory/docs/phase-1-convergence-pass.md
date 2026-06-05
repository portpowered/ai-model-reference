# Phase 1 batch-009 convergence pass

After batch-009 repairs for grouped-query-attention built-route graph markers
and docs footer hover/focus styling, run one maintainer-facing convergence pass
that exercises both the CI build gate and the built-app Phase 1 verifier. This
reuses the existing `make ci` and `make verify-phase-1-ux` commands—no second
browser stack or parallel verifier CLI.

## Command

```sh
make verify-phase-1-convergence
# or: bun run verify:phase-1-convergence
```

## Prerequisites

- Bun dependencies installed (`bun install`)
- Playwright Chromium for live browser checks (`npx playwright install chromium`)
- Production build output (`.next/`) is produced inside the workflow by `make build`

## Workflow order

1. `make ci` — lint, typecheck, test, coverage, build, validate-data, linkcheck
2. `make build && make verify-phase-1-ux` — production build refresh plus the
   Phase 1 built-app manual gate and customer-ask convergence report

`make ci` already includes `make build`; step 2 rebuilds before the live route
gate so verifier output always reflects the latest production bundle.

## Exit semantics

| Condition | Exit code |
| --- | --- |
| `make ci` passes and `make verify-phase-1-ux` passes (including customer-ask rows) | `0` |
| `make ci` fails | `1` |
| Legacy Phase 1 UX verification fails | `1` |
| Any customer-ask row is `fail` | `1` |

`uncertain` customer-ask rows remain non-blocking inside `make verify-phase-1-ux`.

## CI blocker domain report

When `make ci` finishes, the convergence pass prints a **Phase 1 batch-009 CI
blocker domain report** before running the built-app verifier. Each row maps one
of the three batch-009 blocker domains to CI-visible assertion names:

| domainId | Blocker domain | checklistRow |
| --- | --- | --- |
| `gqa-module-graph-build-markers` | Grouped-query-attention module graph build markers | `phase-1-module-page` |
| `docs-footer-hover-focus-parity` | Docs footer hover/focus CSS parity | `phase-1-docs-footer` |
| `phase-1-route-gate` | Phase 1 home/search/glossary/tag/module route gate (CI build checks) | `phase-1-route-gate` |

Example:

```txt
Phase 1 batch-009 CI blocker domain report
[PASS] gqa-module-graph-build-markers — Grouped-query-attention module graph build markers (source=make ci, assertions=verify-grouped-query-attention-built-route, grouped-query-attention built route convergence, grouped-query-attention-module-convergence) — checklistRow=phase-1-module-page
[FAIL] docs-footer-hover-focus-parity — Docs footer hover/focus CSS parity (source=make ci, assertions=docs page footer hover convergence, docs-page-footer-hover-convergence, footer sublabel hover/focus inherit) — bundled app CSS missing footer sublabel hover/focus inherit rule pairing — checklistRow=phase-1-docs-footer
```

When CI fails for unrelated reasons (for example lint), domains without matching
CI failure evidence remain `[PASS]` in this report; rely on the CI exit code and
log output for non-blocker failures.

## Built-app verifier output

`make verify-phase-1-ux` continues to print legacy Phase 1 UX failure reasons
to stderr before throwing, then emits the structured **Customer-ask convergence
report** even when Phase 1 UX checks fail. See
`factory/docs/phase-1-customer-ask-convergence-validator.md` for row format and
check inventory.

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/phase-1-convergence-pass.ts` | CI blocker domain parsing, report formatting, combined exit semantics |
| `src/lib/verify/phase-1-convergence-evidence.ts` | Planner-facing evidence summary, recommendation rules, customer-ask report parsing |
| `scripts/run-phase-1-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-convergence` |
| `scripts/verify-phase-1-route-search-ux.ts` | Existing built-app verifier (unchanged second stage) |

## Planner-facing convergence evidence summary

After `make verify-phase-1-ux` finishes, the convergence pass prints a **Phase 1
batch-009 convergence evidence summary** that merges CI blocker domain evidence
with built-app verifier rows for all three blocker domains. Each domain row
includes:

| Field | Meaning |
| --- | --- |
| `domainId` | Batch-009 blocker domain identifier |
| `status` | Aggregated `pass`, `fail`, or `uncertain` across CI and verifier sources |
| `checklistRow` | Planner checklist reference |
| Source rows | One line per command source (`make ci` or `make verify-phase-1-ux`) with `checkId` or CI assertion names and failure reason when applicable |

Example:

```txt
Phase 1 batch-009 convergence evidence summary
[PASS] gqa-module-graph-build-markers — Grouped-query-attention module graph build markers — checklistRow=phase-1-module-page
  [PASS] make ci — verify-grouped-query-attention-built-route, grouped-query-attention built route convergence, grouped-query-attention-module-convergence
  [PASS] make verify-phase-1-ux — module.graph-build-markers
[FAIL] docs-footer-hover-focus-parity — Docs footer hover/focus CSS parity — checklistRow=phase-1-docs-footer
  [PASS] make ci — docs page footer hover convergence, docs-page-footer-hover-convergence, footer sublabel hover/focus inherit
  [FAIL] make verify-phase-1-ux — docs.footer-hover-focus-parity — bundled app CSS missing footer sublabel hover/focus inherit rule pairing
[PASS] phase-1-route-gate — Phase 1 home/search/glossary/tag/module route gate (CI build checks) — checklistRow=phase-1-route-gate
  [PASS] make ci — verify-phase-1-static-routes, phase-1-shell-contract, phase-1-route-modules, home-search-entry-convergence, tags-navigation-convergence
  [PASS] make verify-phase-1-ux — home.header-search-entry, search.page.page-level-hits, ...
Recommendation: queue-one-narrow-repair-batch
Rationale: Blocker domain(s) failed: docs-footer-hover-focus-parity. Queue one narrow repair batch for the failing evidence before Phase 1 stop-and-wait.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Any blocker domain `fail` | `queue-one-narrow-repair-batch` |
| All blocker domains `pass` (including only non-blocking `uncertain` rows) | `stop-and-wait-for-phase-advancement` |

`uncertain` rows remain non-blocking for the recommendation. Copy uncertain
source reasons into planner notes for manual follow-up.

## Loopback usage

During batch-009 loopback:

1. Run `make verify-phase-1-convergence` after repairs land.
2. Record the process exit code.
3. Copy the **convergence evidence summary** (domain rows plus recommendation)
   into planner notes with `domainId` or `checkId` and `checklistRow`.
4. Follow the printed recommendation for stop-and-wait versus narrow repair.
