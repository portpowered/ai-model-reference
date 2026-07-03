# Related Registry Docs — Relevant Files

Use these files when implementing explicit registry-id → published docs link resolution
and the shared related-registry-docs component/blog wrapper.

## Resolver surface

* `src/lib/content/related-registry-docs.ts`
  Generic `resolveRelatedRegistryDocs(registryIds)` returning `available` link items
  (`registryId`, `title`, `href`) and `unavailable` entries (`missing` / `unpublished`).
  Preserves input order; not blog-specific.
* `src/lib/content/related-registry-docs.test.ts`
  Focused resolver tests with injectable `getRecordById` / `publishedRegistryIds`.

## Shared linking primitives

* `src/lib/content/registry-linking.ts`
  `registryDisplayTitle`, `registryRecordHref`, `hasPublishedDocsPageForRecord`.
* `src/lib/content/published-docs-registry-ids.ts`
  `PUBLISHED_DOCS_REGISTRY_IDS`, `getPublishedDocsHrefForRecord`.
* `src/lib/content/registry-runtime.ts`
  `getRegistryRecordById` for synchronous registry lookup.

## Shared UI component (story 002)

* `src/features/docs/components/RelatedRegistryDocs.tsx`
  Resolves explicit `registryIds` via `resolveRelatedRegistryDocs`, renders compact
  `docsChromeLinkClassName` links in an accessible list, and exposes empty,
  all-unavailable, and partial-unavailable fallback states. Optional `resolveOptions`
  prop supports injected lookup in tests.
* `src/features/docs/components/RelatedRegistryDocs.test.tsx`
  Render/fallback/localization tests with injectable resolver options.
* `src/features/docs/components/RelatedDocList.tsx`
  Curated related-docs list with reason labels and expand/collapse; styling reference
  for docs chrome links.

## Blog wrapper (story 003)

* `src/features/blog/components/BlogRelatedDocs.tsx`
  Blog wrapper using `relatedDocIds`; should delegate to `RelatedRegistryDocs` in story 003.

## Component examples (browser verification)

* `src/component-examples/registry.tsx`
  `related-registry-docs-published`, `related-registry-docs-empty`, and
  `related-registry-docs-unavailable` examples on `/component-examples` (dev or
  `ENABLE_COMPONENT_EXAMPLES=1`).

## Verification

* `bun test src/lib/content/related-registry-docs.test.ts`
* `bun test src/features/docs/components/RelatedRegistryDocs.test.tsx`
* `bun run typecheck`
* `bun run lint`
