# Automate published docs registry wiring for canonical pages

## Problem

Adding a new canonical docs page still requires manual edits outside the page bundle:

- `src/lib/content/registry-runtime.ts`
- `src/lib/content/published-docs-registry-ids.ts`

If either edit is missed, the page can exist on disk but fail runtime lookup, published-doc discovery, or concept-section routing.

## Why this matters

This is a repeatable failure mode for future page work. The page files, registry JSON, and tests can look correct while the runtime still omits the page because two separate manual registries were not updated.

## Suggested direction

Derive these registrations from the canonical page and registry content instead of maintaining hand-written allowlists/import lists:

- generate the runtime concept/module/model imports from the registry directory at build time, or
- derive `PUBLISHED_DOCS_REGISTRY_IDS` and concept-section membership from published frontmatter plus registry kind.

## Expected benefit

- Fewer silent omissions when adding new canonical pages
- Smaller diffs for page work
- Less duplication between page bundles, registry JSON, and runtime lookup surfaces
