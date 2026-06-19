# Glossary Template Authoring Guide

Use `glossary.mdx` as the production page structure for glossary entries at `/docs/glossary/<slug>`. Put localized reader-facing text in `messages/<locale>.json` using the keys from `glossary.messages.en.json`. Put page-specific visual references in `assets.json` using `glossary.assets.json`.

Glossary pages use `kind: glossary` in frontmatter and resolve through a `concept.<slug>` registry record, the same registry shape as concept pages. The route lives under `src/content/docs/glossary/<slug>/` even though the registry id prefix is `concept.`.

Follow [docs writing standards](../../factory/docs/standards/docs-writing-standards.md) and [graphing-standards](../graphing-standards.md) for layperson tone, isolation-first writing, and optional graph placement.

## Required Content

* `title`: canonical glossary term name.
* `description`: short search and metadata description used by the docs shell (folded thesis for readers).
* `openingSummary`: optional lead copy for search or shell metadata; **do not** render `<T k="openingSummary" />` in glossary MDX.

## Sections

* `whatItIs`: define the term without assuming the reader already knows the surrounding architecture.
* `whyItMatters`: explain what the term helps readers understand, compare, debug, or search for.
* `simpleExample`: provide a compact concrete example, shape, flow, or analogy.
* `commonConfusions`: distinguish nearby terms readers often mix up.
* `related`, `tags`, `references`: localized section titles only; rendered content is registry-backed.

## Assets

* `conceptMap`: optional graph asset rendered as a standalone `<ConceptMap />` between `simple-example` and `common-confusions` (not inside a `where-it-appears` section). Use it when visual relationships help more than prose. Configure `graphId` in `assets.json` and supply node labels under `graph.nodes` in messages when the graph is enabled.

## Baseline exclusions

* No `callouts.readerShortcut` in the glossary template or converged pages.
* No separate `problemStatement` / `coreIdea` keys. If lead copy is needed, use `openingSummary` in messages only.
* No in-body `# <T k="title" />` heading; the docs shell renders the page title once.
* No `<T k="openingSummary" />` or `<GlossaryOpening />` in glossary MDX.

## Registry Expectations

The backing concept registry record at `src/content/registry/concepts/<slug>.json` should include `conceptType`, useful `tags`, `prerequisiteIds`, `explainsIds`, `citationIds`, and curated `relatedIds` only when derived relationships are insufficient. Set frontmatter `status` to `published` when the entry is ready for readers.

## Math and Code Examples

Glossary pages compile through the shared `moduleMdxComponents` map and `moduleMdxCompileOptions` (`remark-math` + `rehype-katex`). Keep localized prose in messages; add compact formulas and code inside `page.mdx` where rendering needs structured blocks.

### Inline and block math

Use standard math delimiters in MDX body text:

* inline: `$p_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}$`
* block: a `$$ ... $$` fenced display equation on its own lines

Inside JSX sections (for example within `<Section>`), prefer explicit components so math stays valid MDX:

```mdx
<Section id="simple-example" titleKey="sections.simpleExample.title">
  <T k="sections.simpleExample.body" />
  <BlockMath formula="\\text{softmax}(z_i) = \\frac{e^{z_i}}{\\sum_j e^{z_j}}" />
</Section>
```

For short inline notation inside a section, use `<InlineMath formula="z_i" />`.

### Fenced code blocks

Use fenced code blocks in `page.mdx`. They render through the Fumadocs `pre` / `CodeBlock` mapping bundled in `moduleMdxComponents`:

\`\`\`python
def softmax(logits):
    ...
\`\`\`

Keep examples small (one vector, one formula, one backward-pass sketch). KaTeX styles load globally from `src/app/globals.css`.
