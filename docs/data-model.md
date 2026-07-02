# Data Model

## Purpose

The data model is the source of truth for models, modules, concepts, papers, training regimes, datasets, hardware, organizations, citations, tags, and graph relationships.

The website has three content layers:

1. MDX pages under `src/content/docs` and `src/content/blog` define page structure, component order, and references to registry records, message keys, and asset IDs.
2. JSON registry records under `src/content/registry` contain the structured data used by search, related links, model cards, graph viewers, filters, and validation.
3. Colocated message and asset config files next to each page provide localized text and concrete asset values.

Every important published docs page should link to a registry record through a stable `registryId`. The registry is authoritative for relationships and search facets; prose and display assets should not be scraped to infer core meaning.

## Storage Layout

```txt
src/content/
  docs/
    concepts/
      example-concept/
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
  blog/
    example-post/
      page.mdx
      messages/
        en.json
        vi.json
      assets.json
  registry/
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
src/lib/content/
  schemas.ts
  registry.ts
  messages.ts
  assets.ts
scripts/
  validate-registry.ts
```

Registry files are JSON. TypeScript defines schemas and inferred types. Validation should use Zod or an equivalent TypeScript-first schema library.

## Common Record Fields

Every registry record has these fields:

```ts
type RegistryKind =
  | "model"
  | "module"
  | "concept"
  | "paper"
  | "training-regime"
  | "system"
  | "dataset"
  | "hardware"
  | "organization"
  | "citation"
  | "tag"
  | "graph";

type RegistryStatus = "draft" | "published" | "archived";

type BaseRecord = {
  id: string;
  slug: string;
  kind: RegistryKind;
  defaultTitleKey: string;
  defaultSummaryKey: string;
  aliases: string[];
  tags: string[];
  relatedIds: string[];
  citationIds: string[];
  status: RegistryStatus;
  createdAt: string;
  updatedAt: string;
};
```

Rules:

* `id` is stable, kebab-case, and namespaced by kind, such as `model.gpt-2` or `module.grouped-query-attention`.
* `slug` is route-safe and does not include the route prefix.
* `defaultTitleKey` points to the localized title in the relevant page or registry message file.
* `defaultSummaryKey` points to the localized short summary suitable for search results and cards.
* `aliases` includes abbreviations, spelling variants, and common names, such as `GQA`, `grouped-query attention`, and `grouped query attention`.
* `tags` are controlled search metadata, not casual labels.
* `relatedIds` is an optional curated override for high-value links that cannot be derived from taxonomy, shared tags, or typed fields.
* `citationIds` points to citation records that support factual claims.

## Classification Contract

Classification records are now ontology-first and use canonical dotted ids under
the `classification.*` namespace.

Examples:

* `classification.module`
* `classification.module.attention`
* `classification.module.attention.grouped-query`
* `classification.concept.architecture.activation`
* `classification.training.alignment`
* `classification.system.routing`

Rules:

* `parentClassificationId` is the explicit hierarchy edge. Tree shape must not
  be inferred from string prefixes alone.
* Content records should prefer canonical `primaryClassificationId` and
  `secondaryClassificationIds` values over legacy typed taxonomy fields when a
  slice has migrated.
* Temporary compatibility for legacy flat ids must be expressed explicitly on
  the classification record through `legacyIds`; do not treat legacy ids as the
  canonical contract.

Temporary bridge rules:

* A legacy flat id is supported only when a canonical classification record
  declares it in `legacyIds`.
* Runtime consumers should canonicalize legacy ids through
  `resolveClassificationId(...)` and may inspect the current bridge inventory
  through `listLegacyClassificationBridges(...)`.
* New content must not introduce fresh legacy flat ids. The bridge exists only
  to keep pre-migration records searchable and resolvable while the remaining
  registry files are migrated.
* The measurable migration target is to drive `listLegacyClassificationBridges()`
  to an empty result over time rather than expanding it.

Runtime tree and subtree rules:

* Reusable classification traversal should canonicalize incoming ids through
  `resolveClassificationId(...)` before following parent-child edges.
* Classification ordering is deterministic: sort by `sortOrder` ascending when
  present, then `slug` ascending, then `id` ascending.
* Classification-member ordering is deterministic: sort by the attached
  record's `sortOrder`, then record kind, then record slug, then record id;
  if those tie, sort by membership type and then by the owning classification's
  classification-order rule.
