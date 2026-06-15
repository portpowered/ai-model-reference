# Phase 2/3 discovery reconciliation — relevant files and verification

This document records the surfaces, gates, and patterns used to reconcile published Phase 2 and Phase 3 pages with shared navigation, browse indexes, tag landings, and search.

## Discovery surfaces the reconciliation owns

| Surface | Path / entry | Role |
| --- | --- | --- |
| Published page loader | `src/lib/content/pages.ts` (`loadPublishedDocsPages`) | Resolves every published docs URL from registry + Fumadocs source. |
| Tag resource groups | `src/lib/content/tag-resources.ts` (`loadTagResourceGroups`) | Groups tagged resources by page kind for `/tags/[slug]` landings. |
| Architecture browse index | `src/lib/content/architecture.ts` (`loadPublishedArchitectureEntries`) | Lists architecture-family glossary and concept pages on `/docs/architecture`. |
| Curated related docs | `src/lib/content/related-docs.ts` (`deriveCuratedRelatedItems`) | Architecture-forward links from `concept.architecture` to model-family pages. |
| Search document builder | `src/lib/search/build-documents.ts` (`buildSearchDocuments`) | Emits Orama documents with `kind` facets (`glossary`, `concept`, `module`). |
| Search result meta | `src/lib/search/search-result-meta.ts` | Maps canonical page URLs to localized kind labels shown in search UI. |
| Published docs registry ids | `src/lib/content/published-docs-registry-ids.ts` | Allowlist of registry ids with routable MDX bundles. |

## Batch 017 page inventory

The convergence gate in `src/lib/content/phase-2-3-reconciliation-convergence.ts` defines `BATCH_017_DOCS_URLS`: the glossary, concept, and module pages that must appear in source discovery, search documents, tag landings, and browse indexes.

Attention modules expected on `/tags/attention` are listed in `EXPECTED_ATTENTION_MODULE_URLS` (eight module pages including GQA, MHA, MQA, MLA, sparse, sliding-window, linear, and the attention overview module).

Model-family architecture-forward targets:

- Registry ids: `concept.transformer`, `concept.diffusion-model`, `concept.multimodal-model`, `concept.world-model`
- Glossary URLs: `/docs/glossary/transformer`, `/docs/glossary/diffusion-model`, `/docs/glossary/multimodal-model`, `/docs/glossary/world-model`

## Verification entry points

| Command | Purpose |
| --- | --- |
| `make verify-phase-2-3-reconciliation-convergence` | Six-domain gate: registry validation, source discovery, attention tag grouping, architecture-forward links, search document kind facets, representative search queries. |
| `bun test src/lib/content/phase-2-3-reconciliation` | Focused unit/integration tests for all reconciliation domains. |
| `make validate-data` | Registry validation CLI used by the convergence pass. |

Representative search queries validated by the gate: `transformer`, `diffusion model`, `MHA`, `MQA`, `sparse attention`, `RoPE`, `context window`. Each must rank the canonical page first with the correct kind metadata.

## Phase 1 dependency boundary

Reconciliation does **not** depend on open Phase 1 static-export search repair work. Residual Phase 1 **built-app** convergence failures are owned separately — see `docs/phase-2-3-reconciliation-implementation-notes.md` and `src/lib/content/phase-2-3-reconciliation-phase-1-dependency.ts` for owned path prefixes that reconciliation must not edit.

## Patterns for future content slices

- After publishing new pages, add URLs to `BATCH_017_DOCS_URLS` (or a successor constant) and extend the convergence gate expectations rather than adding one-off ad hoc checks.
- Tag landings group resources by `kind`; ensure registry records carry the correct `kind` and `tags` so `/tags/[slug]` surfaces new pages automatically.
- Search kind labels flow from registry → `buildSearchDocuments` → `loadSearchResultMetaMap` → `SearchResultMetaDetails`; verify representative queries when adding a new content family.
- Architecture-forward navigation uses `deriveCuratedRelatedItems` on `concept.architecture`; new model-family pages need published registry records and entries in `PUBLISHED_DOCS_REGISTRY_IDS`.
