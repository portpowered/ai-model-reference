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
  canonicalization, parent-child traversal, and `listLegacyClassificationBridges`.
* `src/lib/search/build-documents.ts`
  Search facet assembly, including ontology-first topology promotion into the
  indexed document contract.
* `src/lib/search/legacy-taxonomy-compat.ts`
  Explicit compatibility adapter for search surfaces that still emit legacy
  typed-taxonomy facets while downstream filters migrate.

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
  ownership, compatibility status, and the targeted deprecation fence across
  runtime, generation, and authoring surfaces.
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
* `docs/data-model.md`
  Human-readable ontology contract and temporary bridge rules.
