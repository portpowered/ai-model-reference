# Model Template Authoring Guide

Use `model.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `model.messages.en.json`. Put model diagrams and page-specific visuals in `assets.json` using `model.assets.json`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for layperson readability, isolation-first writing, and graph placement.

## Required Content

* `title`: canonical model name.
* `description`: short search and metadata description.
* `openingSummary`: optional lead copy when the page benefits from it. If used, keep it to one concise block and prefer it over legacy split summary keys.

## Sections

* `whatItIs`: explain the model plainly, including whether it is open-weights, closed, research-only, multimodal, decoder-only, encoder-only, encoder-decoder, diffusion-based, or hybrid.
* `inputsAndOutputs`: describe supported modalities and expected input/output behavior.
* `architecture`: summarize the high-level architecture directly. Render the **architecture graph** here when it teaches structure.
* `importantModules`: explain which modules matter for understanding the model. The list itself should come from registry-backed components.
* `training`: summarize public training and post-training information where it exists.
* `practicalNotes`: explain constraints, strengths, limitations, deployment assumptions, or inference notes. Avoid benchmark focus unless it explains architecture or usage caveats.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `architectureGraph`: graph asset for model pages when architecture visualization teaches structure. Treat the model as the root module and use recursive expandable submodules. Do not add decorative graphs that duplicate table or list content.

## Baseline exclusions

* No `callouts.readerShortcut` in the model template or converged pages.
* No separate `problemStatement` / `coreIdea` keys in new starter bundles. If lead copy is needed, use `openingSummary`.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.

## Registry Expectations

The model registry record should include `family`, `sourceType`, `modalities`, `architectureIds`, `moduleIds`, `trainingRegimeIds`, `datasetIds`, `paperIds`, tags, aliases, citations, and size/context fields where public.
