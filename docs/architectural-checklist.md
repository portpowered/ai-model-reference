# High-Quality ML Documentation Website Checklist

## Notes: 
- this document is the intended baseline by which we structure the website. 
- the website must enforce quality using GATES like CI, or Linters, and we generally check of items off the checklist when things are generally constrained by the checklist, or have well defined checklists + templates off which we can govern the system. (Mechanisms + processes). We preference mechanisms generally when possible, but recognize when its not.

## Website fundamentals

### Operational

* Website deploys automatically via GitHub Actions.
* Website has CI checks on every pull request and merge.
* Merges to `main` are blocked unless CI passes.
* Deployments are reproducible from source control.
* Production deploys are versioned and traceable to a commit SHA.
* Rollbacks are supported and documented.
* Preview deployments are generated for pull requests.
* Deployment status is visible in GitHub checks.
* Environment variables and secrets are managed securely through the CI/CD provider.
* The build has deterministic install behavior through a lockfile.
* The website has a documented release process.
* The website has a documented incident rollback process.

## Testing

* Components are tested.
* Render integration tests confirm the website loads and core pages work.
* Lighthouse or equivalent performance tests are included.
* Storybook is used for visual testing and component review.
* Critical docs pages have smoke tests.
* Navigation, search, code blocks, graphs, math rendering, and MDX rendering are tested.
* Accessibility tests are included in CI.
* Broken link checks are included in CI.
* Visual regression tests exist for key pages and reusable components.
* Tests cover loading, empty, error, and success states.
* Test data is deterministic and does not depend on unstable external services.
* CI runs type checking, linting, unit tests, integration tests, and build validation.

## System structure

* Application state uses a clear state manager where needed, such as Zustand.
* Website pages are separate from reusable components.
* Domain-specific components are separate from generic UI components.
* Styles are primarily defined through Tailwind utilities and design tokens.
* Design tokens are defined for colors, spacing, typography, radius, shadows, breakpoints, and z-index.
* Tokens are used consistently across the website.
* Components avoid hard-coded numbers for padding, font sizes, colors, and layout values unless intentionally local.
* Shared logic is extracted into hooks, utilities, or view models.
* Rendering logic is separated from data transformation logic.
* The docs system has clear boundaries between content, rendering, navigation, search, and layout.
* ML-specific rendering, such as graphs and model diagrams, is isolated into dedicated components.

## Component quality

* Components support loading, empty, failed, and success states.
* Components expose variants in a controlled way, similar to shadcn/ui.
* Components avoid one-off styling unless the exception is documented.
* Components are tested across relevant variants, sizes, and states.
* Components support keyboard navigation where interactive.
* Components expose accessible labels and semantic HTML.
* Components are responsive by default.
* Components avoid hidden side effects.
* Components have stable props and documented usage examples.
* Components are composable instead of overly specialized.
* Components avoid directly fetching data unless they are explicitly data-bound components.
* Components are documented in Storybook or equivalent examples.

## Viewports

* The website renders correctly on mobile, tablet, laptop, desktop, and wide-screen layouts.
* Navigation works on small screens.
* Tables, code blocks, diagrams, and graphs remain usable on small screens.
* Large ML diagrams have pan, zoom, fit-to-screen, and reset controls.
* Content does not overflow horizontally unless intentionally scrollable.
* Touch interactions are supported for mobile and tablet.
* Hover-only interactions have keyboard and touch alternatives.
* Font sizes and line heights remain readable across viewport sizes.

## Package structure

Required structure:

```txt
src/
  app/                 # Next.js App Router entrypoints
    layout.tsx         # root HTML shell, global providers, metadata defaults
    page.tsx           # docs-oriented home/search entrypoint
    docs/
      [[...slug]]/
        page.tsx       # Fumadocs document route
    blog/
      page.tsx         # blog index
      [slug]/
        page.tsx       # blog post route
    tags/
      page.tsx         # tag index
      [slug]/
        page.tsx       # tag landing/search page
    print/
      [locale]/
        docs/
          [[...slug]]/
            page.tsx   # print-safe docs route for PDF generation
        sets/
          [set]/
            page.tsx   # print-safe curated PDF set route
    api/
      search/
        route.ts       # optional static search endpoint if client-only search is insufficient
  components/          # shared UI components
    ui/                # shadcn/ui primitives and thin wrappers
    layout/            # app shell, sidebars, headers, footers, page chrome
  features/
    docs/              # docs-specific rendering, navigation, search
      components/      # doc cards, callouts, TOC, citations, related links
        DerivedRelatedDocs.tsx
        TagResourceList.tsx
        TagPillList.tsx
      search/          # Orama client, search dialog, filters, ranking helpers
        SearchDialog.tsx
        SearchTrigger.tsx
        SearchResults.tsx
        SearchFilters.tsx
        search-client.ts
    blog/              # blog-specific rendering, indexes, and post chrome
      components/
        BlogIndex.tsx
        BlogPostLayout.tsx
        BlogCard.tsx
        BlogAuthor.tsx
        BlogDate.tsx
        BlogTagList.tsx
        BlogRelatedDocs.tsx
    models/            # ML model viewers, graph viewers, module diagrams
      components/      # model cards, graph viewer, module viewer, detail panels
        ConceptMap.tsx
        ModelAtAGlance.tsx
        ModelArchitectureGraph.tsx
        ModelModuleList.tsx
        ModelTrainingSummary.tsx
        ModuleAtAGlance.tsx
        PaperAtAGlance.tsx
        PaperContributionGraph.tsx
        TrainingRegimeAtAGlance.tsx
        TrainingRegimeFlow.tsx
      schemas/         # model/module/concept graph schemas
      data/            # typed structured model data imported by content
    state/             # feature-level state
    hooks/             # feature-level hooks
    messages/          # localized strings
  content/
    docs/              # shared MDX page structures rendered by Fumadocs
      concepts/
        example-concept/
          page.mdx
          messages/
            en.json
            vi.json
          assets.json
          assets/
      models/
      modules/
      papers/
      training/
      systems/
      glossary/
    blog/              # shared MDX blog structures rendered with the same MDX component set
    pdf-sets/          # curated page bundles for PDF export
    registry/          # structured JSON/TS data used for search, links, and graphs
  tokens/              # design tokens exported to Tailwind and CSS variables
  lib/                 # framework-agnostic utilities
    content/           # content loaders, messages, assets, slug helpers, citation helpers
    search/            # static index builder and shared ranking utilities
    seo/               # metadata, canonical URL, sitemap helpers
  tests/               # shared test utilities
scripts/
  validate-links.ts    # Fumadocs/next-validate-link docs link checker
  validate-registry.ts # JSON registry schema and relationship checker
  validate-pdf.ts      # PDF export input and print-renderer checker
  build-pdf.ts         # locale-aware PDF generation through print routes
source.config.ts       # Fumadocs source configuration
next.config.ts         # Next.js static/runtime configuration
tailwind.config.ts     # Tailwind theme and token wiring
components.json        # shadcn/ui configuration
biome.json             # Biome lint and format configuration
```

* Components are grouped by responsibility, not only by visual type.
* Feature-specific components live inside the feature directory.
* Generic reusable components live in `src/components`.
* Route files in `src/app` compose layouts, data loaders, and feature components; they do not contain complex transformation logic.
* Feature state lives in `src/features/<feature>/state`.
* Feature hooks live in `src/features/<feature>/hooks`.
* Localized strings live in `src/features/<feature>/messages` or a global i18n layer.
* Public APIs between packages are explicit.
* Internal modules are not imported across boundaries without a clear reason.
* Package exports are controlled through `package.json` exports where applicable.

## Pages

* Pages primarily compose layouts and components.
* Pages avoid containing complex business logic.
* Pages are constrained to a predefined set of layouts.
* Static documentation pages are generated from MDX.
* Each page has clear metadata: title, description, canonical URL, and Open Graph metadata.
* Each page has a clear heading hierarchy.
* Each page supports deep links for important sections.
* Docs pages support previous/next navigation where useful.
* Docs pages support table of contents navigation.
* Pages degrade gracefully when optional enhanced components fail.
* Pages are optimized for search indexing where public docs are intended to be discoverable.

## Accessibility

