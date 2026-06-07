# Writing Standards

Reviewer-checkable rules for canonical docs pages (modules, models, papers, concepts, training regimes, and glossary entries). These standards fold Phase 1 customer feedback and prior GQA repair lessons into durable authoring guidance.

## Related references

* [quality-documents-standards](./quality-documents-standards.md) — compact, persuasive, layperson-readable tone
* [documentation-template](./documentation-template.md) — page structure, component contracts, and asset placement
* [docs/internal/customer-ask.md](./internal/customer-ask.md) — current Phase 1 customer ask and manual gate checklist (GQA graph, math, and template items)

When this document conflicts with older template prose or legacy page examples, follow this document and the customer ask.

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

## Reviewer checklist (writing)

Before approving a module or glossary page:

1. One folded summary at the top; no duplicate title chrome.
2. No phase/process/meta language in customer copy.
3. Math section: symbol definitions directly under each equation; no projection/grouping definition rows.
4. No reader-shortcut callout in baseline structure.
5. Narrative sections stay concise and layperson-readable per [quality-documents-standards](./quality-documents-standards.md).

Cross-check open manual gate rows in [customer-ask](./internal/customer-ask.md) for grouped-query-attention before treating the writing baseline as complete.
