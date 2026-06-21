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
* `src/lib/content/sidebar-grouping.ts`
  Docs-shell sidebar subgroup resolver. Module, training, and system subgroup
  placement should derive from canonical classification membership first, with
  any remaining customer-visible exceptions fenced behind explicit
  `sidebarGrouping` editorial overrides instead of scattered typed-taxonomy
  reads. Backfill those override entries onto the specific registry records
  that still need manual placement before removing a legacy typed branch. For
  concept/glossary slices,
  migrate the currently grouped published records onto canonical concept
  classifications first, then keep any still-curated families on one named
  editorial fallback helper instead of reintroducing `conceptType` branching.
  For modules, only use the editorial bridge when the canonical classification
  is still too coarse to distinguish the intended subgroup, such as the
  `module.attention` foundation page whose current ontology membership alone
  cannot separate `attention-foundations` from `attention-variants`. Validation
  should reject redundant or ignored `sidebarGrouping` entries once ontology
  already resolves the same subgroup.
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
* `src/features/topology/topology-query.ts`
  Outbound topology URL contract for the graph surface. Keep entry-time
  compatibility support separate from emitted selector URLs so chip toggles,
  clear actions, and other steady-state topology links normalize back to the
  canonical runtime-backed selector set.
* `src/features/topology/TopologyPrototype.tsx`
  Customer-visible topology chip interactions and recovery actions. When
  selector semantics change, verify both the graph-state resolver and the
  emitted URL updates here so compatibility aliases do not leak back into the
  steady-state browser URL.
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
* `src/lib/content/timeline-selector-compatibility.ts`
  Timeline-specific temporary selector fence. Keep any still-supported legacy
  timeline ids or shorthand selectors here so canonical timeline resolution can
  stay separate from explicit compatibility handling. When timeline query or
  preload code needs to turn an accepted selector back into the steady-state
  browser output, route that through this helper too so customer-path files do
  not hardcode legacy aliases outside the named fence.
* `src/features/docs/timeline/timeline-query.ts`
  Timeline-specific selector parsing and outbound URL normalization. Keep the
  accepted selector set and the emitted steady-state selector URLs separate
  here so legacy or shorthand entry compatibility does not leak back into
  canonical chip and recovery links. Timeline defaults should resolve from the
  canonical activation classification id first rather than depending on the
  incidental ordering of runtime navigation options.
* `src/features/docs/timeline/timeline-query.test.ts`
  Focused proof that timeline query normalization keeps accepted compatibility
  selectors on the input side while chip and recovery href builders emit only
  canonical outbound selectors and preserve unknown-selector empty states.

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

* `page-specs/*.json`
  Committed ontology-first starter specs should prefer canonical
  `primaryClassificationId` values; leave legacy ids only in explicitly named
  compatibility fixtures.
* `src/lib/content/generate-page-bundle.test.ts`
  When validating generated canonical bundles in a temporary fixture root, seed
  the required canonical classification parents into that fixture first so the
  generated-bundle validator proves the ontology-first path instead of failing
  on missing local registry context.
* `src/lib/content/generate-page-bundle-cli.test.ts`
  Keep the default CLI fixture root canonical-only for success-path bundle
  generation. If a test needs legacy ids or deprecated taxonomy fields, put
  that setup in an explicitly named compatibility helper or test.
* `src/lib/content/registry-runtime.test.ts`
  Runtime assertions against the committed registry data.
* `src/lib/content/registry-runtime-generation.test.ts`
  Generation-path assertions that new classification bridge behavior survives
  runtime regeneration.
* `src/lib/content/ontology-foundation-regression.test.ts`
  Focused proving-ground regression coverage for the migrated ontology slice.
* `src/lib/content/architecture.ts`
  Architecture browse/index classification should treat ontology architecture
  membership, including descendant branches such as activation, as canonical
  evidence before any legacy `conceptType` fallback.
* `src/lib/governance/typed-taxonomy-consumer-audit.ts`
  Machine-checkable contract for remaining typed-taxonomy consumer clusters,
  ownership, compatibility status, the recommended next migration target, and
  the targeted deprecation fence across runtime, generation, and authoring
  surfaces. When multiple migration slices intentionally share one file, scope
  the entry's field-reference inventory to resolver-specific snippets so the
  audit stays reviewer-visible instead of double-counting the entire file. For
  related-doc work specifically, ontology-first behavior should appear here as
  either a migrated consumer or an explicitly named compatibility-only bridge;
  it should not remain listed as an unresolved primary consumer once direct
  relationships and classification peers define the default reader path. Treat
  shared ancestor secondary classifications as supporting metadata rather than
  exact sibling evidence so child-classification cousins can surface through an
  explicit shared-parent related-doc branch.
* `src/lib/content/related-docs.ts`
  Keep ontology-group normalization and compatibility fallback routing on
  separate helper paths. Legacy peer aliases may expand into ontology groups
  for ontology-backed records, but any remaining `variantGroup` or
  `conceptType` reads should stay reachable only through explicitly named
  compatibility group requests or a no-ontology-data fallback helper.
