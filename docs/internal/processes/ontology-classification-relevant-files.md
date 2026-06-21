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
  classification id, and localized browse labels must cover every
  runtime-discovered branch that can ship on `/vi/browse`, `/ja/browse`, and
  other locale-prefixed surfaces.
* `src/lib/search/build-documents.ts`
  Search-term expansion that keeps canonical and legacy classification terms
  discoverable during migration.
* `src/lib/content/ontology-classification-selectors.ts`
  Shared canonical-plus-compatibility selector contract for customer-visible
  ontology consumers. Use this when topology and timeline must accept the same
  supported selector set across static preload and client hydration.
* `src/lib/content/topology-selector-compatibility.ts`
  Topology-specific temporary selector fence. Keep any remaining shorthand or
  legacy topology-only aliases here instead of expanding the generic
  ontology-selector helper.
* `src/features/topology/topology-data.ts`
  Selector-to-classification resolution and graph assembly for the customer-
  visible topology surface. Canonical ids/slugs should resolve before any
  temporary compatibility branch, and accepted legacy ids or shorthand
  selectors should stay on one explicit temporary path instead of piggybacking
  on generic runtime lookup.
* `src/lib/content/ontology-timeline.ts`
  Timeline classification resolution and item assembly. Keep selector matching
  aligned with the shared ontology selector contract instead of ad hoc fuzzy
  matching so canonical ids and explicit compatibility selectors behave the
  same on server and client.
* `src/lib/content/topology-navigation.ts`
  Registry-driven browse navigation options that expose classification slugs to
  the topology and timeline entry points.
* `src/lib/search/legacy-taxonomy-compat.ts`
  Explicit compatibility adapter for search surfaces that still emit legacy
  typed-taxonomy facets while downstream filters migrate.
* `src/features/docs/timeline/OntologyTimelinePage.tsx`
  Timeline static preload registration. Any selector the timeline route accepts
  must be preloaded here as well or the client route will drift from the
  server-resolved contract.

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
* `src/lib/governance/typed-taxonomy-consumer-audit.ts`
  Machine-checkable contract for remaining typed-taxonomy consumer clusters,
  ownership, compatibility status, the recommended next migration target, and
  the targeted deprecation fence across runtime, generation, and authoring
  surfaces.
* `src/lib/governance/typed-taxonomy-consumer-audit.test.ts`
  Regression coverage for grouped audit summaries and contract-drift detection.
* `src/lib/governance/typed-taxonomy-consumer-fence.test.ts`
  Regression coverage proving that new uncategorized or undeclared typed-taxonomy
  usage fails in the targeted surfaces.
* `src/tests/ci/typed-taxonomy-consumer-audit-command.test.ts`
  CLI-level proof that maintainers can render the current audit summary from the
  repository root.
* `src/tests/ci/typed-taxonomy-consumer-fence-command.test.ts`
  CLI-level proof that the targeted deprecation fence stays green for the
  committed compatibility contract.
* `scripts/audit-typed-taxonomy-consumers.ts`
  Maintainer entrypoint for printing the typed-taxonomy consumer inventory.
* `scripts/verify-typed-taxonomy-consumer-fence.ts`
  Maintainer and CI entrypoint that fails when new targeted typed-taxonomy
  usage lands outside the approved audit contract.
* `src/features/topology/topology-data.test.ts`
  Topology-surface assertions for canonical selection, invalid-selector
  recovery, and membership/relationship graph output.
* `src/lib/content/ontology-timeline.test.ts`
  Canonical-versus-compatibility selector assertions for the timeline data
  layer.
* `src/features/docs/timeline/OntologyTimelinePage.test.tsx`
  Static preload coverage proving accepted selector forms survive the
  server-to-client handoff.
* `src/features/docs/timeline/OntologyTimelineClientPage.test.tsx`
  Hydration coverage for canonical ids, legacy ids, and invalid timeline
  selectors read from the browser URL.
* `docs/data-model.md`
  Human-readable ontology contract, runtime ordering rules, empty-branch
  behavior, and temporary bridge rules.
