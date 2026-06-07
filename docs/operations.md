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
| Static export is opt-in for local builds, verified in CI | `NEXT_STATIC_EXPORT=1` (`bun run build:export` / `make build-export`) emits `out/` with `output: "export"`. `make ci` runs `make build` (`.next/` + Phase 1 static route verifiers) then `make build-export` (export artifact verification). |
| Export artifact is verified but not deployed | `make build-export` runs the export build then `verify-phase-1-export-routes` (reader routes) and `verify-phase-1-export-search-handoff` (static Orama bootstrap plus Phase 1 `GQA` / `attention` / `KV cache` ranking). Either verifier exits non-zero with a concrete failure when `out/` or `out/api/search` is missing or assertions fail. CI includes this gate; no deploy workflow publishes `out/` yet. |
| Live search depends on a Next.js API route | `src/app/api/search/route.ts` exports Fumadocs Orama `GET` and `staticGET` handlers backed by `src/lib/search/search-server.ts`. Client search (`src/features/docs/search/search-client.ts`) loads the index from `/api/search`. |
| GitHub Pages is static-only | GitHub Pages cannot run Node.js API routes or server-side Next.js rendering without a static export and pre-generated assets. |
| CI does not run deploy | `.github/workflows/ci.yml` runs `make ci` only; deploy is intentionally out of scope for the baseline gate. |

A GitHub Pages deploy workflow would still need a pre-built Orama search index and
validation that search works without runtime `GET` handlers. Static export and
`GITHUB_PAGES_BASE_PATH` support are available via `make build-export`; wiring
deploy and static search handoff is owned separately (see follow-up below).

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
| Documented release / rollback / SHA traceability | **Implemented** | Repository maintainers | Follow [Release process](#release-process), [Rollback process](#rollback-process), and [Commit-SHA traceability](#commit-sha-traceability); post-deploy steps apply when a deploy workflow ships. |

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

## Release process

Phase 1 has **no live production URL** and **no deploy workflow** (see
[Deployment posture](#deployment-posture)). Release today means integrating
changes onto `main` with a green **ci** check—not publishing to a hosted site.

### Interim release (pre-deploy)

Use this flow until a deploy workflow is activated:

1. **Open a pull request** against `main` and wait for the **ci** check to pass
   on the PR head commit (see [CI status expectations](#ci-status-expectations)).
2. **Merge to `main`** only when branch protection allows it (required **ci**
   green and branch up to date if that rule is enabled).
3. **Confirm post-merge CI** on the merge commit: a push to `main` triggers
   `.github/workflows/ci.yml` again on the integrated SHA.
4. **Optionally tag a release point** on `main` when maintainers want a named
   version in git history, for example `git tag v0.1.0 <merge-commit-sha>` followed
   by `git push origin v0.1.0`. Tags are optional in Phase 1; they do not trigger
   deployment while deploy is deferred.
5. **Record the shipping SHA** using [Commit-SHA traceability](#commit-sha-traceability)
   so a future deploy can target that commit.

There is **no production deploy step** in this interim flow. Do not claim a public
site was updated until a deploy workflow and host are active.

### Future release (post-deploy)

When a deploy workflow ships (owned by the later deployment/hosting work item),
extend the interim flow with:

1. **Choose the release SHA**—typically the latest green commit on `main` or an
   annotated tag pointing at a tested commit.
2. **Trigger deploy from `main` or tag** via the deploy workflow (for example
   push to `main` runs deploy automatically, or `workflow_dispatch` targets a
   tag/SHA). The workflow must pass `${{ github.sha }}` (or an explicit input SHA)
   into build and deploy steps so the hosted artifact matches source control.
3. **Verify deployment status** in GitHub **Actions** and on the commit **Checks**
   tab once deploy reports a required or informational check (see checklist mapping
   for deployment status).
4. **Confirm traceability** in the workflow run summary and host metadata (see
   [Commit-SHA traceability](#commit-sha-traceability)).

## Rollback process

### Interim rollback (pre-deploy)

While production deploy is deferred, rollback means **moving `main` back to a
known-good integration state**, not redeploying a prior site version:

1. **Identify the last good commit** on `main` (green **ci** on that SHA in
   GitHub Actions).
2. **Prefer `git revert`** of the bad merge commit or commits on a branch, open a
   PR, and merge after **ci** passes. This preserves history and avoids
   force-push (branch protection disallows force-push to `main`).
3. **If revert is impractical**, maintainers may reset only through a new PR that
   restores files from the good SHA; still do not force-push `main`.
4. **Optional tags** can mark the restored point; deleting or moving tags does not
   change hosting while deploy is inactive.

There is **no live site to roll back** in Phase 1. The operational goal is a
healthy `main` with traceable SHAs until deploy exists.

### Future rollback (post-deploy)

When a deploy workflow is active:

1. **Redeploy a prior known-good SHA**—re-run the deploy workflow against an
   earlier green commit on `main` or a release tag, passing that SHA explicitly
   if the workflow supports inputs. Prefer this when the failure is isolated to
   the latest deploy and an older artifact is still valid.
2. **Revert on `main`, then redeploy**—when code on `main` must change, merge a
   revert PR (with green **ci**), then let deploy run on the new `main` tip (or
   trigger deploy manually). The post-revert merge commit becomes the rollback
   target SHA.
3. **Use GitHub Actions run metadata**—note the failing deploy run ID, the SHA it
   built, and the prior successful deploy run/SHA when documenting the incident.
4. **Do not force-push `main`**; roll forward with revert + redeploy unless host
   documentation for that platform explicitly requires a different emergency path.

## Commit-SHA traceability

Maintainers must tie any integration or future deployment to an exact git commit.

### SHAs contributors and CI use today

| SHA role | Where it appears | Phase 1 meaning |
| --- | --- | --- |
| PR head commit | PR **Checks** tab **ci** run | Validates the proposed merge tip before integration. |
| Merge commit on `main` | Commit page and push-triggered **ci** run | Authoritative integrated state after merge; interim “release” SHA. |
| `github.sha` in workflows | GitHub Actions context for `.github/workflows/ci.yml` | The commit checkout@v4 built for that run—matches the trigger commit (PR head or `main` push). |

While deploy is deferred, **proof of what shipped to the integration branch** is:
the merge commit SHA on `main` plus a green **ci** workflow run for that SHA in
**Actions**. There is no deployment environment URL or deploy-job artifact yet.

### SHAs when a deploy workflow exists

When deploy is activated, extend traceability with:

| Artifact | Purpose |
| --- | --- |
| Deploy workflow `github.sha` | Build and publish steps must log and deploy this commit unless an explicit approved input SHA overrides it. |
| GitHub Actions run URL / run ID | Links a deploy attempt to workflow logs and timing. |
| Host deployment metadata | Platform deploy ID, preview URL, or Pages deployment record should reference the same commit SHA recorded in the workflow. |
| Optional git tag | Human-friendly name (`v0.2.0`) pointing at a release SHA; deploy may trigger on tag push. |

**Rollback traceability:** keep pairs of `(good_sha, bad_sha)` and the Actions run
IDs for failed and successful deploys so redeploy targets an earlier green commit
without guessing.

### Practical lookup steps

1. On GitHub, open **Commits** on `main` and copy the full SHA of the merge or
   release point.
2. Open **Actions**, select the **CI** workflow, and confirm a successful run
   exists for that SHA.
3. After deploy exists, open the deploy workflow run for the same SHA and confirm
   the run summary or deployment output repeats the commit hash.
4. Locally, `git rev-parse HEAD` or `git log -1 --format=%H` on `main` must match
   the SHA recorded in CI (and deploy when active).
