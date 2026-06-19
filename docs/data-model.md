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

Related-document sections should be derived from taxonomy, tags, and typed fields before using manual overrides.

For example, Multi-Head Attention, Grouped Query Attention, Multi-Query Attention, and Multi-Head Latent Attention can be grouped because they share `moduleType: "attention"` and a `variantGroup`, not because every page manually lists every other page.

Derived related-document inputs:

* `moduleType`
* `moduleFamily`
* `conceptType`
* `variantGroup`
* `tags`
* `usedByModelIds`
* `introducedByPaperIds`
* `trainingRegimeIds`
* `paperIds`
* `relatedIds`

Derived related-document rules:

* `variantGroup` is the strongest module-to-module grouping signal.
* `conceptType` groups records that explain the same underlying idea across modules, training regimes, and systems pages.
* `moduleFamily` groups broader families such as attention, normalization, feed-forward, tokenization, quantization, and inference optimization.
* Shared tags are broad discovery signals and should be ranked lower than exact typed fields.
* `relatedIds` is kept only for curated exceptions that taxonomy cannot express, such as a paper that argues against a method or a prerequisite concept that does not share tags.
* Related UI should label why records appear, such as same variant group, same concept type, shared tag, used by same model, introduced by same paper, or curated related link.
* A module page should show nearby variants by deriving records with the same `variantGroup`.
* A tag page should show all resources for a tag, grouped by kind.

## Sidebar Grouping Metadata

Generated docs sidebar subgroup placement should be derived from typed taxonomy
fields before using editorial overrides.

Precedence:

* First derive sidebar grouping from existing typed fields such as
  `conceptType`, `moduleType`, `variantGroup`, `regimeType`, and `systemType`.
* Use `sidebarGrouping` only when those typed fields are not enough to place a
  page in the intended reader-facing subgroup.
* `sidebarGrouping` is editorial navigation metadata. It does not replace
  taxonomy fields such as `moduleType`, `conceptType`, `variantGroup`,
  `regimeType`, or `systemType`.

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
  governance?: {
    mode: "shared-v1";
    family: {
      id: string;
      version?: string;
    };
    posture: {
      kind: "baseline" | "variant";
      baselineGraphId?: string;
      comparisonGraphId?: string;
    };
    narrativeCenter: {
      kind: "node" | "edge" | "region" | "contrast";
      targetId: string;
    };
    framing: {
      direction: "top-to-bottom" | "left-to-right" | "radial" | "freeform";
      isDefaultDirection: boolean;
    };
    title: {
      requirement: "required" | "optional" | "not-applicable";
    };
    legend: {
      requirement: "required" | "optional" | "not-applicable";
    };
    familyExtension?: Record<string, unknown>;
  };
  nodes: ModuleGraphNode[];
  edges: ModuleGraphEdge[];
};

type ModuleGraphNode = {
  id: string;
  labelKey: string;
  summaryKey?: string;
  registryId?: string;
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

* Legacy graph records can omit `governance` until a family-specific migration opts them into the shared governance contract.
* Governed graph records separate cross-family policy from family-owned metadata. Shared posture, framing, narrative-center, title, and legend fields live under `governance`; family-specific fields belong under `governance.familyExtension`.
* Graph records should live close to the page or registry record they support when practical. Page-local graph asset references live in `assets.json`; reusable graph records live in `src/content/registry/graphs`.
* Node and edge labels use message keys. The renderer resolves labels from the same locale messages as the page.
* Web graph rendering uses React Flow as the interaction engine.
* React Flow is not the visual design system. Visual consistency comes from semantic `moduleKind` node styles, semantic `edgeKind` edge styles, and the vertical expandable layout.
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
    moduleFamily?: string;
    conceptType?: string;
    variantGroup?: string;
    optimizes?: string[];
    trainingRegimeIds?: string[];
    modalities?: string[];
    sourceType?: string;
  };
};
```

Search rules:

* Full-text search indexes title, description, headings, body text, aliases, and tag aliases.
* Facets come from registry fields and tag records, not from prose scraping.
* Tags are always indexed as both searchable text and filterable facets.
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