* WCAG checks are included in CI.
* Components use semantic HTML whenever possible.
* Interactive components support keyboard navigation.
* Focus states are visible.
* Color contrast meets WCAG requirements.
* Images, diagrams, and graphs have accessible labels or text alternatives.
* Code blocks are readable by assistive technology.
* Navigation landmarks are present.
* ARIA is used only when semantic HTML is insufficient.
* Motion effects respect reduced-motion preferences.
* Forms and search inputs have labels and accessible error messages.
* Graph and model viewers provide a non-visual summary of the diagram.

## Localization

* Users can choose content localization where supported.
* Times, dates, and numbers are localized to the reader’s region.
* Locale is reflected in routing or user preference.
* Fallback language behavior is defined.
* Missing translations are detectable in CI or during build.
* Localized pages preserve canonical metadata and alternate-language links.
* Search supports localized content where applicable.
* Technical terms have a glossary or consistent translation policy.

## Quality

* Biome is used for code linting and formatting.
* TypeScript strict mode is enabled.
* CI enforces type checking.
* CI enforces Biome linting.
* CI enforces Biome formatting.
* CI enforces build success.
* Bun is used for unit and integration testing.
* Bun is used for test coverage through `bun test --coverage`.
* Code coverage thresholds are defined in the Bun test configuration or CI command.
* Critical rendering paths should have strong coverage.
* Avoid mandating 100% coverage globally unless the team is willing to maintain it; prefer high coverage thresholds plus required coverage for critical utilities, rendering, and state logic.
* Dead code is detected and removed.
* Dependency updates are managed intentionally.
* Security scans are run for dependencies.
* Bundle size is tracked.
* Performance budgets are defined.
* Broken links are checked with Fumadocs-compatible `next-validate-link`.
* Markdown and MDX content are linted.
* Public-facing docs are reviewed for grammar, clarity, and technical accuracy.

## Build systems

* Bun is used for package installation, build runtime, and testing.
* The root Makefile exposes standard commands.
* Commands are consistent locally and in CI.

Required commands:

```makefile
make ci        # run all CI checks
make test      # run Bun tests
make coverage  # run Bun tests with coverage
make build     # build the website
make lint      # run Biome lint checks
make format    # format code with Biome
make typecheck # run TypeScript checks
make validate-data # validate JSON registry data and relationships
make validate-pdf # validate PDF export inputs for a locale or all default PDFs
make linkcheck # run Fumadocs/next-validate-link docs link validation
make pdf       # generate PDFs, usually with LOCALE=en
make pdf-page  # generate one page PDF with LOCALE=en PAGE=...
make pdf-set   # generate one curated PDF set with LOCALE=en SET=...
make clean     # remove generated artifacts
```

* `make ci` should run Biome linting, Biome formatting checks, type checking, Bun tests, Bun coverage, registry validation, PDF input validation, build validation, accessibility checks, and Fumadocs link checks.
* `make lint` should run `bunx biome check .` or the local package-script equivalent.
* `make format` should run `bunx biome format --write .` or the local package-script equivalent.
* `make test` should run `bun test`.
* `make coverage` should run `bun test --coverage`.
* `make validate-data` should run `bun ./scripts/validate-registry.ts`.
* `make validate-pdf` should run `bun ./scripts/validate-pdf.ts`.
* `make linkcheck` should run `bun ./scripts/validate-links.ts`.
* `make pdf LOCALE=en` should run `bun ./scripts/build-pdf.ts --locale en`.
* `make pdf-page LOCALE=en PAGE=docs/modules/grouped-query-attention` should run `bun ./scripts/build-pdf.ts --locale en --page docs/modules/grouped-query-attention`.
* `make pdf-set LOCALE=en SET=attention` should run `bun ./scripts/build-pdf.ts --locale en --set attention`.
* Build output is deterministic.
* Generated files are either committed intentionally or excluded consistently.
* CI caching is configured for Bun dependencies and build artifacts where appropriate.

# Website-specific decisions

## Technology decisions

