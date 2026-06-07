# Planner checklist

High-level phase and customer-ask tracking for the ideafy meta-planner. Maintainer
deployment detail lives in [docs/operations.md](../operations.md); this file records
control state and repair inventory only.

## Current Control State

- **Phase:** Phase 1 (customer authorization in `docs/internal/customer-ask.md`).
- **Production deploy:** Active via `.github/workflows/deploy.yml` on `main` pushes.
  The workflow builds `out/` with `make build-export` and
  `GITHUB_PAGES_BASE_PATH: ai-model-reference`, then publishes through GitHub Pages.
- **CI vs deploy:** `.github/workflows/ci.yml` / `make ci` validate quality gates only;
  deploy is a separate workflow and does not replace CI.
- **Maintainer docs:** `docs/operations.md` and `README.md` describe the live deploy
  path, prerequisites, release/rollback, and commit-SHA traceability. They no longer
  claim deployment is deferred or that `deploy.yml` is missing.
- **Convergence:** `make verify-phase-1-github-pages-convergence` exercises the static
  export artifact end to end. See
  `factory/docs/phase-1-github-pages-convergence-validator.md`.
- **PR previews:** Deferred for Phase 1; production publish on `main` only.

## Current Direction

Close batch-015 documentation alignment so planner state, maintainer docs, and the
checked-in deploy workflow agree. Remaining work is documentation drift tests and
convergence evidence refresh; deploy workflow activation is already closed in the
repository.

Do not advance to Phase 2 unless `docs/internal/customer-ask.md` explicitly authorizes
it. Phase 1 may remain open for customer-ask repairs even after deploy/docs alignment.

## Recurring control function

On every batch that touches routes, content, deploy posture, or operational docs:

1. Compare finished work against `docs/architectural-checklist.md` operational rows.
2. Run the phase-appropriate convergence command and record pass/fail/uncertain rows.
3. Confirm maintainer guidance in `docs/operations.md` still matches
   `.github/workflows/deploy.yml` and `.github/workflows/ci.yml`.

## Phase 1 operational architecture rows

Rows reference [docs/architectural-checklist.md](../architectural-checklist.md)
**Operational** section. Maintainer procedure detail:
[docs/operations.md](../operations.md).

| Checklist row | Phase 1 status | Evidence / maintainer docs |
| --- | --- | --- |
| Website deploys automatically via GitHub Actions | **Implemented** | `.github/workflows/deploy.yml` on `main`; one-time Pages source **GitHub Actions** per [operations deploy posture](../operations.md#deployment-posture). |
| Deployment status is visible in GitHub checks | **Implemented** on `main` | **deploy** job from `deploy.yml` reports alongside **ci** on each `main` push; see [operations CI expectations](../operations.md#ci-status-expectations). |
| Website has CI checks on every pull request and merge | **Implemented** | `.github/workflows/ci.yml` |
| Preview deployments for pull requests | **Deferred** | Out of scope for Phase 1; production deploy active on `main` only. |
| Documented release / rollback / SHA traceability | **Implemented** | [Release](../operations.md#release-process), [rollback](../operations.md#rollback-process), and [SHA traceability](../operations.md#commit-sha-traceability) use live deploy checks. |

## Phase 1 GitHub Pages convergence rows

| checklistRow | Status | Notes |
| --- | --- | --- |
| `phase-1-github-pages-export-command-path` | **Implemented** | `make build-export` in CI and deploy workflow |
| `phase-1-github-pages-export-artifact` | **Implemented** | `out/` static export with verifiers |
| `phase-1-github-pages-static-server-command-path` | **Implemented** | Static file server path for convergence gate |
| `phase-1-github-pages-static-regression` | **Implemented** | Phase 1 route/search regression on `out/` |

Command: `make verify-phase-1-github-pages-convergence`. Refresh evidence after
export, search, or deploy contract changes.

## Open repair inventory

| Work item | Acceptance bar | Status |
| --- | --- | --- |
| `phase-1-github-pages-deploy-workflow-activation` | `deploy.yml` publishes `out/` on `main` with Pages permissions | **Complete** — merged; workflow present in repository. |
| `phase-1-github-pages-workflow-and-ops-alignment` | Maintainer README/operations describe active deploy | **Complete** — `docs/operations.md` and `README.md` aligned. |
| `phase-1-github-pages-docs-and-planner-alignment` | Planner checklist and maintainer docs agree; no deferral drift | **In progress** — planner control state updated here; documentation drift tests land in story 004. |
| `phase-1-github-pages-convergence-validator` | Static export convergence command and inventory | **Complete** — validator and docs in repository; rerun after material changes. |
| Documentation drift guards | CI fails when deferral language returns while `deploy.yml` exists | **Pending** — `phase-1-github-pages-docs-and-planner-alignment` story 004. |
