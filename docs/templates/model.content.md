# Model Template Authoring Guide

Use `model.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `model.messages.en.json`. Put model diagrams and page-specific visuals in `assets.json` using `model.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for summary tone, layperson readability, and graph placement.

## Required Content

* `title`: canonical model name.
* `description`: short search and metadata description.
* `openingSummary`: one folded summary that states why the model matters and its main architecture or contribution in plain language (merge legacy `problemStatement` + `coreIdea` into this single key).

## Sections

* `whatItIs`: explain the model plainly, including whether it is open-weights, closed, research-only, multimodal, decoder-only, encoder-only, encoder-decoder, diffusion-based, or hybrid.
* `inputsAndOutputs`: describe supported modalities and expected input/output behavior.
* `architecture`: summarize the high-level architecture and link to canonical concept/module pages instead of redefining them. Render the **architecture graph** here when it teaches structure.
* `importantModules`: explain which modules matter for understanding the model. The list itself should come from registry-backed components.
* `training`: summarize public training and post-training information where it exists.
* `practicalNotes`: explain constraints, strengths, limitations, deployment assumptions, or inference notes. Avoid benchmark focus unless it explains architecture or usage caveats.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `architectureGraph`: graph asset for model pages when architecture visualization teaches structure. Treat the model as the root module and use recursive expandable submodules. Do not add decorative graphs that duplicate table or list content.

## Baseline exclusions

* No `callouts.readerShortcut` in the model template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles—use `openingSummary` only.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The model registry record should include `family`, `sourceType`, `modalities`, `architectureIds`, `moduleIds`, `trainingRegimeIds`, `datasetIds`, `paperIds`, tags, aliases, citations, and size/context fields where public.
