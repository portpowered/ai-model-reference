# Training Regime Template Authoring Guide

Use `training-regime.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `training-regime.messages.en.json`. Put training flow diagrams and visual references in `assets.json` using `training-regime.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for summary tone and graph placement.

## Required Content

* `title`: canonical training regime or optimization method name.
* `description`: short search and metadata description.
* `openingSummary`: one folded summary that states the training problem this regime addresses and the mechanism or objective in plain language (merge legacy `problemStatement` + `coreIdea` into this single key).

## Sections

* `whatItIs`: define the regime and where it fits, such as pretraining, post-training, reinforcement learning, preference optimization, distillation, synthetic data, alignment, or optimization.
* `whatItOptimizes`: name the practical target, such as instruction following, preference alignment, reasoning behavior, data efficiency, stability, sample efficiency, or deployment behavior.
* `howItWorks`: explain the training loop, data source, objective, reward signal, preference signal, or optimization target. Render the **training flow graph** here when it teaches the loop.
* `practicalBenefit`: explain why a model builder or reader should care.
* `comparedToNearbyRegimes`: explain how this differs from nearby methods. Rendered related lists should come from registry taxonomy and tags.
* `modelsAndPapers`: explain which models or papers use, introduce, or popularize the regime.
* `limitationsAndFailureModes`: explain data requirements, reward hacking risks, stability issues, compute cost, evaluation uncertainty, or deployment caveats.
* `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `trainingFlow`: graph asset for the training loop or optimization flow when visualization teaches the mechanism.

## Baseline exclusions

* No `callouts.readerShortcut` in the training-regime template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles—use `openingSummary` only.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The training regime registry record should include `regimeType`, `conceptType`, `variantGroup`, `usedByModelIds`, `relatedModuleIds`, `paperIds`, tags, aliases, citations, and curated `relatedIds` only when derived relationships are insufficient.
