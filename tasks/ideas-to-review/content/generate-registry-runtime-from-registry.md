# Generate `registry-runtime.ts` from the published registry manifest

## Problem

`src/lib/content/registry-runtime.ts` is maintained as a manual import-and-array
manifest for published registry records. In this iteration,
`concept.page-spec-workflow-sample` existed as a published registry JSON file but
was missing from the runtime manifest, so `getConceptById(...)` returned
`undefined` even though the record shipped in the repo.

This is a recurring manual-sync failure mode:

- registry JSON can be added or updated correctly
- docs can render from filesystem-backed loaders
- runtime lookup helpers and tests can still silently miss the record

## Why It Matters

- content-layer tests and UI loaders depend on runtime lookups
- missing manifest entries split source of truth between registry files and
  runtime code
- the failure is easy to miss until a specific lookup path is exercised

## Suggested Direction

Replace the hand-maintained `registry-runtime.ts` manifest with generated code or
a build-time manifest derived from the registry directory, while preserving the
typed lookup helpers (`getConceptById`, `getModuleById`, `listConceptRecords`,
and similar).

Minimum acceptable outcomes:

- adding a new published registry record does not require manual runtime import
  wiring
- runtime helpers and tests read from the same registry inventory used by
  validation/build flows
- missing runtime coverage fails in one obvious place instead of producing
  per-record `undefined` lookups

## Notes

- Keep the runtime API stable for existing callers if possible.
- If full code generation is too large, a validation guard that proves every
  published registry record is represented in the runtime manifest would still
  reduce drift.
