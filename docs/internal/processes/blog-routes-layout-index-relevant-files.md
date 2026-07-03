# Blog Routes, Layout, and Index — Relevant Files

Use these files when extending the default English blog surface at `/blog` and
`/blog/<slug>`.

## Blog-owned route and feature surface

* `src/app/(site)/blog/page.tsx`
  English blog index route; delegates to `renderBlogIndexPage`.
* `src/app/(site)/blog/[slug]/page.tsx`
  English blog post route (story 003).
* `src/app/(site)/site-renderers.tsx`
  `renderBlogIndexPage` and `renderBlogPostPage` for docs-shell blog surfaces.
* `src/features/blog/components/BlogIndexPostList.tsx`
  Compact index cards with title, description, published date, tags, and accessible post links.
* `src/features/blog/components/BlogPostMeta.tsx`
  Post metadata row with published date, authors, and tags above the article body.
* `src/lib/content/blog-author-name.ts`
  Human-readable author labels for post metadata rows.
* `src/lib/content/blog-published-date.ts`
  UTC calendar-date formatting for index metadata rows.

## Blog content loader (upstream dependency)

* `src/lib/content/blog-post-list.ts`
  Published post discovery, draft filtering, and newest-first sorting for index cards.
* `src/lib/content/blog-page-load.ts`
  Full MDX post loading, `blogPostHref`, and `blogIndexHref`.
* `docs/internal/processes/blog-content-collection-loader-relevant-files.md`
  Loader-only scope and fixture tests.

## UI messages

* `src/lib/content/ui-messages.types.ts`
  `blogIndex` uses the shared `SectionIndexMessages` shape.
* `src/content/messages/{en,ja,vi}/common.json`
  Blog index title, description, list label, and empty-state copy.

## Verification

* `bun run typecheck`
* `bun run lint`
* `bun test src/tests/content/blog-index.test.tsx`
* `bun test src/tests/content/blog-post.test.tsx`
* `bun test src/tests/content/blog-routes-slice-verification.test.tsx`
  Consolidated route proof for `/blog` metadata/render, `/blog/<slug>` body
  content, newest-first ordering, and unknown-slug missing-page behavior.
* Browser-verify `/blog` and `/blog/<slug>` on a unique local port after `bun run build`.
* PR review may require a clean local `make test`; unrelated search/glossary convergence
  rows can time out under full-suite load—extend per-test timeouts rather than
  changing blog route code when CI is already green.
* Factory git subprocesses in planner modules must use `createIsolatedGitProcessEnv`
  so inherited `GIT_DIR` / `GIT_WORK_TREE` from nested worktrees do not redirect
  tmp fixture repos during full `make test` runs.
* Search page panel GQA ranking rows without explicit per-test timeouts inherit
  the 15s default and can fail under full-suite load; align them with the 90s GQA
  `test.each` budget when CI is already green.

## Patterns

* Prefer `listPublishedBlogPosts` from `blog-post-list.ts` for the index; avoid
  compiling MDX for every card on `/blog`.
* Reuse `DocsPage`, `DocsIndexEmptyState`, and `docsResourceCardLinkClassName`
  so the blog index stays documentation-native rather than a marketing landing page.
* Static render tests should assert React `dateTime` attributes, not lowercase
  `datetime`, when checking published-date markup.
* Assert newest-first card order in route render tests with `indexOf` on
  `/blog/<slug>` hrefs; loader ordering stays in `blog-post-list.test.ts`.
* Use `renderBlogPostPage` with optional `blogRoot` for post-route fixture tests;
  gate unknown and draft slugs through `getPublishedBlogPostBySlug` before MDX load.
