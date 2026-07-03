# Contributing documentation

This guide explains how to add or request new documentation in the Model Reference
repository. It describes only workflows that exist in the codebase today.

## What this repository is for

Model Reference is a documentation-native reference for modern AI models,
modules, concepts, papers, training methods, and related topics. Published pages
live under `src/content/docs/` and `src/content/blog/` and render through the
shared docs shell described in [site fundamentals](../site-fundamentals.md).

Docs contributions should help readers look up concepts, compare variants, and
follow links between related pages. This site is a technical explainer and
reference sheet, not a benchmark leaderboard or a paper download service.

The content model separates page structure (MDX), structured data (registry
records), and reader-facing prose (colocated message files). See
[data model](../data-model.md) for how those layers fit together.

## Before you write

Read these references before authoring or reviewing docs:

| Reference | What it covers |
| --- | --- |
| [documentation template](../documentation-template.md) | Page structure, MDX components, message keys, and asset placement |
| [writing standards](../../factory/docs/standards/docs-writing-standards.md) | Tone, isolation-first writing, symbol-only math, graph/equation expectations, and customer-facing copy rules |
| [graphing standards](../graphing-standards.md) | Single primary graph, node theme, and attention-variant comparison |
| [data model](../data-model.md) | Registry IDs, tags, aliases, citations, and storage layout |
| [site fundamentals](../site-fundamentals.md) | Product frame, visual direction, and docs shell expectations |

