# Module Template Authoring Guide

Use `module.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `module.messages.en.json`. Put module diagrams and comparison tables in `assets.json` using `module.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for layperson tone, isolation-first writing, math placement, and graph rules.

## Required Content

* `title`: canonical module or mechanism name.
* `description`: short search and metadata description.
* `openingSummary`: optional lead copy when the page benefits from it. If used, keep it to one concise block and prefer it over legacy split summary keys.

## Sections

* `whatItIs`: explain the module plainly. Mention where it appears only after the standalone definition is clear.
* `whyItExists`: explain the need that caused this module to appear. That can include concrete bottlenecks it improves, but it can also include capability gaps, architectural limits, or training problems that older choices left unsolved.
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
* No separate `problemStatement` / `coreIdea` keys in new starter bundles. If lead copy is needed, use `openingSummary`.

## Registry Expectations

Canonical taxonomy authoring for modules should start with
`primaryClassificationId`, optional `secondaryClassificationIds`, and
`relationships`. Use [the ontology convergence plan](../temp/ontology-classification-topology-convergence-plan.md)
for the staged deprecation matrix.

Treat `moduleType`, `moduleFamily`, `conceptType`, and `variantGroup` as
deprecated compatibility fields in this slice. Do not introduce them as the
preferred path in new starter content unless a current compatibility workflow
still requires them.

The module registry record should still include `optimizes`, `exampleModelIds`,
`usedByModelIds`, `introducedByPaperIds`, tags, aliases, citations, and curated
`relatedIds` only when derived relationships are insufficient.
