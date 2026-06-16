# Learn Language Models

[![CI](https://github.com/portpowered/ai-model-reference/actions/workflows/ci.yml/badge.svg)](https://github.com/portpowered/ai-model-reference/actions/workflows/ci.yml)

A static AI model reference site for large language model components, concepts,
papers, training regimes, systems ideas, and architecture variants.

## Problem

Engineers and technical readers who follow model architecture changes do not
have a compact reference that connects models, modules, papers, systems
concepts, and practical tradeoffs in one searchable place.

## Solution

This project builds a multilingual, static-first reference website where readers
can search for concepts such as attention, KV cache, grouped-query attention,
diffusion transformers, quantization, inference serving, or GPT-2 and move
between related models, modules, papers, and explanations.

The site is not a benchmark leaderboard and is not a paper-download mirror. It
is an explainer and reference system backed by structured data.

## Website Shape

The intended app is a Next.js App Router site using:

* Fumadocs for MDX documentation routes and source loading
* Orama through Fumadocs for search
* React Flow for interactive recursive model/module graphs
* static vertical SVG, Mermaid, or image fallbacks for print/PDF graphs
* Recharts for explanatory charts
* Tailwind, design tokens, and shadcn/ui for interface components
* Bun for package scripts, tests, and coverage
* Biome for linting and formatting

Content is split into three layers:

```txt
src/content/docs/**/page.mdx       # page structure
src/content/docs/**/messages/*.json # localized text
src/content/docs/**/assets.json     # page-local asset references
src/content/registry/**/*.json      # structured records for search and relations
```

The registry defines meaning. MDX defines structure. Messages provide localized
values. Asset config resolves concrete images, graphs, tables, charts, and code
schemas.

## Important Docs

Start with:

* [AGENTS.md](./AGENTS.md)
* [docs/architecture.md](./docs/architecture.md)
* [docs/data-model.md](./docs/data-model.md)
* [docs/architectural-checklist.md](./docs/architectural-checklist.md)
* [docs/documentation-template.md](./docs/documentation-template.md)
* [docs/documentation-site-pages-needed.md](./docs/documentation-site-pages-needed.md)
* [docs/site-fundamentals.md](./docs/site-fundamentals.md)
* [docs/quality-documents-standards.md](./docs/quality-documents-standards.md)

## Local Development

Install dependencies and start the dev server:

```sh
bun install
make dev
```

`make dev` runs the same Next.js dev entrypoint as `bun run dev`. Open
`http://localhost:3000` for the home page and `/docs/getting-started` for the
placeholder docs route.

## Static export (GitHub Pages)

The default `bun run build` / `make build` path keeps the standard Next.js
production build under `.next/` for `next start` and existing Phase 1 route
verifiers. Use the static export path when you need a GitHub Pages–compatible
`out/` artifact instead of `next start`—for example when validating
project-site base paths locally or confirming the same artifact the deploy
workflow publishes.

**Single command:** `make build-export` runs the export build and verifies the
`out/` artifact in one step. It is the local verification command and the deploy
workflow build entrypoint (`.github/workflows/deploy.yml` runs the same target on
`main` pushes with `GITHUB_PAGES_BASE_PATH=ai-model-reference`). It also runs in
`make ci` after `make build` so both the `.next/` production contract and the
GitHub Pages `out/` artifact stay verified.

```sh
make build-export
```

That runs `bun run build:export` (sets `NEXT_STATIC_EXPORT=1`, which toggles
`output: "export"` and `images.unoptimized` in `next.config.ts`), then
`verify-phase-1-export-routes`, which exits non-zero when `out/` is missing,
empty, or lacks expected Phase 1 reader routes and content markers (`/`,
`/docs/architecture`, `/docs/glossary`, `/docs/modules/grouped-query-attention`,
`/tags`, and `/tags/attention`), then `verify-phase-1-export-search-handoff`,
which exits non-zero when `out/api/search` is missing or when Phase 1 static
search queries (`GQA`, `attention`, `KV cache`) fail against the export bootstrap
payload.

To verify an existing export without rebuilding:

```sh
make verify-export-routes
# or: bun run verify:export-routes

make verify-export-search-handoff
# or: bun run verify:export-search-handoff

make verify-export-search-shell
# or: bun run verify:export-search-shell

make verify-export-search-ux
# or: bun run verify:export-search-ux
```

For GitHub Pages **project sites** served from `https://<org>.github.io/<repo>/`,
set `GITHUB_PAGES_BASE_PATH` to the repository name (with or without a leading
slash) when running the export build. The value configures matching
`basePath` and `assetPrefix` so bundled assets and internal links resolve under
the project path:

```sh
GITHUB_PAGES_BASE_PATH=/ai-model-reference make build-export
```

When `GITHUB_PAGES_BASE_PATH` is unset, export builds keep `/` as the base for
local preview and user/org root GitHub Pages sites.

See [docs/operations.md](./docs/operations.md) for deployment posture, required
Pages settings, deploy check visibility, and commit-SHA traceability after merges
to `main`.

## Phase 2 docs authoring

Glossary and concept pages share one scaffold path. Templates live in
`docs/templates/`; see [docs/documentation-template.md](./docs/documentation-template.md)
for the message-key-driven MDX contract.

### Scaffold a new page

Preview planned paths without writing files:

```sh
bun run scaffold:doc-page -- --kind glossary --slug my-term --title "My term" \
  --concept-type general --dry-run
```

Create the four-file bundle (registry record, colocated `page.mdx` / `messages/en.json` /
`assets.json`):

```sh
bun run scaffold:doc-page -- --kind concept --slug my-concept --title "My concept" \
  --concept-type architecture --tags attention --related-ids concept.token
```

Required flags:

| Flag | Values |
| --- | --- |
| `--kind` | `glossary` or `concept` |
| `--slug` | kebab-case slug (directory name and `concept.<slug>` registry id) |
| `--title` | reader-facing title (written into draft messages) |
| `--concept-type` | `architecture`, `math`, `training`, `inference`, `systems`, `evaluation`, or `general` |

Optional flags: `--tags`, `--related-ids`, `--citation-ids`, `--aliases` (comma-separated),
and `--dry-run`. Run `bun run scaffold:doc-page -- --help` for the full usage line.

Equivalent Make entry (pass CLI args after `ARGS=`):

```sh
make scaffold ARGS='--kind glossary --slug my-term --title "My term" --concept-type general --dry-run'
```

Glossary pages land under `src/content/docs/glossary/<slug>/` and render at
`/docs/glossary/<slug>` through the docs catch-all route (`src/app/docs/[[...slug]]/page.tsx`).
Concept pages use `src/content/docs/concepts/<slug>/` and `/docs/concepts/<slug>` the same way.
No per-slug App Router `page.tsx` stub is generated.

## Reusable component coverage

Reusable MDX building blocks (Callout, Section, T, TagPillList,
DerivedRelatedDocs, and search result presentation) must keep **at least 90%
reachable line coverage**, or be documented as thin wrappers with named smoke
tests. The inventory, thin-wrapper exception pattern, allowed path globs, and
update steps live in
[docs/phase-2-component-coverage.md](./docs/phase-2-component-coverage.md);
machine-readable entries are in `src/lib/docs/component-manifest.ts`.

Run the manifest gate locally with `make coverage` (same as `bun run coverage`).
`make ci` includes this gate after `make test` so GitHub Actions enforces the
same manifest-scoped contract—there are no repository-wide coverage thresholds.

## Component example harness

Phase 2 shared docs components (Callout, Section, T, TagPillList,
DerivedRelatedDocs, and search result presentation) ship with a lightweight
Storybook-style gallery instead of full Storybook. Examples live in
`src/component-examples/` and render on a dev-only route at
`/component-examples`.

Start the harness with a single command (picks a free port in `3100-3999`):

```sh
make component-examples
```

Equivalent Bun script: `bun run component-examples`. The gallery uses grouped-query-attention
fixtures and search metadata so reviewers can inspect default and alternate states
without loading full MDX pages. The route returns 404 in production builds unless
`ENABLE_COMPONENT_EXAMPLES=1` is set; it is not part of `make ci` or deploy.

### After scaffolding

1. Replace placeholder copy in `messages/en.json` (scaffold fills schema-valid stubs).
2. Add or update registry records the page references (for example a `graph.<slug>-concept-map`
   record when the template references a concept map asset).
3. Set `status: published` in `page.mdx` frontmatter when the page is ready for published
   reference checks; keep `draft` while `relatedIds`, tags, or citations still point at
   unpublished targets.
4. Run `make validate-data` (also part of `make ci`) to catch missing message keys, unknown
   assets, unresolved tags, broken references, and page/registry slug mismatches.

## Operations and release

Maintainer procedures for deployment posture, branch protection, CI merge policy,
release, rollback, and commit-SHA traceability live in
[docs/operations.md](./docs/operations.md).

Merges to `main` trigger GitHub Pages deployment via
`.github/workflows/deploy.yml`, which builds `out/` with `make build-export` and
publishes to the project site. See [docs/operations.md](./docs/operations.md) for
required Pages settings, deploy check visibility on `main`, and commit-SHA
traceability.

`.github/workflows/ci.yml` remains the quality gate on pull requests and `main`
pushes; it runs `make ci` only and does not replace or invoke the deploy
workflow. Preview deployments for pull requests remain out of scope for Phase 1.

See the [Actions tab](https://github.com/portpowered/ai-model-reference/actions)
for CI and deploy run history on pull requests and `main`.

## Quality Gates

Merge policy, branch protection assumptions, and what contributors see on pull
requests versus `main` pushes are documented in
[docs/operations.md](./docs/operations.md) (Branch protection and CI status
expectations). GitHub enforces required **ci** status on `main` through
repository settings, not from files in this repo.

### Fresh checkout

On a clean clone with no gitignored build artifacts, the minimal setup is:

```sh
bun install --frozen-lockfile
make ci
```

You do not need to run `fumadocs-mdx` manually. The repository does not commit
`.source/` (Fumadocs MDX bindings) or `.next/`; `pretypecheck` and `pretest`
generate `.source/` automatically before typecheck and tests.

### CI sequence

GitHub Actions runs the same gate sequence on pull requests and pushes to
`main`: install dependencies with `bun install --frozen-lockfile`, then
`make ci` (see `.github/workflows/ci.yml`). No repository secrets are required
for lint, typecheck, fast tests, manifest-scoped component coverage, build,
build-export, build-contract tests, post-build integration tests, validate-data, and linkcheck. The baseline CI workflow
(`.github/workflows/ci.yml`) does not invoke deploy or preview steps. GitHub
Pages deployment runs separately via `.github/workflows/deploy.yml` on pushes to
`main` (see [Operations and release](#operations-and-release)). PDF validation
remains deferred to later phases.

The root Makefile mirrors those CI-oriented checks locally. Run `make ci` from
the repository root after `bun install --frozen-lockfile`; it runs, in order:

1. `make lint` — Biome check (no auto-fix)
2. `make typecheck` — generates Fumadocs MDX source, then `tsc --noEmit`
3. `make test` — generates Fumadocs MDX source (when typecheck was skipped), then fast tests via `scripts/run-fast-tests.ts`
4. `make coverage` — manifest-scoped reusable component coverage gate (same as `bun run coverage`)
5. `make build` — `next build` plus Phase 1 static route verification
6. `make build-export` — static export to `out/` plus Phase 1 export route verification
7. `make test-build-contract` — consolidated build/export contract suites (`bun run test:build-contract`)
8. `make test-integration` — post-build built HTML and production-server integration manifest (`bun run test:integration` / `scripts/run-production-integration-tests.ts`)
9. `make validate-data` — registry and content validation
10. `make linkcheck` — internal docs link validation (Fumadocs routes, module/glossary pages, anchors, MDX href components)

Use `bun run scaffold:doc-page` (or `make scaffold`) when adding Phase 2 glossary or
concept pages, then run `make validate-data` before opening a pull request.

Fumadocs writes generated MDX bindings under `.source/` (gitignored). Fresh
checkouts do not include that directory; `pretypecheck` and `pretest` in
`package.json` both run `fumadocs-mdx` so standalone `make typecheck` and
`make test` succeed without a manual codegen step.


Individual targets:

```sh
make ci            # full gate sequence above
make lint          # Biome check (no auto-fix)
make format        # Biome format --write
make typecheck     # fumadocs-mdx (pretypecheck), then tsc --noEmit
make test          # fumadocs-mdx (pretest), then fast tests
make test-build-contract # consolidated build/export contract suites
make test-system   # build/export contracts plus post-build integration tests
make coverage      # fumadocs-mdx (precoverage), manifest coverage gate
make build         # next build + Phase 1 static route check
make build-export  # static export to out/ + Phase 1 export route verification
make verify-export-routes # verify existing out/ artifact (requires build-export first)
make verify-phase-1-ux # HTTP verification for Phase 1 reader routes and search (requires build)
make verify-phase-1-built-app-convergence # batch-010 built-app gate with planner-facing evidence summary
make verify-phase-1-follow-up-convergence # batch-011 follow-up gate with planner-facing evidence summary
make verify-phase-1-github-pages-convergence # batch-014 GitHub Pages closure gate (validates out/ static export)
make validate-data # registry and content validation
make linkcheck     # internal docs link validation (also runs in make ci)
make scaffold       # scaffold glossary/concept page bundles (pass ARGS='...')
```

Stub targets exist for later work and are not part of `make ci` or GitHub
Actions:

```sh
make validate-pdf
```

### Phase 1 route and search UX verification

**Prerequisites:** `make build` (production `.next/`), Bun dependencies
installed, and Playwright Chromium for real browser checks (`npx playwright
install chromium` once per machine).

After `make build`, run the built-app verifier to codify the Phase 1 manual gate
from `docs/internal/customer-ask.md` (home, search, glossary, tags, sample
docs, live `/search` and header search for GQA, attention, and KV cache, plus
`/api/search` for the same queries):

```sh
make verify-phase-1-ux
# or
bun run verify:phase-1-ux
```

The verifier requires a production build (`.next/`). If the build is missing,
it exits with a clear message to run `make build` first—it does not start
`next dev` by default.

When `VERIFY_BASE_URL` is unset, the harness picks a free port on
`127.0.0.1` in the 3100–3999 range (never port 3000), spawns
`bun run start` on that port, and always tears down the child server on exit.
Each HTTP check uses a per-request timeout of at most 10 seconds; server startup
waits at most 30 seconds. Set `VERIFY_BASE_URL` to an already-running base URL
(for example `http://127.0.0.1:3456`) to skip spawn and run checks against that
server instead.

On success the command prints a one-line summary and exits `0`; failures print
route or query, HTTP status, and reason before exiting `1`. A healthy build
completes the verifier in well under two minutes on a typical laptop, bounded
by the configured timeouts.

**Pass/fail interpretation:** Exit `0` means the production-built app satisfies
the Phase 1 manual gate in `docs/internal/customer-ask.md`, including visible
links to Grouped-Query Attention for GQA, attention, and KV cache on `/search`
and in the header search dialog. Exit `1` catches the known **empty-results
regression**: `make ci` and in-process search tests can pass while `next start`
still shows an empty-only `/search` UI—this verifier fails in that case so
convergence review does not rely on ad hoc browser sessions alone. Neither
`make ci` nor GitHub Actions runs this verifier by default; run it locally or in
convergence review after `make build`.

**UX convergence scope:** One command exercises all eight Phase 1 reader routes
over live HTTP against the production build. Failures print the request URL and a
human-readable reason before exiting `1`.

| Route | Pass | Fail (examples) |
| --- | --- | --- |
| `/docs/architecture`, `/docs/glossary`, `/docs/glossary/token`, `/docs/modules/grouped-query-attention` | Unified Fumadocs shell: primary nav, `nd-sidebar`, `nd-page`, populated Modules and Glossary sidebar, token glossary link | Split shell (missing `nd-sidebar`/`nd-page`), empty sidebar, legacy placeholder sidebar copy |
| `/` | Model Atlas title, global header search trigger (`data-search`), bookmark link to `/search`, **no** redundant inline home search section | Duplicate "Search the reference" heading, `id="search"` section anchor, or inline `data-search` in the home article alongside header search |
| `/search` | Manual-gate search page content markers | Missing expected search page copy or links |
| `/tags`, `/tags/attention` | Primary site navigation plus real tag links to sample module, token glossary, and tag-scoped search (no placeholder copy) | Missing primary nav, placeholder/lorem copy, or required tag navigation links |
| `/api/search`, built `/search`, header dialog | Live search returns GQA, attention, and KV cache results | Empty-only search UI or missing result links |

Convergence checks run first (docs shell → home search entry → reader/tags
navigation), then legacy route content markers, then `/api/search`, built
`/search` Playwright checks, header search dialog, and keyboard shortcuts.

**Customer-ask convergence reporting:** After the Phase 1 UX checks finish,
the same command prints a structured **Customer-ask convergence report** with
one line per batch-008 customer-ask check. Each row includes a stable `checkId`,
human title, optional `route` or `query`, `pass` / `fail` / `uncertain` status,
failure reason when applicable, and a `checklistRow` mapping to
`docs/internal/checklist.md`. The report covers home/header polish on `/`,
tag list styling on `/tags` and `/tags/attention`, search surface behavior on
`/search`, the header search dialog, and `/api/search`, glossary presentation on
`/docs/glossary/token`, and the canonical GQA module page on
`/docs/modules/grouped-query-attention`.

**Pass / fail / uncertain interpretation for loopback review:**

| Outcome | Meaning | Exit code impact |
| --- | --- | --- |
| `pass` | Built app satisfies the customer-ask assertion | Non-blocking |
| `fail` | Regression or missing batch-008 repair evidence | Command exits `1` |
| `uncertain` | Check ran but needs manual follow-up (for example Command-K hover contrast or glossary footer hover pairing) | Non-blocking; record in convergence notes |

The process exit code is `1` when **either** legacy Phase 1 UX verification fails
**or** any customer-ask row is `fail`. Rows marked `uncertain` alone do not fail
the command. Copy per-row statuses into loopback convergence notes so the
ideafy planner can choose a narrow repair batch or Phase 1 stop-and-wait. See
`factory/docs/phase-1-customer-ask-convergence-validator.md` for the full check
id, route, and checklist-row inventory.

**Batch-010 built-app convergence validator:** During batch-010 loopback, run
the canonical built-app gate with planner-facing evidence that separates
verifier command-path health from customer-ask row outcomes:

```sh
make verify-phase-1-built-app-convergence
# or
bun run verify:phase-1-built-app-convergence
```

This runs `make build` then `make verify-phase-1-ux` with `VERIFY_BASE_URL`
explicitly unset, streams subprocess output to the terminal while capturing it
for parsing, and prints a **Phase 1 batch-010 built-app convergence evidence
summary** with `Recommendation` and `Rationale` lines. The process exits `1`
when verifier command-path or any customer-ask row is `fail`; `uncertain`
evidence is non-blocking. Canonical validation must not set `VERIFY_BASE_URL`.
See `factory/docs/phase-1-built-app-convergence-validator.md` for
prerequisites, report fields, exit semantics, and recommendation interpretation.

**Batch-011 follow-up convergence validator:** After batch-011 follow-up repairs
land, run the canonical follow-up gate with planner-facing evidence for the
expanded customer-ask inventory:

```sh
make verify-phase-1-follow-up-convergence
# or
bun run verify:phase-1-follow-up-convergence
```

This runs `make build` then `make verify-phase-1-ux` with `VERIFY_BASE_URL`
explicitly unset, streams subprocess output to the terminal while capturing it
for parsing, and prints a **Phase 1 batch-011 follow-up convergence evidence
summary** with `Recommendation` and `Rationale` lines. The process exits `1`
when verifier command-path or any customer-ask row is `fail`; `uncertain`
evidence is non-blocking. Prior batch-008/010 all-pass evidence is stale for
this inventory and must be refreshed through this pass. See
`factory/docs/phase-1-follow-up-customer-ask-convergence-validator.md` for
prerequisites, check inventory, exit semantics, and loopback usage.

**Batch-014 GitHub Pages convergence validator:** After batch-014 GitHub Pages
repairs land, run the canonical static-export closure gate that validates the
built `out/` artifact rather than only the `next start` spawned-server path:

```sh
make verify-phase-1-github-pages-convergence
# or
bun run verify:phase-1-github-pages-convergence
```

This runs `make build-export`, inspects the `out/` artifact, serves it from a
loopback static file server, and re-runs Phase 1 search probes for GQA,
attention, and KV cache plus representative reader-route markers against that
static export. It prints a **Phase 1 batch-014 GitHub Pages convergence
evidence summary** with `Recommendation` and `Rationale` lines. The process
exits `1` when export-command-path, export-artifact, static-server-command-path,
or phase-1-static-regression rows are `fail`; `uncertain` evidence is
non-blocking. Prior built-app follow-up convergence evidence does not prove the
GitHub Pages export path and must be refreshed through this pass. See
`factory/docs/phase-1-github-pages-convergence-validator.md` for prerequisites,
domain inventory, exit semantics, and loopback usage.

The verifier also exercises the built `/search` page, the header search dialog
(via the search trigger button), and keyboard shortcuts on the home page:
**Meta+K** (Cmd+K on macOS) and **Control+K** (Windows/Linux). Each shortcut
must open the header search dialog with a visible search textbox. Real runs
need Playwright Chromium once per machine (`npx playwright install chromium`).

If your environment cannot reliably automate OS keyboard shortcuts in CI, set
`VERIFY_SEARCH_SHORTCUT_SKIP=1` to skip automated shortcut checks. When
skipping, reviewers must run this two-step manual check after
`make verify-phase-1-ux`:

1. Open the built app home page (`/`).
2. Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) and confirm the
   header search dialog opens with a visible search textbox; repeat for the
   other modifier if your platform supports both.

For static HTTP fixture tests, set `VERIFY_SEARCH_SHORTCUT_STUB=pass` alongside
the other `VERIFY_*_STUB=pass` env vars documented in the verifier tests.

GitHub Pages deployment runs in `.github/workflows/deploy.yml` on `main` pushes
only; neither `.github/workflows/ci.yml` nor `make ci` invokes deploy or preview
steps.
Manifest-scoped component coverage runs in `make ci` after `make test` (see
[Reusable component coverage](#reusable-component-coverage)).

### Fresh-checkout CI proof

During `make test` (and therefore `make ci`), `src/tests/ci/fresh-checkout-typecheck.test.ts`
proves the typecheck gate succeeds when `.source/` is absent. Instead of
deleting gitignored artifacts in your working tree, the test provisions an
isolated detached git worktree at HEAD, runs `bun install --frozen-lockfile`
inside it, confirms `.source/` is missing, and runs the typecheck gate only in
that worktree. This models a fresh clone without mutating your main workspace
`node_modules`, `.next/`, or generated `.source/`.

Equivalent Bun scripts are in `package.json` (`bun run lint`, `bun run build`,
`bun run scaffold:doc-page`, and so on).

## Agent Factory Loop

The project uses an agent factory called `you` to manage long-running work.
Only the PLANNER/meta-planner role should use `you`.

The ideafy meta-planner submits batches of `idea` work. Each idea is converted
to a PRD, a worktree task, implementation work, review, and eventual completion.
The loop is documented in:

* [factory/workstations/ideafy/AGENTS.md](./factory/workstations/ideafy/AGENTS.md)
* [factory/factory.json](./factory/factory.json)
* [factory/docs/batch-inputs.md](./factory/docs/batch-inputs.md)
* [factory/docs/batch-input-example.json](./factory/docs/batch-input-example.json)

Project-level meta state lives in:

```txt
docs/internal/progress.txt
docs/internal/checklist.md
```