* Tree node `children` arrays are stable and always list classification
  children before record children.
* Empty-branch behavior is explicit, not consumer-defined. The default subtree
  and tree behavior is to prune empty leaves; callers may opt into
  `include-empty-leaves` through `includeEmptyClassifications: true`.
* Subtree member placement for this migration slice is
  `owning-classification`: descendant records stay attached to their own
  classification branch instead of rolling up into parent `recordChildren`.

## Page Model

MDX pages define structure and references. Canonical docs pages should not contain raw user-visible prose. They should reference localized text through message keys and reference media, graphs, charts, code schemas, and tables through asset IDs or registry-backed components. Blog posts may contain raw MDX prose because they are narrative content. Published docs pages should include:

```yaml
---
kind: module
registryId: module.grouped-query-attention
messageNamespace: local
assetNamespace: local
tags:
  - attention
  - kv-cache
status: published
updatedAt: 2026-06-02
---
```

Frontmatter rules:

* `registryId` must resolve to an existing registry record for model, module, concept, paper, training, systems, and glossary pages when the page explains a canonical entity.
* `kind` must match the registry record kind when `registryId` is present.
* `messageNamespace: local` means localized values resolve from the colocated `messages/<locale>.json` files next to the page.
* `assetNamespace: local` means asset references resolve from the colocated `assets.json` file next to the page.
* `tags` must resolve to tag records.
* MDX pages should reference localized strings through translation components such as `T`, not hard-code user-facing body copy.
* Section headings should resolve through message keys, for example `<Section id="what-it-is" titleKey="sections.whatItIs.title">`.
* Code schemas, comparison tables, diagrams, charts, and images should resolve from `assetId` values or registry-backed components rather than inline MDX values.
* MDX pages may include structural links and components, but canonical related links should come from registry relationships.

Template authoring files live under `docs/templates`:

```txt
<kind>.mdx
<kind>.content.md
<kind>.messages.en.json
<kind>.assets.json
```

The `.mdx` file is production page structure. The `.content.md` file explains how to fill the page and should not be copied into `src/content/docs`. The `.messages.en.json` and `.assets.json` files are starter shapes for colocated page files.

The frontmatter schema is:

```ts
type PageFrontmatter = {
  kind: "concept" | "model" | "module" | "paper" | "training-regime" | "system" | "glossary";
  registryId: string;
  messageNamespace: "local" | string;
  assetNamespace: "local" | string;
  tags: string[];
  aliases: string[];
  status: RegistryStatus;
  updatedAt: string;
};
```

Blog posts have separate frontmatter:

```yaml
---
messageNamespace: local
assetNamespace: local
publishedAt: 2026-06-02
updatedAt: 2026-06-02
authors:
  - site-team
tags:
  - attention
  - kv-cache
relatedDocIds:
  - module.grouped-query-attention
status: published
---
```

## Localized Messages

Localized page values live next to the page they serve:

```txt
src/content/docs/modules/grouped-query-attention/
  page.mdx
  messages/
    en.json
    vi.json
  assets.json
```

Example message file:

```json
{
  "title": "Grouped-Query Attention",
  "description": "An attention variant that reduces KV cache memory.",
  "openingSummary": "Grouped-query attention lowers KV-cache cost by letting several query heads share fewer key-value heads.",
  "sections": {
    "whatItIs": {
      "title": "What It Is",
      "body": "Grouped-query attention is an attention variant derived from multi-head attention."
    },
    "whyItExists": {
      "title": "Why It Exists",
      "body": "GQA reduces KV-cache size, memory bandwidth, and long-context inference cost."
    }
  }
}
```

Message rules:

* The default locale message file is required for every published page.
* Message files are content values, not structure. They should not define component order, registry IDs, graph IDs, or relationship rules.
* Message keys should be stable because MDX pages and components reference them.
* Long localized body sections may use MDX-capable strings or a controlled rich-text format once the renderer supports it.
* Shared UI strings live in global common message files, but page-specific text lives next to the page.

Message files should satisfy this general shape:

