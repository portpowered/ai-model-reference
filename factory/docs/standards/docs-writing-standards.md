# Docs Writing Standards

Reviewer-checkable rules for canonical docs pages such as modules, models,
papers, concepts, training regimes, and glossary entries.

## Usage

Anyone authoring or reviewing canonical docs content **MUST** read this
standard before implementation or review.

Use [general website standards](./general-website-standards.md) alongside this
document for UI, accessibility, responsive behavior, and test expectations.
Use [code review standards](./code-review-standards.md) for review conduct and
blocking/non-blocking classification.

## Technical writing baseline

Canonical docs pages **MUST** follow established technical-writing best
practices.

Required influences:

- Strunk and White: prefer concise sentences, direct structure, and removal of
  needless words.
- BUGS in Writing: make the explanation easy to debug by removing ambiguity,
  weak references, and avoidable confusion.
- Microsoft Writing Style Guide: prefer plain language, clear task-oriented
  phrasing, and consistent terminology over insider shorthand.

These references guide tone and editing discipline. When they conflict with
site-specific rules, this repository standard wins.

## Quick Rules

- Open with one folded `openingSummary`, not duplicated problem/solution lines.
- Write for a technical layperson using plain language and concrete terms.
- Make each page understandable in isolation before narrowing into one
  architecture slot.
- Explain why the topic matters, not just what it is.
- Expand acronyms on first mention and prefer full names in titles when the
  shorthand would be unclear.
- Give each section a distinct job; do not restate the same thesis repeatedly.
- Keep math sections limited to formulas and symbol-only definitions.
- Exclude customer-visible process language and reader-shortcut callouts from
  canonical page copy.

## Review Checklist

Before approval, reviewers **MUST** check each rule below and mark it `PASS` or
`FAIL` in the PR review summary when docs writing is in scope:

1. The page opens with one folded summary and no duplicate title chrome.
2. The page is understandable in isolation and does not define the topic only
   through one architecture slot.
3. The opening summary and first sections explain why the topic matters in plain
   language.
4. The title and first mentions use full names before acronyms or shorthand.
5. Narrative sections have distinct jobs and do not repeat adjacent sections.
6. Math sections keep symbol-only definitions directly under equations and avoid
   concept rows such as projections or grouping mechanics.
7. Customer-facing copy contains no phase, process, or authoring meta language.
8. Baseline templates and rendered copy contain no reader-shortcut callouts.
9. The page follows the companion quality checklist in
   [docs-quality-standards](./docs-quality-standards.md).

## Regulations

### 1. Summary pattern

Every canonical page opens with **one folded summary**, not two separate lead
lines.

Rules:

- Merge `problemStatement` and `coreIdea` into a single customer-facing summary
  sentence or tightly coupled pair rendered as one block.
- The summary answers what hurts or confuses the reader and what this page
  teaches as the fix or idea.
- Do not leave separate `problemStatement` and `coreIdea` keys in new or
  converged templates unless a documented exception requires both for
  localization tooling.

Pass:

- A reader gets the page thesis in one glance without reading section bodies.

Fail:

- Two stacked one-liners repeat the same idea, or the summary is missing and
  the page jumps straight into sections.

### 2. Tone and audience

Write for a technical layperson, meaning someone learning AI concepts without
reading papers first.

Rules:

- Use short sentences, concrete nouns, and active voice.
- Prefer “what changes for the reader” over implementation jargon in narrative
  sections.
- Link to related modules, concepts, and papers instead of re-explaining whole
  adjacent topics.
- Follow [docs-quality-standards](./docs-quality-standards.md): compact,
  minimalist, and free of filler.
- Define terms in ordinary language before narrowing into
  architecture-specific usage.
- Assume the reader opened this page first. Do not require prior reading of a
  nearby page to understand the core explanation.
- Expand acronyms on first mention in narrative copy, then use the short form
  after the full name is established.
- Prefer full names in titles and section openings when the acronym would be
  less clear to a first-time reader.

Pass:

- Section bodies are scannable and each paragraph advances one idea.

Fail:

- Long definitional essays, benchmark claims, or tutorial-style walkthroughs
  that belong on blog posts.

### 3. Titles, naming, and acronyms

Canonical pages should introduce concepts by their clearest human-readable name
before relying on shorthand.

Rules:

- Page titles should prefer the full term when the acronym would be unclear in
  isolation, for example `Rectified Linear Unit` before `ReLU`.
- The first narrative mention should use the full name followed by the acronym
  in parentheses when the acronym is common, for example `rectified linear
  unit (ReLU)`.
- After the first clear expansion, the rest of the page may use the acronym
  alone.
- Do not open a page, section, or summary with unexplained shorthand such as
  `FFN`, `KV`, or `GQA`.
- If the short form is the main search term, keep it in aliases, metadata, or
  parenthetical text, but do not let search convenience make the prose harder
  to read.

Pass:

- The reader learns the long name first, then sees the short form reused
  consistently.

Fail:

- A page title is only an acronym, or a section opens with unexplained
  shorthand like “FFN activations” before the full phrase appears.

### 4. Page independence and scope

Every canonical page should make sense **in isolation** before it explains
where the topic appears in a larger architecture.

Rules:

- Start with the most general true statement about the topic.
- Only narrow to a specific context such as feed-forward networks, attention
  blocks, or inference systems after the standalone definition is clear.
- Do not define a concept purely by one common use site if the concept exists
  outside that site.
