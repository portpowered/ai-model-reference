# Concept Template Authoring Guide

Use `concept.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `concept.messages.en.json`. Put page-specific visual references in `assets.json` using `concept.assets.json`.

## Required Content

* `title`: canonical concept name.
* `description`: short search and metadata description.
* `problemStatement`: one sentence explaining the confusion or gap this concept resolves.
* `coreIdea`: one sentence explaining the concept plainly.

## Sections

* `whatItIs`: define the concept without assuming the reader already knows the surrounding architecture.
* `whyItMatters`: explain what the concept helps readers understand, compare, debug, or search for.
* `simpleExample`: provide a compact concrete example, shape, flow, or analogy.
* `whereItAppears`: describe which models, modules, papers, training regimes, or systems use the concept.
* `commonConfusions`: distinguish nearby concepts readers often mix up.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `conceptMap`: optional graph asset. Use it when visual relationships help more than prose.

## Registry Expectations

The concept registry record should include `conceptType`, useful `tags`, `prerequisiteIds`, `explainsIds`, `citationIds`, and curated `relatedIds` only when derived relationships are insufficient.