* The application is a Next.js App Router site written in TypeScript.
* The site is primarily statically rendered. Dynamic routes should use static generation unless a feature has a documented reason to require runtime rendering.
* Bun is the package manager and local command runner. The committed lockfile is the source of truth for dependency versions.
* Fumadocs is the documentation framework. It owns MDX loading, document routing, table of contents generation, previous/next navigation, and source configuration.
* Docs use shared MDX page structures under `src/content/docs`.
* Localized page text lives in colocated `messages/<locale>.json` files next to each `page.mdx`.
* Page-specific asset references resolve from colocated `assets.json` files next to each `page.mdx`.
* Structured content data lives under `src/content/registry` and is validated before build. Registry data powers search facets, related links, model/module graphs, and model cards.
* Tailwind is the styling system. Design tokens are defined once in `src/tokens` and wired into `tailwind.config.ts` plus global CSS variables.
* shadcn/ui is the base component system for accessible primitives.
* Magic UI may be used for polished non-core visual moments, but core docs, search, graph, and navigation components must remain accessible, stable, and lightweight.
* React Flow is used for model, module, and pipeline graph rendering.
* Recharts is used for small explanatory charts, timelines, and comparative visualizations that are not graph/topology diagrams.
* KaTeX or an equivalent build-compatible LaTeX renderer is used for math rendering in MDX.
* Search uses Fumadocs built-in Orama search as the default implementation: https://www.fumadocs.dev/docs/headless/search/orama
* Search is backed by Fumadocs source data, colocated localized messages, colocated asset config, and structured registry data. The index includes localized titles, descriptions, headings, body text, tags, aliases, page kind, model family, module type, training regime, asset captions/alt text where useful, and registry relationships.
* Search should use Fumadocs static search mode for a fully static export when practical. If static index payloads become too large, the site may use the Fumadocs Orama API route instead.
* PDF export is supported for selected docs pages or doc sets through a documented build or route-level export mechanism.

## App Structure Contract

* `src/app/layout.tsx` defines the root shell, global metadata defaults, font loading, global CSS, and providers.
* `src/app/page.tsx` is the first user-facing reference/search surface, not a marketing landing page.
* `src/app/docs/[[...slug]]/page.tsx` is the canonical documentation route for MDX pages.
* `src/app/blog/page.tsx` is the blog index route.
* `src/app/blog/[slug]/page.tsx` is the canonical blog post route.
* `src/app/tags/page.tsx` is the tag index route.
* `src/app/tags/[slug]/page.tsx` is the tag landing page route.
* `src/app/print/[locale]/docs/[[...slug]]/page.tsx` is the print-safe route for single-page PDF generation.
* `src/app/print/[locale]/sets/[set]/page.tsx` is the print-safe route for curated PDF bundles.
* `source.config.ts` defines Fumadocs collections and points at shared `page.mdx` files under `src/content/docs`.
* `src/content/docs` contains shared MDX page structures grouped by page type: concepts, models, modules, papers, training, systems, and glossary.
* `src/content/blog` contains shared MDX blog structures for release notes, paper walkthroughs, research commentary, and site updates.
* `src/content/registry` contains machine-readable structured records. Each record has a stable `id`, `slug`, `defaultTitleKey`, `defaultSummaryKey`, `kind`, `tags`, `aliases`, `relatedIds`, and citations where applicable.
* Each page directory may contain `messages/<locale>.json`, `assets.json`, and local assets. Page components consume resolved localized values and resolved asset references.
* `src/features/docs` owns document rendering concerns: search UI, related links, citations, callouts, table of contents, previous/next controls, and MDX component mappings.
* `src/features/blog` owns blog rendering concerns: blog index, post layout, author/date metadata, tag lists, related reference links, and post navigation.
* `src/features/models` owns model-specific rendering concerns: model cards, module listings, graph viewers, graph schemas, node detail panels, and model architecture summaries.
* `src/lib/content` owns content normalization and validation helpers. Rendering components should consume validated data rather than parse frontmatter ad hoc.
* `src/lib/search` owns index generation, query normalization, ranking, and facet filtering.
* `src/lib/seo` owns metadata helpers, canonical URLs, Open Graph data, sitemap data, and structured data where useful.
* `src/components/ui` contains shadcn primitives only or thin project wrappers around those primitives.
* `src/components/layout` contains reusable layout chrome that is not specific to one feature.
* Tests live near the code they verify when local context helps, with shared test helpers under `src/tests`.

## Routing Contract