- If a page covers a variant, explain the parent concept in one or two plain
  sentences before explaining what the variant changes.

Pass:

- A reader can understand the page thesis without already knowing the
  surrounding architecture.

Fail:

- A page about an activation explains it only as “the FFN thing after expand
  projection,” or a page about a paper assumes the reader already knows the
  model family details it builds on.

### 5. Direct value and reader payoff

Every page should tell the reader why the topic matters **on its own**, not
only how it fits into a template.

Rules:

- The opening summary should state the practical value, decision point, or
  conceptual payoff of understanding the page.
- “What it optimizes” and “Practical benefit” should explain what becomes
  easier, cheaper, safer, clearer, or more capable because of this idea.
- If the topic is mainly historical or foundational, say that directly.
- Prefer concrete consequences over generic praise words such as “important,”
  “powerful,” or “advanced.”

Pass:

- A reader can answer “why would I look this up?” after reading the summary and
  first two sections.

Fail:

- The page defines the term correctly but never says why someone should care.

### 6. Repetition and section separation

Canonical pages should not repeat the same idea across summary, section bodies,
captions, and comparison text.

Rules:

- The summary states the thesis once.
- “What it is” defines the thing.
- “What it optimizes” explains the objective or pressure it addresses.
- “Practical benefit” explains reader-visible consequences.
- “How it works” explains mechanism.
- “Limitations and tradeoffs” explains what the topic gives up.
- Comparison sections should contrast nearby alternatives rather than restate
  the base definition.

Reviewer probe:

- Check whether two adjacent sections can be swapped without changing meaning.
  If yes, the page is probably repeating itself.

Pass:

- Each section answers a different question.

Fail:

- “What it is,” “How it works,” and “Why it matters” all restate the same
  sentence with slightly different wording.

### 7. No phase, process, or meta language

Customer-facing copy must never mention internal project phases, factory
workflows, convergence batches, or authoring process.

Forbidden in rendered page copy and message files:

- “Phase 1”, “Phase 2”, batch numbers, verifier names, or “manual gate”
- “This page was converged”, “per the template contract”, or “as required by
  the PRD”
- Maintainer-only deployment or CI language

Pass:

- Copy reads as a standalone reference article.

Fail:

- Any meta or process language appears in `messages/*.json` or rendered HTML.

### 8. Math and algorithm sections

Equations carry the formalism. Symbol definitions carry the glossary. Narrative
sections carry mechanism and tradeoff prose.

#### Placement

- Render each equation or equation block in the math/schema section.
- Place concise symbol definitions immediately under the equation they
  annotate, not in a distant list or separate concept section.
- Use `ModuleAttentionSchemaComparison` or the page-kind equivalent so
  definitions stay tied to formulas.

#### Allowed definition terms

Definitions under equations are symbols and indices only, for example `Q`, `K`,
`V`, `H`, `G`, `d`, `h`, group index `g`, head index `i`, sequence length `T`,
and similar notation that appears in the displayed formula.

Each definition should be one short line: symbol -> plain-language meaning.

#### Forbidden under equations

Do not define these as math-block rows. Move them to narrative sections such as
“How it works” or “What it optimizes” if needed.

- query projection, key projection, value projection
- query heads, key-value heads as concept labels detached from symbol `H` or
  `G`
- grouping, bucketing, or “query-to-KV grouping” as standalone definition rows
- implementation steps such as “project hidden states” or “reshape tensors”
  unless expressed as symbols in the formula

Pass:

- A reader can read the formula, then scan symbol lines directly beneath it
  without concept clutter.

Fail:

- Math blocks explain projections, head counts, or grouping mechanics instead
  of symbols.

#### Verbosity

- No multi-sentence definition paragraphs under equations.
- If a concept needs more than one line, move it out of the math block.

### 9. Callouts and reader shortcuts

Baseline templates must **not** include reader-shortcut callouts.

Rules:

- Remove `callouts.readerShortcut` from module, model, paper, concept, and
  training-regime templates unless a future story documents a justified
  exception in this file.
- Do not replace removed shortcuts with equivalent “TL;DR” or “In one sentence”
  callouts in the baseline structure.

Pass:

- No reader-shortcut callout renders on canonical pages.

Fail:

- Template or page still ships `callouts.readerShortcut` without a documented
  exception.

### 10. Section discipline

Required section jobs:

- **What it is** — standalone definition first, architecture slot second.
- **What it optimizes** — the pressure, bottleneck, or design goal this idea
  addresses.
- **Practical benefit** — direct user-facing or builder-facing payoff, not a
  rewrite of the definition.
- **How it works** — mechanism narrative plus the single primary graph. See
  [graphing standards](../../../docs/graphing-standards.md).
- **Math or compute schema** — equations and symbol definitions only, with no
  second React Flow canvas.
- **Compared to nearby modules** — tables and short contrast prose, not a
  substitute for the comparison graph.
- **Why it still matters** — why the concept remains a useful reference point
  even if newer variants exist.
- **Related / tags / references** — derived or registry-backed, with no
  hand-maintained duplicate lists.

## Lessons from prior repair work

Do not reintroduce these recurring writing failures:

- Split summary lines that repeat the thesis instead of using one
  `openingSummary`
- Concept rows under equations that crowd symbol glossaries
- Reader-shortcut callouts in baseline templates
- Phase or meta copy in customer-facing content
- Verbose math definitions instead of short symbol lines
- Unexpanded acronyms such as `FFN` or `ReLU` before teaching the full term
