# Contributing documentation

This guide explains how to add or request new documentation in the Model Reference
repository. It describes only workflows that exist in the codebase today.

## What this repository is for

Model Reference is a documentation-native reference for modern AI models,
modules, concepts, papers, training methods, and related topics. Published pages
live under `src/content/docs/` and `src/content/blog/` and render through the
shared docs shell described in [site fundamentals](../site-fundamentals.md).

Docs contributions should help readers look up concepts, compare variants, and
follow links between related pages. This site is a technical explainer and
reference sheet, not a benchmark leaderboard or a paper download service.

The content model separates page structure (MDX), structured data (registry
records), and reader-facing prose (colocated message files). See
[data model](../data-model.md) for how those layers fit together.

## Before you write

Read these references before authoring or reviewing docs:

| Reference | What it covers |
| --- | --- |
| [documentation template](../documentation-template.md) | Page structure, MDX components, message keys, and asset placement |
| [writing standards](../writing-standards.md) | Folded summary, tone, symbol-only math, and customer-facing copy rules |
| [graphing standards](../graphing-standards.md) | Single primary graph, node theme, and attention-variant comparison |
| [quality documents standards](../quality-documents-standards.md) | Review checklist for compact, accurate reference pages |
| [data model](../data-model.md) | Registry IDs, tags, aliases, citations, and storage layout |
| [site fundamentals](../site-fundamentals.md) | Product frame, visual direction, and docs shell expectations |

Production templates and starter sidecars live in `docs/templates/`. Each kind
has a `.mdx` structure file, a `.content.md` authoring guide, and starter
`messages.en.json` and `assets.json` files.

## Choose your path

Contributors can land docs work in two ways.

### Add or edit a page directly

Use direct authoring when you can implement the page yourself in a pull request:

- You know the page kind and slug.
- You can fill the MDX structure, registry record, messages, assets, tags, and
  citations without generator assistance.
- The work fits an existing template and the current scaffold support boundary.

For **glossary** and **concept** pages, start with the checked-in scaffold:

```sh
bun run scaffold:doc-page -- --help
```

Example dry run:

```sh
bun run scaffold:doc-page -- --kind concept --slug my-concept --title "My concept" \
  --concept-type architecture --dry-run
```

Equivalent Make entry:

```sh
make scaffold ARGS='--kind glossary --slug my-term --title "My term" --concept-type general --dry-run'
```

`scaffold:doc-page` currently supports `--kind glossary` and `--kind concept`
only. Other canonical kinds (model, module, paper, training-regime) still start
from the templates in `docs/templates/` until scaffold support expands.

After scaffolding or copying a template bundle, replace placeholder copy in
`messages/en.json`, add or update registry records the page references, and set
`status` in `page.mdx` frontmatter when the page is ready for published checks.

Open a pull request with your page changes. Run local validation before review;
see [README.md](../../README.md#quality-gates) for the `make ci` sequence and
individual targets such as `make validate-data` and `make linkcheck`.

### Request factory-driven work

Use the agent factory when the change is larger than a single direct PR, needs
generated transformations, or requires coordinated batch execution across many
pages.

The factory loop is documented in:

- [factory/docs/overview.md](../../factory/docs/overview.md)
- [factory/docs/batch-inputs.md](../../factory/docs/batch-inputs.md)
- [factory/docs/batch-input-example.json](../../factory/docs/batch-input-example.json)

Maintainers and meta-planners submit batches with the `you` CLI. Contributors who
are not running the factory should open an issue or talk to a maintainer with a
clear idea work item: page kind, slug, source material, and which template or
generator path applies.

Do not assume every contributor machine has `you` installed or authorized to
submit real batches. The checked-in factory docs describe the request shape;
submission authorization is controlled separately.

Examples of factory-appropriate requests:

- Generator-assisted page creation for kinds the scaffold does not support yet.
- Broad content conversions that touch many registry records or templates.
- Planned documentation batches tracked in
  [documentation site pages needed](../documentation-site-pages-needed.md).

Examples of direct-PR work:

- A single new glossary or concept page after scaffold.
- Corrections to messages, citations, tags, or assets on an existing page.
- Template-aligned edits that pass `make validate-data` and `make linkcheck`.

## What is not an active contributor workflow today

**Localization** — Canonical pages are designed for colocated
`messages/<locale>.json` files, but a contributor-facing localization pipeline
is not authorized in the current phase. Do not document or request locale rollout
as if it were already implemented. When a future phase authorizes localization,
requests should name the source page, target locales, and message keys to
translate.

**Unsupported generators** — Only commands and scripts checked into this
repository are valid. Do not rely on undocumented CLI flags, external scaffolds,
or localization flows that are not backed by `package.json`, the Makefile, or
checked-in scripts.

## Maintainer references

These files support factory planning and review. They are not the primary
contributor contract, but they explain how large docs efforts are prioritized:

- [documentation site pages needed](../documentation-site-pages-needed.md)
- [architectural checklist](../architectural-checklist.md)
- [operations](../operations.md) — CI merge policy and deployment posture

For command details beyond docs work, see the root [README.md](../../README.md).
