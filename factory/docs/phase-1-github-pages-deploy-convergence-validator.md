# Phase 1 batch-015 GitHub Pages deploy convergence validator

After batch-015 deploy workflow activation lands, run one planner-facing
convergence pass that proves the repository has an active GitHub Pages deploy
path—not only a locally buildable static export. The workflow inspects
`.github/workflows/deploy.yml`, deploy-facing documentation posture, runs
`make build-export` with the canonical project-site base path, serves `out/` from
a loopback static file server, and re-runs the highest-risk Phase 1 `/search`
probes against that static export. The workflow prints a **Phase 1 batch-015
GitHub Pages deploy convergence evidence summary** so ideafy can queue one more
narrow repair batch or stop and wait for customer Phase 1 advancement.

**Prior batch-014 closure evidence from `make verify-phase-1-github-pages-convergence`
validates export artifact shape and static regression probes but does not prove
deploy workflow activation or truthful deploy-facing documentation.** Refresh
batch-015 deploy convergence evidence only through
`make verify-phase-1-github-pages-deploy-convergence` after batch-015 repairs
land.

## Command

```sh
make verify-phase-1-github-pages-deploy-convergence
# or: bun run verify:phase-1-github-pages-deploy-convergence
```

## Prerequisites

- Bun dependencies installed (`bun install`)
- Playwright Chromium for live browser checks on the static export server
  (`npx playwright install chromium`)
- Static export output (`out/`) is produced inside the workflow by
  `make build-export` with `GITHUB_PAGES_BASE_PATH=ai-model-reference`
- `VERIFY_BASE_URL` unset for canonical default static export spawn path; an
  external `VERIFY_BASE_URL` marks deploy-path evidence `uncertain` rather than
  `fail`

## Workflow order

1. Deploy workflow evidence — inspect `.github/workflows/deploy.yml` against the
   static export publish contract (separate from CI, production branch trigger,
   Pages permissions, `make build-export`, `GITHUB_PAGES_BASE_PATH`, `out/`
   upload, deploy job)
2. Deploy docs posture evidence — inspect `README.md` and `docs/operations.md`
   for deferred production language and active deploy-path contract markers
3. `make build-export` — static export to `out/` plus Phase 1 export route
   verification via `verifyPhase1ExportRoutesFromOutDir`
4. Static export harness — serve `out/` on `127.0.0.1` with the canonical
   project-site base path and wait until the home route returns HTTP 200
5. Deploy-path `/search` probes — GQA, attention, and KV cache queries via
   `phase-1-search-page-checks`

Subprocess stdout and stderr stream to the terminal while being captured for
evidence parsing. If `make build-export` fails, the validator skips static
harness startup and deploy-path search probes, still prints the evidence summary,
and marks `export-artifact` `fail` with the captured lifecycle reason.

The static export server is torn down after probes complete or fail.

## Exit semantics

| Condition | Exit code |
| --- | --- |
| Every domain row is `pass` or `uncertain` | `0` |
| `deploy-workflow` `fail` (missing or non-compliant deploy workflow) | `1` |
| `deploy-docs-posture` `fail` (deferred production language while deploy.yml exists) | `1` |
| `export-artifact` `fail` (`make build-export` or export-route gate failure) | `1` |
| `deploy-path-search` `fail` (static harness lifecycle failure or any `/search` probe failed) | `1` |

`uncertain` domain or per-check rows remain non-blocking for the process exit
code. Copy uncertain reasons into planner notes for manual follow-up.

## Domain inventory

| domainId | checklistRow | What it verifies |
| --- | --- | --- |
| `deploy-workflow` | `phase-1-github-pages-deploy-workflow` | `.github/workflows/deploy.yml` matches the GitHub Pages static export publish contract |
| `deploy-docs-posture` | `phase-1-github-pages-deploy-documentation` | README and operations describe the active deploy path instead of deferring production deployment |
| `export-artifact` | `phase-1-export-route-gate` | `make build-export` succeeded and `verifyPhase1ExportRoutesFromOutDir` passed against `out/` |
| `deploy-path-search` | `phase-1-deploy-path-search` | Phase 1 `/search` probes for GQA, attention, and KV cache against the static export harness |

### Deploy-path search check inventory

For each query in `GQA`, `attention`, and `KV cache`:

