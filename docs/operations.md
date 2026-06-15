# Operations

Maintainer guide for Phase 1 deployment posture, CI merge policy, and release
operations. This document closes operational checklist rows from
[architectural-checklist.md](./architectural-checklist.md) that cannot be
inferred from workflow files alone.

## Deployment posture

**Decision: Phase 1 publishes the static export to GitHub Pages via GitHub
Actions.** Merges to `main` trigger an automatic deploy workflow that builds
`out/` with `make build-export` and publishes it to the project-site URL.

### Active deploy path

| Item | Value |
| --- | --- |
| Workflow file | `.github/workflows/deploy.yml` (separate from `.github/workflows/ci.yml`) |
| Trigger | `push` to `main` |
| Install | `bun install --frozen-lockfile` |
| Build entrypoint | `make build-export` with `GITHUB_PAGES_BASE_PATH: ai-model-reference` |
| Published artifact | `out/` (static export verified by `verify-phase-1-export-routes` and `verify-phase-1-export-search-handoff`) |
| Public URL | `https://portpowered.github.io/ai-model-reference/` (GitHub Pages project site for `portpowered/ai-model-reference`) |
| Quality gates | `.github/workflows/ci.yml` runs `make ci` only; deploy does not replace or invoke CI |

The workflow **`build`** job checks out the pushed commit, runs
`make build-export`, and uploads `out/` with `actions/upload-pages-artifact@v3`.
The **`deploy`** job publishes that artifact via `actions/deploy-pages@v4`.
Failed export builds or deploy steps fail the workflow run on the `main` commit.

### Why GitHub Pages works for this repository

Observable constraints satisfied in the current repository:

| Constraint | Evidence |
| --- | --- |
| Static export is verified in CI and deploy | `NEXT_STATIC_EXPORT=1` (`bun run build:export` / `make build-export`) emits `out/` with `output: "export"`. `make ci` runs `make build` then `make build-export` with export verifiers. The deploy workflow runs the same `make build-export` path with `GITHUB_PAGES_BASE_PATH` set for the project site. |
| Search works without live API routes on Pages | `make build-export` runs `verify-phase-1-export-search-handoff`, which validates static Orama bootstrap and Phase 1 `GQA` / `attention` / `KV cache` ranking under `out/api/search`. Client search loads the prebuilt index from `/api/search` in the static export. |
| GitHub Pages is static-only | GitHub Pages cannot run Node.js API routes at request time. This site ships a pre-generated static export and search index instead of live `GET` handlers. |
| CI and deploy are separate | `.github/workflows/ci.yml` runs `make ci` on pull requests and `main` pushes. `.github/workflows/deploy.yml` publishes `out/` on `main` pushes only and does not invoke `make ci`. |

### Required GitHub repository settings

Maintainers must confirm these settings under the repository **Settings** tab
(maintainer access). They cannot be enforced from git alone.

| Setting | Location | Phase 1 expectation |
| --- | --- | --- |
| Pages source | **Settings → Pages → Build and deployment → Source** | **GitHub Actions** (not “Deploy from a branch”) |
| Workflow permissions | **Settings → Actions → General → Workflow permissions** | **Read and write permissions** enabled so the deploy workflow can request `pages: write` and `id-token: write` |
| Pages environment | **Settings → Environments → `github-pages`** | Created automatically on first successful deploy; confirm it exists and review protection rules if the org requires approvals |
| Deploy workflow permissions | `.github/workflows/deploy.yml` | `contents: read`, `pages: write`, `id-token: write` at workflow scope |

**One-time host-side step:** the first publish requires Pages to be enabled with
source **GitHub Actions**. Until that setting is saved, deploy workflow runs may
fail at the Pages configuration step. After the first successful deploy, the
public URL above should resolve.

Preview deployments for pull requests remain **out of scope** for Phase 1.

## Phase 1 operational checklist mapping