* `src/lib/governance/legacy-taxonomy-compatibility-budget.ts`
  Shared reviewer-facing budget contract that records the approved baseline for
  one explicit legacy classification-id bridge inventory and one explicit
  deprecated typed-taxonomy compatibility cluster, including the approved
  search-cluster entry inventory and per-entry field-reference budgets used by
  the narrow no-growth guards. The contract is shrink-only: removals stay
  green, while additions, path moves, or field-reference growth fail.
* `src/lib/governance/legacy-taxonomy-compatibility-budget.test.ts`
  Coverage that proves the committed repo still matches the recorded
  compatibility-budget baselines and that budget drift is reported in maintainer
  terms when either governed surface grows, while explicit shrink-path fixtures
  stay aligned.
* `src/tests/ci/legacy-classification-budget-command.test.ts`
  CLI-level proof that the dedicated legacy bridge no-growth verifier stays
  green for the committed runtime bridge inventory and fails red when a fixture
  bridge inventory grows beyond the approved baseline; shrink fixtures should
  remain green.
* `src/lib/governance/typed-taxonomy-consumer-audit.test.ts`
  Regression coverage for grouped audit summaries and contract-drift detection.
* `src/lib/governance/typed-taxonomy-consumer-fence.test.ts`
  Regression coverage proving that new uncategorized or undeclared typed-taxonomy
  usage fails in the targeted surfaces.
* `src/tests/ci/legacy-taxonomy-compatibility-budget-command.test.ts`
  CLI-level proof that maintainers can print the current approved compatibility
  budget for both governed legacy surfaces from the repository root.
* `src/tests/ci/typed-taxonomy-budget-command.test.ts`
  CLI-level proof that the dedicated search typed-taxonomy budget guard stays
  green for the committed approved consumer inventory and field-reference
  counts, remains green for shrink-only reductions, and fails red when an
  approved search-cluster entry grows beyond its recorded field-reference
  budget.
* `src/tests/ci/typed-taxonomy-consumer-audit-command.test.ts`
  CLI-level proof that maintainers can render the current audit summary from the
  repository root. Keep reviewer-facing assertions pinned to the measured
  governance contract, including `Contract status: aligned` and the explicit
  `none: no unresolved migration targets remain in the audit` outcome whenever
  the current slice claims the audit has no unresolved migration target.
* `scripts/report-legacy-taxonomy-compatibility-budget.ts`
  Maintainer entrypoint for printing the approved legacy taxonomy compatibility
  budget and the current measured result for each governed surface.
* `scripts/verify-legacy-classification-budget.ts`
  Maintainer and CI entrypoint that fails when the runtime legacy
  classification bridge inventory grows beyond the approved budget.
* `scripts/verify-typed-taxonomy-budget.ts`
  Maintainer and CI entrypoint that fails when the governed search
  typed-taxonomy compatibility cluster grows beyond the approved per-entry
  budget.
* `src/tests/ci/typed-taxonomy-consumer-fence-command.test.ts`
  CLI-level proof that the targeted deprecation fence stays green for the
  committed compatibility contract, including the reviewer-visible
  `Contract status: aligned` and `Violation status: clear` lines rather than
  only the banner text.
* `scripts/audit-typed-taxonomy-consumers.ts`
  Maintainer entrypoint for printing the typed-taxonomy consumer inventory.
* `scripts/verify-typed-taxonomy-consumer-fence.ts`
  Maintainer and CI entrypoint that fails when new targeted typed-taxonomy
  usage lands outside the approved audit contract.
* `src/features/topology/topology-data.test.ts`
  Topology-surface assertions for canonical selection, invalid-selector
  recovery, and membership/relationship graph output.
* `src/features/topology/topology-query.test.ts`
  Focused proof that topology query serialization normalizes supported
  compatibility selectors and canonical ids back to the canonical outbound URL
  contract.
* `src/features/topology/TopologyPrototype.test.tsx`
  Browser-interaction-level proof for topology chip hrefs and router pushes
  after selector canonicalization changes.
* `src/lib/content/ontology-timeline.test.ts`
  Canonical-versus-compatibility selector assertions for the timeline data
  layer.
* `src/lib/content/timeline-selector-compatibility.test.ts`
  Focused proof that the timeline compatibility fence stays reviewable,
  canonicalizes approved selectors, and rejects undeclared near misses.
* `src/features/docs/timeline/OntologyTimelinePage.test.tsx`
  Static preload coverage proving accepted selector forms survive the
  server-to-client handoff.
* `src/features/docs/timeline/OntologyTimelineClientPage.test.tsx`
  Hydration coverage for canonical ids, legacy ids, and invalid timeline
  selectors read from the browser URL. Keep the recoverable empty-state
  assertions focused on rendered chip and recovery-link hrefs so customer-path
  output stays canonical even when compatibility selectors remain accepted on
  input.
* `docs/data-model.md`
  Human-readable ontology contract, runtime ordering rules, empty-branch
  behavior, and temporary bridge rules.
