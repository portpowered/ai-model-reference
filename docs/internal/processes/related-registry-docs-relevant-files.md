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

## Existing related-docs UI (story 002+)

* `src/features/docs/components/RelatedDocList.tsx`
  Accessible compact link list with docs chrome styling.
* `src/features/blog/components/BlogRelatedDocs.tsx`
  Blog wrapper using `relatedDocIds`; should delegate to shared component in story 003.

## Verification

* `bun test src/lib/content/related-registry-docs.test.ts`
* `bun run typecheck`
* `bun run lint`
