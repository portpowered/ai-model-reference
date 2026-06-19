# Fix module-backed concept search routes

## Problem

Browser verification on the RoPE concept page surfaced repeated requests to
`/docs/concepts/absolute-positional-embeddings` returning 404 while the search
UI was active. The published page for that concept still lives at
`/docs/modules/absolute-positional-embeddings`, so some discovery path is
constructing concept-section URLs for records that remain module-backed.

## Why this matters

- This creates dead-end navigation in a high-traffic discovery surface.
- The bug is likely broader than one page because several concept records are
  intentionally module-backed.
- It undermines the canonical-route model the docs system depends on.

## Proposed direction

- Audit search result URL construction and any client-side prefetch logic for
  concept records that are still listed in
  `MODULE_BACKED_CONCEPT_REGISTRY_IDS`.
- Centralize route generation on the same registry-linking helper used by
  related docs so search, prose autolinks, and page chrome cannot diverge.
- Add focused coverage that proves module-backed concepts never emit
  `/docs/concepts/<slug>` URLs unless they have actually been promoted to the
  concept section.