* `/` opens the searchable reference home.
* `/docs` opens the documentation index.
* `/docs/concepts/<slug>` renders concept pages.
* `/docs/models/<slug>` renders model pages.
* `/docs/modules/<slug>` renders module/component pages.
* `/docs/papers/<slug>` renders paper explainer pages.
* `/docs/training/<slug>` renders training regime and optimization pages.
* `/docs/systems/<slug>` renders hardware, distributed systems, and inference systems pages.
* `/docs/glossary/<slug>` renders glossary entries.
* `/blog` renders the blog index.
* `/blog/<slug>` renders individual blog posts.
* `/tags` renders the tag index.
* `/tags/<slug>` renders a tag landing page that lists all docs, blog posts, and registry records associated with the tag.
* `/print/<locale>/docs/<slug>` renders a print-safe version of one docs page for PDF generation.
* `/print/<locale>/sets/<set>` renders a print-safe curated page bundle for PDF generation.
* Search results must support query text plus structured filters for page kind, tags, model family, module type, and training regime where data exists.

## Search Components Contract

* Search uses Fumadocs Orama as the primary engine. Do not invent a separate search engine unless an implementation note explains why Fumadocs Orama cannot satisfy the requirement.
* `src/app/api/search/route.ts` hosts the Fumadocs Orama search route when using fetch mode. It should be created from the Fumadocs source with `createFromSource` or `createSearchAPI` from `fumadocs-core/search/server`.
* For static export, `src/app/api/search/route.ts` should expose `staticGET` and the client should use `useDocsSearch({ type: "static" })`.
* `src/features/docs/search/SearchDialog.tsx` is the customized Fumadocs UI search dialog. It composes `SearchDialog`, `SearchDialogOverlay`, `SearchDialogContent`, `SearchDialogHeader`, `SearchDialogIcon`, `SearchDialogInput`, `SearchDialogClose`, `SearchDialogList`, `SearchDialogFooter`, `TagsList`, and `TagsListItem` from `fumadocs-ui/components/dialog/search` where those pieces are needed.
* `src/features/docs/search/SearchTrigger.tsx` owns the visible command/search button in the app shell and docs pages.
* `src/features/docs/search/SearchResults.tsx` owns result rendering only when the default Fumadocs list is insufficient for the reference-site result shape.
* `src/features/docs/search/SearchFilters.tsx` owns structured filters for page kind, tags, model family, module type, and training regime.
* `src/features/docs/search/search-client.ts` wraps `useDocsSearch` configuration so the search mode, locale, tag filter, and Orama initialization are defined in one place.
* The root provider in `src/app/layout.tsx` or a client provider wrapper registers the custom `SearchDialog` through the Fumadocs UI `RootProvider` search configuration.
* Search result items must show title, page kind, short summary, matched tags, and enough context for a normal reader to distinguish concepts, modules, models, and papers.
* Search must support keyboard opening, keyboard result navigation, visible focus states, empty state, loading state, and no-JavaScript fallback navigation to `/docs`.

## Derived Related Documents And Tags Contract

* `src/features/docs/components/DerivedRelatedDocs.tsx` renders grouped related resources from the shared ontology peer policy, compatibility metadata, and optional `relatedIds` overrides.
* `src/features/docs/components/RelatedDocs.tsx` should render default page-side related links from curated overrides plus ontology-derived relationship, classification-sibling, and shared-parent groups instead of `variantGroup` as the main module peer source.
* `src/lib/content/ontology-peer-policy.ts` defines the cross-surface peer precedence: direct ontology relationships first, same-classification siblings second, and shared-parent classification peers only as a fallback.
* Relationship types `variant`, `part-of`, and `explains` must outrank generic classification siblings when both apply.
* Legacy taxonomy fields such as `variantGroup`, `conceptType`, and `moduleFamily` remain compatibility metadata and should not be treated as the primary peer-discovery contract once ontology ancestry exists.
* Module pages should use `DerivedRelatedDocs` to show nearby variants and alternatives according to ontology relationships and classification structure rather than broad legacy grouping strings.
* `src/features/models/components/ModuleAtAGlance.tsx` renders module `optimizes` and `exampleModelIds` near the top of module pages.
* Model pages should derive related models, modules, training regimes, datasets, and papers from model family, shared modules, training regimes, datasets, organizations, tags, and optional `relatedIds`.
* Paper pages should derive introduced models/modules/concepts from typed paper fields, plus supporting or conflicting papers from contribution type, tags, and optional `relatedIds`.
* `src/features/docs/components/TagPillList.tsx` renders clickable tag links for docs, blog posts, cards, and search results.
* Every tag pill links to `/tags/<slug>` or an equivalent search URL with that tag filter applied.
* `src/features/docs/components/TagResourceList.tsx` renders tag landing page results grouped by kind: models, modules, concepts, papers, blog posts, training regimes, systems pages, and glossary entries.
* Tag landing pages derive their result lists from registry records and MDX frontmatter, not manual page lists.
* Tag landing pages should include a search handoff link such as `/search?tag=<slug>` when a dedicated search page exists.