Rows below reference the **Operational** section of
[architectural-checklist.md](./architectural-checklist.md). Status values:
**Implemented** (satisfied in this repo today), **Deferred** (documented blocker
with owner), or **N/A** (not applicable).

| Checklist row | Phase 1 status | Owner | Follow-up |
| --- | --- | --- | --- |
| Merges to `main` are blocked unless CI passes | **Implemented** (CI workflow) + **GitHub settings assumed** | Repository maintainers | Configure **Settings → Branches** on GitHub per the [Branch protection](#branch-protection) section; rules cannot be enforced from git. |
| Website deploys automatically via GitHub Actions (GitHub Pages or equivalent) | **Implemented** | Repository maintainers | `.github/workflows/deploy.yml` runs on `main` pushes; confirm Pages source is **GitHub Actions** on first enablement. |
| Deployment status is visible in GitHub checks | **Implemented** on `main` | Repository maintainers | The **deploy** job from `.github/workflows/deploy.yml` reports status on each `main` push alongside **ci**. PRs do not run deploy (preview deploy is deferred). |

Related operational rows not closed in this section alone:

| Checklist row | Phase 1 status | Notes |
| --- | --- | --- |
| Website has CI checks on every pull request and merge | **Implemented** | `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`. |
| The build has deterministic install behavior through a lockfile | **Implemented** | `bun.lock` + `bun install --frozen-lockfile` in CI and deploy. |
| Preview deployments for pull requests | **Deferred** | Out of scope for Phase 1; production deploy is active on `main` only. |
| Documented release / rollback / SHA traceability | **Implemented** | Follow [Release process](#release-process), [Rollback process](#rollback-process), and [Commit-SHA traceability](#commit-sha-traceability) using the live deploy check and published site. |

### What contributors should expect today

- **Pull requests and `main` pushes** run the `ci` job (see
  `.github/workflows/ci.yml`). Passing `make ci` locally matches GitHub Actions.
- **Pushes to `main`** also run `.github/workflows/deploy.yml`, which publishes
  `out/` to GitHub Pages when the export build and deploy steps succeed.
- **The public site** is `https://portpowered.github.io/ai-model-reference/`
  after a successful deploy on `main`. Confirm the **deploy** check on the
  merge commit before claiming the site was updated.
- **Batch-014 GitHub Pages closure** uses `make verify-phase-1-github-pages-convergence`
  (or `bun run verify:phase-1-github-pages-convergence`) to prove the static
  export path end to end. Unlike `make verify-phase-1-follow-up-convergence`,
  this gate exercises the built `out/` artifact served as static files rather
  than only a spawned `next start` server on `.next/`. See
  `factory/docs/phase-1-github-pages-convergence-validator.md` for workflow
  order, domain inventory, and recommendation rules.

## Branch protection

Branch protection rules live in **GitHub repository settings**, not in this git
repository. Maintainers configure them under **Settings → Branches** for the
default branch (`main`). The table below records the Phase 1 expectations so
contributors know merges require green CI even though the rules cannot be
version-controlled.

| Setting | Phase 1 expectation | Why |
| --- | --- | --- |
| Protected branch | `main` | Production integration branch; merges trigger CI and GitHub Pages deploy. |
| Require status checks to pass before merging | **Enabled** | Merges must not land while the CI workflow is failing. |
| Required status check name | `ci` | Matches the sole job in `.github/workflows/ci.yml` (`jobs.ci`). GitHub lists this as **ci** on pull requests once the workflow has run at least once on the branch. |
| Require branches to be up to date before merging | **Recommended** | Ensures the required `ci` check ran against the latest `main` tip, not only an older base. |
| Do not allow bypassing the above settings | **Enabled for administrators** | Prevents accidental direct pushes that skip the gate. |
| Allow force pushes | **Disabled** | Force-push to `main` is not permitted; history repair uses revert commits or a new branch and PR. |
| Allow deletions | **Disabled** | The default branch must not be deleted from the UI. |

The **deploy** check on `main` is informational for merge gating in Phase 1
(deploy runs after merge). Maintainers may add it as a required check later if
the org wants to block integration on deploy failure.

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
with `bun install --frozen-lockfile`, installs Playwright Chromium
(`bunx playwright install chromium --with-deps`) for browser-backed export
search UX tests, and runs `make ci` (lint, typecheck, test,
manifest-scoped coverage, build, validate-data, linkcheck). Deploy and preview
steps are intentionally excluded from CI.

Production publish is workflow file `.github/workflows/deploy.yml`, job **`deploy`**.
It runs only on `push` to `main`, builds with `make build-export`, and publishes
`out/` to GitHub Pages.

### When checks run

| Event | Workflow trigger | Expected checks |
| --- | --- | --- |
| Pull request opened or updated | `on: pull_request` in `ci.yml` | **ci** runs against the PR head commit and appears in the PR **Checks** tab. No deploy check on PRs. |
| Push to `main` | `on: push` branches `main` in `ci.yml` and `deploy.yml` | **ci** and **deploy** run against the pushed commit and appear on the commit and branch views. |
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
- No **deploy** check appears on PRs; production deploy runs after merge to `main`.

**On pushes to `main`**

- Each commit on `main` shows **ci** and **deploy** status badges on the commit
  list and commit detail page.
- Failed **ci** on `main` signals the integration branch is unhealthy; fix
  forward with a follow-up commit or revert—do not force-push.
- Failed **deploy** on `main` means the static export did not publish; the prior
  successful Pages deployment remains live until a later green **deploy** run.

**Local versus GitHub**

- `make ci` locally does not publish status to GitHub; push or open/update a PR
  to surface the **ci** check.
- `make build-export` locally verifies the same export artifact deploy publishes;
  it does not push to GitHub Pages.

### Matching local and CI

Run `bun install --frozen-lockfile` then `make ci` from the repository root
before opening a PR. The same sequence runs in GitHub Actions, so local green
`make ci` is the practical preflight for the **ci** check contributors see on
GitHub.

### Governance audit reviewer path

Checklist mechanism coverage for Phase 1 governance passes is recorded in
[architectural-checklist-mechanism-status.md](./governance/architectural-checklist-mechanism-status.md).
Reviewers validating that artifact should run, in order:

1. `make verify-architectural-checklist-mechanism-status` — proves the durable
   audit artifact stays complete and aligned with
   [architectural-checklist.md](./architectural-checklist.md).
2. `make ci` — confirms general site quality gates still pass after governance
   edits (including post-build integration tests after the build steps).

## Release process

Phase 1 release means integrating changes onto `main` with a green **ci** check,
then confirming **deploy** published the merge commit to
`https://portpowered.github.io/ai-model-reference/`.

### Standard release on `main`

1. **Open a pull request** against `main` and wait for the **ci** check to pass
   on the PR head commit (see [CI status expectations](#ci-status-expectations)).
2. **Merge to `main`** only when branch protection allows it (required **ci**
   green and branch up to date if that rule is enabled).
3. **Confirm post-merge CI** on the merge commit: a push to `main` triggers
   `.github/workflows/ci.yml` again on the integrated SHA.
4. **Confirm post-merge deploy** on the same SHA: `.github/workflows/deploy.yml`
   builds `out/` with `make build-export` and publishes to GitHub Pages. A green
   **deploy** check means the public site reflects that commit.
5. **Optionally tag a release point** on `main` when maintainers want a named
   version in git history, for example `git tag v0.1.0 <merge-commit-sha>` followed
   by `git push origin v0.1.0`. Tags do not replace the deploy-on-`main` flow
   unless a future workflow adds tag triggers.
6. **Record the shipping SHA** using [Commit-SHA traceability](#commit-sha-traceability)
   and verify the published site matches that commit.

Do not claim the public site was updated until **deploy** succeeds on the target
`main` commit.

### Manual or tagged deploy (future extension)

The current deploy workflow triggers on `main` pushes only. If maintainers add
`workflow_dispatch` or tag triggers later, the workflow must still pass
`${{ github.sha }}` (or an explicit input SHA) into build and deploy steps so the
hosted artifact matches source control.

## Rollback process

Rollback means **republishing a prior known-good commit** to GitHub Pages and/or
**moving `main` back to a healthy integration state**.

### Redeploy a prior SHA

When the latest deploy is bad but an older artifact is still valid:

1. **Identify the last good commit** on `main` with green **ci** and **deploy**
   in GitHub Actions.
2. **Re-run deploy for that SHA**—today this means restoring `main` to that
   commit via revert (preferred) or merging a fix-forward PR, then letting
   **deploy** run on the new `main` tip. If `workflow_dispatch` is added later,
   re-run deploy against the good SHA directly.
3. **Confirm** the **deploy** check and
   `https://portpowered.github.io/ai-model-reference/` reflect the target SHA
   (see [Commit-SHA traceability](#commit-sha-traceability)).

### Revert on `main`, then redeploy

When code on `main` must change:

1. **`git revert`** the bad merge commit or commits on a branch, open a PR, and
   merge after **ci** passes. This preserves history and avoids force-push
   (branch protection disallows force-push to `main`).
2. Let **deploy** run on the post-revert merge commit on `main`.
3. **Use GitHub Actions run metadata**—note the failing deploy run ID, the SHA it
   built, and the prior successful deploy run/SHA when documenting the incident.

Do not force-push `main`; roll forward with revert + redeploy unless host
documentation explicitly requires a different emergency path.

## Commit-SHA traceability

Maintainers must tie integration and deployment to an exact git commit.

### SHAs in CI and deploy

| SHA role | Where it appears | Phase 1 meaning |
| --- | --- | --- |
| PR head commit | PR **Checks** tab **ci** run | Validates the proposed merge tip before integration. |
| Merge commit on `main` | Commit page; **ci** and **deploy** runs | Authoritative integrated and published state after green checks. |
| `github.sha` in workflows | GitHub Actions context for `ci.yml` and `deploy.yml` | The commit `actions/checkout@v4` built for that run—matches the trigger commit. |
| Deploy workflow output | **deploy** job summary and Pages deployment record | Should reference the same SHA as the `main` push that triggered publish. |

**Proof of what shipped to production** is: the merge commit SHA on `main`, a
green **ci** run for that SHA, a green **deploy** run for that SHA, and the
live site at `https://portpowered.github.io/ai-model-reference/` updated after
that deploy.

| Artifact | Purpose |
| --- | --- |
| Deploy workflow `github.sha` | Build and publish steps log and deploy this commit. |
| GitHub Actions run URL / run ID | Links a deploy attempt to workflow logs and timing. |
| GitHub Pages deployment record | Platform deployment should reference the same commit SHA as the workflow. |
| Optional git tag | Human-friendly name (`v0.2.0`) pointing at a release SHA; does not replace SHA traceability in Actions. |

**Rollback traceability:** keep pairs of `(good_sha, bad_sha)` and the Actions run
IDs for failed and successful deploys so redeploy targets an earlier green commit
without guessing.

### Practical lookup steps

1. On GitHub, open **Commits** on `main` and copy the full SHA of the merge or
   release point.
2. Open **Actions**, select the **CI** workflow, and confirm a successful run
   exists for that SHA.
3. Open the **Deploy GitHub Pages** workflow run for the same SHA and confirm
   the **deploy** job succeeded and the run summary repeats the commit hash.
4. Load `https://portpowered.github.io/ai-model-reference/` and spot-check that
   content matches the expected release (deploy propagation can take a short time).
5. Locally, `git rev-parse HEAD` or `git log -1 --format=%H` on `main` must match
   the SHA recorded in CI and deploy for that release.
