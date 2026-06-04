# Documentation Template Contract

Docs pages are shared MDX structures that combine registry-backed React components, message-key references, and asset references. Localized prose lives in colocated `messages/<locale>.json` files next to each page.

For canonical docs pages, templates should be production-shaped. They should not contain authoring instructions, placeholder body prose, hard-coded section headings, raw callout titles, manually written comparison lists, inline schema examples, or concrete media paths. Those values belong in colocated messages, registry records, or asset config. The template itself defines order and component shape only.

Blog templates are the exception. Blog posts may contain raw MDX prose because they are narrative, time-specific writing rather than reusable reference structure. Blog posts should still use messages and assets when they need localization or reusable media.

Use the page-kind template that matches the content:

```txt
docs/templates/concept.mdx
docs/templates/glossary.mdx
docs/templates/model.mdx
docs/templates/module.mdx
docs/templates/paper.mdx
docs/templates/training-regime.mdx
docs/templates/blog-post.mdx
```

Glossary entries use `glossary.mdx` with colocated content under `src/content/docs/glossary/<slug>/` and render at `/docs/glossary/<slug>`. They share the concept registry record shape (`concept.<slug>`) and the same section structure as concept pages; only frontmatter `kind` and the docs route differ.

Each template has sidecar files:

```txt
docs/templates/<kind>.content.md       # authoring guide, not copied into production pages
docs/templates/<kind>.messages.en.json # starter default-locale message file
docs/templates/<kind>.assets.json      # starter page asset config
```

When creating a canonical docs page, use the `.mdx` file as the page structure, copy the starter message file to `messages/en.json`, copy the starter asset config to `assets.json`, and use the `.content.md` guide to fill in the values. Do not paste `.content.md` prose into `page.mdx`.

## Required Pattern

Canonical docs pages should include:

* frontmatter with `kind`, `registryId`, `messageNamespace`, `assetNamespace`, `status`, `tags`, `aliases`, and `updatedAt`
* `messageNamespace` and `assetNamespace` references, usually `local`
* a localized one-sentence problem statement rendered from messages
* a localized one-sentence core idea rendered from messages
* registry-backed metadata or at-a-glance component where relevant
* clickable tags through `TagPillList`
* page-kind-specific sections
* derived related documents through `DerivedRelatedDocs` where useful
* references through `CitationList`

Production docs pages should render sections through localized section components, for example:

```mdx
<Section id="what-it-is" titleKey="sections.whatItIs.title">
  <T k="sections.whatItIs.body" />
</Section>
```

When a section needs a graph, chart, diagram, code schema, image, or table, reference an `assetId` instead of writing the value inline:

```mdx
<ModuleGraph registryId="module.grouped-query-attention" assetId="computeFlow" />
<ModuleComparisonTable registryId="module.grouped-query-attention" assetId="comparisonTable" />
```

Blog posts should include:

* frontmatter with `messageNamespace`, `assetNamespace`, `publishedAt`, `updatedAt`, `authors`, `tags`, `relatedDocIds`, and `status`
* colocated `messages/<locale>.json` files for narrative context
* colocated `assets.json` when the post uses page-specific images, graphs, or media
* links back to canonical docs pages
* related docs through `BlogRelatedDocs`

Blog posts may use `blog-post.content.md` as an outline, but unlike canonical docs pages they may keep narrative prose in the MDX file when localization is not required.

## Component Rule

Use MDX components for structured information that comes from the registry:

* model and module metadata
* at-a-glance summaries
* React Flow graphs
* comparison tables
* related resources
* tag lists
* citations

Use message components for localized user-facing text. Use asset components or resolved asset props for page-specific media. Do not hard-code localized body prose, section headings, callout titles, alt text, captions, inline schemas, comparison table values, or concrete asset paths directly in shared MDX unless there is a documented exception.

For graph-heavy pages, reference graph assets by `assetId`. Graph node labels, edge labels, summaries, captions, and alt text should resolve from colocated messages. A model page should treat the model as a root module and let the recursive graph viewer expand submodules vertically.

Do not hand-maintain lists of related pages when the same result can be derived from registry data, tags, taxonomy fields, model usage, paper usage, or `relatedIds` overrides.

## Search Rule

Search depends on frontmatter and registry data. Keep these fields accurate:

* `registryId`
* `kind`
* `tags`
* `aliases`
* page headings

Localized search values come from page messages. Asset captions and alt text should be indexed only after resolving asset config and message keys.

Tags should be broad browsing and filtering paths. Use tag pages for topic-wide exploration, such as `/tags/attention` or `/tags/kv-cache`.

## References

Use citation registry records for technical claims. The rendered page should use `CitationList` instead of hand-formatting source lists when possible.
