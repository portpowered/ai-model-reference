# Phase 1 batch-014 GitHub Pages convergence validator

After batch-014 repairs for the GitHub Pages static export path, run one
planner-facing convergence pass that exercises `make build-export`, validates the
`out/` artifact, serves it from a loopback static file server (not
`next start`), and re-runs the highest-risk Phase 1 search and route probes
against that static export. The workflow prints a **Phase 1 batch-014 GitHub
Pages convergence evidence summary** so ideafy can queue one more narrow repair
batch or stop and wait for customer Phase 1 advancement.

**Prior built-app convergence evidence from `make verify-phase-1-follow-up-convergence`
validates a spawned Next.js server on `.next/` and can recommend
stop-and-wait even when the GitHub Pages export path is broken.** Refresh
batch-014 closure evidence only through
`make verify-phase-1-github-pages-convergence` after batch-014 repairs land.

## Command

```sh
make verify-phase-1-github-pages-convergence
# or: bun run verify:phase-1-github-pages-convergence
```

## Prerequisites

- Bun dependencies installed (`bun install`)
- Playwright Chromium for live browser checks on the static export server
  (`npx playwright install chromium`)
- Static export output (`out/`) is produced inside the workflow by
  `make build-export`
- Set `GITHUB_PAGES_BASE_PATH` when validating the same project-site prefix
  GitHub Pages uses (for example `ai-model-reference` in deploy). When unset,
  base-path artifact rows report `uncertain` rather than `fail`.

## Workflow order

1. `make build-export` — static export to `out/` plus Phase 1 export route and
   static search-handoff verification
2. Export artifact evidence — inspect `out/index.html`, representative Phase 1
   export routes, and base-path markers when configured
3. Static file server — serve `out/` on `127.0.0.1` with an ephemeral port and
   wait until the home route returns HTTP 200
4. Phase 1 static regression probes — GQA, attention, and KV cache search on
   `/search` and the header search dialog, plus home header-search entry and
   grouped-query-attention module presentation markers

Subprocess stdout and stderr stream to the terminal while being captured for
evidence parsing. If `make build-export` fails, the validator skips static
server startup and regression probes, still prints the evidence summary, and
marks `export-command-path` `fail` with the captured lifecycle reason.

The static export server is torn down after probes complete or fail.

## Exit semantics

| Condition | Exit code |
| --- | --- |
| Every domain row is `pass` or `uncertain` | `0` |
| `export-command-path` `fail` (`make build-export` lifecycle failure) | `1` |
| `export-artifact` `fail` (missing `out/`, empty index, missing route HTML, and similar) | `1` |
| `static-server-command-path` `fail` (missing `out/`, readiness timeout, early process exit) | `1` |
| `phase-1-static-regression` `fail` (any static search or route probe failed) | `1` |

`uncertain` domain or per-check rows remain non-blocking for the process exit
code. Copy uncertain reasons into planner notes for manual follow-up.

## Export command-path evidence

The summary includes a dedicated **export-command-path** domain row that
answers whether `make build-export` succeeded with both canonical export
verifier success markers.

| Field | Value |
| --- | --- |
| `domainId` | `export-command-path` |
| `checklistRow` | `phase-1-github-pages-export-command-path` |

`pass` requires captured output to include both `Phase 1 export routes verified`
and `Phase 1 static export search handoff verified`. A zero exit code without
both markers yields `uncertain`. Non-zero exit or known failure patterns yield
`fail`.

Example domain line:

```txt
[PASS] export-command-path — Static export build command path (make build-export) — checklistRow=phase-1-github-pages-export-command-path
```

## Export artifact evidence

The **export-artifact** domain aggregates filesystem checks on the built `out/`
tree before any browser probes run.

| Field | Value |
| --- | --- |
| `domainId` | `export-artifact` |
| `checklistRow` | `phase-1-github-pages-export-artifact` |

### Report line format

Each artifact row prints as:

```txt
[STATUS] checkId — title — reason — checklistRow=phase-1-github-pages-export-artifact
```

### Artifact check inventory

| checkId | What it verifies |
| --- | --- |
| `export-artifact.out-index-html` | Non-empty `out/index.html` exists |
| `export-artifact.route.home` | `/` export includes reader markers |
| `export-artifact.route-docs-architecture` | `/docs/architecture` export includes reader markers |
| `export-artifact.route-docs-glossary` | `/docs/glossary` export includes reader markers |
| `export-artifact.route-docs-modules-grouped-query-attention` | `/docs/modules/grouped-query-attention` export includes reader markers |
| `export-artifact.route-tags` | `/tags` export includes reader markers |
| `export-artifact.route-tags-attention` | `/tags/attention` export includes reader markers |
| `export-artifact.base-path.assets` | Exported HTML references base-path asset URLs when `GITHUB_PAGES_BASE_PATH` is set |
| `export-artifact.base-path.internal-links` | Exported HTML references base-path internal links when `GITHUB_PAGES_BASE_PATH` is set |

When `GITHUB_PAGES_BASE_PATH` is unset, the base-path rows report `uncertain`
with reason that no base path was configured.

## Static server command-path evidence

| Field | Value |
| --- | --- |
| `domainId` | `static-server-command-path` |
| `checklistRow` | `phase-1-github-pages-static-server-command-path` |