```ts
type PageMessages = {
  title: string;
  description: string;
  openingSummary?: string;
  problemStatement?: string;
  coreIdea?: string;
  sections?: Record<
    string,
    {
      title: string;
      body?: string;
    }
  >;
  callouts?: Record<string, { title?: string; body: string }>;
  assets?: Record<string, { alt?: string; caption?: string }>;
};
```

## Asset References

Structured files should reference assets by ID. Concrete asset values are resolved from config files.

Colocated page asset config:

```json
{
  "hero": {
    "type": "image",
    "src": "./assets/gqa-hero.png",
    "altKey": "assets.hero.alt"
  },
  "computeFlow": {
    "type": "graph",
    "graphId": "graph.grouped-query-attention-compute-flow",
    "webRenderer": "react-flow",
    "printRenderer": "mermaid"
  },
  "mhaComparison": {
    "type": "image",
    "src": "./assets/mha-vs-gqa.png",
    "altKey": "assets.mhaComparison.alt"
  }
}
```

Asset rules:

* MDX pages and registry records reference asset IDs such as `computeFlow` or `mhaComparison`.
* `src/lib/content/assets.ts` resolves asset IDs into concrete values such as image paths, graph IDs, chart config, alt text keys, and dimensions.
* Localized asset text, such as alt text and captions, resolves through page messages using keys like `assets.hero.alt`.
* Graph records remain in the registry when they describe reusable model/module structure.
* Page-local images, charts, diagrams, code schemas, and comparison tables are declared in colocated `assets.json`.
* Validation fails when an asset ID, graph ID, chart ID, table ID, schema ID, file path, alt text key, or caption key cannot be resolved.

Asset config should satisfy this general shape:

```ts
type PageAssetConfig = Record<string, PageAsset>;

type PageAsset =
  | {
      type: "image";
      src: string;
      altKey: string;
      captionKey?: string;
      width?: number;
      height?: number;
    }
  | {
      type: "graph";
      graphId: string;
      webRenderer: "react-flow";
      printRenderer: "vertical-svg" | "mermaid" | "image";
      printFallbackAssetId?: string;
      altKey?: string;
      captionKey?: string;
    }
  | {
      type: "chart";
      chartId: string;
      altKey?: string;
      captionKey?: string;
    }
  | {
      type: "table";
      tableId: string;
      captionKey?: string;
    }
  | {
      type: "code-schema";
      schemaId: string;
      language?: string;
      captionKey?: string;
    };
```

## Tag Model

Tags are a general search mechanism and a controlled vocabulary. They power search recall, result filters, related-page suggestions, and topic browsing.

```ts
type TagRecord = BaseRecord & {
  kind: "tag";
  category:
    | "architecture"
    | "module-type"
    | "training"
    | "inference"
    | "systems"
    | "modality"
    | "paper-topic"
    | "model-family"
    | "difficulty";
  parentTagId?: string;
  searchBoost?: number;
  landingPage:
    | "search"
    | "generated-tag-page"
    | "custom-doc-page";
  customPageId?: string;
};
```

Tag rules:

* Tags are stored as registry records under `src/content/registry/tags`.
* Every tag used by MDX frontmatter or registry records must exist as a tag record.
* Tags should be lowercase kebab-case in JSON, such as `attention`, `kv-cache`, `mixture-of-experts`, and `inference-optimization`.
* Tags should include aliases when users commonly search another phrase, such as `moe` for `mixture-of-experts`.
* Tags may form a shallow hierarchy through `parentTagId`, such as `attention` -> `kv-cache`.
* Search UI filters should use tag records for labels, categories, and ordering.
* Tags are not replacements for typed fields. A module still needs `moduleType`; a model still needs `family`; tags help discovery across entity types.
* Each tag should have a browsable destination. By default this is `/tags/<slug>` or `/search?tag=<slug>`.
* Tag pages enumerate every published docs page, blog post, and registry-backed record associated with the tag.
* Tag pages should group results by kind, such as modules, concepts, models, papers, blog posts, training regimes, and systems pages.
* High-value tags such as `attention`, `kv-cache`, `mixture-of-experts`, and `inference-optimization` may have custom explainer pages, but those pages still derive result lists from registry data.

## Derived Related Documents

Related-document sections should derive peers from the shared ontology runtime before consulting legacy taxonomy strings or curated overrides.

The shared peer policy lives in `src/lib/content/ontology-peer-policy.ts` and applies to related docs, search grouping, and topology-backed browse surfaces.

