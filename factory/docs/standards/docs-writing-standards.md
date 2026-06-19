# Docs Writing Standards

Reviewer-checkable rules for canonical docs pages such as modules, models,
papers, concepts, training regimes, systems, and glossary entries.

## Usage

Anyone authoring or reviewing canonical docs content **MUST** read this
standard before implementation or review.

Use [general website standards](./general-website-standards.md) alongside this
document for UI, accessibility, responsive behavior, and test expectations.
Use [code review standards](./code-review-standards.md) for review conduct and
blocking/non-blocking classification.
Use [graphing standards](../../../docs/graphing-standards.md) as a required
sub-standard when a page uses graphs, charts, diagrams, or math-heavy teaching
assets.

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

- Write for a technical layperson using plain language and concrete terms.
- Make each page understandable in isolation before narrowing into one
  architecture slot or historical example.
- Keep the page body focused on the concept itself, not on the page, the site,
  or adjacent pages.
- Do not make pages self-referential or meta. A page should not explain why the
  page exists, how the page is structured, or where else the reader should go
  to understand the core concept.
- Expand acronyms on first mention and prefer full names in titles when the
  shorthand would be unclear.
- Give each section a distinct job; do not restate the same thesis repeatedly.
- If the concept is mathematically heavy, include the equations needed to teach
  it clearly.
- If the concept is visually or conceptually heavy, include the graph, diagram,
  chart, or comparison view needed to teach it clearly.
- When a lead summary is used, keep it to one concise block. Do not split it
  into separate `problemStatement` and `coreIdea` lines.
- Exclude customer-visible process language, page meta language, and
  reader-shortcut callouts from canonical page copy.

## Review Checklist

Before approval, reviewers **MUST** check each rule below and mark it `PASS` or
`FAIL` in the PR review summary when docs writing is in scope:

1. The page is understandable in isolation and does not define the topic only
   through one architecture slot or adjacent page.
2. The narrative body stays focused on the concept and contains no self-
   referential or page-structure meta copy.
3. The first sections explain both the concept and its value in plain language.
4. The title and first mentions use full names before acronyms or shorthand.
5. Narrative sections have distinct jobs and do not repeat adjacent sections.
6. Mathematically heavy pages include the equations needed to teach the idea.
7. Visually or conceptually heavy pages include appropriate graphs, diagrams,
   charts, or comparison views, and those assets follow
   [graphing standards](../../../docs/graphing-standards.md).
8. Math sections keep symbol-only definitions directly under equations and
   avoid concept rows such as projections or grouping mechanics.
9. Customer-facing copy contains no phase, process, page-meta, or reader-
   shortcut language.
10. Citations, related docs, and tags are present where needed, but the page
    body does not depend on hand-held cross-page explanation to make sense.

## Regulations

### 1. Tone and audience

Write for a technical layperson, meaning someone learning AI concepts without
reading papers first.

Rules:

- Use short sentences, concrete nouns, and active voice.
- Prefer "what changes for the reader" over implementation jargon in narrative
  sections.
- Define terms in ordinary language before narrowing into architecture-specific
  usage.
- Assume the reader opened this page first. Do not require prior reading of a
  nearby page to understand the core explanation.
- Expand acronyms on first mention in narrative copy, then use the short form
  after the full name is established.
- Prefer full names in titles and section openings when the acronym would be
  less clear to a first-time reader.
- Use the fewest words needed for accuracy. Remove filler, throat clearing, and
  repetitive "important because" framing.

Pass:

- Section bodies are scannable and each paragraph advances one idea.

Fail:

- Long definitional essays, benchmark detours, or tutorial-style walkthroughs
  that belong on blog posts.

### 2. Page independence and isolation

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
- The core explanation must stand on its own even if related links, tags, and
  references were removed from the page.

Pass:

- A reader can understand the page thesis without already knowing the
  surrounding architecture.

Fail:

- A page about an activation explains it only as "the FFN thing after expand
  projection," or a page about a paper assumes the reader already knows the
  model family details it builds on.

### 3. No self-reference or page meta

Canonical page narrative must stay focused on the concept itself.

Rules:

- Do not explain why the page exists.
- Do not explain the role of the page within the site, taxonomy, docs shell, or
  information architecture.
- Do not tell the reader that another page is the "real" place to learn the
  concept.
- Do not describe section order, page structure, or other pages inside the
  narrative body.
- Keep references to other records in derived related/tags/references sections
  or in rare inline mentions that clarify the concept itself rather than the
  site structure.

Pass:

- The body reads like a concept explanation, not a guide to navigating the
  website.

Fail:

- "This page explains grouped-query attention so you can compare it with the
  architecture page," or "See the other page for the real definition."

### 4. Direct value and reader payoff

Every page should tell the reader why the topic matters **on its own**, not
only how it fits into a template.

Rules:

- Early sections should state the practical value, decision point, or
  conceptual payoff of understanding the page.
- "What it optimizes" and "Practical benefit" should explain what becomes
  easier, cheaper, safer, clearer, or more capable because of this idea.
