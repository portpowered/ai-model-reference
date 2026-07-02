# Shell Domain Relevant Files

Use these files when changing collection-driven browse, section index, sidebar,
or shell fixture proofs that must stay independent from AI registry helpers.

## Generic shell primitives

* `src/lib/docs/collection-definition-contract.ts`
  Shared `ShellCollectionDefinition` contract for AI and non-AI collections.
* `src/lib/docs/browse-collection-sections.ts`
  Collection-driven browse sections; AI order comes from `DOCS_BROWSE_COLLECTION_IDS`.
* `src/lib/docs/section-collection-index.ts`
  Generic section-index message resolution and `renderShellSectionCollectionIndexPage`.
* `src/lib/navigation/shell-collection-page-tree.ts`
  Generic sidebar/page-tree builder with optional grouping resolvers.
* `src/lib/navigation/ai-docs-sidebar-adapter.ts`
  Model Atlas-owned shell sidebar labels and adapter helpers for AI docs collections.
* `src/lib/navigation/generated-docs-page-tree.ts`
  AI docs page tree; delegates to `buildShellCollectionPageTree`.
* `src/app/(site)/site-renderers.tsx`
  AI browse and section-index render entry points used by public routes.

## Non-AI fixture proof

* `src/tests/fixtures/non-ai-shell/fixture.ts`
  Test-owned collections, pages, messages, and composable builders for browse,
  section index, sidebar, and search proofs.
* `src/tests/fixtures/non-ai-shell/shell-renderers.tsx`
  Fixture browse and section-index render helpers for tests.
* `src/tests/fixtures/non-ai-shell/browse-and-index.test.tsx`
  Fixture browse and section-index behavioral coverage.
* `src/tests/fixtures/non-ai-shell/sidebar.test.ts`
  Fixture sidebar/page-tree behavioral coverage.
* `src/tests/fixtures/non-ai-shell/search.test.ts`
  Fixture base search document and Orama query coverage without AI enrichment.

## AI shell parity regression

* `src/tests/fixtures/non-ai-shell/ai-shell-behavior-parity.test.ts`
  Consolidated regression proving AI browse, section index, sidebar, and search
  behavior stayed stable and fixture routes remain off public AI surfaces.
* `src/tests/content/browse-index.test.tsx`
  Detailed AI browse quick-route and localized browse assertions.
* `src/tests/content/section-indexes.test.tsx`
  AI section-index page render and metadata coverage.
* `src/lib/navigation/docs-sidebar-collection-verification.test.ts`
  AI sidebar folder order, grouping labels, and representative links.
* `src/tests/search/search-behavior-parity.test.ts`
  AI search indexing and query parity for attention, GQA, and classification scope.
