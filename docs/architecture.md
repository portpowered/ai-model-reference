# Architecture

## Purpose

This document describes how content files, registry data, localized messages, asset references, search indexes, website components, markdown structure, and validation scripts work together.

The site is a static-first Next.js App Router application using Fumadocs for MDX documentation, Orama for search, React Flow for model/module graphs, Recharts for explanatory charts, Tailwind and shadcn/ui for interface components, and Bun/Biome for the local toolchain.

## System Overview

```txt
Shared MDX page structure      Machine-readable JSON registry
src/content/docs/**/page.mdx   src/content/registry
src/content/blog/**/page.mdx          |
       |                             |
       v                             v
Colocated messages             Registry validation
messages/<locale>.json         scripts/validate-registry.ts
       |                             |
       v                             v
Colocated asset config         Fumadocs source + registry loaders
assets.json                    source.config.ts
       |                        src/lib/content
       +------------+----------------+
                    |
                    v
        localized page model and search documents
                    |
        +-----------+------------+
        |                        |
        v                        v
  rendered pages            Orama search index
  src/app/docs              src/app/api/search
  src/app/blog              src/features/docs/search
        |                        |
        +-----------+------------+
                    |
                    v
             website experience
             docs, blog, search, cards, graphs
```

## Content Layers

### MDX Page Structure

MDX files define page structure. They contain frontmatter, component order, registry references, message keys, asset IDs, citations, and structural cross-links.

Canonical docs pages should not contain raw user-visible prose. Section titles, section bodies, callout text, graph labels, chart captions, image alt text, code schemas, comparison table values, and other display values resolve through colocated messages, registry records, or asset config. Blog posts are the exception because they are narrative documents rather than reusable reference templates.

Template authoring guidance lives in sidecar files under `docs/templates`. The production `*.mdx` template defines structure; `<kind>.content.md` explains how to write the page; `<kind>.messages.en.json` provides the starter default-locale message shape; `<kind>.assets.json` provides the starter asset config. Generated docs pages should not copy authoring guidance into `page.mdx`.

Docs pages live under:

```txt
src/content/docs/
  concepts/
    kv-cache/
      page.mdx
      messages/
        en.json
        vi.json
      assets.json
  models/
  modules/
  papers/
  training/
  systems/
  glossary/
```

Blog posts live under:

```txt
src/content/blog/
  why-gqa-matters/
    page.mdx
    messages/
      en.json
      vi.json
    assets.json
```

MDX frontmatter links page structure to structured data through `registryId`. Localized display metadata and body text come from colocated message files. Concrete image, graph, chart, and media values come from colocated asset config.

### Localized Messages

Page-specific localized values live next to the page:

```txt
src/content/docs/modules/grouped-query-attention/
  page.mdx
  messages/
    en.json
    vi.json
```

Message files provide localized titles, descriptions, summaries, section headings, section bodies, callouts, captions, and alt text. Shared UI chrome uses common message files outside the page tree.

### Asset Config

Structured files reference asset IDs rather than concrete file paths or graph values. Colocated `assets.json` files resolve those IDs:

```txt
src/content/docs/modules/grouped-query-attention/
  assets.json
  assets/
    mha-vs-gqa.png
```

Asset config resolves images, generated images, graph IDs, chart IDs, captions, alt text keys, dimensions, and other display values. Components consume resolved assets, not raw string paths scattered through MDX.

### JSON Registry

Registry JSON files are the structured source of truth for search metadata, semantic relationships, model cards, module lists, graph data, related links, and validation.

Registry records live under:

```txt
src/content/registry/
  models/
  modules/
  concepts/
  papers/
  training-regimes/
  datasets/
  hardware/
  organizations/
  citations/
  tags/
  graphs/
```

The registry stores stable IDs, slugs, aliases, tags, relationships, citations, and type-specific fields. It should be easy for agents to generate and easy for humans to review in diffs.

### TypeScript Schemas

TypeScript schema files define the registry contract:

```txt
src/lib/content/schemas.ts
src/lib/content/registry.ts
src/lib/content/messages.ts
src/lib/content/assets.ts
```

The schemas validate JSON records, message files, and asset config. They provide inferred types to components, loaders, graph renderers, and search builders. Zod or an equivalent TypeScript-first schema library should be used.

## Build-Time Flow

### 1. Load Content

Fumadocs loads MDX page structures from `src/content/docs`. Blog loading may use the same source pattern or a separate collection, but should reuse the same MDX component mapping for code, math, callouts, tables, citations, and diagrams.

The content loaders read page structure, colocated messages, colocated asset config, and registry records, then build lookup maps:

```txt
id -> record
slug -> record
tag -> tag record
registryId -> page
page -> messages by locale
page -> asset config
record id -> related records
record id -> citations
```

### 2. Validate Registry Data

`scripts/validate-registry.ts` validates the registry before the site builds.

It should verify:

