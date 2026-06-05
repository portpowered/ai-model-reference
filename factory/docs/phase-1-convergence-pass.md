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
| `scripts/run-phase-1-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-convergence` |
| `scripts/verify-phase-1-route-search-ux.ts` | Existing built-app verifier (unchanged second stage) |

## Loopback usage

During batch-009 loopback:

1. Run `make verify-phase-1-convergence` after repairs land.
2. Record the process exit code.
3. Copy CI blocker domain rows and customer-ask convergence rows into planner
   notes with `domainId` or `checkId` and `checklistRow`.
4. Use story `phase-1-built-html-and-footer-convergence-validator-004` evidence
   artifact rules for the stop-and-wait versus narrow-repair recommendation.
