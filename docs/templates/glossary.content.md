# Glossary Template Authoring Guide

Use `glossary.mdx` as the production page structure for glossary entries at `/docs/glossary/<slug>`. Put localized reader-facing text in `messages/<locale>.json` using the keys from `glossary.messages.en.json`. Put page-specific visual references in `assets.json` using `glossary.assets.json`.

Glossary pages use `kind: glossary` in frontmatter and resolve through a `concept.<slug>` registry record, the same registry shape as concept pages. The route lives under `src/content/docs/glossary/<slug>/` even though the registry id prefix is `concept.`.

## Required Content

* `title`: canonical glossary term name.
* `description`: short search and metadata description.
* `problemStatement`: one sentence explaining the confusion or gap this term resolves.
* `coreIdea`: one sentence explaining the term plainly.

## Sections

* `whatItIs`: define the term without assuming the reader already knows the surrounding architecture.
* `whyItMatters`: explain what the term helps readers understand, compare, debug, or search for.
* `simpleExample`: provide a compact concrete example, shape, flow, or analogy.
* `whereItAppears`: describe which models, modules, papers, training regimes, or systems use the term.
* `commonConfusions`: distinguish nearby terms readers often mix up.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `conceptMap`: optional graph asset. Use it when visual relationships help more than prose. Configure `graphId` in `assets.json` and supply node labels under `graph.nodes` in messages when the graph is enabled.

## Registry Expectations

The backing concept registry record at `src/content/registry/concepts/<slug>.json` should include `conceptType`, useful `tags`, `prerequisiteIds`, `explainsIds`, `citationIds`, and curated `relatedIds` only when derived relationships are insufficient. Set frontmatter `status` to `published` when the entry is ready for readers.
