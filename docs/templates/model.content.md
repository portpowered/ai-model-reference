# Model Template Authoring Guide

Use `model.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `model.messages.en.json`. Put model diagrams and page-specific visuals in `assets.json` using `model.assets.json`.

## Required Content

* `title`: canonical model name.
* `description`: short search and metadata description.
* `problemStatement`: one sentence explaining why this model matters to readers.
* `coreIdea`: one sentence explaining the model's main architecture or contribution.

## Sections

* `whatItIs`: explain the model plainly, including whether it is open-weights, closed, research-only, multimodal, decoder-only, encoder-only, encoder-decoder, diffusion-based, or hybrid.
* `inputsAndOutputs`: describe supported modalities and expected input/output behavior.
* `architecture`: summarize the high-level architecture and link to canonical concept/module pages instead of redefining them.
* `importantModules`: explain which modules matter for understanding the model. The list itself should come from registry-backed components.
* `training`: summarize public training and post-training information where it exists.
* `practicalNotes`: explain constraints, strengths, limitations, deployment assumptions, or inference notes. Avoid benchmark focus unless it explains architecture or usage caveats.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `architectureGraph`: required graph asset for model pages. Treat the model as the root module and use recursive expandable submodules.

## Registry Expectations

The model registry record should include `family`, `sourceType`, `modalities`, `architectureIds`, `moduleIds`, `trainingRegimeIds`, `datasetIds`, `paperIds`, tags, aliases, citations, and size/context fields where public.