## Link Validation Contract

* Link validation uses the Fumadocs Validate Links integration with `next-validate-link`: https://www.fumadocs.dev/docs/integrations/validate-links
* The repo must include `scripts/validate-links.ts`.
* `scripts/validate-links.ts` imports the Fumadocs `source` object and validates every page returned by `source.getPages()`.
* The validator scans Next.js routes with `scanURLs({ preset: "next" })` and populates the docs catch-all route from Fumadocs page slugs.
* The validator passes page heading hashes from each page table of contents so same-page and cross-page anchor links are checked.
* The validator checks links in raw MDX text from `page.data.getText("raw")`.
* The validator checks relative paths as URLs with `checkRelativePaths: "as-url"`.
* The validator must include href-bearing MDX components in its markdown component configuration, including `Card`, `Cards`, `Callout`, `SourceLink`, `RelatedLink`, and any custom link-like component introduced by the docs system.
* `make linkcheck` and `make ci` must fail when internal docs links, relative URL links, heading anchors, or configured MDX component hrefs are broken.
* External link validation may be kept separate from `make ci` if network flakiness makes it unreliable, but internal link validation is required in CI.

## Blog Components Contract

* The blog is secondary to the reference docs. Blog posts should point readers back to canonical docs pages for stable definitions, model pages, module pages, and concepts.
* Blog posts are authored in MDX under `src/content/blog`.
* Blog frontmatter must include `title`, `description`, `slug`, `publishedAt`, `updatedAt` when revised, `authors`, `tags`, `relatedDocIds`, and `status`.
* Blog status is one of `draft`, `published`, or `archived`.
* `src/features/blog/components/BlogIndex.tsx` renders the blog listing with tag filtering and pagination or incremental loading when needed.
* `src/features/blog/components/BlogPostLayout.tsx` renders the article shell, heading hierarchy, metadata, table of contents when useful, related docs, and previous/next post navigation.
* `src/features/blog/components/BlogCard.tsx` renders repeated post summaries on indexes and related-post sections.
* `src/features/blog/components/BlogAuthor.tsx` renders author information from structured metadata, not hard-coded article text.
* `src/features/blog/components/BlogDate.tsx` renders published and updated dates with accessible machine-readable timestamps.
* `src/features/blog/components/BlogTagList.tsx` renders tag links that align with docs search tags where possible.
* `src/features/blog/components/BlogRelatedDocs.tsx` renders links to canonical docs pages using `relatedDocIds`.
* Blog MDX uses the same core MDX component mapping as docs pages for code blocks, math, callouts, citations, tables, and diagrams.
* Blog pages must have canonical metadata, Open Graph metadata, and sitemap entries.
* Blog links are included in `scripts/validate-links.ts` so `make linkcheck` validates blog routes, anchors, relative links, and custom blog MDX component hrefs.
* Blog content should not duplicate canonical reference definitions. When a post explains a concept, it links to the canonical docs page and focuses on narrative context, recency, or practical interpretation.

## Documentation features

* Supports documentation search.
* Supports export to PDF.
* Supports in-page navigation.
* Supports cross-file navigation.
* Supports previous/next navigation.
* Supports versioned documentation.
* Supports changelog or release-note pages.
* Supports rendering graphs for ML models, modules, and pipelines.
* Supports math equations.
* Supports syntax-highlighted code blocks.
* Supports copy buttons for code snippets.
* Supports callouts such as notes, warnings, tips, and limitations.
* Supports diagrams and architecture visuals.
* Supports tables with responsive behavior.
* Supports glossary pages for ML terms.
* Supports citations or source references where technical claims need grounding.
* Supports model cards or structured model documentation.
* Supports API reference pages if the ML system exposes APIs.
* Supports downloadable assets where appropriate.
* Supports canonical URLs and sitemap generation.

