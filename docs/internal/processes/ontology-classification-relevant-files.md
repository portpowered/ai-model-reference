# Ontology Classification Relevant Files

Use these files when changing the ontology classification namespace contract or
the temporary legacy-id bridge.

## Core contract

* `src/content/registry/classifications/*.json`
  Canonical classification records, explicit `parentClassificationId` edges,
  and any temporary `legacyIds` aliases.
* `src/lib/content/registry.ts`
  Registry loading and validation, including duplicate legacy-id protection and
  ontology-first content checks.
* `src/lib/content/registry-runtime-generation.ts`
  Generated runtime source contract for canonical lookup, legacy-id
  canonicalization, parent-child traversal, filtered subtree generation,
  branch-membership authority, deterministic ordering
  (`sortOrder -> slug -> id` for classifications; record-aware ordering for
  members), explicit empty-branch behavior, and
  `listLegacyClassificationBridges`.
* `src/lib/content/topology-navigation.ts`
  Current proving consumer for runtime-owned module-branch discovery on the
  `/browse` topology surface; this consumer should derive candidate branches
  from `buildClassificationSubtree(...)` roots rather than a hardcoded parent
  classification id.
* `src/lib/search/build-documents.ts`
  Search-term expansion that keeps canonical and legacy classification terms
  discoverable during migration.

## Remaining compatibility fallback outside the proving consumer

* `src/lib/search/build-documents.ts`
  Search still keeps legacy flat classification ids and canonical ids side by
  side for discoverability during migration; this slice does not remove that
  compatibility expansion.
* `src/lib/content/page-spec.ts`
  Page-spec generation and validation still accept legacy taxonomy fields such
  as `conceptType`, `moduleFamily`, and `variantGroup` as temporary
  compatibility inputs outside the migrated `/browse` navigation surface.

## Reviewer-facing verification

* `src/lib/content/registry-runtime.test.ts`
  Runtime assertions against the committed registry data.
* `src/lib/content/registry-runtime-generation.test.ts`
  Generation-path assertions that new classification bridge behavior survives
  runtime regeneration.
* `src/lib/content/ontology-foundation-regression.test.ts`
  Focused proving-ground regression coverage for the migrated ontology slice.
* `docs/data-model.md`
  Human-readable ontology contract, runtime ordering rules, empty-branch
  behavior, and temporary bridge rules.