Primary peer sources, in order:

* direct ontology relationships
* sibling records in the same classification branch
* records that only share the same parent classification

Relationship precedence over generic classification siblings:

* `variant`
* `part-of`
* `explains`

Policy rules:

* Legacy taxonomy fields such as `variantGroup`, `moduleFamily`, and `conceptType` remain compatibility metadata and should not be the primary peer-discovery source when ontology ancestry exists.
* Shared-parent classification peers are a fallback only after direct relationships and same-classification siblings have been considered.
* Shared tags remain a broad discovery signal and should rank below ontology relationships and classification membership.
* `relatedIds` remains a curated escape hatch for exceptions taxonomy and ontology still cannot express cleanly.
* Related UI should label why records appear using ontology-explainable reasons rather than relying on legacy bucket names as the main explanation.
* Default related-doc sections should surface reasons such as `Same classification: attention mechanisms` or `Shares parent classification: neural network components` so readers can see the ontology path instead of a legacy `variantGroup` label.

Deliberate improvement case:

* Broad legacy `conceptType` buckets such as `general` can group semantically unrelated glossary pages together. Under the ontology-first policy, records such as `concept.foundation-model` and `concept.temperature` do not become nearby peers just because they share that old taxonomy string; they need direct relationships or classification adjacency.

Compatibility inputs that may still support fallback behavior on older surfaces:

* `tags`
* `usedByModelIds`
* `introducedByPaperIds`
* `trainingRegimeIds`
* `paperIds`
* `relatedIds`

## Sidebar Grouping Metadata

Generated docs sidebar subgroup placement should be derived from canonical
ontology classification membership before using editorial overrides.

Precedence:

* First derive sidebar grouping from canonical `primaryClassificationId` and
  `secondaryClassificationIds` membership.
* Use `sidebarGrouping` only when the ontology model is still too coarse to
  place a page in the intended reader-facing subgroup.
* `sidebarGrouping` is editorial navigation metadata. It does not replace
  canonical classification membership, and validation should reject redundant
  overrides once ontology already resolves the subgroup.
* The generated `/browse` module-topology surface now derives its primary branch
  shape from published classification parent-child edges plus
  `primaryClassificationId` membership. Existing `moduleType` and
  `sidebarGrouping` metadata may still support other discovery surfaces, but
  they no longer define that topology browse tree.

Supported `sidebarGrouping` sections and values:

* Concept records may define `glossary` with `model-taxonomy`,
  `sequence-and-attention`, `math-and-training`, or
  `generation-and-diffusion`.
* Concept records may define `concepts` with `long-context`, `inference`,
  `architecture`, or `reference-samples`.
* Module records may define `modules` with `attention-foundations`,
  `attention-variants`, `feed-forward-and-activation`, `normalization`, or
  `positional-and-sequence-encoding`.
* Training-regime records may define `training` with `post-training`,
  `distillation`, or `optimization`.
* System records may define `systems` with `memory` or `routing`.

Validation must fail before build output when:

* a record uses a sidebar section that does not apply to its kind
* a sidebar subgroup value is not one of the supported ids
* malformed sidebar metadata would otherwise drift from the generated
  navigation labels

## Model Record

```ts
type ModelRecord = BaseRecord & {
  kind: "model";
  family: string;
  organizationId?: string;
  releaseDate?: string;
  sourceType: "open-weights" | "closed" | "research" | "unknown";
  modalities: Array<"text" | "image" | "audio" | "video" | "multimodal">;
  architectureIds: string[];
  moduleIds: string[];
  trainingRegimeIds: string[];
  datasetIds: string[];
  paperIds: string[];
  parameterCount?: string;
  activeParameterCount?: string;
  contextLength?: number;
  precision?: string[];
};
```

## Module Record

```ts
type ModuleRecord = BaseRecord & {
  kind: "module";
  moduleType:
    | "attention"
    | "normalization"
    | "feed-forward"
    | "activation"
    | "position-encoding"
    | "tokenizer"
    | "optimizer"
    | "quantization"
    | "inference-optimization"
    | "training-method"
    | "systems"
    | "other";
  moduleFamily?: string;
  conceptType?: string;
  variantGroup?: string;
  optimizes: string[];
  exampleModelIds: string[];
  variantOf?: string;
  improvesOnIds: string[];
  tradeoffIds: string[];
  usedByModelIds: string[];
  introducedByPaperIds: string[];
  mathLevel: "none" | "light" | "detailed";
};
```

