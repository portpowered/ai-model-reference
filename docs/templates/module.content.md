# Module Template Authoring Guide

Use `module.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `module.messages.en.json`. Put module diagrams, code schemas, and comparison tables in `assets.json` using `module.assets.json`.

## Required Content

* `title`: canonical module or mechanism name.
* `description`: short search and metadata description.
* `problemStatement`: one sentence explaining the bottleneck, confusion, or design problem.
* `coreIdea`: one sentence explaining the module's main mechanism.

## Sections

* `whatItIs`: explain the module plainly and where it appears in a model.
* `whatItOptimizes`: name concrete bottlenecks this module improves. These should map to registry `optimizes`.
* `practicalBenefit`: explain the user-facing or engineering consequence. These should map to registry `practicalBenefits`.
* `howItWorks`: explain the computation step by step. Link to prerequisites instead of redefining them.
* `mathOrComputeSchema`: provide lightweight notation, tensor shapes, or a short computation schema through an asset-backed renderer.
* `comparedToNearbyModules`: explain why this module exists relative to nearby modules. Table values should come from an asset or registry-backed comparison config.
* `variantsAndNearbyModules`: introduce the derived neighborhood. The rendered list should come from taxonomy, tags, and relationships.
* `exampleArchitectures`: explain why the example model list matters. The list itself should come from registry `exampleModelIds` or usage fields.
* `limitationsAndTradeoffs`: explain what the module does not solve and the main tradeoffs.
* `whyItStillMatters`: connect the module to current search intent and newer alternatives.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `computeFlow`: graph asset for the computation or data flow.
* `computeSchema`: graph, chart, code schema, or image asset for math/tensor shape explanation.
* `comparisonTable`: comparison config for nearby modules.

## Registry Expectations

The module registry record should include `moduleType`, `moduleFamily`, `conceptType`, `variantGroup`, `optimizes`, `practicalBenefits`, `exampleModelIds`, `usedByModelIds`, `introducedByPaperIds`, tags, aliases, citations, and curated `relatedIds` only when derived relationships are insufficient.
