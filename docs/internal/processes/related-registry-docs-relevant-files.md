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
* `src/lib/content/related-registry-docs.test-fixtures.ts`
  Shared resolver/component/blog test fixtures and `relatedRegistryDocsResolveOptions`.
* `src/lib/content/related-registry-docs-behavior.test.tsx`
  Consolidated story-004 acceptance tests across resolver, `RelatedRegistryDocs`, and
  `BlogRelatedDocs` with explicit anchor-count and docs-page-less coverage.

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
  Blog wrapper accepting `relatedDocIds` and delegating to `RelatedRegistryDocs` with
  blog-specific empty/all-unavailable fallback copy and `testId="blog-related-docs"`.
* `src/features/blog/components/BlogRelatedDocs.test.tsx`
  Wrapper render/fallback tests with injectable `resolveOptions`.
* `src/features/blog/components/blog-related-docs-blog-integration.test.tsx`
  Loads `roofline-throughput-explorer` blog post and asserts explicit frontmatter ids
  render as compact published docs links via `renderBlogPostShell`.
* `src/lib/content/blog-mdx-components.tsx`
  Registers `BlogRelatedDocs` for MDX blog posts.

## Component examples (browser verification)

* `src/component-examples/registry.tsx`
  `related-registry-docs-published`, `related-registry-docs-empty`, and
  `related-registry-docs-unavailable` examples on `/component-examples` (dev or
  `ENABLE_COMPONENT_EXAMPLES=1`).

## Verification

* `bun test src/lib/content/related-registry-docs.test.ts`
* `bun test src/lib/content/related-registry-docs-behavior.test.tsx`
* `bun test src/features/docs/components/RelatedRegistryDocs.test.tsx`
* `bun test src/features/blog/components/BlogRelatedDocs.test.tsx`
* `bun test src/features/blog/components/blog-related-docs-blog-integration.test.tsx`
* `bun run typecheck`
* `bun run lint`
* Blog browser check: build then curl `/blog/roofline-throughput-explorer` for
  `data-testid="blog-related-docs"` and concept hrefs.
