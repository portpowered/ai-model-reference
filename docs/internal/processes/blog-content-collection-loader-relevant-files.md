# Blog Content Collection Loader — Relevant Files

Use these files when extending the blog content loading foundation. This lane
loads `src/content/blog/<slug>/page.mdx` posts for future route renderers without
adding public blog routes, shell hardening, or committed real posts.

## Blog-owned loader surface

* `src/lib/content/blog-frontmatter.ts`
  Typed frontmatter contract, calendar-date validation, and published visibility.
* `src/lib/content/blog-post-messages.ts`
  Blog-specific local message schema (`title`, `description`, `contextSentence`, `takeaway`).
* `src/lib/content/blog-post-load.ts`
  Sidecar loading for local `messages/<locale>.json` and optional `assets.json`.
* `src/lib/content/blog-post-list.ts`
  Published post discovery, draft filtering, and newest-first sorting.
* `src/lib/content/blog-post-get.ts`
  Single published post lookup by slug with typed not-found (`null`) behavior.
* `src/lib/content/page-asset-paths.ts`
  Build-time helpers for resolving colocated page asset filesystem paths; keep out of
  `assets.ts` so client components do not bundle `node:path`.
  Build-time validation for published blog metadata, controlled tags, related docs,
  local messages, local asset files, asset message keys, MDX asset references, MDX links,
  and local asset config. Wired into `validateRegistryContent`.

## Shared path helper (minimum touch)

* `src/lib/content/content-paths.ts`
  `getBlogRoot()` and `BLOG_ROOT` only — do not add broader shell or browse helpers here.

## Fixture and isolation tests

* `src/lib/content/blog-frontmatter.test.ts`
* `src/lib/content/blog-post-load.test.ts`
* `src/lib/content/blog-post-list.test.ts`
* `src/lib/content/blog-post-get.test.ts`
* `src/lib/content/blog-content-loader-scope.test.ts`
  Production-root emptiness, blog-owned import surfaces, and public shell catalog isolation.
* `src/lib/content/validate-blog-posts.test.ts`
  Published blog metadata, tag, related-doc, message, asset file, asset message key,
  MDX asset reference, and MDX link validation fixtures.
* `src/lib/content/blog-prose-validation-boundaries.test.ts`
  Behavioral proof that narrative blog MDX prose stays exempt from canonical docs prose
  checks while canonical docs pages still reject raw reader-facing prose.
* `src/lib/content/validate-canonical-mdx-prose.ts`
  `isBlogContentPath` and `shouldValidateCanonicalMdxProse` keep blog routes and
  `src/content/blog/*` bundles outside canonical MDX prose validation.

## Search indexing (story 003+)

* `src/lib/search/build-blog-search-document.ts`
  Published blog search document builder: local messages, MDX prose, controlled tag terms,
  `publishedAt`, and distinct `blog` kind.
* `src/lib/search/build-blog-search-document.test.ts`
  Fixture indexing, draft exclusion, MDX prose extraction, and search API discovery.
* `src/lib/search/build-documents.ts`
  `buildSearchDocumentsForLocale` accepts optional published blog post sources.
* `src/lib/search/search-server.ts`
  Loads published blog posts into the live search catalog.

## Tag landing grouping (story 004+)

* `src/lib/content/tag-resources.ts`
  Loads published blog posts into tag landing groups with distinct `blog` kind, `/blog/<slug>` URLs,
  localized title/description, `publishedAt`, and frontmatter tags.
* `src/features/docs/components/TagResourceList.tsx`
  Renders blog group metadata (published date and supplemental tag pills) on tag landing pages.
* `src/lib/content/blog-tag-landing.test.ts`
  Fixture and production tag landing coverage for blog grouping, draft exclusion, and render proof.

## Out of scope for this lane

* Public `/blog` or `/blog/<slug>` routes under `src/app`
* Blog navigation or sidebar entries
* Real blog post content under `src/content/blog`
* Generic shell hardening lanes (`shell-domain-relevant-files.md`, browse, sidebar, search enrichment beyond blog indexing)

## Verification

* `bun run typecheck`
* `bun run lint`
* `bun test src/lib/content/blog-`

Canonical frontmatter reference: `docs/templates/blog-post.mdx`.