## Template Contract

* Docs templates are authored as MDX files under `docs/templates`.
* The required templates are `concept.mdx`, `model.mdx`, `module.mdx`, `paper.mdx`, `training-regime.mdx`, and `blog-post.mdx`.
* Each template kind has sidecars: `<kind>.content.md`, `<kind>.messages.en.json`, and `<kind>.assets.json`.
* The `.content.md` sidecar is authoring guidance only and is not copied into production pages.
* The `.messages.en.json` sidecar is the starter default-locale message shape for `messages/en.json`.
* The `.assets.json` sidecar is the starter asset config shape for page-local `assets.json`.
* Templates include frontmatter, registry IDs where applicable, message namespace references, asset namespace references, tags, imported MDX components, derived related-document components, tag components, and citation components.
* Templates show component usage patterns but do not define implementation code.
* Canonical docs templates use `registryId`.
* Canonical docs templates use message keys and resolved assets for user-facing text and media rather than hard-coded localized values.
* Canonical docs templates render sections through localized section components, such as `Section` with `titleKey` and `T` with body keys.
* Canonical docs templates reference graphs, charts, code schemas, images, and comparison tables by `assetId` or registry-backed component props.
* Validation fails when canonical docs MDX contains raw user-visible prose outside approved structural wrappers, message components, or registry-backed components.
* Blog templates use `relatedDocIds` and should point back to canonical docs pages.
* Templates should not rely on manual related lists when registry-derived related sections can do the job.

## PDF Export Contract

* PDF export is generated from resolved localized page models through print-safe Next.js routes.
* Playwright is used to drive Chromium's `page.pdf()` API. The PDF pipeline must not screenshot whole pages and wrap screenshots into PDFs.
* Print routes live under `src/app/print/[locale]/docs/[[...slug]]/page.tsx` and `src/app/print/[locale]/sets/[set]/page.tsx`.
* PDF output is written under `dist/pdf/<locale>/`.
* `scripts/build-pdf.ts` owns PDF generation.
* `scripts/validate-pdf.ts` owns PDF input validation.
* Curated PDF bundles live under `src/content/pdf-sets`.
* `make validate-pdf` runs in CI.
* `make pdf LOCALE=en` generates all default PDFs for one locale.
* `make pdf-page LOCALE=en PAGE=docs/modules/grouped-query-attention` generates one docs-page PDF.
* `make pdf-set LOCALE=en SET=attention` generates one curated PDF bundle.
* PDF routes use print CSS, resolved localized messages, resolved assets, registry records, visible citations, and print-safe graph renderers. Recursive module graphs should render through static vertical SVG by default.
* PDF export does not include draft, archived, private, or locale-incomplete pages unless explicitly requested by an internal-only command.

## ML-specific documentation quality

* Model pages clearly state model purpose, inputs, outputs, and constraints.
* Model pages document architecture at a high level.
* Model pages document important modules, such as attention, normalization, feed-forward layers, embeddings, tokenizers, and output heads.
* Model pages document training regime where relevant.
* Model pages document evaluation metrics and benchmark caveats.
* Model pages document hardware assumptions and performance characteristics.
* Model pages distinguish between conceptual explanation and implementation detail.
* Graphs show clear labels, legends, and directional flow.
* Graphs avoid visual ambiguity between data flow, control flow, and dependency relationships.
* Model diagrams have textual summaries for accessibility and search.
* Mathematical notation is consistent across docs.
* Terms such as tokens, embeddings, KV cache, attention heads, hidden size, and parameters are defined consistently.
* Performance claims include context, such as hardware, batch size, sequence length, precision, and measurement method.
* Limitations and failure modes are documented.
* Security, safety, and privacy considerations are documented where relevant.

## Graph and model rendering

