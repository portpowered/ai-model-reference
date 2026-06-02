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

## Expected Commands

The full website scaffold is still being defined. Once implemented, the root
Makefile should expose:

```sh
make ci
make test
make coverage
make build
make lint
make format
make typecheck
make validate-data
make validate-pdf
make linkcheck
make pdf LOCALE=en
```

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