* JSON shape matches the TypeScript/Zod schema.
* IDs and slugs are unique.
* File paths match record kind.
* Relationship IDs resolve.
* Tags resolve to tag records.
* Published docs pages have valid `registryId` values where required.
* Published registry records have matching canonical MDX pages unless marked data-only.
* Published pages have default-locale message files.
* Required message keys exist for the page template.
* Canonical docs MDX does not contain raw user-visible prose outside approved structural components.
* Asset references resolve to concrete config values.
* Asset alt text and caption keys resolve through messages.
* Graph nodes and edges are valid.

### 3. Validate Links

`scripts/validate-links.ts` uses the Fumadocs Validate Links integration with `next-validate-link`.

It checks:

* Next.js routes.
* Fumadocs docs routes.
* Blog routes.
* Relative MDX links.
* Heading anchors.
* Custom MDX components with `href` props.

### 4. Build Search Documents

Search documents are derived from MDX page structure, localized messages, asset metadata, and registry records.

MDX structure contributes:

* route URL
* frontmatter tags
* registry references
* component structure

Localized messages contribute:

* title
* description
* headings
* body text
* captions
* alt text when useful for discovery

Registry records contribute:

* stable `registryId`
* aliases
* canonical tags
* page kind
* model family
* module type
* module family
* concept type
* variant group
* optimization targets
* example model IDs
* training regime IDs
* modalities
* source type
* relationship IDs
* citation IDs

Asset config contributes:

* graph IDs
* image IDs
* chart IDs
* captions and alt text through message keys

The result is a normalized search document:

```txt
MDX page structure + locale messages + asset config + registry record -> SearchDocument -> Orama index
```

Orama handles retrieval. The registry remains the authority for relationships and graph traversal.

## Runtime Flow

### Page Rendering

Route files in `src/app` should compose data loaders and feature components:

```txt
src/app/page.tsx
src/app/docs/[[...slug]]/page.tsx
src/app/blog/page.tsx
src/app/blog/[slug]/page.tsx
```

The route layer should stay thin. It loads validated page structure, locale messages, resolved assets, and registry records, then passes a localized page model to feature components.

### Docs Components

`src/features/docs` owns docs-specific presentation:

* MDX component mappings
* table of contents
* callouts
* citations
* related links
* search dialog
* docs cards
* previous/next navigation

Docs components consume validated localized page data, resolved assets, and registry data. They should not parse registry JSON, read message files directly, resolve asset paths manually, or infer relationships from raw prose.

### Blog Components

`src/features/blog` owns blog-specific presentation:

* blog index
* post layout
* post cards
* author metadata
* date metadata
* tag lists
* related docs

Blog posts should link back to canonical docs pages for stable definitions.

### Model Components

`src/features/models` owns model and module visualization:

* model cards
* module lists
* architecture summaries
* React Flow graph viewers
* graph legends
* node detail panels

Model components read validated registry records, resolved localized values, resolved asset references, and graph records. React Flow receives graph data that has already been validated and normalized.

## Search Architecture

Search uses Fumadocs Orama as the default engine.

The search stack has three layers:

```txt
1. Orama full-text retrieval
2. Registry-derived facets and filters
3. Registry relationship enrichment
```

### Full-Text Retrieval

Orama indexes:

* titles
* descriptions
* headings
* body text
* aliases
* tag names
* tag aliases

This supports normal user queries like `attention`, `gqa`, `kv cache`, and `models using sliding window attention`.

### Tags And Facets

Tags are a general search mechanism. They are controlled registry records and appear in both MDX frontmatter and JSON registry records.

Search UI filters should be built from registry fields:

* page kind
* tags
* model family
* module type
* optimization target
* training regime
* modality
* source type

The search dialog may use Fumadocs tag filtering for simple filters, and registry-derived client filtering for richer facets.

Tag pages provide a browsing surface for broad topics:

```txt
/tags
/tags/attention
/tags/kv-cache
```

Tag pages derive their lists from registry data and MDX frontmatter. They should group results by page kind so a reader can scan models, modules, concepts, papers, blog posts, training regimes, and systems pages associated with the same tag.

### Semantic Relationships

Relationship fields such as `relatedIds`, `moduleIds`, `paperIds`, `usedByModelIds`, and `introducedByPaperIds` may be indexed into Orama for result enrichment.

However, relationship truth stays in the registry. Multi-hop questions should be answered by registry traversal first, then search can retrieve or rank candidate pages.

Example:

```txt
User query:
  attention variants used by llama models

Registry traversal:
  model family llama -> moduleIds -> attention modules

Search ranking:
  rank matching module pages by text, aliases, tags, and summaries
```

### Derived Related Documents

Related-document sections are derived from taxonomy, tags, and typed registry fields. They answer questions like:

```txt
If I am reading Multi-Head Attention, what nearby module variants should I inspect next?
```

The registry should not require every page to manually list every nearby page. Instead, related resources are derived from fields such as:

* `variantGroup`
* `conceptType`
* `moduleFamily`
* `moduleType`
* `tags`
* `usedByModelIds`
* `introducedByPaperIds`
* `paperIds`
* `relatedIds`

Page components render those relationships as grouped sections:

```txt
Same variant group
Same concept type
Same module family
Shared tags
Used by the same models
Introduced by the same papers
Curated related links
```

`relatedIds` remains an override for high-value links that cannot be derived from taxonomy, such as a paper arguing against a method or a prerequisite concept that intentionally does not share tags.

MDX can introduce the section, but the component should read the registry and derive the current related documents.

## Recursive Module Graph Architecture

All model and module structures are represented as recursive module graphs.

A model is a root module. A module can contain submodules. Submodules can contain more submodules. This single abstraction should cover transformer models, diffusion models, FFT modules, attention blocks, audio/image encoders, training pipelines, and systems diagrams.

The graph structure, localized labels, page assets, and page MDX should stay close together:

```txt
src/content/docs/modules/grouped-query-attention/
  page.mdx
  messages/
    en.json
    vi.json
  assets.json
  assets/
```

Reusable graphs may live under `src/content/registry/graphs`, but page-specific graph references and renderer choices should be declared in colocated `assets.json`.

Graph rendering flow:

```txt
recursive module graph
  + messages/<locale>.json
  + assets.json
  -> expanded/collapsed graph state
  -> vertical layout
  -> renderer selection
       web: React Flow
       PDF: static vertical SVG, Mermaid, or image fallback
```

Graph viewers should include:

* localized labels
* legends
* node details
* pan and zoom
* fit-to-view
* reset controls
* expand node
* collapse node
* expand all
* collapse all
* text summaries for accessibility and search

Graph renderer rules:

* Web routes use React Flow as the interactive graph engine.
* React Flow should not dictate visual style. Visual quality comes from semantic module node styles, semantic edge styles, and deterministic vertical layout.
* Layout is vertical-first on desktop and mobile.
* Expand and collapse controls are icon buttons with accessible labels.
* The graph state is recursive: expanding a module replaces or opens that module's submodules while preserving the vertical flow.
* Print/PDF routes use a static vertical SVG renderer for recursive module graphs.
* Print/PDF routes may use Mermaid for simple directional graphs.
* Print/PDF routes use image fallback only when graph complexity requires it.
* PDF generation must not screenshot the whole page. Playwright is used to call Chromium `page.pdf()` on print-safe routes.
* Graph assets declare `webRenderer` and `printRenderer` in `assets.json`.
* `validate-pdf` checks that selected graph assets have a valid print renderer and localized labels/alt text.

## PDF Export Architecture

PDF export is a build artifact from resolved localized page models.

```txt
page.mdx structure
  + messages/<locale>.json
  + assets.json
  + registry records
  -> print route
  -> Chromium page.pdf()
  -> dist/pdf/<locale>/*.pdf
```

PDF routes:

```txt
src/app/print/[locale]/docs/[[...slug]]/page.tsx
src/app/print/[locale]/sets/[set]/page.tsx
```

Required commands:

```txt
make internal-validate-pdf LOCALE=en
make pdf LOCALE=en
make pdf-page LOCALE=en PAGE=docs/modules/grouped-query-attention
make pdf-set LOCALE=en SET=attention
```

`scripts/build-pdf.ts` should:

* parse `LOCALE`, `PAGE`, and `SET`
* validate registry, message, asset, and PDF set inputs
* build or start the site
* visit print-safe routes with Playwright
* wait for fonts, math, charts, Mermaid, and print graph renderers
* call `page.pdf()`
* write output under `dist/pdf/<locale>/`

PDF sets live under:

```txt
src/content/pdf-sets/
  attention.json
  core-transformers.json
```

CI should run `make internal-validate-pdf` to catch unresolved print inputs. CI does not need to generate every PDF on every pull request unless the project chooses that as a release gate.

## CI And Quality Gates

Production build output is guarded against Turbopack NFT whole-project filesystem tracing warnings; see [turbopack-nft-tracing-warning-closure.md](./turbopack-nft-tracing-warning-closure.md) for detector locations, guarded pattern families, and maintenance notes.

The root `make ci` command should run:

```txt
make lint
make internal-typecheck
make test
make internal-coverage
make internal-validate-data
make internal-linkcheck
make build
```

Required tool ownership:

* Biome owns linting and formatting; CI should run Biome in check mode rather than write mode.
* Bun owns tests and coverage.
* TypeScript owns type checking.
* Fumadocs and `next-validate-link` own docs link validation.
* Registry validation owns JSON data correctness.

## Design Principle

Do not let runtime components discover meaning by scraping prose or raw file paths.

The registry defines meaning. MDX defines structure. Messages provide localized values. Asset config resolves concrete media and graph references. Search indexes the resolved page model. Components render validated data.
