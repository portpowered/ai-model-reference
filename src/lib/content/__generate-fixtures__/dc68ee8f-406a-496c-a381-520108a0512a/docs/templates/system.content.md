# System Template Authoring Guide

Use `system.mdx` as the production page structure. Put localized reader-facing text in `messages/<locale>.json` using the keys from `system.messages.en.json`. Put system flow diagrams and page-specific visuals in `assets.json` using `system.assets.json`.

## Required Content

* `title`: canonical system or runtime component name.
* `description`: short search and metadata description.
* `openingSummary`: optional lead copy when the page benefits from it. If used, keep it to one concise block.

## Sections

* `whatItIs`: define the system boundary plainly.
* `whereItSits`: explain where this system lives in the stack and what it touches.
* `howItWorks`: explain the main flow and render the system graph here when it teaches the mechanism.
* `practicalImpact`: explain why operators or model builders care.
* `associatedRecords`: use programmatic deep links to show related models, modules, concepts, datasets, papers, and organizations.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.
