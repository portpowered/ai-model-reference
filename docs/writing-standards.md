# Writing Standards

Reviewer-checkable rules for canonical docs pages (modules, models, papers, concepts, training regimes, and glossary entries).

## Related references
* [documentation-template](./documentation-template.md) — page structure, component contracts, and asset placement

## How to use, please review each document per this checklist and submit this as part of the PR.

[] Does the document follow the principles and standards of https://en.wikipedia.org/wiki/The_Elements_of_Style
[] Does the document conform the principles and standards of https://www.amazon.com/BUGS-Writing-Revised-Guide-Debugging/dp/020137921X
[] Does the document clearly describe what it is intended in the fewest words possible
[] Does the document read as if some layman could understand it (a college educated person - not necessarily an engineer)
[] Does the document not go of on random tangents and focuses primarily on the topic. 
[] Does the document not presume any pre-requisite documented knowledge. 
[] Does it properly reference claims it makes?
[] Does it practice the standard of progressive presentation? 1 line problem statmeent, X solution/overview, Y letter content. 
[] Does the document have no signs of AI tone. i.e. per https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing.
- [] "em dashes", "oxford commas", etc.
- [] this isn't X. It's Y.  or variants of that structure. 
- [] "curious if"
- [] "and honestly?" .... or variants of that structure. 

## Summary pattern

Every canonical page opens with **one folded summary**, not two separate lead lines.

* Merge `problemStatement` and `coreIdea` into a single customer-facing summary sentence (or tightly coupled pair rendered as one block) that states the problem and the mechanism in plain language.
* The summary answers: what hurts or confuses the reader, and what this page teaches as the fix or idea.
* Do not leave separate `problemStatement` and `coreIdea` message keys in new or converged templates unless a documented exception requires both for localization tooling.

**Pass:** A reader gets the page thesis in one glance without reading section bodies.

**Fail:** Two stacked one-liners repeat the same idea, or the summary is missing and the page jumps straight into sections.

## Tone and audience

Write for a technical layperson — someone learning AI concepts without reading papers first.

* Use short sentences, concrete nouns, and active voice.
* Prefer “what changes for the reader” over implementation jargon in narrative sections.
* Link to related modules, concepts, and papers instead of re-explaining entire adjacent topics.
* Follow [quality-documents-standards](./quality-documents-standards.md): compact, minimalist, and free of filler.

**Pass:** Section bodies are scannable; each paragraph advances one idea.

**Fail:** Long definitional essays, benchmark claims, or tutorial-style walkthroughs that belong on blog posts.

## No phase, process, or meta language

Customer-facing copy must never mention internal project phases, factory workflows, convergence batches, or authoring process.

Forbidden in rendered page copy and message files:

* “Phase 1”, “Phase 2”, batch numbers, verifier names, or “manual gate”
* “This page was converged”, “per the template contract”, or “as required by the PRD”
* Maintainer-only deployment or CI language

**Pass:** Copy reads as a standalone reference article.

**Fail:** Any meta or process language appears in `messages/*.json` or rendered HTML.

## Math and algorithm sections

Equations carry the formalism; **symbol definitions** carry the glossary. Narrative sections carry mechanism and tradeoff prose.

### Placement

* Render each equation (or equation block) in the math/schema section.
* Place **concise symbol definitions immediately under the equation they annotate**, not in a distant list or separate concept section.
* Use `ModuleAttentionSchemaComparison` (or the page-kind equivalent) so definitions stay tied to formulas.

### Allowed definition terms

Definitions under equations are **symbols and indices only**, for example:

* `Q`, `K`, `V`, `H`, `G`, `d`, `h`, group index `g`, head index `i`, sequence length `T`, and similar notation that appears in the displayed formula.

Each definition should be one short line: symbol → plain-language meaning.

### Forbidden under equations

Do **not** define these as math-block rows (relocate to narrative “How it works” or “What it optimizes” if needed):

* query projection, key projection, value projection
* query heads, key-value heads (as concept labels detached from symbol `H` / `G`)
* grouping, bucketing, or “query-to-KV grouping” as standalone definition rows
* implementation steps (“project hidden states”, “reshape tensors”) unless expressed as symbols in the formula

**Pass:** A reader can read the formula, then scan symbol lines directly beneath it without concept clutter.

**Fail:** Math blocks explain projections, head counts, or grouping mechanics instead of symbols — the current GQA manual gate failure documented in [customer-ask](./internal/customer-ask.md).

### Verbosity

* No multi-sentence definition paragraphs under equations.
* If a concept needs more than one line, move it out of the math block.

## Callouts and reader shortcuts

Baseline templates must **not** include reader-shortcut callouts.

* Remove `callouts.readerShortcut` from module, model, paper, concept, and training-regime templates unless a future story documents a justified exception in this file.
* Do not replace removed shortcuts with equivalent “TL;DR” or “In one sentence” callouts in the baseline structure.

**Pass:** No reader-shortcut callout renders on converged canonical pages.

**Fail:** Template or page still ships `callouts.readerShortcut` without an documented exception.

## Section discipline

* **How it works** — mechanism narrative plus the **single primary graph** (see [graphing-standards](./graphing-standards.md)).
* **Math or compute schema** — equations and symbol definitions only; no second React Flow canvas.
* **Compared to nearby modules** — tables and short contrast prose; not a substitute for the comparison graph.
* **Related / tags / references** — derived or registry-backed; avoid hand-maintained duplicate lists.

a high quality document is defined by these checklisted attributes

1. it aligns with the feedback of strunk and white. 
2. it aligns with the feedback of bugs in writing
3. it follows standards of chicago school of writing (persuasive, compacted, minimalist)
4. it has a short 1 line problem statement for each doc. it follows immediately with a 1 line statement on what the overall concept of the paper is. 
5. it writes in a very clear, human readable, technical tone, meant for lay individuals.


## Reviewer checklist (writing)

Before approving a module or glossary page:

1. One folded summary at the top; no duplicate title chrome.
2. No phase/process/meta language in customer copy.
3. Math section: symbol definitions directly under each equation; no projection/grouping definition rows.
4. No reader-shortcut callout in baseline structure.
5. Narrative sections stay concise and layperson-readable per [quality-documents-standards](./quality-documents-standards.md).

Cross-check open manual gate rows in [customer-ask](./internal/customer-ask.md) for grouped-query-attention before treating the writing baseline as complete.

## Lessons from prior GQA repair

These writing failures recurred across GQA repair PRs before this baseline; do not reintroduce them:

* **Split summary lines** — separate `problemStatement` and `coreIdea` repeated the thesis; fold into one `openingSummary`.
* **Concept rows under equations** — projection, grouping, and head-count labels in the math block crowded symbol glossaries; keep only `Q`, `K`, `V`, `H`, `G`, and indices under formulas.
* **Reader-shortcut callouts** — baseline templates shipped `callouts.readerShortcut` instead of letting the folded summary carry the thesis.
* **Phase/meta copy** — customer messages mentioned phases, verifiers, or convergence batches; keep process language in factory docs only.
* **Verbose math definitions** — multi-sentence glossaries under equations; one short symbol line each, with mechanism prose in narrative sections.
