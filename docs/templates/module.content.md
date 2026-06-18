# Module Template Authoring Guide

Use `module.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `module.messages.en.json`. Put module diagrams and comparison tables in `assets.json` using `module.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for summary tone, math placement, and graph rules.

## Required Content

* `title`: canonical module or mechanism name.
* `description`: short search and metadata description.
* `openingSummary`: one folded summary that states the reader problem and the module mechanism in plain language (merge legacy `problemStatement` + `coreIdea` into this single key).

## Sections

* `whatItIs`: explain the module plainly and where it appears in a model.
* `whatItOptimizes`: name concrete bottlenecks this module improves. These should map to registry `optimizes`.
* `practicalBenefit`: explain the user-facing or engineering consequence. These should map to registry `practicalBenefits`.
* `howItWorks`: explain the computation step by step. Link to prerequisites instead of redefining them. Render the **single primary React Flow graph** here.
* `mathOrComputeSchema`: equations and symbol-only definitions under each formula—no second React Flow canvas. Attention modules use `ModuleAttentionSchemaComparison` with `math.mhaSchema` / `math.gqaSchema` keys.
* `comparedToNearbyModules`: explain why this module exists relative to nearby modules. Table values should come from an asset or registry-backed comparison config.
* `exampleArchitectures`: explain why the example model list matters. The list itself should come from registry `exampleModelIds` or usage fields.
* `limitationsAndTradeoffs`: explain what the module does not solve and the main tradeoffs.
* `whyItStillMatters`: connect the module to current search intent and newer alternatives.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `computeFlow`: primary graph asset for mechanism teaching (for attention variants, prefer `attention-variant-graph` with an MHA/variant comparison switcher per graphing standards).
* `comparisonTable`: comparison config for nearby modules.

Do **not** add a `computeSchema` React Flow graph in the math section. Math blocks hold equations and symbol definitions only.

## Math messages

Under `math.{mha|gqa}Schema`, provide:

* `label` and `formula` for each displayed equation.
* `variableDefinitions` with symbol terms (`Q`, `K`, `V`, `H`, `G`, indices) and one-line meanings directly under the formula.

Do not define projections, grouping mechanics, or head-count concepts as math-block rows—keep those in narrative sections.

## Baseline exclusions

* No `callouts.readerShortcut` in the module template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles—use `openingSummary` only.

## Registry Expectations

The module registry record should include `moduleType`, `moduleFamily`, `conceptType`, `variantGroup`, `optimizes`, `practicalBenefits`, `exampleModelIds`, `usedByModelIds`, `introducedByPaperIds`, tags, aliases, citations, and curated `relatedIds` only when derived relationships are insufficient.