Production templates and starter sidecars live in `docs/templates/`. See
[Page kinds and starter artifacts](#page-kinds-and-starter-artifacts) for how to
choose a kind and which files to copy.

## Page kinds and starter artifacts

### Canonical docs pages vs blog posts

The repository has two published page families. They use different templates,
storage paths, and metadata rules.

**Canonical docs pages** live under `src/content/docs/` and render through the
shared docs shell. They are reusable reference structure:

- MDX defines component order and references only; reader-facing prose belongs
  in colocated `messages/<locale>.json` files.
- Frontmatter includes `kind`, `registryId`, `tags`, and usually `aliases`.
- Search, related links, and cards resolve through registry records under
  `src/content/registry/`.

**Blog posts** live under `src/content/blog/` and are narrative, time-specific
writing:

- MDX may contain raw prose when localization is not required.
- Frontmatter uses `authors`, `publishedAt`, and `relatedDocIds` instead of
  `registryId`.
- Posts link back to canonical docs pages rather than duplicating stable
  definitions.

See [documentation template](../documentation-template.md) for the full
component and frontmatter contract.

### Template inventory in `docs/templates/`

Each page kind has a production template and three starter sidecars. Copy the
sidecars into the published page folder; do not copy `.content.md` into
`src/content/`.

| Page kind | Production template | Starter sidecars | Published route parent |
| --- | --- | --- | --- |
| Concept | `concept.mdx` | `concept.content.md`, `concept.messages.en.json`, `concept.assets.json` | `src/content/docs/concepts/<slug>/` |
| Glossary | `glossary.mdx` | `glossary.content.md`, `glossary.messages.en.json`, `glossary.assets.json` | `src/content/docs/glossary/<slug>/` |
| Model | `model.mdx` | `model.content.md`, `model.messages.en.json`, `model.assets.json` | `src/content/docs/models/<slug>/` |
| Module | `module.mdx` | `module.content.md`, `module.messages.en.json`, `module.assets.json` | `src/content/docs/modules/<slug>/` |
| Paper | `paper.mdx` | `paper.content.md`, `paper.messages.en.json`, `paper.assets.json` | `src/content/docs/papers/<slug>/` |
| Training regime | `training-regime.mdx` | `training-regime.content.md`, `training-regime.messages.en.json`, `training-regime.assets.json` | `src/content/docs/training/<slug>/` |
| Blog post | `blog-post.mdx` | `blog-post.content.md`, `blog-post.messages.en.json`, `blog-post.assets.json` | `src/content/blog/<slug>/` |

Starter artifact roles:

| Artifact | Role |
| --- | --- |
| `<kind>.mdx` | Production page structure. Becomes `page.mdx` in the published folder. |
| `<kind>.content.md` | Authoring guide for that kind. Read while writing; never copied into `src/content/`. |
| `<kind>.messages.en.json` | Starter shape for `messages/en.json` beside the page. |
| `<kind>.assets.json` | Starter shape for colocated `assets.json` (graphs, tables, images, code schemas). |

Some kinds also ship optional `*.graph.json` examples next to the template
bundle. Use them as references when filling `assets.json`, not as files to copy
verbatim into published pages.

Glossary entries share the concept registry record shape and section structure.
They differ in frontmatter `kind: glossary`, route prefix
(`/docs/glossary/<slug>`), and glossary-specific message rules described in
`glossary.content.md`.

### Page generation for canonical bundles

For **concept**, **glossary**, **module**, **model**, **paper**, and
**training-regime** pages, the preferred direct-authoring path is the page-spec
workflow:

```sh
bun run generate:page-bundle -- --help
```

Pass a compact JSON page spec so title, optional lead copy, sections, tags, and
assets stay aligned across `page.mdx`, `messages/en.json`, `assets.json`, and
the registry record:

```sh
bun run generate:page-bundle -- --spec page-specs/page-spec-workflow-sample.json --dry-run
```

See `page-specs/` for checked-in sample inputs across the supported canonical
kinds and `bun run generate:page-bundle -- --help` for the full checked-in
contract.

**Legacy scaffold** — `scaffold:doc-page` still generates concept and glossary
bundles from CLI flags for backward compatibility. Its `--help` output points
maintainers at `generate:page-bundle` for new pages. Prefer the page-spec path
unless you are reproducing an older scaffold-only workflow.

```sh
bun run scaffold:doc-page -- --help
```

The page-spec generator is the supported common path for those canonical kinds.
Templates in `docs/templates/` remain the production structures behind the
generator and the fallback path for exceptional manual work, but contributors
should not need template copy plus multi-file hand edits in the common case.

### Review preflight before opening a page PR

After authoring or generating a canonical page bundle, run these checks before
review:

| When | Command | Why |
| --- | --- | --- |
| Page bundle and registry shape are aligned | `make validate-data` | Primary derived page-bundle validation proof for ordinary content-only pages |
| Structural proof passes and the review commit is ready | `bun run audit:canonical-page-surface` | Catch shared-surface drift before review |

#### Drop accidental `next-env.d.ts` drift before review

Root `next-env.d.ts` is a **generated Next.js/TypeScript framework declaration
file**. Next.js and TypeScript tooling rewrite it during local dev, build, or
typecheck work. For ordinary canonical page tasks—page content, registry
records, colocated messages, or page-local assets—it is **framework drift**,
not page-owned work.

Before opening review, inspect your diff and **drop accidental `next-env.d.ts`
changes** when the task did not intentionally change Next.js or TypeScript
framework contracts. Do not carry that shared root file into a routine page PR
just because local tooling touched it.

**Legitimate exception:** the work item explicitly changes Next.js or
TypeScript framework contracts (for example `tsconfig.json`, Next config, or
App Router type surfaces) and the PR explains why `next-env.d.ts` changed.

**Why this matters now:** the planner drift watchdog recently flagged a concrete
multi-lane hotspot while `useful-active=4`: both
`activation-concept-current-main-page` and `normalization-concept-page` had
dirty shared-path drift in `next-env.d.ts`. Multiple page lanes touching the
same generated root file creates avoidable merge conflicts and reviewer noise.
Keep routine page branches page-local; remove unrelated `next-env.d.ts` drift
before review.

Full contracts live in maintainer references—not duplicated here:

- [content page generation workflow relevant files](../internal/processes/content-page-generation-workflow-relevant-files.md)
- [derived page validation relevant files](../internal/processes/derived-page-validation-relevant-files.md)

See [Local validation](#local-validation) for the complete fast content loop
including `make linkcheck`.

### Page-local scope versus shared hotspot work

Ordinary canonical page branches should stay **page-local** unless the page
behavior genuinely requires shared infrastructure changes. Do not hide shared
helper edits, generated artifacts, shared tests, broad validators, or
registry-manifest churn inside a routine page slice.

When shared hotspot work is the real task—not an unavoidable narrow fix for one
page—redirect to or create a broader throughput/conflict-reduction PRD. Run
`bun run audit:canonical-page-surface` before review to classify the branch.

Full three-lane budget and hotspot categories:
[Routine canonical-page PR surface budget](#routine-canonical-page-pr-surface-budget).

#### PR-head mergeability (process executors)

When page PRD story work is otherwise complete but the current blocker is
PR-head mergeability, autonomous process executors should follow the existing
mergeability phase in
[factory/workstations/process/AGENTS.md](../../factory/workstations/process/AGENTS.md)
(rules 5.2.1–5.2.5)—not a second policy. Run
`bun run watch:active-pr-mergeability` to diagnose active lane mergeability and
attempt the smallest disciplined mergeability fix allowed by those rules before
returning continue. Command routing and planner preflight:
[content page generation workflow relevant files](../internal/processes/content-page-generation-workflow-relevant-files.md#pr-head-mergeability-for-page-branches-process-executors).

## Routine canonical page policies

Ordinary canonical page work should stay on the low-collision path defined by
these two repository policies:

1. **Derived page directory lookup** — When code or tests need a published page
   bundle path, resolve it with `getDocsPageDir(section, slug)` from
   `src/lib/content/content-paths.ts`. Do not add new page-specific
   `*_PAGE_DIR` exports or hand-maintained content-path constants for a single
   page. Shared roots and section helpers such as `getDocsRoot`,
   `getDocsSectionRoot(section)`, and `getModulesDocsRoot` remain the right
   surface for tree-wide or section-wide operations.

2. **Scanner-backed ordinary page validation** — Content-only published page
   bundles receive registry alignment, default-locale messages, route metadata,
   tags, citations, and local asset checks through derived validation inside
   `make validate-data`. Do not add a new per-page test that only re-checks
   those relationships. See [Derived published-page validation](#derived-published-page-validation)
   for valid exceptions.

Maintainer references with the full contract:

- [content page generation workflow relevant files](../internal/processes/content-page-generation-workflow-relevant-files.md)
- [derived page validation relevant files](../internal/processes/derived-page-validation-relevant-files.md)

## Ontology-first taxonomy contract

Canonical authoring for **modules**, **concepts/glossary entries**,
**training regimes**, and **systems** is moving to the ontology-backed shape:

- `primaryClassificationId`
- `secondaryClassificationIds`
- `relationships`

Use [the convergence plan](../temp/ontology-classification-topology-convergence-plan.md)
as the source design for this staged deprecation.

For this convergence slice, treat those ontology fields as the long-term
contract you should author toward. Legacy typed taxonomy fields still exist in
some compatibility paths, but they are no longer the preferred way to describe
structure for new content.

### Deprecation matrix

The table below defines the staged role of each legacy taxonomy field at
contributor touchpoints. "No longer generated" means starter templates and new
authoring guidance must not tell contributors to fill that field for fresh
pages. "Temporarily accepted with warnings" is the planned transition state for
compatibility inputs. "Compatibility-only fallback" means the field may still
exist in older records or downstream derivations, but it is not part of the
preferred authoring contract.

| Field | Record kinds | Deprecation state | Contributor guidance |
| --- | --- | --- | --- |
| `moduleType` | module | Temporarily accepted with warnings | Existing page-spec and registry flows may still read it, but new authoring should prefer classification membership and explicit relationships. |
| `conceptType` | concept, glossary, training-regime, system | Temporarily accepted with warnings | Existing page-spec and registry flows may still read it, but new authoring should prefer classification membership and explicit relationships. |
| `regimeType` | training-regime | Temporarily accepted with warnings | Existing page-spec and registry flows may still read it, but new authoring should prefer classification membership and explicit relationships. |
| `systemType` | system | Temporarily accepted with warnings | Existing page-spec and registry flows may still read it, but new authoring should prefer classification membership and explicit relationships. |
| `variantGroup` | module, training-regime, system | Compatibility-only fallback | Keep only when compatibility or derived grouping still needs it; do not use it as the primary way to express nearby variants for new pages. |
| `moduleFamily` | module | Compatibility-only fallback | Keep only when compatibility or derived grouping still needs it; do not use it as the primary way to express structure for new pages. |
| `sidebarGrouping` | concept, module, training-regime, system | No longer generated | Editorial navigation metadata only. Do not add it to new starter content unless a later workflow explicitly requires it. |

Runtime registry lookups are derived automatically from the authoritative JSON
records under `src/content/registry/`. Those registry JSON files are the
authored source of truth for the main registry runtime. Do not hand-edit or
commit `src/lib/content/generated/registry-runtime.generated.ts`; use
`bun run prepare:content-runtime` when you need to recreate it locally, and let
the normal `dev`, `build`, `typecheck`, and `test` command paths regenerate or
verify it for you.

### Choosing slug, title, aliases, tags, and registryId

These fields must stay aligned across the page folder, MDX frontmatter, message
files, and registry records. See [data model](../data-model.md) for the full
schema.

**Slug** — Kebab-case route segment and folder name (`grouped-query-attention`).
Use lowercase letters, digits, and single hyphens only. The slug does not include
the route prefix (`modules/`, `concepts/`, and so on).

**Title** — Reader-facing display name. Put the canonical title in
`messages/en.json` under `title`. Registry records point to it through
`defaultTitleKey` (usually `"title"`).

**registryId** — Stable namespaced ID that links the page to search and related
docs:

| Page kind | registryId pattern | Registry file location |
| --- | --- | --- |
| Concept | `concept.<slug>` | `src/content/registry/concepts/<slug>.json` |
| Glossary | `concept.<slug>` | `src/content/registry/concepts/<slug>.json` |
| Model | `model.<slug>` | `src/content/registry/models/<slug>.json` |
| Module | `module.<slug>` | `src/content/registry/modules/<slug>.json` |
| Paper | `paper.<slug>` | `src/content/registry/papers/<slug>.json` |
| Training regime | `training-regime.<slug>` | `src/content/registry/training-regimes/<slug>.json` |

Set the same `registryId` in `page.mdx` frontmatter and in the registry record
`id` field. Frontmatter `kind` must match the registry record `kind` (glossary
pages use `kind: glossary` in frontmatter while the registry record remains
`kind: concept`).

**Aliases** — Abbreviations, spelling variants, and common names readers might
search for (`GQA`, `grouped-query attention`). Keep frontmatter `aliases` and
the registry record `aliases` array in sync.

**Tags** — Controlled search metadata, not casual labels. Use tag **slugs** that
resolve to published records in `src/content/registry/tags/` (for example
`attention` maps to `tag.attention`). Repeat the same slugs in frontmatter and in
the registry record `tags` array.

When using `generate:page-bundle`, the checked-in page-spec validator now
accepts ontology-first inputs for module, concept, glossary, training-regime,
and system pages through `primaryClassificationId` plus optional
`secondaryClassificationIds` and `relationships`. Legacy typed taxonomy fields
such as `conceptType`, `moduleType`, `regimeType`, and `systemType` are still
accepted as temporary compatibility inputs, but they are no longer required for
those ontology-backed authoring paths. Model pages still require `family`,
`sourceType`, and `modalities`, and paper pages still require `authors`,
`publishedAt`, and `url`. Valid `conceptType` values remain `architecture`,
`math`, `training`, `inference`, `systems`, `evaluation`, and `general` when a
compatibility input is still needed. Optional spec fields (`tags`, `aliases`,
`relatedIds`, `citationIds`) seed registry and frontmatter fields in one step.
The legacy `scaffold:doc-page` CLI accepts the concept/glossary subset through
`--concept-type` and comma-separated optional flags.

## Canonical content requirements

This section covers what contributors must put in MDX, message files, registry
records, and `assets.json` so a page is structurally valid and reviewer-ready.
Blog posts follow a different contract; see [Canonical docs pages vs blog
posts](#canonical-docs-pages-vs-blog-posts).

### MDX structure and localized messages

Canonical docs pages keep **structure in MDX** and **reader-facing prose in
colocated message files**:

| Layer | Location | What belongs there |
| --- | --- | --- |
| Page structure | `page.mdx` | Frontmatter, section order, component references, `assetId` references, message key references (`<T k="..." />`) |
| Reader-facing copy | `messages/<locale>.json` | Titles, descriptions, section bodies, graph labels, captions, alt text |
| Structured metadata | `src/content/registry/` | Search facets, relationships, citations, typed fields |
| Visual and tabular data | `assets.json` | Graph, table, image, and code-schema asset definitions |

Do not paste `.content.md` authoring guidance into `page.mdx`. Do not hard-code
section headings, callout titles, comparison table values, graph node labels,
captions, or body prose in shared MDX unless the page kind explicitly allows it
(blog posts only).

Use section components with localized titles:

```mdx
<Section id="what-it-is" titleKey="sections.whatItIs.title">
  <T k="sections.whatItIs.body" />
</Section>
```

The docs shell renders the page title once. Do not add an in-body
`# <T k="title" />` heading on canonical pages.

Set `messageNamespace: local` and `assetNamespace: local` in frontmatter so the
page resolves colocated `messages/<locale>.json` and `assets.json` files.

### Writing expectations

Canonical pages must work for a first-time reader without leaning on adjacent
pages, page-meta explanation, or navigation guidance inside the narrative body.

If a page benefits from lead copy, put it in `messages/en.json` under
`openingSummary` and keep it to one concise block. Do not split the same idea
across legacy `problemStatement` and `coreIdea` keys. Do not add
`callouts.readerShortcut` to baseline templates.

Additional writing rules contributors must follow before opening a PR:

- Write for a technical layperson: short sentences, concrete nouns, active voice.
- Keep section bodies scannable; each paragraph should advance one idea.
- Keep the page body focused on the concept itself, not on why the page exists,
  how the page is structured, or which other page should be read first.
- If the concept is mathematically heavy, include the equations needed to teach
  it.
- If the concept is conceptually heavy or relationship-heavy, include the
  appropriate graph, diagram, chart, or comparison view and follow
  [graphing standards](../graphing-standards.md).
- Put symbol-only definitions under equations in the math/schema section; move
  projection, grouping, and head-count explanations into narrative sections.
- Do not put factory phases, batch numbers, or other internal process language
  in customer-facing message files.

See [writing standards](../../factory/docs/standards/docs-writing-standards.md) for the full
review checklist.

### Citations, tags, related links, and aliases

These fields power search, related-doc cards, tag browsing, and reference
sections. Keep frontmatter, registry records, and message keys aligned.

**Aliases** — Abbreviations and alternate names readers might search for (`GQA`,
`grouped-query attention`). Mirror the same values in frontmatter `aliases` and
the registry record `aliases` array.

**Tags** — Controlled topic labels, not free-form keywords. Use tag **slugs**
that resolve to published records under `src/content/registry/tags/` (for example
`attention` → `tag.attention`). Repeat the same slugs in frontmatter and in the
registry record `tags` array. Tags drive `/tags/<slug>` browsing and search
filters.

**Related IDs** — Prefer relationships the registry can derive from taxonomy,
shared tags, model usage, or paper links. Add curated `relatedIds` on the
registry record only when a high-value link cannot be derived automatically
(for example a prerequisite concept that shares no tags with the page).

**Citations** — Technical claims should point to citation registry records, not
hand-formatted source lists. Create or reuse records under
`src/content/registry/citations/` with stable IDs such as
`citation.gqa-paper`. List supporting sources in the page registry record
`citationIds` array and render them through `<CitationList />` in MDX.

Citation records should include authors, title, year, a stable canonical `url`,
and MLA text for the references section. When scaffolding, pass
`--citation-ids citation.example-paper,citation.other-source` to seed
`citationIds` on the new registry record.

Do not hand-maintain related-page lists when `DerivedRelatedDocs` or registry
relationships already produce the same result.

### Messages, assets, graphs, and tables

Put captions, alt text, graph node labels, and table values in message files.
Reference concrete media through `assets.json`, not inline MDX paths or JSON
blobs.

Example asset entry shape (from `docs/templates/concept.assets.json`):

```json
{
  "conceptMap": {
    "type": "graph",
    "graphId": "graph.example-concept-map",
    "webRenderer": "react-flow",
    "printRenderer": "mermaid",
    "altKey": "assets.conceptMap.alt",
    "captionKey": "assets.conceptMap.caption"
  }
}
```

Reference assets from MDX by `assetId`:

```mdx
<ModuleGraph registryId="module.grouped-query-attention" assetId="computeFlow" />
<ModuleComparisonTable registryId="module.grouped-query-attention" assetId="comparisonTable" />
```

Placement rules by page kind:

| Visual type | Where it belongs |
| --- | --- |
| Primary React Flow graph (module pages) | **How it works** section only — one canvas per page |
| Math / compute schema | Equations and symbol definitions only — no second React Flow canvas |
| Comparison tables | **Compared to nearby modules** or the page-kind equivalent section |
| Optional concept-map graphs | The section that teaches relationships (concept, glossary, training-regime) |
| Model architecture graphs | Architecture section when structure is the teaching goal |
| Paper contribution graphs | Method or architecture section when dependencies are the teaching goal |

Module pages render **exactly one** primary React Flow graph on the published
page. Do not place a second graph under the math/schema section. Graph node
labels, edge labels, captions, and alt text resolve from colocated messages.

See [graphing standards](../graphing-standards.md) for the readable node theme,
zoom/pan interaction rules, and attention-variant comparison pattern.

Images, charts, and code schemas follow the same split: define the asset in
`assets.json`, put display text in messages, and reference the `assetId` from
MDX or registry-backed components.

## Local validation

Verify docs changes with the same commands CI runs. Use a fast content loop
while authoring, then run the full gate before opening a pull request.

### Fast content loop

While editing page bundles, registry records, or maintainer docs under `docs/`,
run these lightweight checks often:

| Command | Equivalent Bun script | What it validates |
| --- | --- | --- |
| `make validate-data` | `bun ./scripts/validate-registry.ts` | Registry schema, frontmatter ↔ registry alignment, derived published-page bundle coverage for ordinary docs pages, message keys referenced from MDX, asset ids, graph/table references, tag and citation resolution, and colocated `messages/` + `assets.json` bundles under `src/content/docs/` |
| `bun run audit:canonical-page-surface` | `bun ./scripts/audit-canonical-page-surface.ts` | Whether one canonical-page branch still fits the routine owned-file budget or has spilled into shared hotspot surfaces that need either a visible exception or a broader throughput lane |
| `make linkcheck` | `bun ./scripts/validate-links.ts` | Internal links and `#section` anchors in published docs pages served through the Fumadocs catch-all route (`src/content/docs/**/page.mdx`) |

`make validate-data` is the primary gate for docs content work. It catches the
structural mistakes contributors make most often:

- Missing or unknown `registryId`, tags, citations, or related record ids
- Frontmatter `kind`, slug, or `aliases` out of sync with the registry record
- Missing default-locale messages, route metadata, or declared local assets on ordinary published page bundles (derived scanner-backed coverage)
- Message keys in MDX that do not exist in colocated `messages/<locale>.json`
- `assetId` references missing from `assets.json` or graph/table registry records
- Invalid or incomplete registry JSON under `src/content/registry/`

`make linkcheck` runs after content shape is stable. It verifies that links
between docs routes resolve (for example
`/docs/modules/grouped-query-attention`, `/docs/glossary/token`, and in-page
`#section` anchors). Fix broken relative links in MDX before review.

`bun run audit:canonical-page-surface` fits between the content checks and PR
review for ordinary canonical-page work. Run it after `make validate-data`
confirms the page bundle and registry shape, rerun
`bun run prepare:content-runtime` locally if you needed generated artifacts for
validation, and use the audit to confirm the review commit stays on the owned
page surface instead of carrying shared tests, generated runtime churn, or
other hotspot edits into review.

Optional during iteration:

```sh
make lint          # Biome check — same as bun run lint
make typecheck     # prepare:content-runtime + fumadocs-mdx, then tsc --noEmit
bun run prepare:content-runtime # recreate generated content runtime artifacts locally
```

`make lint` helps when you edit TypeScript, MDX components, or scripts alongside
docs content. `make typecheck` matters when your change touches typed loaders,
registry code, or MDX component props.

When a maintainer wants one repeatable content-branch proof before review,
prefer `bun run doctor:content-pr`. It is intentionally narrower than `make ci`:
the doctor flow checks tracked cleanliness for `src/content` plus
the generated runtime modules owned by `bun run prepare:content-runtime`,
reruns that canonical entrypoint, fails immediately if that generation step
leaves tracked derived-artifact drift, verifies the full generated-runtime
completeness/freshness contract, and finishes with the lightweight content
checks `validate-data` and `linkcheck`. It reports scoped tracked-path drift
and tells you to review, commit, stash, or discard those changes before
rerunning; if the supported preparation path still leaves stale deleted-route
generated state behind, it now fails with a targeted generated-source
completeness/freshness invariant instead of only surfacing generic clean-path
or linkcheck errors. It does not attempt unrelated cleanup for the rest of the
repository. The ignored
`src/lib/content/generated/published-docs-registry.generated.ts` manifest is
also regenerated by that preparation flow for browser-safe published-doc
lookups, but it stays outside the tracked clean-tree proof because the file is
derived and gitignored.

### Discovery and navigation test strategy

When a docs change affects discovery surfaces such as the sidebar, browse
indexes, tag landing pages, taxonomy pages, or search, prefer tests that track
the runtime contract instead of freezing the entire current corpus.

Use these patterns:

- **Structural invariants** for stable shape rules. Example: assert that the
  required top-level docs folders exist, that configured subgroup separators are
  present, or that a generated page tree stays aligned with the runtime-derived
  published-page set for one section.
- **Representative anchors** for reader journeys. Example: assert that one or a
  few canonical routes per behavior class appear in the sidebar, browse page,
  tag landing, or taxonomy/search flow instead of listing every page in that
  class. Prefer runtime-derived positions such as the first and last visible
  route in a section when the contract is about discovery order rather than a
  specific page slug.
- **Grouped-sidebar bounds** for separator-driven sections. Example: in grouped
  page-tree tests, assert that each runtime-derived subgroup stays contiguous
  after its separator and that the subgroup's first and last runtime-derived
  pages remain the visible anchors, rather than snapshotting every page in the
  subgroup.
- **Shared discovery-contract checks** when multiple surfaces should agree about
  the same content. Example: reuse the same representative route across
  published-doc loading, tag-group membership, and search-document assertions so
  one contract proves the surfaces stay aligned.

Avoid broad exact inventories when the product behavior under test is
discoverability. New published pages should usually land without unrelated edits
to `src/lib/source.test.ts`,
`src/lib/navigation/generated-docs-page-tree.test.ts`, tag landing tests,
browse-index tests, or search discovery tests, as long as the new page follows
existing grouping and discovery rules.

An exact manual list is still appropriate when the list itself is the intended
reader-visible contract. Examples include:

- a fixed ordered command list documented for contributors
- a small curated set of top-level navigation items where every entry is
  intentionally hand-chosen
- a deliberately limited proof set whose membership is itself the behavior under
  review

If you keep a manual list in a test, document the behavior class it protects so
future contributors can tell that it is curated on purpose rather than acting as
hidden whole-site inventory.

When you add or change discovery or navigation coverage, run the **focused
touched tests** and other **cheap validation** targets for that surface before
opening a pull request. Typical commands:

```sh
bun run pretest
bun test src/lib/source.test.ts
bun test src/lib/navigation/generated-docs-page-tree.test.ts
bun test src/lib/content/phase-1-published-resources.test.ts
bun run typecheck
make validate-data
```

Run only the files you changed when that is enough to prove the behavior under
review. Use `make ci` once before review when you need the full required GitHub
**ci** check.

If you skip broader checks such as `make ci`, `make test`, or integration
build/export gates, say so in the PR description with a **concrete reason**
(for example disk limits, unrelated failing checks on `main`, or a docs-only
change that already passed the focused discovery tests above). Do not treat
skipped broad checks as silent approval.

### Derived published-page validation

Ordinary content-only published page bundles receive standard validation from
scanner-backed **derived published-page coverage** in
`validateDerivedPublishedPageBundles`. The contract runs inside
`make validate-data` through `validateRegistryContent` and discovers published
docs pages from the same scanner source as runtime docs loading, not from a
hand-maintained page list.

For each ordinary published page, derived validation checks:

- Valid frontmatter and route metadata
- Default-locale `messages/en.json`
- Resolvable `registryId` with page-kind alignment (including supported bridges
  such as glossary → concept)
- Declared frontmatter tags, registry-backed citations, and local assets when
  present

**Do not add a new per-page test** for an ordinary page bundle that only
re-checks those relationships. Use `make validate-data` as validation evidence
instead. When you change the derived contract itself, also run
`bun test src/lib/content/validate-derived-published-page-bundles.test.ts`.

Add or keep per-page tests only when the page introduces:

- new rendering behavior or component contracts
- search, sidebar, browse, tag, or taxonomy discovery wiring
- graph/table asset registry runtime behavior
- page-generation workflow validation
- a focused regression guard that cannot be expressed as a derived bundle
  invariant

Fence retained per-page tests with a file- or describe-level comment that
states why the coverage is special rather than routine page-bundle validation.

This policy is process-focused: derived coverage does not require maintaining
broad route inventories, docs link topology inventories, or asset-bundle
internals unless those are the product behavior under test (see
[Discovery and navigation test strategy](#discovery-and-navigation-test-strategy)).

Maintainer reference:
[derived page validation relevant files](../internal/processes/derived-page-validation-relevant-files.md).

For a visual pass on a published page, start the dev server after installing
dependencies:

```sh
bun install
make dev
```

Open the page route in the browser (for example
`http://localhost:3000/docs/modules/grouped-query-attention`). Pick a free port
if `3000` is already in use: `bun run dev -- -p 3456`.

### Full quality gate before PR

GitHub Actions runs `make ci` on pull requests (see
[README.md](../../README.md#quality-gates) and
[operations.md](../operations.md)). Run the same sequence locally before you
request review:

```sh
bun install --frozen-lockfile
make ci
```

`make ci` runs, in order:

1. `make lint` — Biome check
2. `make typecheck` — `prepare:content-runtime`, then `fumadocs-mdx`, then `tsc --noEmit`
3. `make test` — `bun test`
4. `make coverage` — manifest-scoped reusable component coverage gate
5. `make test-build-contract` — production build contract plus one GitHub Pages base-path export artifact contract
6. `make test-integration` — served export, built HTML, and production-server integration tests
7. `make validate-data` — registry and content validation (same as the fast loop above)
8. `make linkcheck` — internal docs link validation

You do not need to run `fumadocs-mdx` manually. Supported command paths invoke
`prepare:content-runtime` first and then run `fumadocs-mdx` automatically when
`.source/` is required on fresh checkouts.

When you need to recreate generated content runtime artifacts locally, use
`bun run prepare:content-runtime`. It is the canonical entrypoint for shipped
localized docs, graph runtime data, the generated published-docs manifest, the
generated main registry runtime, and table registry runtime data.

The authoritative generated-runtime contract lives in
`src/lib/content/content-runtime-preparation.ts` as
`CONTENT_RUNTIME_COMPLETENESS_CONTRACT`. That one list defines each supported
runtime-preparation step, the generated output path, and whether the file is
expected to be committed or intentionally ignored in git.

When a reviewer needs one narrow generated-runtime proof, run
`make verify-content-runtime-completeness`. That target calls
`bun run verify:content-runtime-completeness`, which reruns
`bun run prepare:content-runtime`, then fails non-zero if any required runtime
module is missing or if its tracked-versus-ignored git classification no longer
matches the completeness contract.

For the main registry runtime specifically, author changes in
`src/content/registry/` and do not manually edit or commit
`src/lib/content/generated/registry-runtime.generated.ts`.

For the published docs registry manifest specifically, author changes in the
published docs pages, colocated messages/assets, and registry JSON inputs rather
than editing the generated manifest. `src/lib/content/generated/published-docs-registry.generated.ts`
is scanner-derived, regenerated by `bun run prepare:content-runtime` or
`bun run generate:published-docs-registry`, and stays out of routine commits.

For most docs-only pull requests, the **fast content loop** (`make validate-data`
and `make linkcheck`) catches registry and linking regressions early. Run
`make ci` once before opening the PR so you match the required GitHub **ci**
check.

## Routine canonical-page PR surface budget

Use one visible default contract for ordinary canonical-page pull requests: keep
the authored surface centered on one page bundle and its directly paired
structured data, and treat shared collision surfaces as an exception path rather
than the routine case.

Maintainer reference (full observable contract):
[canonical-page-surface-budget-relevant-files](../internal/processes/canonical-page-surface-budget-relevant-files.md).

### What counts as page-owned work

For one canonical page, the routine owned surface is:

- The page bundle under `src/content/docs/<group>/<slug>/`, including
  `page.mdx`, `messages/en.json`, `assets.json`, and page-local asset files.
- The matching primary structured record for that page under
  `src/content/registry/<group>/<slug>.json`.
- Page-specific supporting records that only exist to render that same page,
  such as a matching graph or table registry record when the page bundle
  declares one.

This is the narrow default reviewers should expect from ordinary page work:
authored content, colocated messages/assets, the matching registry record, and
no unrelated shared-surface churn.

### What counts as supported derived output

Supported derived outputs are artifacts recreated by maintained commands such as
`bun run prepare:content-runtime` or `make validate-data` — for example
`src/lib/content/generated/*.generated.ts`. They are expected locally but
should not appear as authored changes in a routine page review commit unless the
work item is explicitly broader than one page. When the branch diff includes
generated runtime artifacts, split them out of the routine commit or move the
work to a throughput lane.

### What counts as a shared hotspot surface

`bun run report:planner-conflict-hotspots` is the maintained evidence source for
collision-prone surfaces. Today it groups recurrent conflict areas into these
review-relevant categories:

- `generated artifact/runtime churn` such as
  `src/lib/content/generated/*.generated.ts`
- `shared test/verification` such as `src/lib/content/*.test.ts`,
  `src/tests/ci`, and `scripts/validate-*.ts`
- `shared registry/manifest` such as broad `src/content/registry/` edits beyond
  the page's own primary record
- `shared helper` such as `src/lib/content`, `src/lib/search`, `package.json`,
  and `Makefile`

**Current evidence:** in the maintained hotspot snapshot,
`src/lib/content` under shared test/verification is consistently hotter than any
single authored page bundle — often 30+ touches across many paths in a 40-commit
sample, while one page bundle under `src/content/docs/<section>/<slug>/` usually
shows only a handful of touches. Shared runtime helpers and verification files
therefore need separate handling from routine page-owned work even when the
page task feels "done" only after touching them.

### Expected budget for routine page work

Treat the budget as three lanes:

| Lane | What belongs there | Review expectation |
| --- | --- | --- |
| **Default pass** | One page bundle, its localized messages, page-local assets, the matching primary registry record, and page-specific supporting graph/table records | Normal canonical-page PR. No extra justification needed. |
| **Allowed with justification** | A small shared touch that is directly required to ship the page, such as a narrowly scoped shared helper adjustment or one additional registry/support file | Call out the reason in the PR so reviewers can see why the page could not stay fully owned. |
| **Redirect to a broader throughput lane** | Generated runtime artifacts committed as authored output, broad validator or verification churn, shared test suites, manifest/runtime rewrites, build/search/tooling changes, or multiple shared hotspot categories at once | Split the work or open/use a dedicated throughput PRD instead of hiding it inside a routine page PR. |

In practice, a routine canonical-page branch should normally avoid:

- Shared test and verification files
- Generated runtime artifacts checked in as authored changes
- Broad registry sweeps, manifest rewrites, or validator updates
- Build, search, factory, or repository tooling files unless the work item is
  explicitly broader than one page

Run `bun run audit:canonical-page-surface` before review when you need a quick
branch-local check against this budget. The command audits the current branch by
default, or you can pass an explicit file set with
`bun run audit:canonical-page-surface -- --page-dir src/content/docs/<group>/<slug> --files <path...>`.
It reads the canonical page frontmatter, classifies each changed path as
page-owned, declared generated output, or a shared hotspot surface, then
prints one recommended action:

- `keep-routine` when the branch stays inside the default owned page surface
- `split-to-page-owned-work` when the diff mainly includes generated outputs
  that should be removed from the routine review commit
- `declare-exception` when one narrow shared touch can stay in the PR with an
  explicit justification
- `redirect-to-throughput-prd` when the branch crosses broader shared hotspot
  categories or multiple shared surfaces at once

The audit fails clearly only when it cannot determine one page scope or current
hotspot evidence.

When a page truly needs cross-surface work, keep the exception visible. State
which shared category was touched, why the owned page surface was insufficient,
and whether the change still fits one narrow PR or should move into a dedicated
throughput/factory lane. Use
`bun run audit:canonical-page-surface -- --exception-reason "<why this shared touch is required>"`
for those cases. The guard still reports `over-budget`, but it echoes the
exception so you can paste the same wording into the PR conversation comment and
keep the broader touch reviewable instead of silently downgrading the warning.

### Checks that are not the default contributor path

These commands exist in the repository but are not part of `make ci` or the
standard docs contribution loop:

| Command | Status |
| --- | --- |
| `make validate-pdf` | Stub — skipped (not implemented) |
| `make verify-phase-1-ux` | Maintainer convergence tool — requires `make build`, Playwright, and a running server |
| `make verify-phase-1-*-convergence` | Batch convergence validators for factory/meta-planner review |
| `make component-examples` | Dev-only component gallery at `/component-examples` |

Do not manually inspect bundle internals, emitted route inventories, or export
artifact file lists unless a maintainer explicitly asks for that evidence in a
convergence review. The checked-in scripts (`validate-registry.ts`,
`validate-links.ts`, build verifiers inside `make build` / `make build-export`)
are the supported validation surface.

### After page generation or exceptional manual fallback

When you add a new page with `generate:page-bundle`, the legacy
`scaffold:doc-page` command, or by copying a template bundle:

1. Replace placeholder copy in `messages/en.json`.
2. Add or update registry records the page references.
3. Set `status: published` in `page.mdx` frontmatter when the page is ready for
   published checks (keep `draft` while tags or citations still point at
   unpublished targets).
4. Run `make validate-data`.
5. If the branch is meant to stay one routine canonical-page PR, run
   `bun run audit:canonical-page-surface` and keep the review commit in the
   `keep-routine` lane unless you are carrying a visible exception or moving
   the work into a broader throughput PRD.
6. Run `make linkcheck`.
7. Run `make ci` before opening the pull request.

This matches the post-scaffolding checklist in [README.md](../../README.md).

### Critical docs smoke autodiscovery

The critical-doc smoke path is metadata-driven. Contributors should treat it as
an extension of the normal published canonical page workflow, not as a set of
hand-maintained route lists.

The shared contract in `src/lib/content/critical-docs-smoke.ts` derives smoke
coverage from three supported inputs:

1. `loadShippedLocalizedDocsPages` loads the published canonical page set.
2. `resolvePublishedResourceTags` merges page frontmatter tags with registry
   tags.
3. The published-docs registry/discovery manifest remains the supported route
   inventory for those published pages.

This means a normal page addition should be picked up automatically when all of
the following are true:

- the page is a published canonical docs page that already participates in the
  shipped published-docs workflow
- its `kind`, `registryId`, and route are valid under `make validate-data`
- its merged page-plus-registry tags satisfy an existing critical smoke rule

Current examples:

- published module pages with the merged `attention` tag enter the critical
  attention smoke set automatically
- published glossary pages with the merged `token-to-probability-chain` tag
  enter the glossary smoke set automatically

Do not add a bespoke smoke entry just because a new eligible page exists. A
manual smoke update is expected only when behavior changes. Common cases are:

- adding or changing a representative search probe because the reader-facing
  discovery behavior under test changed
- changing the critical-rule definitions in
  `src/lib/content/critical-docs-smoke.ts`
- adding a new export-facing route expectation or a new smoke behavior class
  that is not covered by the existing projections

Keep the ownership boundary explicit. If a docs change is correctly discovered
by the shared contract but a built-app or GitHub Pages static-export verifier
still fails, do not broaden the docs-authoring change into unrelated verifier
repair unless you have reproduced a concrete customer-visible coverage gap that
belongs to the current work item.

## Choose your path

Contributors can land docs work in two ways.

### Add or edit a page directly

Use direct authoring when you can implement the page yourself in a pull request:

- You know the page kind and slug.
- You can fill the MDX structure, registry record, messages, assets, tags, and
  citations without generator assistance.
- The work fits an existing template or the current page-generation support
  boundary.

For canonical page bundles, start with the page-spec generator
(see [Page generation for canonical bundles](#page-generation-for-canonical-bundles)):

```sh
bun run generate:page-bundle -- --help
```

Example dry run using the committed sample spec:

```sh
bun run generate:page-bundle -- --spec page-specs/page-spec-workflow-sample.json --dry-run
```

For a new page, copy `page-specs/page-spec-workflow-sample.json`, adjust
`kind`, `slug`, `title`, `summary`, and the kind-specific required fields, then
dry-run before writing files. For module, model, paper, and training-regime
pages, this page-spec flow is the supported common path; template-copy work is
for exceptional cases only.

**Legacy scaffold** — when you need the older CLI-flag workflow, `scaffold:doc-page`
still supports concept and glossary dry runs:

```sh
bun run scaffold:doc-page -- --kind concept --slug my-concept --title "My concept" \
  --concept-type architecture --dry-run
```

Equivalent Make entry:

```sh
make scaffold ARGS='--kind glossary --slug my-term --title "My term" --concept-type general --dry-run'
```

After generating, scaffolding, or copying a template bundle, replace placeholder copy in
`messages/en.json`, add or update registry records the page references, and set
`status` in `page.mdx` frontmatter when the page is ready for published checks.
Use [Choosing slug, title, aliases, tags, and registryId](#choosing-slug-title-aliases-tags-and-registryid)
to keep metadata aligned.

Open a pull request with your page changes. Before review, run
`make validate-data` (primary derived bundle proof) and
`bun run audit:canonical-page-surface` (owned-surface budget check). See
[Review preflight before opening a page PR](#review-preflight-before-opening-a-page-pr)
and [Local validation](#local-validation) for details.

### Request factory-driven work

Use the agent factory when the change is larger than a single direct PR, needs
generated transformations, or requires coordinated batch execution across many
pages.

#### Direct authoring vs generated transformations

| Path | When to use it | What you deliver |
| --- | --- | --- |
| **Direct pull request** | One page (or a small, tightly related set) you can implement yourself with `generate:page-bundle`, or the legacy scaffold when reproducing older concept/glossary-only flows | MDX, registry records, messages, assets, and passing local checks in a PR |
| **Factory request** | Broad conversions across many pages, coordinated multi-page batches, or work that goes beyond the current checked-in generator/templates | A clear **idea** work item (or batch of ideas) that maintainers can route through the factory pipeline |

Direct authoring ends in a normal GitHub pull request you can review page by page.
Factory work ends in one or more executor pull requests produced after planning
and batch submission. Do not mix the two paths casually: if you can land the page
with `generate:page-bundle` plus `make validate-data`, prefer a direct PR. Use
the legacy scaffold only when reproducing the older concept/glossary-only flow.

Examples of factory-appropriate requests:

- Broad content conversions that touch many registry records, templates, or
  message bundles at once.
- Planned documentation batches tracked in
  [documentation site pages needed](../documentation-site-pages-needed.md).

Examples of direct-PR work:

- A single new glossary or concept page from a page spec or legacy scaffold.
- Corrections to messages, citations, tags, or assets on an existing page.
- Template-aligned edits that pass `make validate-data` and `make linkcheck`.

#### How factory batches work

The checked-in factory docs describe the real batch workflow:

| Reference | What it covers |
| --- | --- |
| [factory/docs/overview.md](../../factory/docs/overview.md) | Factory roles, workstation flow, phase control, and submission entry points |
| [factory/docs/batch-inputs.md](../../factory/docs/batch-inputs.md) | Human-readable batch ingress notes and dry-run guidance |
| [factory/docs/batch-input-example.json](../../factory/docs/batch-input-example.json) | Example `FACTORY_REQUEST_BATCH` with `idea` work items and `DEPENDS_ON` relations |

At a behavioral level, docs-related factory work starts as **`idea` work items**.
Each idea names the outcome (for example “add a module page for flash-attention”)
and carries enough payload for planners to turn it into a PRD and executor tasks.
Batches group related ideas so prerequisites run in order.

Minimal request shape contributors and maintainers should recognize:

```json
{
  "requestId": "docs-module-flash-attention-001",
  "type": "FACTORY_REQUEST_BATCH",
  "works": [
    {
      "name": "module-flash-attention-page",
      "workTypeName": "idea",
      "payload": "Add a canonical module page for flash-attention: kind module, slug flash-attention, source paper and existing attention concept links, use generate:page-bundle with a page spec and keep the emitted page bundle, registry record, messages, assets, and graph record aligned."
    }
  ]
}
```

Real batches often include 3–5 `idea` items plus a loopback `thoughts` item and
`DEPENDS_ON` relations between them. See
[factory/docs/batch-input-example.json](../../factory/docs/batch-input-example.json)
for the full pattern.

**Maintainers and meta-planners** who run the factory submit batches with the
`you` CLI after reading [factory/docs/overview.md](../../factory/docs/overview.md):

```sh
you submit batch --dry-run factory/docs/batch-input-example.json
you submit batch factory/docs/batch-input-example.json
```

Watched-folder ingress also accepts the same JSON shape at
`factory/inputs/BATCH/default/<request_id>.json`. Always dry-run before a real
submission. Phase authorization and `realSubmissionAuthorized` are controlled
separately; the overview doc explains when real batches are allowed.

**Contributors who are not running the factory** should open an issue or talk to
a maintainer instead of submitting batches directly. Provide the same behavioral
fields an `idea` payload needs:

- **Outcome** — what page or transformation you need.
- **Page kind and slug** — for example `module` / `flash-attention`.
- **Source material** — paper links, existing pages to align with, or draft
  outline.
- **Starting path** — `generate:page-bundle` for canonical bundles in the
  common case, legacy scaffold only for older concept/glossary flows, or a
  broader factory transformation.
- **Scope** — single page vs multi-page batch; whether registry or template
  changes are in scope.

Do not assume every contributor machine has `you` installed or authorized to
submit real batches.

#### What to include in a docs factory request

Whether you file an issue or a maintainer files a batch JSON file, make the
request reviewer-ready:

1. Name the **page kind** and **slug** using the rules in
   [Choosing slug, title, aliases, tags, and registryId](#choosing-slug-title-aliases-tags-and-registryid).
2. State whether **page-spec generation**, **legacy scaffold**, or a broader
   **generator-assisted** transformation applies today.
3. List **source references** (papers, upstream docs, related registry IDs).
4. Call out **tags, citations, and related IDs** you already know.
5. Say whether the work is **one page** or part of a **larger batch** listed in
   [documentation site pages needed](../documentation-site-pages-needed.md).

Factory executors will produce PRs that follow the same content model and
validation path documented in this guide. Request factory help when the
transformation itself—not just review—is more than you can land in one direct PR.

## What is not an active contributor workflow today

**Localization** — Canonical pages are designed for colocated
`messages/<locale>.json` files, but a contributor-facing localization pipeline
is **not an active contribution workflow in the current authorized phase**. Do
not open pull requests that add non-English locale bundles, request locale
rollout through the factory, or document localization steps as if they were
already implemented.

Localization work may be requested **only when a future phase explicitly
authorizes it**. Until then, treat English (`messages/en.json`) as the supported
authoring locale for new and updated canonical pages.

When localization is authorized, a request should include everything planners
need to scope the work without implying the tooling already exists:

| Field | What to specify |
| --- | --- |
| Source page | Published route or `registryId` (for example `module.grouped-query-attention`) |
| Target locales | BCP-47 locale codes to add (for example `es`, `fr`) |
| Message scope | Whether to translate the full `messages/en.json` tree or named key prefixes only |
| Asset text | Whether graph labels, captions, and alt text in `assets.json` need locale-specific message keys |
| Glossary and registry copy | Whether registry `defaultTitleKey` targets or tag display names are in scope |
| Validation expectation | That new locale files must pass the same `make validate-data` alignment checks as English |

Planners may route authorized localization as factory `idea` items. The
implementation path is phase-gated; this guide documents the request shape only.

**Unsupported generators** — Only commands and scripts checked into this
repository are valid. Do not rely on undocumented CLI flags, external scaffolds,
or localization flows that are not backed by `package.json`, the Makefile, or
checked-in scripts.

## Keeping this guide aligned

This guide is checked against the repository so documented commands and
workflows behave as described.

| Verification surface | Path |
| --- | --- |
| Contributor workflow command test | `src/tests/ci/contributor-guide-alignment.test.ts` |
| Page-spec workflow | `scripts/generate-page-bundle.ts`, `page-specs/page-spec-workflow-sample.json` |
| Legacy scaffold kinds | `src/lib/content/scaffold-doc-page.ts` (`SCAFFOLD_DOC_PAGE_KINDS`) |
| Production templates | `docs/templates/*.mdx` and starter sidecars |
| Factory batch docs | `factory/docs/overview.md`, `factory/docs/batch-inputs.md`, `factory/docs/batch-input-example.json` |

Run the workflow command test while editing this guide:

```sh
bun test src/tests/ci/contributor-guide-alignment.test.ts
```

The test dry-runs the documented `generate:page-bundle` and `scaffold:doc-page`
entrypoints and runs `make validate-data` against committed content. Run
`make validate-data` and `make linkcheck` for published page bundles;
`linkcheck` does not scan arbitrary markdown under `docs/`.

## Maintainer references

These files support factory planning and review. They are not the primary
contributor contract, but they explain how large docs efforts are prioritized:

- [content page generation workflow relevant files](../internal/processes/content-page-generation-workflow-relevant-files.md) — derived page directory lookup with `getDocsPageDir(section, slug)`
- [derived page validation relevant files](../internal/processes/derived-page-validation-relevant-files.md) — scanner-backed ordinary page validation through `make validate-data`
- [documentation site pages needed](../documentation-site-pages-needed.md)
- [architectural checklist](../architectural-checklist.md)
- [operations](../operations.md) — CI merge policy and deployment posture

For command details beyond docs work, see the root [README.md](../../README.md).
