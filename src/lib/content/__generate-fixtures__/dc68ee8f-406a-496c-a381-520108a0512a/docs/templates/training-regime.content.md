# Training Regime Template Authoring Guide

Use `training-regime.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `training-regime.messages.en.json`. Put training flow diagrams and visual references in `assets.json` using `training-regime.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for layperson tone, isolation-first writing, and graph placement.

## Required Content

* `title`: canonical training regime or optimization method name.
* `description`: short search and metadata description.
* `openingSummary`: optional lead copy when the page benefits from it. If used, keep it to one concise block and prefer it over legacy split summary keys.

## Sections

* `whatItIs`: define the regime and where it fits, such as pretraining, post-training, reinforcement learning, preference optimization, distillation, synthetic data, alignment, or optimization.
* `whyItExists`: explain the need that caused this training regime to appear, such as instruction following, preference alignment, reasoning behavior, data efficiency, stability, sample efficiency, deployment behavior, or a weakness in older training loops.
* `howItWorks`: explain the training loop, data source, objective, reward signal, preference signal, or optimization target. Render the **training flow graph** here when it teaches the loop.
* `comparedToNearbyRegimes`: explain how this differs from nearby methods. Rendered related lists should come from registry taxonomy and tags.
* `modelsAndPapers`: explain which models or papers use, introduce, or popularize the regime.
* `limitationsAndFailureModes`: explain data requirements, reward hacking risks, stability issues, compute cost, evaluation uncertainty, or deployment caveats.
* `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `trainingFlow`: graph asset for the training loop or optimization flow when visualization teaches the mechanism.

## Baseline exclusions

* No `callouts.readerShortcut` in the training-regime template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles. If lead copy is needed, use `openingSummary`.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The training regime registry record should include `regimeType`, `conceptType`, `variantGroup`, `usedByModelIds`, `relatedModuleIds`, `paperIds`, tags, aliases, citations, and curated `relatedIds` only when derived relationships are insufficient.
