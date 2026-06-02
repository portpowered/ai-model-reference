# Training Regime Template Authoring Guide

Use `training-regime.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `training-regime.messages.en.json`. Put training flow diagrams and visual references in `assets.json` using `training-regime.assets.json`.

## Required Content

* `title`: canonical training regime or optimization method name.
* `description`: short search and metadata description.
* `problemStatement`: one sentence explaining the training problem this regime addresses.
* `coreIdea`: one sentence explaining the mechanism or objective.

## Sections

* `whatItIs`: define the regime and where it fits, such as pretraining, post-training, reinforcement learning, preference optimization, distillation, synthetic data, alignment, or optimization.
* `whatItOptimizes`: name the practical target, such as instruction following, preference alignment, reasoning behavior, data efficiency, stability, sample efficiency, or deployment behavior.
* `howItWorks`: explain the training loop, data source, objective, reward signal, preference signal, or optimization target.
* `practicalBenefit`: explain why a model builder or reader should care.
* `comparedToNearbyRegimes`: explain how this differs from nearby methods. Rendered related lists should come from registry taxonomy and tags.
* `modelsAndPapers`: explain which models or papers use, introduce, or popularize the regime.
* `limitationsAndFailureModes`: explain data requirements, reward hacking risks, stability issues, compute cost, evaluation uncertainty, or deployment caveats.
* `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `trainingFlow`: graph asset for the training loop or optimization flow.

## Registry Expectations

The training regime registry record should include `regimeType`, `conceptType`, `variantGroup`, `usedByModelIds`, `relatedModuleIds`, `paperIds`, tags, aliases, citations, and curated `relatedIds` only when derived relationships are insufficient.
