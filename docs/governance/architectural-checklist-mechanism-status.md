# Architectural Checklist Mechanism Status

## Purpose

This artifact records which mechanisms described in
[architectural-checklist.md](../architectural-checklist.md) are present in the
Model Atlas repository, which are only partially enforced, and which remain
missing. It is the durable evidence source for governance passes and for updating
planner-owned checklists from observable facts rather than assumptions.

## Review metadata

| Field | Value |
| --- | --- |
| **Last reviewed (UTC)** | 2026-06-14 (repeatable reviewer verification path, story 006) |
| **Review scope** | Phase 1 governance pass: map checklist category sections to repository mechanisms, document operator-owned controls separately from source-controlled gates, enforce mechanism-status artifact completeness locally, document localization posture and intentionally deferred mechanisms, and expose reviewer commands for the audit and existing quality gates. |
| **Source checklist** | [docs/architectural-checklist.md](../architectural-checklist.md) |
| **Artifact path** | `docs/governance/architectural-checklist-mechanism-status.md` |

## Status values

Every auditable checklist category uses exactly one of these values:

| Status | Meaning |
| --- | --- |
| **implemented** | Repository source, workflows, scripts, tests, or configuration directly enforce or document the mechanism today. Evidence paths and verification commands are listed. |
| **partially implemented** | Some repository mechanisms exist, but the checklist intent is not fully covered. Evidence cites what exists; gaps explain what is still missing. |
| **missing** | No repository mechanism satisfies the checklist category. The entry must not imply the control already exists. |

