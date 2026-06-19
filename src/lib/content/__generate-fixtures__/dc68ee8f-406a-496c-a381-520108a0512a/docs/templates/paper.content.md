# Paper Template Authoring Guide

Use `paper.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `paper.messages.en.json`. Put contribution diagrams or evidence visuals in `assets.json` using `paper.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for layperson tone, isolation-first writing, and graph placement.

## Required Content

* `title`: paper title or common short title.
* `description`: short search and metadata description.
* `openingSummary`: optional lead copy when the page benefits from it. If used, keep it to one concise block and prefer it over legacy split summary keys.

## Sections

* `whatThePaperIntroduced`: explain the new model, module, training regime, dataset, inference optimization, scaling evidence, or negative evidence.
* `whyItMatters`: explain what changed after the paper and why readers should care.
* `methodOrArchitecture`: explain the method at a high level. Render the **contribution graph** here when it teaches introduced records or dependencies.
* `evidence`: summarize evidence only insofar as it explains architecture, training, scaling, or system behavior.
* `limitations`: explain what the paper does not prove, where evidence is weak, and which assumptions matter.
* `whatItConnectsTo`, `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `contributionGraph`: graph asset showing introduced records, dependencies, and relationships when visualization teaches the contribution. Do not add decorative graphs.

## Baseline exclusions

* No `callouts.readerShortcut` in the paper template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles. If lead copy is needed, use `openingSummary`.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The paper registry record should include authors, date, canonical URL, arXiv ID where present, `introducesIds`, `supportsIds`, `arguesAgainstIds`, `modelIds`, `moduleIds`, `conceptIds`, tags, aliases, and citation metadata.