- If the topic is mainly historical or foundational, say that directly.
- Prefer concrete consequences over generic praise words such as "important,"
  "powerful," or "advanced."
- A lead summary is optional. When present, it should sharpen the concept, not
  restate headings or duplicate section bodies.

Pass:

- A reader can answer "why would I look this up?" after reading the summary and
  first two sections.

Fail:

- The page defines the term correctly but never says why someone should care.

### 5. Titles, naming, and acronyms

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
- Do not open a page, section, or lead with unexplained shorthand such as
  `FFN`, `KV`, or `GQA`.
- If the short form is the main search term, keep it in aliases, metadata, or
  parenthetical text, but do not let search convenience make the prose harder
  to read.

Pass:

- The reader learns the long name first, then sees the short form reused
  consistently.

Fail:

- A page title is only an acronym, or a section opens with unexplained
  shorthand like "FFN activations" before the full phrase appears.

### 6. Graphs, diagrams, and equations

Use the teaching aid that makes the concept understandable with the least
reader effort.

Rules:

- If the concept is mathematically heavy, include the equations, notation, or
  symbolic derivation needed to teach it accurately.
- If the concept is conceptually heavy, structurally heavy, or relationship-
  heavy, include the graph, diagram, chart, or comparison view needed to teach
  it accurately.
- Some pages need both. Do not force a prose-only explanation when a graph or
  equation would make the concept materially clearer.
- Graphs, diagrams, charts, captions, and alt text **MUST** follow
  [graphing standards](../../../docs/graphing-standards.md).
- Do not add decorative visuals that repeat the prose without teaching a new
  idea.

Pass:

- The chosen visual or formal aid removes confusion that prose alone would
  leave behind.

Fail:

- A mathematically dense page has no equations, or a relation-heavy page uses
  long prose where one comparison graph would teach the difference.

### 7. Repetition and section separation

Canonical pages should not repeat the same idea across summaries, section
bodies, captions, and comparison text.

Rules:

- Each section should answer a different reader question.
- "What it is" defines the thing.
- "What it optimizes" explains the objective or pressure it addresses.
- "Practical benefit" explains reader-visible consequences.
- "How it works" explains mechanism.
- "Limitations and tradeoffs" explains what the topic gives up.
- Comparison sections should contrast nearby alternatives rather than restate
  the base definition.

Reviewer probe:

- Check whether two adjacent sections can be swapped without changing meaning.
  If yes, the page is probably repeating itself.

Pass:

- Each section contributes something new.

Fail:

- "What it is," "How it works," and "Why it matters" all restate the same
  sentence with slightly different wording.

### 8. No phase, process, or meta language

Customer-facing copy must never mention internal project phases, factory
workflows, convergence batches, authoring process, or page-meta framing.

Forbidden in rendered page copy and message files:

- "Phase 1", "Phase 2", batch numbers, verifier names, or "manual gate"
- "This page was converged", "per the template contract", or "as required by
  the PRD"
- "This page explains...", "on this page...", or "the page below shows..."
- Maintainer-only deployment or CI language

Pass:

- Copy reads as a standalone reference article.

Fail:

- Any process or page-meta language appears in `messages/*.json` or rendered
  HTML.

### 9. Math discipline

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
"How it works" or "What it optimizes" if needed.

- query projection, key projection, value projection
- query heads, key-value heads as concept labels detached from symbol `H` or
  `G`
- grouping, bucketing, or "query-to-KV grouping" as standalone definition rows
- implementation steps such as "project hidden states" or "reshape tensors"
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

### 10. Callouts and reader shortcuts

Baseline templates must **not** include reader-shortcut callouts.

Rules:

- Remove `callouts.readerShortcut` from module, model, paper, concept, system,
  glossary, and training-regime templates unless a future story documents a
  justified exception in this file.
- Do not replace removed shortcuts with equivalent "TL;DR" or "In one
  sentence" callouts in the baseline structure.

Pass:

- No reader-shortcut callout renders on canonical pages.

Fail:

- Template or page still ships `callouts.readerShortcut` without a documented
  exception.

### 11. Related docs, tags, and citations

Canonical pages may expose registry-backed related docs, tags, and citations,
but those systems are supporting structure, not the page's teaching strategy.

Rules:

- Use citations for factual claims.
- Use derived related sections, tags, and references instead of hand-maintained
  duplicate lists when possible.
- Do not make the core narrative depend on "read these other pages first."
- If an inline mention of another concept is necessary, explain the local point
  directly rather than turning the paragraph into navigation guidance.

Pass:

- The page body stands on its own, while supporting sections deepen discovery.

Fail:

- Cross-links are doing the explanatory work that the page itself should do.

## Lessons from prior repair work

Do not reintroduce these recurring writing failures:

- Split summary lines that repeat the thesis instead of one concise lead block
- Concept rows under equations that crowd symbol glossaries
- Reader-shortcut callouts in baseline templates
- Phase, process, or page-meta copy in customer-facing content
- Verbose math definitions instead of short symbol lines
- Unexpanded acronyms such as `FFN` or `ReLU` before teaching the full term
- Pages that explain their role in the docs set instead of the concept itself