Do not use other status labels in category entries. Operator-only controls that
cannot be proven from repository source belong in
[Operator and manual requirements](#operator-and-manual-requirements), not as
`implemented`.

## Evidence rule

A category may be marked **implemented** or **partially implemented** only when
reviewers can verify claims from repository evidence:

* committed workflow files, package scripts, Makefile targets, validation scripts,
  tests, configuration, or maintainer docs that describe what the repo actually
  enforces;
* commands that reproduce the check locally or in CI without secrets or external
  dashboards.

Do **not** mark a mechanism **implemented** based on assumed GitHub branch
protection, deployment-provider settings, environment secrets, preview
infrastructure, or production hosting configuration unless direct repository
evidence proves those controls. When proof lives outside git, document the
requirement under operator/manual requirements and describe how maintainers can
attach future evidence without committing secrets.

## Focused local enforcement

Phase 1 prioritized missing local gates that can run from repository source
without external services. The highest-impact feasible gap for this pass is
**artifact completeness**: future edits must not silently drop checklist
categories, use disallowed status values, or mark mechanisms implemented without
evidence.

| Gap | Impact | Phase 1 action |
| --- | --- | --- |
| **Mechanism-status completeness** | Without a verifier, the durable audit can drift from `docs/architectural-checklist.md` and overstate controls. | **Enforced** — deterministic verifier below. |
| **Accessibility tests outside `make ci`** | axe-based tests exist but are not part of the default CI recipe. | Documented as partially implemented; wire into CI in a follow-up pass. |
| **`make validate-pdf` stub** | Checklist expects PDF validation; Makefile target exits successfully without checking inputs. | Documented as **missing** under PDF Export Contract; implement scripts when print routes land. |

### Mechanism-status completeness verifier

| Field | Value |
| --- | --- |
| **Mechanism** | Compare auditable checklist sections to category entries in this artifact; require allowed status values; require repository evidence for **implemented** and **partially implemented** rows; require operator/manual and reviewer command sections. |
| **Repository evidence** | `src/lib/governance/architectural-checklist-audit.ts`, `src/lib/governance/architectural-checklist-audit.test.ts`, `scripts/verify-architectural-checklist-mechanism-status.ts` |
| **Verification command** | `make verify-architectural-checklist-mechanism-status` (alias: `bun run verify:architectural-checklist-mechanism-status`) |
| **Failure behavior** | Exits non-zero with a list of missing categories, duplicate entries, disallowed statuses, or evidence gaps. |

## Required fields per category

Each auditable checklist category section (including nested sections such as
**Website fundamentals → Operational**) must appear once in
[Category entries](#category-entries) using this field set:

| Field | Required | Description |
| --- | --- | --- |
| **Category** | yes | Exact checklist heading path, e.g. `Website fundamentals > Operational` or `Testing`. |
| **Status** | yes | One of `implemented`, `partially implemented`, or `missing`. |
| **Summary** | yes | One or two sentences on what the repository does today relative to the checklist. |
| **Repository evidence** | yes | Comma-separated or bulleted repo paths (workflows, scripts, tests, config, docs, source modules). Use `none` only for **missing** entries. |
| **Verification commands** | when applicable | At least one reviewer-runnable command when a local mechanism exists, e.g. `bun run typecheck`, `make ci`, `bun test`. Use `n/a` when no local command applies. |
| **Gaps** | when applicable | What the checklist expects but the repository does not yet enforce. Omit or write `none` when status is **implemented**. |
| **Follow-up or operator requirement** | when applicable | Concrete next mechanism (script, test, doc, CI command) or operator/manual action. Omit or write `none` when no follow-up is needed. |

### Entry template

```markdown
### <Category path>

| Field | Value |
| --- | --- |
| **Status** | implemented \| partially implemented \| missing |
| **Summary** | … |
| **Repository evidence** | `path/to/evidence` |
| **Verification commands** | `bun run …` |
| **Gaps** | … |
| **Follow-up or operator requirement** | … |
```

## Auditable category index

The following sections from [architectural-checklist.md](../architectural-checklist.md)
must each receive a [Category entries](#category-entries) record during the
governance pass:

1. Website fundamentals → Operational
2. Testing
3. System structure
4. Component quality
5. Viewports
6. Package structure
7. Pages
8. Accessibility
9. Localization
10. Quality
11. Build systems
12. Website-specific decisions → Technology decisions
13. Website-specific decisions → App Structure Contract
14. Website-specific decisions → Routing Contract
15. Website-specific decisions → Search Components Contract
16. Website-specific decisions → Derived Related Documents And Tags Contract
17. Website-specific decisions → Link Validation Contract
18. Website-specific decisions → Blog Components Contract
19. Website-specific decisions → Documentation features
20. Website-specific decisions → Template Contract
21. Website-specific decisions → PDF Export Contract
22. Website-specific decisions → ML-specific documentation quality
23. Website-specific decisions → Graph and model rendering
24. Website-specific decisions → README
25. Website-specific decisions → Components
26. Website-specific decisions → Content governance
27. Website-specific decisions → Observability and analytics
28. Website-specific decisions → Security and privacy
29. Website-specific decisions → Performance
30. Website-specific decisions → Definition of done

Nested checklist bullets inside a section roll up to the section entry unless a
later governance pass splits them intentionally.

## Operator and manual requirements

Repository source alone cannot prove some controls. Those belong in this
section (or in per-category **Follow-up or operator requirement** fields) as
**operator/manual** actions. Do not mark them **implemented** in category
entries unless direct repository evidence exists.

### Controls that require operator configuration

| Control | Why it is operator/manual | Phase 1 expectation |
| --- | --- | --- |
| **GitHub branch protection** | Rules live under **Settings → Branches**; no `.github/branch-protection.yml` or equivalent in this repository. | Protect `main`; require status check **`ci`** (job name in `.github/workflows/ci.yml`); disallow force-push and branch deletion. See [docs/operations.md](../operations.md#branch-protection). |
| **GitHub Pages source and permissions** | Pages **Build and deployment → Source** and **Actions → Workflow permissions** are repository settings, not workflow file contents. | Source must be **GitHub Actions**; workflow permissions must allow `pages: write` and `id-token: write` for deploy. See [docs/operations.md](../operations.md#required-github-repository-settings). |
| **Production hosting configuration** | Custom domains, TLS, CDN, and Pages environment protection rules are configured in GitHub (or another host) outside git. | Phase 1 publishes `out/` to the GitHub Pages project site documented in `docs/operations.md`. |
| **Environment secrets** | No production API keys, analytics tokens, or deployment secrets are committed; `.gitignore` excludes local env files. | CI and deploy use lockfile installs only; no secret-backed deploy steps in workflow files today. |
| **Preview deployment infrastructure** | No PR preview workflow exists in `.github/workflows/`. | Deferred for Phase 1; production deploy runs on `main` pushes only. |
| **External monitoring and analytics** | Client error tracking, Core Web Vitals, search analytics, and 404 telemetry are absent from application source. | Operator-owned if added later via a hosting or analytics provider. |
| **Dependency and security dashboards** | No Dependabot config or automated vulnerability gate in repository source. | Operator-owned security review cadence until a repo-local gate lands. |

### What repository workflows actually enforce

Describe CI and deploy only according to committed workflow files. They do **not**
replace operator settings above.

#### `.github/workflows/ci.yml` (job `ci`)

| Aspect | Repository behavior |
| --- | --- |
| **Triggers** | `pull_request` (all branches) and `push` to `main`. |
| **Permissions** | `contents: read` at job scope. |
| **Steps** | Checkout → setup Bun → `bun install --frozen-lockfile` → install Playwright Chromium → `make ci`. |
| **What `make ci` runs** | lint, typecheck, test, manifest-scoped coverage, build-contract tests (`make test-build-contract`), post-build integration tests (`make test-integration`), validate-data, linkcheck (see `Makefile`). |
| **What it does not do** | Deploy, publish previews, configure branch protection, or prove GitHub Pages UI settings. |

Verification: `make ci`, `bun test src/tests/ci/github-actions-make-ci.test.ts`

#### `.github/workflows/deploy.yml` (jobs `build`, `deploy`)

| Aspect | Repository behavior |
| --- | --- |
| **Triggers** | `push` to `main` only (no `pull_request`, no `workflow_dispatch` in Phase 1). |
| **Permissions** | Workflow scope: `contents: read`, `pages: write`, `id-token: write`. |
| **Build job** | Checkout → setup Bun → frozen lockfile install → `make build-export` with `GITHUB_PAGES_BASE_PATH: ai-model-reference` → configure Pages → upload `out/` artifact. |
| **Deploy job** | Publishes artifact via `actions/deploy-pages@v4` to environment `github-pages`. |
| **What it does not do** | Run `make ci` (quality gates stay in `ci.yml`); deploy PR heads; validate branch protection. |

Verification: `make build-export`, `bun test src/tests/ci/github-actions-deploy.test.ts` (if present), `docs/operations.md`

Maintainer narrative for release, rollback, and SHA traceability lives in
[docs/operations.md](../operations.md). That doc explains operational
expectations but does not version-control GitHub settings.

### Providing future evidence without secrets in the repo

Operators can close manual-control gaps in governance passes **without**
committing credentials, screenshots of secret values, or live dashboard exports:

| Evidence type | Acceptable use |
| --- | --- |
| **Workflow run URL** | Link a green `ci` or `deploy` run for a specific commit SHA in a PR conversation comment or planner checklist update. |
| **Settings confirmation (non-secret)** | Maintainer states in PR conversation that branch protection is active, required check is `ci`, and Pages source is GitHub Actions—no need to store UI screenshots in git. |
| **Documentation update** | Add or revise `docs/operations.md` when workflow job names, required checks, or deploy paths change so the artifact stays aligned with files. |
| **Repository config (when applicable)** | Commit Dependabot, CODEOWNERS, or new workflow files when the control becomes source-controlled; then reclassify the category from operator/manual to implemented or partially implemented with evidence paths. |
| **External artifact (out of band)** | Store redacted settings screenshots or org policy links in maintainer-run storage; reference them by URL in conversation, not in the public repo. |

Do **not** commit `.env` files, API tokens, analytics keys, or production
secrets to satisfy this artifact.

## Category entries

### Website fundamentals > Operational

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | CI runs on pull requests and `main` pushes; static export deploys to GitHub Pages on `main` via a separate workflow. Lockfile-backed installs, release/rollback guidance, and SHA traceability are documented. PR preview deploys and GitHub branch protection are not enforced from repository source. |
| **Repository evidence** | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `docs/operations.md`, `bun.lock`, `Makefile` (`ci`, `build-export`), `src/tests/ci/github-actions-*.test.ts` |
| **Verification commands** | `make ci`, `make build-export`, `bun test src/tests/ci` |
| **Gaps** | No PR preview deployment workflow; branch protection rules live in GitHub settings only; `make validate-pdf` is stubbed; environment secrets and Pages UI settings are operator-owned. |
| **Follow-up or operator requirement** | Configure GitHub branch protection per `docs/operations.md`; treat preview deploys as deferred Phase 1 scope. |

### Testing

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | The repository has broad unit, integration, build-export, search, layout, and axe-based accessibility tests. `make ci` runs typecheck, lint, tests, manifest-scoped coverage, build-contract tests, registry validation, and linkcheck. Storybook, Lighthouse CI, visual regression, and accessibility-in-CI are not present. |
| **Repository evidence** | `src/tests/**`, `Makefile` (`ci`, `test`, `coverage`), `package.json` (`test`, `coverage`), `scripts/component-coverage-gate.ts`, `src/lib/docs/component-coverage-gate.ts`, `src/tests/a11y/*.a11y.test.tsx`, `.github/workflows/ci.yml` |
| **Verification commands** | `bun test`, `make ci`, `make coverage` |
| **Gaps** | No Storybook; no Lighthouse or performance regression suite in CI; accessibility tests exist but are not part of `make ci`; no visual regression harness; math/MDX rendering lacks dedicated CI contract beyond page-level tests. |
| **Follow-up or operator requirement** | Add focused a11y gate to CI or document explicit deferral; evaluate Storybook vs existing `component-examples` harness for visual review. |

### System structure

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | The codebase follows feature-oriented boundaries (`src/features/docs`, `src/features/models`), shared layout/UI components, and framework-agnostic `src/lib` utilities. ML graph rendering is isolated under `src/features/models`. Design tokens are inlined in CSS rather than a dedicated `src/tokens` package, and no Zustand state layer is present. |
| **Repository evidence** | `src/features/`, `src/components/`, `src/lib/`, `src/app/`, `src/app/globals.css`, `docs/architecture.md`, `docs/code-standards.md` |
| **Verification commands** | `bun run typecheck` |
| **Gaps** | Checklist expects `src/tokens/` and optional Zustand feature state; blog feature directory absent; some checklist package-boundary exports not modeled via `package.json` exports. |
| **Follow-up or operator requirement** | Extract shared tokens module or document CSS-variable approach as the Phase 1 token source of truth. |

### Component quality

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Reusable docs and model components include tests, variant styling via Tailwind/shadcn patterns, and explicit empty/missing fallbacks (`MissingMessageKey`, `DocsIndexEmptyState`). A dev `component-examples` gallery supplements Storybook-style review. Not every interactive component has full state-matrix or keyboard-navigation tests. |
| **Repository evidence** | `src/features/docs/components/*.test.tsx`, `src/features/models/components/*.test.tsx`, `src/components/ui/button.tsx`, `src/app/(dev)/component-examples/`, `scripts/component-examples.ts`, `src/lib/docs/component-manifest.ts` |
| **Verification commands** | `bun test src/features`, `bun run component-examples` |
| **Gaps** | No Storybook catalog; loading/error/success coverage is uneven across components; keyboard and responsive variant matrices are not uniformly tested. |
| **Follow-up or operator requirement** | Extend component coverage manifest for remaining reusable surfaces. |

### Viewports

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Layout and docs chrome use Tailwind responsive utilities; React Flow graph viewers support pan/zoom interactions tested in build and module convergence suites. There is no dedicated viewport regression matrix across mobile/tablet/desktop breakpoints. |
| **Repository evidence** | `src/app/globals.css`, `src/features/models/components/RegistryGraphFlow.tsx`, `src/components/layout/canonical-docs-layout.tsx`, `src/tests/layout/docs-shell-contract.test.tsx`, `src/lib/verify/phase-1-ux-verifier.ts` |
| **Verification commands** | `bun test src/tests/layout`, `bun run verify:export-search-ux` |
| **Gaps** | No systematic small-screen navigation/table/graph usability gate; touch and hover-alternative coverage is implicit only. |
| **Follow-up or operator requirement** | Add viewport-focused Playwright or CSS contract checks for primary docs routes. |

### Package structure

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Core App Router, feature, content, lib, and scripts layout matches the checklist intent. Deviations include absent `src/content/blog`, `src/app/blog`, `src/app/print`, `src/tokens`, and `src/features/blog` paths that the checklist still describes as required. |
| **Repository evidence** | `src/app/`, `src/features/`, `src/content/`, `src/lib/`, `scripts/validate-links.ts`, `scripts/validate-registry.ts`, `source.config.ts`, `biome.json`, `docs/architectural-checklist.md` (Package structure section) |
| **Verification commands** | `bun run typecheck`, `make validate-data` |
| **Gaps** | Blog, print/PDF, and dedicated tokens directories from the checklist contract are not present; `package.json` does not define subpath exports. |
| **Follow-up or operator requirement** | Track blog/PDF scaffold work separately; update checklist or add missing directories when those features land. |

### Pages

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Docs pages are statically generated from colocated MDX and messages under `src/content/docs`. Home, docs index, tag landing, search, and glossary routes compose feature components with metadata helpers. Blog and print-safe page routes are not implemented. |
| **Repository evidence** | `src/app/docs/[[...slug]]/page.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/tags/[slug]/page.tsx`, `src/app/(site)/search/page.tsx`, `source.config.ts`, `src/lib/content/`, Fumadocs layout in `src/app/docs/layout.tsx` |
| **Verification commands** | `make build`, `bun test src/tests/content`, `bun test src/tests/discovery` |
| **Gaps** | No blog post routes; no print/PDF page routes; versioned docs and changelog pages not present. |
| **Follow-up or operator requirement** | Implement blog and print routes or mark checklist rows deferred with explicit status updates. |

### Accessibility

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | axe-core accessibility tests cover primary navigation, docs sidebar, search dialog, glossary token rendering, and representative docs components. Semantic HTML and focusable controls appear in layout and search components. WCAG contrast and CI enforcement are not automated in `make ci`. |
| **Repository evidence** | `src/tests/a11y/`, `axe-core` in `package.json`, `src/components/layout/primary-nav.ts`, `src/features/docs/search/SearchDialog.tsx`, `src/features/docs/search/SearchTrigger.tsx` |
| **Verification commands** | `bun test src/tests/a11y` |
| **Gaps** | Accessibility suite is not part of `make ci`; no automated color-contrast gate; graph textual summaries exist on some pages but are not uniformly enforced. |
| **Follow-up or operator requirement** | Wire `src/tests/a11y` into CI or a dedicated `make a11y` target referenced from `make ci`. |

### Localization

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | English-only shipping posture: colocated `messages/en.json` sidecars, `ui-messages` loaders defaulting to `en`, and no locale-prefixed App Router segments. Message-key tests cover English UI copy only. See [Phase 1 boundaries and deferred mechanisms](#phase-1-boundaries-and-deferred-mechanisms) for what this pass intentionally does not require. |
| **Repository evidence** | `src/content/**/messages/en.json`, `src/content/messages/en/common.json`, `src/lib/content/ui-messages.ts`, `src/lib/content/ui-messages-load.ts`, `src/lib/content/tag-messages.ts`, `docs/templates/*.messages.en.json` |
| **Verification commands** | `bun test src/tests/content/ui-messages.test.ts` |
| **Gaps** | No non-English locales in content; no locale-prefixed routes; no CI check for missing translation keys; date/number localization not implemented. |
| **Follow-up or operator requirement** | Add translation completeness validator when a second locale is introduced; do not add locale routing or translated search for this governance pass. |

### Quality

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Biome lint/format, TypeScript strict mode, Bun tests, manifest-scoped coverage, build/export validation, registry validation, and internal linkcheck run through `make ci`. Dependency security scans, bundle-size tracking, performance budgets, and global dead-code detection are not automated. |
| **Repository evidence** | `biome.json`, `tsconfig.json` (`strict: true`), `Makefile` (`ci`), `package.json`, `scripts/validate-registry.ts`, `scripts/validate-links.ts`, `scripts/component-coverage-gate.ts`, `scripts/verify-architectural-checklist-mechanism-status.ts`, `src/lib/governance/architectural-checklist-audit.ts`, `.github/workflows/ci.yml` |
| **Verification commands** | `make ci`, `make verify-architectural-checklist-mechanism-status`, `bun run lint`, `bun run typecheck` |
| **Gaps** | No Dependabot/npm-audit gate; no bundle analyzer or Lighthouse budget in CI; MDX prose lint is manual via `docs/writing-standards.md`. |
| **Follow-up or operator requirement** | Add dependency scan workflow or document operator-owned security review cadence. |

### Build systems

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Bun drives install, scripts, and tests; the root `Makefile` exposes `ci`, `test`, `test-integration`, `coverage`, `build`, `build-export`, `validate-data`, and `linkcheck` aligned with CI. PDF validation and generation targets are stubbed or absent; checklist-listed accessibility and PDF steps are not in `make ci`. |
| **Repository evidence** | `Makefile`, `package.json`, `bun.lock`, `.github/workflows/ci.yml`, `scripts/validate-registry.ts`, `scripts/validate-links.ts` |
| **Verification commands** | `make ci`, `make build`, `make build-export`, `make linkcheck`, `make validate-data` |
| **Gaps** | `make validate-pdf` exits successfully without validating; no `make pdf` targets; `make ci` omits a11y checks the checklist associates with CI. |
| **Follow-up or operator requirement** | Implement PDF scripts or keep explicit `missing` status in PDF Export Contract entry until implemented. |

### Website-specific decisions > Technology decisions

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | The site is a TypeScript Next.js App Router project using Bun, Fumadocs MDX, Tailwind CSS variables, shadcn/ui primitives, React Flow graphs, Recharts (where used), KaTeX math, and Orama-backed search with static export support. PDF export and full blog stack described in the checklist are not yet in the tree. |
| **Repository evidence** | `package.json`, `next.config.ts`, `source.config.ts`, `src/app/api/search/route.ts`, `src/features/models/components/RegistryGraphFlow.tsx`, `src/features/docs/components/Math.tsx`, `scripts/emit-export-search-index.ts` |
| **Verification commands** | `make build-export`, `bun run test:build-contract` |
| **Gaps** | PDF pipeline and blog authoring paths missing; Magic UI usage is minimal/optional and not centrally cataloged. |
| **Follow-up or operator requirement** | Land print/PDF routes before claiming PDF support as implemented. |

### Website-specific decisions > App Structure Contract

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Root layout, docs catch-all route, tag/search surfaces, registry-backed content loaders, and feature-owned docs/models rendering match the documented contract. Blog routes, print routes, and some checklist-listed feature paths are absent. |
| **Repository evidence** | `src/app/layout.tsx`, `src/app/docs/[[...slug]]/page.tsx`, `src/app/(site)/tags/`, `src/app/(site)/search/page.tsx`, `src/features/docs/`, `src/features/models/`, `src/lib/content/`, `src/lib/search/`, `docs/architecture.md` |
| **Verification commands** | `bun run typecheck`, `bun test src/tests/layout` |
| **Gaps** | `src/features/blog`, `src/content/blog`, and `src/app/print/**` not present; `src/lib/seo` helpers may be partial vs checklist enumeration. |
| **Follow-up or operator requirement** | Add blog/print app structure or revise checklist contract after explicit deferral. |

### Website-specific decisions > Routing Contract

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | `/`, `/docs/**`, `/tags/**`, `/search`, and glossary/architecture index routes are implemented and covered by static-route and convergence tests. Blog and print URL families from the checklist are not routable. |
| **Repository evidence** | `src/app/(site)/page.tsx`, `src/app/docs/[[...slug]]/page.tsx`, `src/app/(site)/tags/[slug]/page.tsx`, `src/app/(site)/search/page.tsx`, `scripts/verify-phase-1-static-routes.ts`, `scripts/verify-phase-1-export-routes.ts`, `src/tests/discovery/route-modules.test.ts` |
| **Verification commands** | `make build`, `bun ./scripts/verify-phase-1-static-routes.ts`, `bun ./scripts/verify-phase-1-export-routes.ts` |
| **Gaps** | `/blog`, `/blog/<slug>`, and `/print/<locale>/...` routes missing; dedicated `/search?tag=` page behavior partially covered via tag landing handoffs. |
| **Follow-up or operator requirement** | Extend route verifiers when blog/print routes are added. |

### Website-specific decisions > Search Components Contract

| Field | Value |
| --- | --- |
| **Status** | implemented |
| **Summary** | Custom search dialog, trigger, results, filters, and client wrapper integrate Fumadocs Orama search with registry-backed metadata, keyboard opening, empty/loading states, and static-export bootstrap. API route and static index emission are present. |
| **Repository evidence** | `src/features/docs/search/SearchDialog.tsx`, `SearchTrigger.tsx`, `SearchResults.tsx`, `SearchPagePanel.tsx`, `search-client.ts`, `model-atlas-search-client.ts`, `src/app/api/search/route.ts`, `scripts/emit-export-search-index.ts`, `src/tests/search/` |
| **Verification commands** | `bun test src/tests/search`, `bun run verify:export-search-handoff` |
| **Gaps** | Structured filter UI (`SearchFilters.tsx`) is not a separate module name in tree; tag filter handoff relies on tag landing/search page rather than a standalone `/search?tag=` contract in all cases. |
| **Follow-up or operator requirement** | none |

### Website-specific decisions > Derived Related Documents And Tags Contract

| Field | Value |
| --- | --- |
| **Status** | implemented |
| **Summary** | Registry-derived related docs, tag pills, and tag landing lists are implemented and tested. Module pages surface variant relationships through `DerivedRelatedDocs` and registry taxonomy. |
| **Repository evidence** | `src/features/docs/components/DerivedRelatedDocs.tsx`, `TagPillList.tsx`, `TagResourceList.tsx`, `src/features/docs/tags/TagsIndexList.tsx`, `src/lib/content/related-docs.ts`, `src/lib/content/tag-resources.ts`, `src/features/models/components/ModuleAtAGlance.tsx` |
| **Verification commands** | `bun test src/features/docs/components/DerivedRelatedDocs.test.tsx`, `bun test src/tests/content/attention-tag-landing.test.ts` |
| **Gaps** | Paper and model related-group coverage is thinner than module variant coverage. |
| **Follow-up or operator requirement** | Extend registry relationships for model/paper pages as content grows. |

### Website-specific decisions > Link Validation Contract

| Field | Value |
| --- | --- |
| **Status** | implemented |
| **Summary** | Internal docs link validation uses Fumadocs `next-validate-link` integration via `scripts/validate-links.ts`, included in `make ci`. Blog links are not validated because blog content routes are absent. |
| **Repository evidence** | `scripts/validate-links.ts`, `src/lib/build/validate-links.ts`, `Makefile` (`linkcheck`), `src/tests/ci/github-actions-make-ci.test.ts` |
| **Verification commands** | `make linkcheck` |
| **Gaps** | Blog MDX links not in scope until blog ships; external URL validation not in CI by design. |
| **Follow-up or operator requirement** | Include blog pages in validator when blog content exists. |

### Website-specific decisions > Blog Components Contract

| Field | Value |
| --- | --- |
| **Status** | missing |
| **Summary** | Blog templates exist under `docs/templates/blog-post.*`, but there is no `src/content/blog`, `src/features/blog`, or App Router blog route implementation. |
| **Repository evidence** | `docs/templates/blog-post.mdx`, `docs/templates/blog-post.messages.en.json` (templates only) |
| **Verification commands** | n/a |
| **Gaps** | Entire blog index/post layout, MDX mapping, link validation, and metadata stack described in the checklist. |
| **Follow-up or operator requirement** | Scaffold blog routes and components per checklist contract or mark blog as Phase 2 scope in planner checklist. |

### Website-specific decisions > Documentation features

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Search, in-page/cross-file navigation, previous/next via Fumadocs, math, code blocks, callouts, tables, glossary pages, citations, model/module graphs, and tag-based discovery are present. PDF export, versioned docs, changelog/blog pages, and API reference pages are not implemented. |
| **Repository evidence** | `src/features/docs/components/`, `src/features/models/components/`, `src/content/docs/`, `src/content/registry/`, Fumadocs TOC/footer in docs layout, `src/lib/search/` |
| **Verification commands** | `make build`, `bun test src/tests/docs`, `make linkcheck` |
| **Gaps** | PDF export, doc versioning, and blog/release-note surfaces missing. |
| **Follow-up or operator requirement** | Implement PDF export contract or keep status `missing` in PDF entry. |

### Website-specific decisions > Template Contract

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Canonical templates with MDX, `.content.md`, `.messages.en.json`, and `.assets.json` sidecars exist under `docs/templates/`. Scaffolding and template-convergence tests enforce message-key and registry patterns on module pages. Raw-prose validation outside approved wrappers is partially enforced through tests, not a standalone CI script named in the checklist. |
| **Repository evidence** | `docs/templates/`, `scripts/scaffold-doc-page.ts`, `src/lib/content/scaffold-doc-page.ts`, `src/lib/content/scaffold-validation.test.ts`, `src/lib/content/*-module-template-convergence.test.tsx` |
| **Verification commands** | `bun run scaffold:doc-page`, `bun test src/lib/content/scaffold-validation.test.ts` |
| **Gaps** | Not all page kinds have live converged examples; automated “no raw prose” gate is test-scoped rather than global. |
| **Follow-up or operator requirement** | Add global template prose validator when story 004 enforcement lands. |

### Website-specific decisions > PDF Export Contract

| Field | Value |
| --- | --- |
| **Status** | missing |
| **Summary** | The checklist requires print routes, Playwright PDF generation, and validation scripts. `Makefile` `validate-pdf` is a no-op stub and no `src/app/print/**`, `scripts/build-pdf.ts`, or `scripts/validate-pdf.ts` implementation exists. |
| **Repository evidence** | `Makefile` (`validate-pdf` stub only), `docs/architectural-checklist.md` (PDF Export Contract) |
| **Verification commands** | n/a |
| **Gaps** | Print routes, PDF build pipeline, curated PDF sets, and CI validation are absent. |
| **Follow-up or operator requirement** | Implement PDF scripts and print routes per checklist or defer with explicit planner sign-off. |

### Website-specific decisions > ML-specific documentation quality

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Attention-variant module pages, glossary entries, comparison tables/graphs, and writing standards provide structured ML explainers with accessibility-oriented summaries on key module routes. Full model-card coverage, benchmark caveats, and safety/limitations sections are not uniform across all records. |
| **Repository evidence** | `src/content/docs/modules/`, `src/content/registry/modules/`, `docs/writing-standards.md`, `docs/documentation-template.md`, `src/features/models/components/ModuleAtAGlance.tsx`, `ModuleAttentionSchemaComparison.tsx` |
| **Verification commands** | `bun test src/lib/content/*-module-page.test.ts`, `make validate-data` |
| **Gaps** | Few live model/paper pages vs checklist breadth; performance claims and hardware assumptions not consistently documented. |
| **Follow-up or operator requirement** | Expand model/paper content with registry-backed sections as planner batches land. |

### Website-specific decisions > Graph and model rendering

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | React Flow powers interactive registry graphs; module graphs route through `PageAsset` with registry graph schemas and themed CSS. Tests cover layout, interaction, and static-export hydration for key module graphs. Print/static SVG fallback pipeline is not fully implemented. |
| **Repository evidence** | `src/features/models/components/RegistryGraphFlow.tsx`, `ConceptMap.tsx`, `AttentionVariantComparisonGraph.tsx`, `src/content/registry/graphs/`, `src/features/docs/styles/registry-graph-flow-theme.css`, `src/tests/build/static-export-base-path-contract.test.ts` |
| **Verification commands** | `bun test src/features/models/components`, `bun test src/tests/build/static-export-base-path-contract.test.ts` |
| **Gaps** | Recursive module graph expand/collapse contract is partial; Mermaid print renderer validation absent; deep-linking to selected nodes not universal. |
| **Follow-up or operator requirement** | Add print renderer validation when PDF/export graph path exists. |

### Website-specific decisions > README

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | `README.md` documents problem/solution, content-layer shape (`Website Shape`), important governance docs, **Local Development** (`bun install`, `make dev`), **Static export (GitHub Pages)** with `make build-export`, **Quality Gates** with ordered `make ci` steps and full Makefile target listings, operations/release posture, Phase 1 UX verifiers, and the agent factory loop. It carries a CI badge and links to `docs/operations.md`. |
| **Repository evidence** | `README.md` (`## Local Development`, `## Quality Gates`, `## Static export (GitHub Pages)`) |
| **Verification commands** | Manual review; README prose is not a test-gated contract. |
| **Gaps** | Missing page-count/license/locale badges (only CI badge present); no explicit one-line published-site URL; no detailed top-level repository tree map beyond content-layer layout in **Website Shape**. |
| **Follow-up or operator requirement** | Add remaining checklist rows (badges, live URL line, repo structure map) without duplicating `docs/operations.md`. |

### Website-specific decisions > Components

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | shadcn/ui primitives, docs chrome, search UI, callouts, math, tables, graph viewers, and loading/missing fallbacks exist with tests and a component-examples harness. Magic UI, analytics helpers, and some checklist-listed standard components are absent or minimal. |
| **Repository evidence** | `src/components/ui/`, `src/features/docs/components/`, `src/features/models/components/`, `src/component-examples/`, `components.json`, `src/lib/docs/component-manifest.ts` |
| **Verification commands** | `bun test src/features/docs/components`, `make coverage` |
| **Gaps** | No analytics/event helpers; not all standard SEO helpers centralized under `src/lib/seo`. |
| **Follow-up or operator requirement** | Track optional analytics components as observability work, not blocking docs reference scope. |

### Website-specific decisions > Content governance

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Authoring standards, documentation templates, graphing standards, and AGENTS.md define tone, structure, and review expectations. Automated doc owners, freshness dates, deprecation markers, and CI-detectable stale content are not implemented. |
| **Repository evidence** | `docs/writing-standards.md`, `docs/documentation-template.md`, `docs/graphing-standards.md`, `AGENTS.md`, `docs/templates/` |
| **Verification commands** | n/a |
| **Gaps** | No per-page owner or last-reviewed metadata enforcement; no deprecated-doc flag in content model. |
| **Follow-up or operator requirement** | Add registry or frontmatter fields for freshness/ownership when governance automation is prioritized. |

### Website-specific decisions > Observability and analytics

| Field | Value |
| --- | --- |
| **Status** | missing |
| **Summary** | No client error tracking, Core Web Vitals monitoring, search analytics, or 404 telemetry is implemented in application source. Build/deploy failure visibility relies on GitHub Actions checks only. |
| **Repository evidence** | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` (CI/deploy status only) |
| **Verification commands** | n/a |
| **Gaps** | Entire observability/analytics checklist category. |
| **Follow-up or operator requirement** | Operator-owned: configure hosting/analytics provider outside repo or add privacy-conscious instrumentation in a future phase. |

### Website-specific decisions > Security and privacy

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Workflows use least-privilege permissions where defined; dependencies install from lockfile without committing secrets. No automated dependency vulnerability scan, CSP configuration, or form-input validation layer is present (few user-submitted forms exist). |
| **Repository evidence** | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `bun.lock`, `.gitignore` |
| **Verification commands** | `bun install --frozen-lockfile` (deterministic install) |
| **Gaps** | No Dependabot/npm audit gate; no documented CSP for production; PDF draft-exclusion not applicable until PDF exists. |
| **Follow-up or operator requirement** | Enable GitHub Dependabot or equivalent operator process; document CSP expectations in deployment guide. |

### Website-specific decisions > Performance

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | Static export pre-renders docs pages; heavy graph clients hydrate on module routes with targeted performance tests for export/search paths. Bundle-size tracking, Lighthouse budgets, and CI performance regression gates are not configured. |
| **Repository evidence** | `next.config.ts`, `make build-export`, `src/tests/build/static-export-*.test.ts`, `scripts/verify-phase-1-export-search-handoff.ts` |
| **Verification commands** | `make build-export`, `bun run test:build-contract` |
| **Gaps** | No bundle analyzer or performance budget enforcement; image/font optimization policies are implicit via Next/static export. |
| **Follow-up or operator requirement** | Add Lighthouse or bundle-size gate when performance enforcement is prioritized. |

### Website-specific decisions > Definition of done

| Field | Value |
| --- | --- |
| **Status** | partially implemented |
| **Summary** | `make ci` encodes much of the engineering definition of done (typecheck, lint, tests, coverage thresholds for manifest components, build-contract tests, data validation, linkcheck). Human review for accuracy, mobile UX, accessibility in CI, and performance budgets still relies on process rather than full mechanical gates. |
| **Repository evidence** | `Makefile` (`ci`), `docs/architectural-checklist.md` (Definition of done), `scripts/component-coverage-gate.ts`, `.github/workflows/ci.yml` |
| **Verification commands** | `make ci` |
| **Gaps** | Not all DoD bullets (mobile/tablet/desktop sign-off, a11y in CI, performance budgets, editorial review) are automatically enforced. |
| **Follow-up or operator requirement** | Wire `src/tests/a11y` into CI; add performance and editorial sign-off gates when prioritized. |

## Phase 1 boundaries and deferred mechanisms

This governance pass records mechanism status from repository evidence. It does
**not** authorize new locale routing, preview deployments, Storybook, Lighthouse
budgets, PDF pipelines, or blog routes in Phase 1. Reviewers should treat
entries marked **missing** or operator-owned in the tables below as intentional
deferrals unless a later governance pass explicitly rescopes them.

### Current localization posture

| Aspect | Repository behavior today | Phase 1 boundary |
| --- | --- | --- |
| **Shipped locales** | English only — message sidecars use `en` (for example `messages/en.json`, `src/content/messages/en/common.json`, and `*.en.json` tag registry files). | Do not mark **Localization** **implemented** until a second locale ships. |
| **Message loading** | `src/lib/content/ui-messages.ts` and `ui-messages-load.ts` default to `locale = "en"`; page MDX uses colocated `messages/en.json` sidecars. | No new global i18n layer is required in Phase 1. |
| **Routing** | No `src/app/[locale]/` or `src/app/print/[locale]/` segments; docs routes use locale-agnostic paths such as `/docs/**`. | Locale-prefixed routes and print URLs are deferred. |
| **Search** | Orama search indexes English content; there is no translated-index or locale-switch UI. | Translated search and alternate-language metadata are deferred. |
| **CI enforcement** | `bun test src/tests/content/ui-messages.test.ts` covers English message keys only. | No translation-completeness validator until a second locale is introduced. |

The checklist describes future locale-aware PDF paths and `messages/<locale>.json`
patterns; those are aspirational contract text, not Phase 1 requirements for
this pass.

### Intentionally deferred mechanisms

| Mechanism | Status in this artifact | Why deferred | Reviewer expectation |
| --- | --- | --- | --- |
| **PR preview deployments** | Operator/manual; Operational gaps | No preview workflow in `.github/workflows/` | Confirm in GitHub UI; do not expect repository proof. |
| **Storybook / visual regression** | Testing and Component quality gaps | `src/component-examples/` substitutes for interactive catalog review | Do not fail this pass for absent Storybook. |
| **Lighthouse / bundle budgets** | Performance and Quality gaps | No CI performance regression gate | Manual spot-check is acceptable for Phase 1. |
| **Print routes and PDF validation** | PDF Export Contract **missing**; `make validate-pdf` stub | No `src/app/print/**`, `scripts/build-pdf.ts`, or real `scripts/validate-pdf.ts` | Treat PDF checklist rows as a future phase unless routes land. |
| **Blog routes and components** | Blog Components Contract **missing** | Templates exist under `docs/templates/`; no live blog app routes | Do not backfill blog implementation from checklist text alone. |
| **Observability / analytics** | Observability **missing** | No client telemetry in application source | Operator-owned or a future instrumentation pass. |
| **Accessibility in `make ci`** | Accessibility **partially implemented** | axe tests exist but are outside the default CI recipe | Documented deferral; wire into CI in a follow-up pass. |
| **Full locale / translation CI** | Localization **partially implemented** | English-only shipping posture | Do not add locale routing or translation CI for this governance pass. |

### Reviewer guidance for deferred scope

When approving this governance pass:

1. Confirm **Localization** and the deferred rows above match repository behavior — English-only messages, no locale routes, no translation CI.
2. Do **not** treat checklist aspirational text (locale PDF paths, blog URLs, Storybook catalog) as Phase 1 blockers.
3. Missing mechanisms listed here remain **missing** or **partially implemented** until a scoped follow-up pass adds source-controlled enforcement.
4. Re-run `bun run verify:architectural-checklist-mechanism-status` after edits to this section.

## Reviewer commands

Use the commands below to validate this governance pass. **Governance audit**
commands prove this artifact stays complete and aligned with
`docs/architectural-checklist.md`. **General quality gates** enforce site
health but are not specific to the mechanism-status audit.

### Repeatable reviewer path

Run these steps in order when approving this governance pass:

1. **Governance audit** — `make verify-architectural-checklist-mechanism-status`
   (alias: `bun run verify:architectural-checklist-mechanism-status`) proves every
   auditable checklist category, required artifact sections, and repository
   evidence rows stay aligned with `docs/architectural-checklist.md`.
2. **General quality gates** — `make ci` matches the default GitHub Actions **ci**
   job: lint, typecheck, tests, component coverage, production build, static
   export build, post-build integration tests, registry validation, and internal
   linkcheck.
3. **Post-build integration coverage** — `make test-integration` (alias:
   `bun run test:integration`) runs the manifest in
   `src/lib/verify/production-integration-test-paths.ts` via
   `scripts/run-production-integration-tests.ts` after `make test-build-contract`
   so the default CI path exercises built HTML, served export checks, and
   production-server convergence assertions that default `make test` skips unless
   `VERIFY_PRODUCTION_INTEGRATION_TESTS=1` is set.

### Governance audit (this artifact)

| Command | Purpose |
| --- | --- |
| `make verify-architectural-checklist-mechanism-status` | Primary reviewer entrypoint; runs the mechanism-status completeness verifier. |
| `bun run verify:architectural-checklist-mechanism-status` | Package-script alias for the same verifier. |
| `bun test src/lib/governance/architectural-checklist-audit.test.ts` | Regression tests for the mechanism-status verifier (category extraction, parsing, failure modes). |

### General quality gates

| Command | Purpose |
| --- | --- |
| `make ci` | Default maintainer gate: lint, typecheck, tests, component coverage, build-contract tests, post-build integration tests, registry validation, and internal linkcheck. |
| `bun run lint` | Biome lint and format checks across the repository. |
| `bun run typecheck` | TypeScript strict check (`tsc --noEmit`) after Fumadocs MDX generation. |
| `bun test` | Full Bun test suite (includes governance verifier tests and CI contract tests; skips opt-in built HTML / production-server integration unless `VERIFY_PRODUCTION_INTEGRATION_TESTS=1`). |
| `make test-integration` | Served export, built HTML, and production-server integration manifest (`production-integration-test-paths.ts`); included in `make ci` after the build-contract gate. Script-level E2E validator suites remain opt-in via full `VERIFY_PRODUCTION_INTEGRATION_TESTS=1 bun test`. |
| `bun run test:integration` | Package-script alias for `make test-integration` (`scripts/run-production-integration-tests.ts`). |

Run `make verify-architectural-checklist-mechanism-status` first when reviewing
changes to this artifact or `docs/architectural-checklist.md`. Run `make ci` (or
the individual gates above) to confirm existing site quality checks still pass
after governance edits.
