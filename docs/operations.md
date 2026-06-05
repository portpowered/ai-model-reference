# Operations

Maintainer guide for Phase 1 deployment posture, CI merge policy, and release
operations. This document closes operational checklist rows from
[architectural-checklist.md](./architectural-checklist.md) that cannot be
inferred from workflow files alone.

## Deployment posture

**Decision: Phase 1 defers production deployment.** No deploy workflow ships in
this phase.

### Rationale

Observable constraints in the current repository:

| Constraint | Evidence |
| --- | --- |
| No static export | `next.config.ts` sets only `turbopack.root`; it does **not** set `output: "export"`. |
| Live search depends on a Next.js API route | `src/app/api/search/route.ts` exports Fumadocs Orama `GET` and `staticGET` handlers backed by `src/lib/search/search-server.ts`. Client search (`src/features/docs/search/search-client.ts`) loads the index from `/api/search`. |
| GitHub Pages is static-only | GitHub Pages cannot run Node.js API routes or server-side Next.js rendering without a static export and pre-generated assets. |
| CI does not run deploy | `.github/workflows/ci.yml` runs `make ci` only; deploy is intentionally out of scope for the baseline gate. |

A minimal GitHub Pages workflow would break live search unless the project first
adds static export, pre-builds the Orama index as static JSON, and validates that
search still works without runtime `GET` handlers. That hosting migration is
larger than this Phase 1 closure item and is owned separately (see follow-up
below).

### Future owner

Deployment activation is owned by a **later deployment/hosting work item** (after
Phase 1 operational docs are complete). Candidate paths, not chosen yet:

- **Node-capable host** (for example Vercel or similar) keeping the current
  App Router + `/api/search` contract, or
- **Static export + prebuilt search index** if `output: "export"` is added and
  search is verified without live API `GET` queries.

Neither path is implemented in Phase 1. This guide records the deferral honestly
so checklist rows do not imply a live production URL.

## Phase 1 operational checklist mapping

Rows below reference the **Operational** section of
[architectural-checklist.md](./architectural-checklist.md). Status values:
**Implemented** (satisfied in this repo today), **Deferred** (documented blocker
with owner), or **N/A** (not applicable until deploy exists).

| Checklist row | Phase 1 status | Owner | Follow-up |
| --- | --- | --- | --- |
| Merges to `main` are blocked unless CI passes | **Implemented** (CI workflow) + **GitHub settings assumed** | Repository maintainers | Branch protection and required status check names are documented in the Branch protection section of this guide (added in a follow-up story). Configure **Settings → Branches** on GitHub; rules cannot be enforced from git. |
| Website deploys automatically via GitHub Actions (GitHub Pages or equivalent) | **Deferred** | Later deployment/hosting work item | Choose Node host vs static export; add `.github/workflows/deploy.yml` (or equivalent) only after search and build contracts are validated for that host. |
| Deployment status is visible in GitHub checks | **N/A** while deploy is deferred | Same deployment owner | When a deploy workflow ships, its job must report status on `main` (and optionally PR previews in a later phase) so merges show deploy health alongside the `ci` check. |

Related operational rows not closed in this section alone:

| Checklist row | Phase 1 status | Notes |
| --- | --- | --- |
| Website has CI checks on every pull request and merge | **Implemented** | `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`. |
| The build has deterministic install behavior through a lockfile | **Implemented** | `bun.lock` + `bun install --frozen-lockfile` in CI. |
| Preview deployments for pull requests | **Deferred** | Out of scope for Phase 1; depends on the same hosting decision as production deploy. |
| Documented release / rollback / SHA traceability | **Deferred to follow-up sections** | Release, rollback, and commit-SHA traceability sections are added in subsequent stories on this branch. |

### What contributors should expect today

- **Pull requests and `main` pushes** run the `ci` job (see
  `.github/workflows/ci.yml`). Passing `make ci` locally matches GitHub Actions.
- **No production deploy** runs from this repository yet. There is no deployment
  check on PRs or `main` until a deploy workflow is added.
- **No live public site URL** is claimed by Phase 1 documentation. Shipping is
  merge-to-`main` with green CI until hosting is activated.
