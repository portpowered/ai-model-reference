# Content page generation workflow — scaffolding inventory and boundaries

This document inventories the existing content-generation surfaces the page-spec workflow owns, records current scaffold limitations, and defines workflow boundaries so generation improves the established path instead of introducing a parallel system.

## Generation surfaces the workflow owns

| Surface | Path | Role |
| --- | --- | --- |
| Production templates | `docs/templates/<kind>.mdx`, `<kind>.messages.en.json`, `<kind>.assets.json`, `<kind>.content.md` | Canonical page structure, default message keys, and asset IDs for each supported docs kind. `.content.md` is maintainer guidance only; generators read `.mdx` and sidecars. |
| Published page bundles | `src/content/docs/**/<slug>/page.mdx` | Structural MDX with frontmatter, message keys, and asset component references. |
| Colocated messages | `src/content/docs/**/<slug>/messages/en.json` | Reader-facing title, description, folded `openingSummary`, section copy, callouts, and asset alt/caption text. |
| Colocated assets | `src/content/docs/**/<slug>/assets.json` | Page-local graph, table, chart, image, and code-schema references keyed by asset id. |
| Registry records | `src/content/registry/{concepts,modules,models,papers,training-regimes,graphs,tables}/` | Search, tags, citations, relationships, and graph/table metadata consumed by loaders and search. |
| Legacy scaffold CLI | `scripts/scaffold-doc-page.ts` | Thin entrypoint for concept and glossary scaffolding. |
| Legacy scaffold library | `src/lib/content/scaffold-doc-page.ts` | Template substitution, registry record creation, and dry-run planning for the legacy scaffold. |
| Registry validation CLI | `scripts/validate-registry.ts` | Pre-build registry and bundle alignment gate (`make validate-data`). |
| Registry validation library | `src/lib/content/validate-registry.ts` | Schema checks, relationship resolution, message-key and asset-id validation across committed content. |
| Page-spec workflow CLI | `scripts/generate-page-bundle.ts` | Preferred entrypoint: `bun run generate:page-bundle --spec <page-spec.json>`. |
| Page-spec workflow library | `src/lib/content/generate-page-bundle.ts` | Validates page specs, builds bundles in memory, enforces canonical MDX prose rules, and writes files. |
| Page-spec contract | `src/lib/content/page-spec.ts` | Zod schemas, `PAGE_SPEC_KINDS`, registry/frontmatter derivation, and pre-write validation. |
| Generated bundle validation | `src/lib/content/validate-generated-page-bundle.ts` | Proves generated output loads through standard message/asset loaders and registry validation. |
| Canonical MDX prose validation | `src/lib/content/validate-canonical-mdx-prose.ts` | Rejects hard-coded reader-facing prose in canonical docs MDX (blog posts excluded). |

Docs parents by page kind:

- `concept` → `src/content/docs/concepts/<slug>/`
- `glossary` → `src/content/docs/glossary/<slug>/` (registry kind remains `concept`)
- `module` → `src/content/docs/modules/<slug>/`
- `model` → `src/content/docs/models/<slug>/`
- `paper` → `src/content/docs/papers/<slug>/`
- `training-regime` → `src/content/docs/training/<slug>/`

## Current scaffold limitations

The legacy `scaffold:doc-page` path (`SCAFFOLD_DOC_PAGE_KINDS` in `scaffold-doc-page.ts`) has three constraints the page-spec workflow addresses:

1. **Kind coverage** — Scaffold supports only `concept` and `glossary`. Templates already exist for `module`, `model`, `paper`, and `training-regime`, but the legacy CLI cannot emit those bundles.
2. **Many required CLI flags** — Maintainers must pass `--kind`, `--slug`, `--title`, `--concept-type`, and optional comma-separated `--tags`, `--related-ids`, `--citation-ids`, and `--aliases` on the command line instead of one declarative input file.
3. **No compact page-spec input** — Section bodies, folded summaries, callouts, and asset message copy are not part of the legacy scaffold contract; maintainers edit generated message files by hand after scaffolding.

`formatScaffoldUsage()` now points maintainers at `generate:page-bundle` for new concept and glossary pages. The legacy scaffold remains for backward compatibility.

## Supported page kinds (page-spec workflow)

`PAGE_SPEC_KINDS` in `src/lib/content/page-spec.ts` defines the supported workflow kinds, reusing the existing template inventory:

- `concept`
- `glossary`
- `module`
- `model`
- `paper`
- `training-regime`

`blog-post` templates under `docs/templates/blog-post.*` are intentionally excluded; blog posts follow a separate authoring path.

## Workflow boundary

**Content tooling (generation and validation)** — Owns page-spec parsing, template substitution, file writes, dry-run planning, canonical MDX prose checks, and generated-bundle alignment tests. Modules: `page-spec.ts`, `generate-page-bundle.ts`, `generate-page-bundle-cli.ts`, `validate-generated-page-bundle.ts`, `validate-canonical-mdx-prose.ts`, plus the `scripts/generate-page-bundle.ts` and `scripts/validate-registry.ts` entrypoints.

**Existing runtime (loading, rendering, search)** — Unchanged. Generated bundles must load through:

- `loadPageMessages` / `loadPageAssets` (`page-messages-load.ts`, `page-assets-load.ts`)
- `loadRegistry` and registry-backed search (`registry.ts`, Orama index builders)
- Fumadocs docs routing and MDX components (`src/app/docs/**`, shared page components)

The generator does not add special runtime loaders or bypass registry validation. Proving alignment is the responsibility of `validateGeneratedPageBundle` and integration tests such as `page-spec-workflow-sample.test.ts`.

## Maintainer entrypoints

```bash
# Preferred: one page-spec file → full canonical bundle
bun run generate:page-bundle --spec page-specs/my-page.json

# Dry-run (no writes)
bun run generate:page-bundle --spec page-specs/my-page.json --dry-run

# Legacy concept/glossary scaffold (backward compatible)
bun run scaffold:doc-page --kind concept --slug my-slug --title "My Title" --concept-type architecture

# Registry validation (also run via make validate-data)
bun ./scripts/validate-registry.ts
```
