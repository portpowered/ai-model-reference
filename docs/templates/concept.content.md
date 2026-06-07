# Concept Template Authoring Guide

Use `concept.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `concept.messages.en.json`. Put page-specific visual references in `assets.json` using `concept.assets.json`.

Follow [writing-standards](../writing-standards.md) and [graphing-standards](../graphing-standards.md) for summary tone and optional graph placement.

## Required Content

* `title`: canonical concept name.
* `description`: short search and metadata description.
* `openingSummary`: one folded summary that states the confusion or gap this concept resolves and the concept plainly (merge legacy `problemStatement` + `coreIdea` into this single key).

## Sections

* `whatItIs`: define the concept without assuming the reader already knows the surrounding architecture.
* `whyItMatters`: explain what the concept helps readers understand, compare, debug, or search for.
* `simpleExample`: provide a compact concrete example, shape, flow, or analogy.
* `whereItAppears`: describe which models, modules, papers, training regimes, or systems use the concept. Place an optional **concept map** graph here when visual relationships teach more than prose.
* `commonConfusions`: distinguish nearby concepts readers often mix up.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `conceptMap`: optional graph asset. Use it when visual relationships help more than prose. Do not add decorative graphs.

## Baseline exclusions

* No `callouts.readerShortcut` in the concept template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles—use `openingSummary` only.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The concept registry record should include `conceptType`, useful `tags`, `prerequisiteIds`, `explainsIds`, `citationIds`, and curated `relatedIds` only when derived relationships are insufficient.
