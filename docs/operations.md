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
| Merges to `main` are blocked unless CI passes | **Implemented** (CI workflow) + **GitHub settings assumed** | Repository maintainers | Configure **Settings → Branches** on GitHub per the [Branch protection](#branch-protection) section; rules cannot be enforced from git. |
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

## Branch protection

Branch protection rules live in **GitHub repository settings**, not in this git
repository. Maintainers configure them under **Settings → Branches** for the
default branch (`main`). The table below records the Phase 1 expectations so
contributors know merges require green CI even though the rules cannot be
version-controlled.

| Setting | Phase 1 expectation | Why |
| --- | --- | --- |
| Protected branch | `main` | Production integration branch; all Phase 1 shipping is merge-to-`main` with green CI. |
| Require status checks to pass before merging | **Enabled** | Merges must not land while the CI workflow is failing. |
| Required status check name | `ci` | Matches the sole job in `.github/workflows/ci.yml` (`jobs.ci`). GitHub lists this as **ci** on pull requests once the workflow has run at least once on the branch. |
| Require branches to be up to date before merging | **Recommended** | Ensures the required `ci` check ran against the latest `main` tip, not only an older base. |
| Do not allow bypassing the above settings | **Enabled for administrators** | Prevents accidental direct pushes that skip the gate. |
| Allow force pushes | **Disabled** | Force-push to `main` is not permitted; history repair uses revert commits or a new branch and PR. |
| Allow deletions | **Disabled** | The default branch must not be deleted from the UI. |

If the required check name drifts (for example after renaming the workflow job),
update **Settings → Branches → Branch protection rules → Required status
checks** to match the job name in `.github/workflows/ci.yml` and update this
section in the same change.

Repository maintainers own keeping GitHub settings aligned with this guide.
Contributors cannot verify branch protection from a local clone alone; open the
repository **Settings** tab (maintainer access) or ask a maintainer to confirm
the rule is active.

## CI status expectations

The baseline quality gate is workflow file `.github/workflows/ci.yml`, which
defines a single job named **`ci`**. That job checks out the branch, installs
with `bun install --frozen-lockfile`, and runs `make ci` (lint, typecheck, test,
manifest-scoped coverage, build, validate-data, linkcheck). Deploy and preview
steps are intentionally excluded.

### When checks run

| Event | Workflow trigger | Expected check |
| --- | --- | --- |
| Pull request opened or updated | `on: pull_request` | **ci** runs against the PR head commit and appears in the PR **Checks** tab. |
| Push to `main` | `on: push` branches `main` | **ci** runs against the pushed commit and appears on the commit and branch views. |
| Push to other branches without a PR | No workflow trigger | No GitHub Actions run until a pull request is opened (or the branch is pushed to `main`). |

### What contributors see

**On pull requests**

- The **Checks** tab shows a **ci** entry while the workflow is queued, in
  progress, or finished.
- A green **ci** check means every step in `make ci` passed on the PR head SHA.
- A red **ci** check blocks merge when branch protection requires status checks
  (see [Branch protection](#branch-protection)).
- The PR conversation may also show “All checks have passed” or list failing
  checks; the authoritative job name for required-merge gating is **ci**.

**On pushes to `main`**

- Each commit on `main` shows a **ci** status badge on the commit list and
  commit detail page.
- Failed **ci** on `main` signals the integration branch is unhealthy; fix
  forward with a follow-up commit or revert—do not force-push.

**What is not shown today**

- No deployment or preview check appears on PRs or `main` while production
  deploy is deferred (see [Deployment posture](#deployment-posture)).
- `make ci` locally does not publish status to GitHub; push or open/update a PR
  to surface checks on GitHub.

### Matching local and CI

Run `bun install --frozen-lockfile` then `make ci` from the repository root
before opening a PR. The same sequence runs in GitHub Actions, so local green
`make ci` is the practical preflight for the **ci** check contributors see on
GitHub.
