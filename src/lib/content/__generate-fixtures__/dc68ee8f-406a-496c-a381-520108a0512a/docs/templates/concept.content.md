# Concept Template Authoring Guide

Use `concept.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `concept.messages.en.json`. Put page-specific visual references in `assets.json` using `concept.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for layperson tone, isolation-first writing, and optional graph placement.

## Required Content

* `title`: canonical concept name.
* `description`: short search and metadata description.
* `openingSummary`: optional lead copy when the page benefits from it. If used, keep it to one concise block and prefer it over legacy split summary keys.

## Sections

* `whatItIs`: define the concept without assuming the reader already knows the surrounding architecture.
* `whyItMatters`: explain what the concept helps readers understand, compare, debug, or search for.
* `simpleExample`: provide a compact concrete example, shape, flow, or analogy.
* `whereItAppears`: describe usage only when it helps teach the concept itself. Place an optional **concept map** graph here when visual relationships teach more than prose.
* `commonConfusions`: distinguish nearby concepts readers often mix up.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `conceptMap`: optional graph asset. Use it when visual relationships help more than prose. Do not add decorative graphs.

## Baseline exclusions

* No `callouts.readerShortcut` in the concept template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles. If lead copy is needed, use `openingSummary`.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The concept registry record should include `conceptType`, useful `tags`, `prerequisiteIds`, `explainsIds`, `citationIds`, and curated `relatedIds` only when derived relationships are insufficient.
