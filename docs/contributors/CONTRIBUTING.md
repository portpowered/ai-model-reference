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

Production templates and starter sidecars live in `docs/templates/`. See
[Page kinds and starter artifacts](#page-kinds-and-starter-artifacts) for how to
choose a kind and which files to copy.

## Page kinds and starter artifacts

### Canonical docs pages vs blog posts

The repository has two published page families. They use different templates,
storage paths, and metadata rules.

**Canonical docs pages** live under `src/content/docs/` and render through the
shared docs shell. They are reusable reference structure:

- MDX defines component order and references only; reader-facing prose belongs
  in colocated `messages/<locale>.json` files.
- Frontmatter includes `kind`, `registryId`, `tags`, and usually `aliases`.
- Search, related links, and cards resolve through registry records under
  `src/content/registry/`.

**Blog posts** live under `src/content/blog/` and are narrative, time-specific
writing:

- MDX may contain raw prose when localization is not required.
- Frontmatter uses `authors`, `publishedAt`, and `relatedDocIds` instead of
  `registryId`.
- Posts link back to canonical docs pages rather than duplicating stable
  definitions.

See [documentation template](../documentation-template.md) for the full
component and frontmatter contract.

### Template inventory in `docs/templates/`

Each page kind has a production template and three starter sidecars. Copy the
sidecars into the published page folder; do not copy `.content.md` into
`src/content/`.

| Page kind | Production template | Starter sidecars | Published route parent |
| --- | --- | --- | --- |
| Concept | `concept.mdx` | `concept.content.md`, `concept.messages.en.json`, `concept.assets.json` | `src/content/docs/concepts/<slug>/` |
| Glossary | `glossary.mdx` | `glossary.content.md`, `glossary.messages.en.json`, `glossary.assets.json` | `src/content/docs/glossary/<slug>/` |
| Model | `model.mdx` | `model.content.md`, `model.messages.en.json`, `model.assets.json` | `src/content/docs/models/<slug>/` |
| Module | `module.mdx` | `module.content.md`, `module.messages.en.json`, `module.assets.json` | `src/content/docs/modules/<slug>/` |
| Paper | `paper.mdx` | `paper.content.md`, `paper.messages.en.json`, `paper.assets.json` | `src/content/docs/papers/<slug>/` |
| Training regime | `training-regime.mdx` | `training-regime.content.md`, `training-regime.messages.en.json`, `training-regime.assets.json` | `src/content/docs/training/<slug>/` |
| Blog post | `blog-post.mdx` | `blog-post.content.md`, `blog-post.messages.en.json`, `blog-post.assets.json` | `src/content/blog/<slug>/` |

Starter artifact roles:

| Artifact | Role |
| --- | --- |
| `<kind>.mdx` | Production page structure. Becomes `page.mdx` in the published folder. |
| `<kind>.content.md` | Authoring guide for that kind. Read while writing; never copied into `src/content/`. |
| `<kind>.messages.en.json` | Starter shape for `messages/en.json` beside the page. |
| `<kind>.assets.json` | Starter shape for colocated `assets.json` (graphs, tables, images, code schemas). |

Some kinds also ship optional `*.graph.json` examples next to the template
bundle. Use them as references when filling `assets.json`, not as files to copy
verbatim into published pages.

Glossary entries share the concept registry record shape and section structure.
They differ in frontmatter `kind: glossary`, route prefix
(`/docs/glossary/<slug>`), and glossary-specific message rules described in
`glossary.content.md`.

### Scaffold support boundary

`scaffold:doc-page` generates a full page bundle for **glossary** and **concept**
kinds only. It copies the matching template, creates the registry record, graph
record when needed, and writes colocated messages and assets.

```sh
bun run scaffold:doc-page -- --help
```

All other canonical kinds (**model**, **module**, **paper**, **training-regime**)
still start from the template bundle in `docs/templates/`. Copy
`<kind>.mdx` to `page.mdx`, rename the starter JSON files into the published
folder, create the matching registry record under `src/content/registry/`, and
follow `<kind>.content.md` until scaffold support expands.

For concept and glossary work, contributors may also use
`scripts/generate-page-bundle.ts` with a page spec when they need generator
alignment across structure, messages, and assets. That path is optional; the
scaffold command is the default direct-authoring entry point.

### Choosing slug, title, aliases, tags, and registryId

These fields must stay aligned across the page folder, MDX frontmatter, message
files, and registry records. See [data model](../data-model.md) for the full
schema.

**Slug** — Kebab-case route segment and folder name (`grouped-query-attention`).
Use lowercase letters, digits, and single hyphens only. The slug does not include
the route prefix (`modules/`, `concepts/`, and so on).

**Title** — Reader-facing display name. Put the canonical title in
`messages/en.json` under `title`. Registry records point to it through
`defaultTitleKey` (usually `"title"`).

**registryId** — Stable namespaced ID that links the page to search and related
docs:

| Page kind | registryId pattern | Registry file location |
| --- | --- | --- |
| Concept | `concept.<slug>` | `src/content/registry/concepts/<slug>.json` |
| Glossary | `concept.<slug>` | `src/content/registry/concepts/<slug>.json` |
| Model | `model.<slug>` | `src/content/registry/models/<slug>.json` |
| Module | `module.<slug>` | `src/content/registry/modules/<slug>.json` |
| Paper | `paper.<slug>` | `src/content/registry/papers/<slug>.json` |
| Training regime | `training-regime.<slug>` | `src/content/registry/training-regimes/<slug>.json` |

Set the same `registryId` in `page.mdx` frontmatter and in the registry record
`id` field. Frontmatter `kind` must match the registry record `kind` (glossary
pages use `kind: glossary` in frontmatter while the registry record remains
`kind: concept`).

**Aliases** — Abbreviations, spelling variants, and common names readers might
search for (`GQA`, `grouped-query attention`). Keep frontmatter `aliases` and
the registry record `aliases` array in sync.

**Tags** — Controlled search metadata, not casual labels. Use tag **slugs** that
resolve to published records in `src/content/registry/tags/` (for example
`attention` maps to `tag.attention`). Repeat the same slugs in frontmatter and in
the registry record `tags` array.

When using `scaffold:doc-page`, pass `--concept-type` for concept and glossary
pages. Valid values are `architecture`, `math`, `training`, `inference`,
`systems`, `evaluation`, and `general`. Optional scaffold flags
(`--tags`, `--aliases`, `--related-ids`, `--citation-ids`) seed registry and
frontmatter fields in one step.

## Choose your path

Contributors can land docs work in two ways.

### Add or edit a page directly

Use direct authoring when you can implement the page yourself in a pull request:

- You know the page kind and slug.
- You can fill the MDX structure, registry record, messages, assets, tags, and
  citations without generator assistance.
- The work fits an existing template and the current scaffold support boundary.

For **glossary** and **concept** pages, start with the checked-in scaffold
(see [Scaffold support boundary](#scaffold-support-boundary)):

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

For **model**, **module**, **paper**, and **training-regime** pages, copy the
matching template bundle from `docs/templates/` and create the registry record
manually until scaffold support expands.

After scaffolding or copying a template bundle, replace placeholder copy in
`messages/en.json`, add or update registry records the page references, and set
`status` in `page.mdx` frontmatter when the page is ready for published checks.
Use [Choosing slug, title, aliases, tags, and registryId](#choosing-slug-title-aliases-tags-and-registryid)
to keep metadata aligned.

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
