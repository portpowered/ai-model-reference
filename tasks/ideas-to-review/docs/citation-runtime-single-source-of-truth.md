# Citation runtime single source of truth

## Problem

Citation registry records currently have to be added manually in at least two runtime entry points:

- `src/lib/content/citations.ts`
- `src/lib/content/registry-runtime.ts`

That duplication creates an easy drift path where a new citation exists in the registry JSON, but only one runtime can resolve it. In this iteration, that caused rendered `CitationList` output to omit valid citations even though the registry referenced them correctly.

## Why this matters

- It is a repeated future failure mode for any story that adds or edits citation records.
- The failure is subtle because registry-level tests can pass while rendered citation lists still drop records.
- The fix currently depends on maintainers remembering two separate manual registration steps.

## Proposed direction

Create one canonical citation loader or generated citation manifest and have both runtime surfaces consume it, instead of maintaining parallel import lists by hand.

## Acceptance idea

- Adding a new citation JSON file in the canonical registry path requires one registration step, not two.
- `CitationList` and registry-runtime citation lookup resolve from the same underlying citation record set.
- A regression test fails if a registry citation file exists but is absent from the shared citation loader.