## Concept Record

```ts
type ConceptRecord = BaseRecord & {
  kind: "concept";
  conceptType:
    | "architecture"
    | "math"
    | "training"
    | "inference"
    | "systems"
    | "evaluation"
    | "general";
  prerequisiteIds: string[];
  explainsIds: string[];
};
```

## Paper Record

```ts
type PaperRecord = BaseRecord & {
  kind: "paper";
  authors: string[];
  publishedAt: string;
  venue?: string;
  url: string;
  arxivId?: string;
  introducesIds: string[];
  supportsIds: string[];
  arguesAgainstIds: string[];
  modelIds: string[];
  moduleIds: string[];
  conceptIds: string[];
};
```

## Training, Dataset, Hardware, And Organization Records

```ts
type TrainingRegimeRecord = BaseRecord & {
  kind: "training-regime";
  regimeType: "pretraining" | "post-training" | "rl" | "distillation" | "optimization" | "alignment" | "other";
  conceptType?: string;
  variantGroup?: string;
  usedByModelIds: string[];
  relatedModuleIds: string[];
  paperIds: string[];
};

type DatasetRecord = BaseRecord & {
  kind: "dataset";
  datasetType: "text" | "image" | "audio" | "video" | "multimodal" | "synthetic" | "evaluation";
  license?: string;
  url?: string;
  usedByModelIds: string[];
};

type HardwareRecord = BaseRecord & {
  kind: "hardware";
  hardwareType: "gpu" | "tpu" | "npu" | "cpu" | "memory" | "interconnect" | "wafer-scale" | "other";
  vendorId?: string;
  relevantForIds: string[];
};

type OrganizationRecord = BaseRecord & {
  kind: "organization";
  website?: string;
  modelIds: string[];
  paperIds: string[];
};
```

## Citation Record

```ts
type CitationRecord = BaseRecord & {
  kind: "citation";
  citationType: "paper" | "blog" | "documentation" | "repository" | "dataset" | "other";
  authors: string[];
  title: string;
  year?: number;
  url: string;
  accessedAt?: string;
  mla: string;
};
```

Citation rules:

* Technical claims in published pages should point to citation records.
* Citation records should provide MLA text for page references.
* External URLs should be stable canonical sources when possible, such as arXiv, publisher pages, official docs, or project repositories.

## Graph Model

All model and module diagrams use a recursive module graph abstraction.

A model is a root module. A module may contain submodules. Submodules may contain more submodules. The renderer expands and collapses modules recursively while preserving a vertical layout on desktop, tablet, mobile, and PDF.

```ts
type GraphRecord = BaseRecord & {
  kind: "graph";
  subjectId: string;
  graphType:
    | "recursive-module-graph"
    | "model-architecture"
    | "module-compute-flow"
    | "paper-contribution"
    | "concept-map";
  rootNodeId: string;
  layout: "vertical-expandable";
  defaultExpandedDepth: number;
  supportedRenderers: Array<"react-flow" | "vertical-svg" | "mermaid" | "image">;
  nodes: ModuleGraphNode[];
  edges: ModuleGraphEdge[];
};

type ModuleGraphNode = {
  id: string;
  labelKey: string;
  summaryKey?: string;
  registryId?: string;
  relatedRegistryId?: string;
  relatedHref?: string;
  moduleKind:
    | "model"
    | "block"
    | "operation"
    | "projection"
    | "attention"
    | "normalization"
    | "feed-forward"
    | "embedding"
    | "tokenizer"
    | "cache"
    | "diffusion-step"
    | "fourier"
    | "optimizer"
    | "loss"
    | "dataset"
    | "hardware"
    | "input"
    | "output"
    | "other";
  childNodeIds: string[];
  collapsedByDefault?: boolean;
  assetIds?: string[];
};

type ModuleGraphEdge = {
  id: string;
  source: string;
  target: string;
  edgeKind:
    | "data-flow"
    | "control-flow"
    | "depends-on"
    | "residual"
    | "conditioning"
    | "cache-read"
    | "cache-write"
    | "parameter-sharing"
    | "loss-signal"
    | "contains";
  labelKey?: string;
};
```