`pass` means the static file server started on loopback, honored
`GITHUB_PAGES_BASE_PATH` when set, and the home route returned HTTP 200 before
probes ran. Upstream `make build-export` failure skips server startup with
`uncertain` evidence.

## Phase 1 static regression evidence

Against the static export base URL, the validator runs search and route probes
that mirror the highest-risk Phase 1 customer-ask expectations visible only on
GitHub Pages hosting.

| Field | Value |
| --- | --- |
| `domainId` | `phase-1-static-regression` |
| `checklistRow` | `phase-1-github-pages-static-regression` |

### Report line format

Each regression row prints as:

```txt
[STATUS] checkId — title (route=..., query=...) — reason — checklistRow=phase-1-github-pages-static-regression
```

### Static regression check inventory

For each query in `GQA`, `attention`, and `KV cache`:

| checkId pattern | Surface | Assertion |
| --- | --- | --- |
| `static-regression.search.page.page-level-hits` | `/search` | Canonical page-level hits without fragment URLs |
| `static-regression.search.page.no-matched-tags` | `/search` | No search-result-matched-tags chips |
| `static-regression.search.dialog.page-level-hits` | header search dialog | Canonical page-level hits without fragment URLs |
| `static-regression.search.dialog.no-matched-tags` | header search dialog | No search-result-matched-tags chips |

Route probes:

| checkId | Route | Assertion |
| --- | --- | --- |
| `static-regression.route.home-header-search-entry` | `/` | Home exposes header-only search entry |
| `static-regression.route.gqa-module-presentation` | `/docs/modules/grouped-query-attention` | GQA module page includes converged presentation markers |

## Batch-014 GitHub Pages convergence evidence summary

After the workflow finishes, the validator prints a **Phase 1 batch-014 GitHub
Pages convergence evidence summary** with:

| Section | Content |
| --- | --- |
| Header | `Phase 1 batch-014 GitHub Pages convergence evidence summary` |
| Domain rows | `export-command-path`, `export-artifact`, `static-server-command-path`, `phase-1-static-regression` |
| Per-check source lines | Indented lines under `export-artifact` and `phase-1-static-regression` |
| Recommendation | Actionable loopback decision |
| Rationale | Human-readable explanation tied to failing or uncertain evidence |

Example:

```txt
Phase 1 batch-014 GitHub Pages convergence evidence summary
[PASS] export-command-path — Static export build command path (make build-export) — checklistRow=phase-1-github-pages-export-command-path
[PASS] export-artifact — GitHub Pages static export artifact (out/) — checklistRow=phase-1-github-pages-export-artifact
  [PASS] export-artifact.out-index-html — Non-empty out/index.html exists — checklistRow=phase-1-github-pages-export-artifact
[PASS] static-server-command-path — Static export file server command path (serve out/) — checklistRow=phase-1-github-pages-static-server-command-path
[PASS] phase-1-static-regression — Phase 1 search and route regression on static export — checklistRow=phase-1-github-pages-static-regression
  [PASS] static-regression.search.page.page-level-hits — Search page lists canonical page-level hits without fragment URLs (route=/search, query=GQA) — checklistRow=phase-1-github-pages-static-regression
Recommendation: stop-and-wait-for-phase-advancement
Rationale: make build-export passed, export-artifact checks passed, the static export server became ready, and Phase 1 static search/route regression probes passed against the exported site.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Any domain or per-check row is `fail` | `queue-one-narrow-repair-batch` |
| No `fail` rows; all domains `pass` or only `uncertain` remains | `stop-and-wait-for-phase-advancement` |

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/phase-1-github-pages-export-command-path.ts` | Export build command-path evidence |
| `src/lib/verify/phase-1-github-pages-export-artifact.ts` | Export artifact row derivation and formatting |
| `src/lib/verify/static-export-server-lifecycle.ts` | Loopback static file server lifecycle |
| `src/lib/verify/phase-1-github-pages-static-server-command-path.ts` | Static server command-path evidence |
| `src/lib/verify/phase-1-github-pages-static-regression.ts` | Static regression row derivation and formatting |
| `src/lib/verify/phase-1-github-pages-static-regression-http.ts` | Live HTTP/Playwright probes against static export |
| `src/lib/verify/phase-1-github-pages-convergence-evidence.ts` | Evidence summary, recommendation rules, exit semantics |
| `scripts/run-phase-1-github-pages-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-github-pages-convergence` |

## Loopback usage

During batch-014 loopback:

1. Run `make verify-phase-1-github-pages-convergence` after batch-014 repairs
   land. Prefer setting `GITHUB_PAGES_BASE_PATH` to the same value deploy uses
   when validating project-site URL prefixes.
2. Record the process exit code.
3. Copy the **batch-014 GitHub Pages convergence evidence summary** into
   planner notes with `domainId` or `checkId` and `checklistRow`.
4. Follow the printed recommendation:
   - `queue-one-narrow-repair-batch` when any domain or check row failed — scope
     repairs to failing `checkId` rows and lifecycle domains only
   - `stop-and-wait-for-phase-advancement` when no row failed — copy any
     `uncertain` reasons into manual follow-up notes and wait for customer
     Phase 1 advancement

Do not treat `make verify-phase-1-follow-up-convergence` as a substitute for
this gate; the GitHub Pages validator is additive evidence for batch-014 closure.
