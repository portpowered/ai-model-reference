# Derive published docs manifests from content instead of hand-maintained allowlists

## Problem

Adding one new canonical docs page currently requires updating several separate
sources of truth by hand:

- `src/lib/content/registry-runtime.ts`
- `src/lib/content/published-docs-registry-ids.ts`
- explicit snapshot-style tests for module indexes and tag landing pages
- shipped localized docs manifests when translations exist

This creates a repeated failure mode where valid content files exist on disk,
but related-doc, published-page, or discovery behavior stays stale until every
manual list is patched.

## Why it matters

This pattern will keep recurring as the docs surface grows. It increases the
cost of small content additions and makes failures look scattered across
registry, navigation, and search tests instead of pointing to one missing
source of truth.

## Suggested direction

Create one generated or loader-derived published-doc manifest that becomes the
authoritative source for:

- registry-runtime published docs membership
- `PUBLISHED_DOCS_REGISTRY_IDS`
- navigation/index snapshot helpers where possible

Keep shipped non-default locale manifests explicit, but reduce the number of
English/default-locale allowlists that can drift from the content tree.
