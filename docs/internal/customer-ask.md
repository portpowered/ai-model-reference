# Current Customer Ask

phase: 1
status: in-progress
allowedNextPhase: 2
realSubmissionAuthorized: true

## Goal

Your job is to create the ai-model-reference, a reference page for customers learning about AI.
This is a website used to generate websites.
Overall the target can be seen in the docs/design-renders, as a sketch to target of how the world should look.
Remember the overall goal is to have a human readable doc for customers that are trying to look up AI concepts, without
having to go about researching themselves all the concepts.

Complete Phase 1: default site and one canonical docs page.

## Priority Interpretation

This ask overrides older template, content, and page-structure expectations wherever they conflict.

Treat this ask as the current source of truth for:

* any phase customer-facing repairs
* the baseline standards that future pages should replicate
* the structural expectations for templates, graphs, algorithms, and concise customer-facing copy

## Current Instructions
As of Monday jun 8th - we are good to launch to phase 2, and phase 3 until the completino fo the phase 4. we are wanting to move forward until manual verification of localization working.

in parallel the github pages are not working for search as per the current work item. 
- we recommend that we fix said work item in parallel to parallel work items dispatched to add new content items. 
- we recomment that we build out the content as parallely as possible to maximize throuhgput. 



## What This Work Is For


Reference:

* previous GQA feedback thread:
  https://github.com/portpowered/ai-model-reference/pull/54

Acceptance criteria:

* templates reflect the new baseline rather than the old one
* standards explain how module pages, glossary pages, graphs, and algorithms should be structured
* agent instructions point to the updated standards/templates
* the system is ready to replicate future work more consistently

## Manual Gate

* [X] Open the app locally and confirm home, search, glossary, tag, and sample
  docs routes work.
* [X] Confirm the sample page uses message keys rather than raw prose in
  canonical MDX.
* [X] Confirm search finds `GQA`, `attention`, and `KV cache`.
* [X] Confirm customer-facing copy on touched pages is concise, layperson-readable, and free of phase/process/meta language.
* [X] Confirm the grouped-query-attention page has one intended top summary structure, one intended tag surface, and no duplicate title chrome.
* [X] Confirm the grouped-query-attention graph clearly compares MHA and GQA, highlights query-head versus KV-head counts, and supports zoom/pan.
-- currently failing, as the graph has yet to be updated. 
* [X] Confirm math or algorithm sections explain variables under the equations in concise plain language.
-- currently failing, because its explaining components that are not variables directly i.e. QKV should be explained, "query projection" as a concept should not. 
* [X] Confirm the updated templates and standards encode the new baseline for future page generation.
* [X] Confirm the customer approves moving from Phase 1 to Phase 2.