Graph renderer rules:

* Graph records should live close to the page or registry record they support when practical. Page-local graph asset references live in `assets.json`; reusable graph records live in `src/content/registry/graphs`.
* Node and edge labels use message keys. The renderer resolves labels from the same locale messages as the page.
* Runtime node rendering should resolve an explicit semantic node family before choosing a React Flow component. V1 families are canonical registry references, structural scaffolding, annotations, operators, architecture blocks, and a default fallback family for older or less specific nodes.
* Canonical interactive nodes should derive popup titles from the graph label when it is meaningful, but fall back to the canonical record title when the visual graph label is intentionally blank for container-style nodes.
* A node without a published canonical docs page may still open a graph-local popup when `summaryKey` resolves. That popup must clearly identify itself as graph-local rather than canonical.
* Graph authors may attach an optional outbound destination for graph-local popups through `relatedRegistryId` when the destination is another published canonical docs page, or `relatedHref` for an explicit docs destination when no registry-backed route is appropriate.
* Registry validation should fail when a node `registryId` points at a missing record, when `relatedRegistryId` does not resolve to a published docs page, or when a graph-local outbound destination is configured without a local `summaryKey`.
* The fallback node must preserve label-first rendering for older graphs that only provide the minimum current schema fields. When graph-local summary content exists, the fallback may surface a summary affordance and, in the interactive runtime, open the same graph-local popup without requiring a schema rewrite.
* Runtime edge rendering should resolve an explicit semantic edge family before choosing React Flow path behavior. V1 families are `data-flow`, `contains`, `residual`, `cache-read`, `cache-write`, `parameter-sharing`, `depends-on`, and a default fallback family for older but still supported relationship kinds such as `control-flow`, `conditioning`, and `loss-signal`.
* Interactive dependency-style edges should carry resolved relationship text and the source or target docs destinations in runtime edge metadata so the UI does not need client-only fetching to populate the popup.
* The fallback edge must keep older graphs rendering by using the default path treatment for supported but not-yet-specialized edge kinds instead of failing closed.
* Registry validation should also fail when `rootNodeId`, `childNodeIds`, or edge `source` and `target` values do not resolve to nodes inside the same graph record.
* Web graph rendering uses React Flow as the interaction engine.
* React Flow is not the visual design system. Visual consistency comes from semantic `moduleKind` node styles, semantic `edgeKind` edge styles, and the vertical expandable layout.
* When a React Flow node becomes directly clickable, its hidden handles and the clickable node wrapper must not capture or lose pointer events in a way that blocks popup activation.
* Interactive edges should keep a larger invisible button or hit target than the visible path so keyboard and touch activation stay practical without adding visible inline labels to the edge itself.
* Users can expand and collapse nodes recursively.
* Every expandable node should expose icon buttons for expand and collapse. Use accessible icon buttons with labels such as "Expand module" and "Collapse module".
* Layout is always vertical-first. Expanded modules flow top-to-bottom on mobile and desktop.
* The graph viewer should support expand all, collapse all, fit view, reset view, selected node details, and keyboard-accessible controls where practical.
* PDF graph rendering must not rely on screenshots.
* PDF graph rendering should use the static vertical SVG renderer for recursive module graphs, Mermaid for simple directional graphs, and image fallback only when SVG or Mermaid cannot represent the diagram well.
* A graph asset with `printRenderer: "mermaid"` must be convertible to valid Mermaid syntax.
* A graph asset with `printRenderer: "image"` must provide `printFallbackAssetId`, alt text, and caption text when useful.

## PDF Export Model

PDF export uses resolved localized page models, not raw MDX.

Curated PDF bundles live under:

```txt
src/content/pdf-sets/
  attention.json
  core-transformers.json
```

PDF set records should satisfy:

```ts
type PdfSetRecord = {
  id: string;
  slug: string;
  titleKey: string;
  descriptionKey: string;
  status: "draft" | "published" | "archived";
  locales: "all" | string[];
  pages: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
```

PDF export rules:

* `make pdf LOCALE=en` generates PDF artifacts for the requested locale.
* `make pdf-page LOCALE=en PAGE=docs/modules/grouped-query-attention` generates one page PDF.
* `make pdf-set LOCALE=en SET=attention` generates one curated PDF bundle.
* PDFs are generated from print-safe routes using Chromium's print-to-PDF engine through Playwright.
* PDF generation must call `page.pdf()`, not screenshot pages and wrap the screenshots in a PDF.
* PDF output should be written under `dist/pdf/<locale>/`.
* Print routes must use resolved messages, resolved asset config, registry records, and print-safe graph renderers.
* Print output should preserve normal document text as selectable/searchable PDF text where browser PDF output supports it.
* Draft and private content must not be included in published PDF output.

## Search Index Contract

The search index is derived from MDX pages plus registry records. A normalized search document should include:

```ts
type SearchDocument = {
  id: string;
  registryId?: string;
  url: string;
  kind: string;
  title: string;
  description: string;
  bodyText: string;
  headings: string[];
  aliases: string[];
  tags: string[];
  relatedIds: string[];
  facets: {
    kind: string;
    tags: string[];
    modelFamily?: string;
    moduleType?: string;
    optimizes?: string[];
    trainingRegimeIds?: string[];
    modalities?: string[];
    sourceType?: string;
    primaryClassificationId?: string;
    primaryClassificationSlug?: string;
    classificationIds?: string[];
    classificationSlugs?: string[];
    ancestorClassificationIds?: string[];
    ancestorClassificationSlugs?: string[];
    rootClassificationIds?: string[];
    rootClassificationSlugs?: string[];
    relatedTopologyIds?: string[];
    relationshipTypes?: string[];
    legacyModuleFamily?: string;
    legacyConceptType?: string;
    legacyVariantGroup?: string;
  };
  topology: {
    primaryClassificationId?: string;
    secondaryClassificationIds: string[];
    classificationIds?: string[];
    ancestorClassificationIds?: string[];
    rootClassificationIds?: string[];
    relatedTopologyIds?: string[];
  };
};
```

Search rules:

* Full-text search indexes title, description, headings, body text, aliases, and tag aliases.
* Facets come from registry fields and tag records, not from prose scraping.
* Ontology-backed pages should publish classification ancestry and related topology ids as the primary facet contract for grouping, filtering, and reranking.
* Search scope should resolve from the same topology payload rather than a
  separate taxonomy table, including ancestor and root classifications when no
  page uses the requested scope as its immediate primary classification.
* Search ranking should treat ontology relationships such as `variant`,
  `part-of`, and `explains` as stronger than generic sibling proximity whenever
  the shared peer policy marks them as outranking classification siblings.
* Tags are always indexed as both searchable text and filterable facets.
* Legacy taxonomy strings such as `moduleFamily`, `conceptType`, and `variantGroup` should only survive as explicit `legacy*` compatibility fields when ontology ancestry already exists.
* Relationship fields such as `relatedIds`, `moduleIds`, and `paperIds` are indexed for result enrichment and optional filtering, but the registry remains the source of truth.
* Orama handles retrieval. The registry handles canonical relationships, graph traversal, and related-link generation.

## Validation Rules

`scripts/validate-registry.ts` should fail when:

* A JSON record does not match its TypeScript/Zod schema.
* A file path does not match its `kind` and `id`.
* Two records share the same `id` or conflicting `slug`.
* A relationship ID does not resolve to an existing record.
* A tag reference does not resolve to a tag record.
* A published canonical MDX page has no `registryId`.
* A published canonical MDX page has no default-locale message file.
* A shared MDX page references a message key that does not exist in the default locale.
* A shared MDX page references an asset ID that does not exist in colocated `assets.json`.
* A canonical docs MDX page contains raw user-visible prose outside approved structural wrappers, message components, or registry-backed components.
* An asset config references a missing file, graph ID, chart ID, table ID, schema ID, alt text key, or caption key.
* A graph asset has no web renderer or no print renderer.
* A graph selected for Mermaid PDF rendering cannot be converted to Mermaid syntax.
* An image print fallback is missing alt text.
* A PDF set references a missing page, draft-only page, missing locale, or unresolved message key.
* A published registry record has no matching MDX page unless it is marked data-only.
* A graph node `registryId` does not resolve.
* A published technical record has no citation where citations are required.
* A record uses an alias or tag spelling that conflicts with an existing canonical tag or entity.

The root `make ci` command should include registry validation once the application scaffold exists.