| checkId pattern | Surface | Assertion |
| --- | --- | --- |
| `deploy-path-search.search.page.gqa` | `/search` | Canonical page-level hits without fragment URLs |
| `deploy-path-search.search.page.attention` | `/search` | Canonical page-level hits without fragment URLs |
| `deploy-path-search.search.page.kv-cache` | `/search` | Canonical page-level hits without fragment URLs |

## Batch-015 GitHub Pages deploy convergence evidence summary

After the workflow finishes, the validator prints a **Phase 1 batch-015 GitHub
Pages deploy convergence evidence summary** with:

| Section | Content |
| --- | --- |
| Header | `Phase 1 batch-015 GitHub Pages deploy convergence evidence summary` |
| Domain rows | `deploy-workflow`, `deploy-docs-posture`, `export-artifact`, `deploy-path-search` |
| Per-check source lines | Indented lines under `deploy-path-search` |
| Recommendation | Actionable loopback decision |
| Rationale | Human-readable explanation tied to failing or uncertain evidence |

Example:

```txt
Phase 1 batch-015 GitHub Pages deploy convergence evidence summary
[PASS] deploy-workflow — GitHub Pages deploy workflow contract (.github/workflows/deploy.yml) — checklistRow=phase-1-github-pages-deploy-workflow
[PASS] deploy-docs-posture — Deploy-facing documentation posture (README.md and docs/operations.md) — checklistRow=phase-1-github-pages-deploy-documentation
[PASS] export-artifact — GitHub Pages export artifact (make build-export + export-route gate) — checklistRow=phase-1-export-route-gate
[PASS] deploy-path-search — Phase 1 deploy-path /search regression on static export — checklistRow=phase-1-deploy-path-search
  [PASS] deploy-path-search.search.page.gqa — Deploy-path /search returns grouped-query-attention for query "GQA" (route=/search, query=GQA) — checklistRow=phase-1-deploy-path-search
Recommendation: stop-and-wait-for-phase-advancement
Rationale: Deploy workflow and documentation align, make build-export passed export-route verification, and Phase 1 deploy-path /search probes passed against the static export harness.
```

### Recommendation rules

| Evidence | Recommendation |
| --- | --- |
| Any domain or per-check row is `fail` | `queue-one-narrow-repair-batch` |
| No `fail` rows; all domains `pass` or only `uncertain` remains | `stop-and-wait-for-phase-advancement` |

## Source modules

| Module | Role |
| --- | --- |
| `src/lib/verify/phase-1-github-pages-deploy-workflow.ts` | Deploy workflow contract evidence |
| `src/lib/verify/phase-1-github-pages-deploy-documentation.ts` | Deploy-facing documentation posture evidence |
| `src/lib/verify/phase-1-github-pages-deploy-export-artifact.ts` | Export artifact evidence via `verifyPhase1ExportRoutesFromOutDir` |
| `src/lib/verify/phase-1-github-pages-deploy-static-harness.ts` | Static export HTTP harness with canonical base path |
| `src/lib/verify/phase-1-github-pages-deploy-path-search.ts` | Deploy-path search row derivation and formatting |
| `src/lib/verify/phase-1-github-pages-deploy-path-search-http.ts` | Live HTTP/Playwright probes against static export harness |
| `src/lib/verify/phase-1-github-pages-deploy-convergence-evidence.ts` | Evidence summary, recommendation rules, exit semantics |
| `scripts/run-phase-1-github-pages-deploy-convergence-pass.ts` | CLI entrypoint invoked by `make verify-phase-1-github-pages-deploy-convergence` |

## Loopback usage

During batch-015 loopback:

1. Run `make verify-phase-1-github-pages-deploy-convergence` after batch-015
   deploy workflow activation and documentation repairs land.
2. Record the process exit code.
3. Copy the **batch-015 GitHub Pages deploy convergence evidence summary** into
   planner notes with `domainId` or `checkId` and `checklistRow`.
4. Follow the printed recommendation:
   - `queue-one-narrow-repair-batch` when any domain or check row failed — scope
     repairs to failing `checkId` rows and lifecycle domains only
   - `stop-and-wait-for-phase-advancement` when no row failed — copy any
     `uncertain` reasons into manual follow-up notes and wait for customer
     Phase 1 advancement

Do not treat `make verify-phase-1-github-pages-convergence` as a substitute for
this gate; the deploy convergence validator is additive evidence for batch-015
closure after workflow activation.