* Uses React Flow for interactive web model and module rendering.
* Uses static vertical SVG, Mermaid, or image fallback for print/PDF graph rendering.
* Has a standard graph viewer component.
* Has a standard model viewer component.
* Has a standard recursive module graph viewer component.
* Graph viewer supports pan, zoom, fit-to-view, reset, minimap where useful, and keyboard navigation where possible.
* Graph viewer supports recursive expand and collapse for module nodes.
* Graph viewer supports expand all and collapse all.
* Expand and collapse controls are icon buttons with accessible labels.
* Models are rendered as root modules. Modules can contain submodules recursively.
* The graph layout is vertical-first on mobile and desktop.
* Graph nodes use consistent visual semantics.
* Graph edges use consistent visual semantics.
* Graphs support legends.
* Graphs support node details panels.
* Graphs support deep linking to selected nodes where useful.
* Graphs support responsive behavior.
* Graph data is separated from graph rendering.
* Graph schemas are versioned.
* Graph rendering has tests for layout, node rendering, and interaction.
* Large graphs have performance safeguards.
* Graphs provide text alternatives or summaries for accessibility.
* Graph assets declare web and print renderers. Web rendering defaults to React Flow; print rendering should prefer static vertical SVG for recursive module graphs, Mermaid for simple directional graphs, and image fallback only when needed.
* Mermaid conversion is validated for graph assets that request `printRenderer: "mermaid"`.
* Recursive module graph labels and edge labels resolve from localized message keys.
* Recursive module graph data, page structure, messages, and asset config should stay colocated when the graph is page-specific.

## README
* readme has one line description of what the project problem, is and how it solves it. 

* readme has a one line description of how to use it (website link)
* readme has a series of badges denoting the license, the license, supported languages, number of pages
* readme is in english. (in a later step we should progress forward)
* readme explains the overall structure of the project
* readme has a basic instructions on how to build the project and how to use
* readme explains the build process via the agent factory loop
* readme has acknowledgements of relevant links/files
## Components

* Uses standard shadcn/ui components where possible.
* Uses Magic UI components only when they improve communication and do not harm accessibility or performance.
* Has a standard graph viewer component.
* Has a standard model viewer component.
* Has standard page layout components.
* Has standard docs navigation components.
* Has standard callout components.
* Has standard code block components.
* Has standard math rendering components.
* Has standard table components.
* Has standard search components.
* Has standard loading, empty, error, and fallback components.
* Has standard SEO metadata helpers.
* Has standard analytics/event helpers if analytics are used.

## Content governance

* Docs have owners.
* Docs have a review process.
* Docs have a freshness or last-reviewed date.
* Outdated docs can be marked as deprecated.
* Technical claims are reviewed before publication.
* Breaking changes are reflected in docs before or during release.
* Docs include examples that are tested where practical.
* Public docs avoid undocumented internal assumptions.
* Terminology is consistent across the site.
* A style guide defines tone, formatting, terminology, and code example conventions.

## Observability and analytics

* Website errors are tracked.
* Build and deploy failures are visible.
* Core Web Vitals are monitored.
* Search queries can be analyzed to identify missing docs.
* 404s are tracked.
* Popular pages and drop-off points are tracked if analytics are enabled.
* Analytics respect privacy requirements.
* Performance regressions are detected before release where possible.

## Security and privacy

* No secrets are committed to the repository.
* Environment variables are scoped appropriately.
* Dependencies are scanned.
* External scripts are minimized and reviewed.
* Content Security Policy is considered for production.
* User analytics, if used, are privacy-conscious.
* Forms, if any, validate inputs and avoid leaking sensitive data.
* PDF export does not accidentally include private or draft-only content.

## Performance

* Static pages are pre-rendered where possible.
* Images are optimized.
* Fonts are optimized and loaded intentionally.
* JavaScript bundle size is tracked.
* Heavy interactive components, such as graph viewers, are lazy-loaded where appropriate.
* Search index size is monitored.
* Code splitting is used where useful.
* Core docs pages remain fast without requiring heavy client-side JavaScript.
* Performance budgets are enforced in CI where practical.

## Definition of done

A page or feature is not considered complete until:

* It builds successfully.
* It passes type checking.
* It passes linting and formatting.
* It has appropriate tests.
* It works on mobile, tablet, and desktop.
* It has accessible labels and keyboard behavior where relevant.
* It has loading, empty, and error states where relevant.
* It follows design tokens and layout rules.
* It has documentation or examples if reusable.
* It does not introduce broken links.
* It does not exceed performance budgets.
* It has been reviewed for technical accuracy.
