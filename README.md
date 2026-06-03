# Learn Language Models

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

## Quality Gates

The root Makefile mirrors CI-oriented checks. Run `make ci` from the repository
root after `bun install`; it runs, in order:

1. `make lint` — Biome check (no auto-fix)
2. `make typecheck` — generates Fumadocs MDX source, then `tsc --noEmit`
3. `make test` — generates Fumadocs MDX source (when typecheck was skipped), then `bun test`
4. `make build` — `next build` plus Phase 1 static route verification
5. `make validate-data` — registry and content validation

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
make test          # fumadocs-mdx (pretest), then bun test
make build         # next build + Phase 1 static route check
make validate-data # registry and content validation
```

Stub targets exist for later work and are not part of `make ci`:

```sh
make linkcheck
make validate-pdf
```

Equivalent Bun scripts are in `package.json` (`bun run lint`, `bun run build`,
and so on).

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
factory/internal/progress.txt
factory/internal/checklist.md
```
