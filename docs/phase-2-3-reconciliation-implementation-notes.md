# Phase 2/3 reconciliation — implementation notes

Batch 017 navigation and search reconciliation (`phase-2-3-content-navigation-search-reconciliation`) integrates shared discovery surfaces for glossary, concept, and module pages without reopening the active Phase 1 static-export search repair path.

## Phase 1 static-export search repair dependency

**Assessment (verified 2026-06-09 UTC): reconciliation does not depend on any open Phase 1 static-export search repair work.**

Evidence:

- `make internal-verify-phase-1-github-pages-convergence` exits 0 with recommendation `stop-and-wait-for-phase-advancement`. Export command path, static server command path, and Phase 1 static regression probes (including `/search` hydration, page-level hits, and header dialog search for GQA, attention, and KV cache) pass against the `out/` artifact served from a loopback static file server.
- `src/tests/build/static-export-base-path-contract.test.ts` passes: `build:export` emits the Orama bootstrap payload, verifies route and `/search` shell markers, and the Phase 1 export route/search script entrypoints succeed against the shared base-path export artifact.
- Batch 017 reconciliation surfaces are present on the static export artifact: `/search`, `/tags`, `/tags/attention`, `/docs/architecture`, `/docs/glossary`, and `/docs/modules/grouped-query-attention` include reader markers in the GitHub Pages convergence export-artifact checks.

Reconciliation search and tag behavior was verified on the dev server and through the focused Phase 2/3 gate (`make internal-verify-phase-2-3-reconciliation-convergence`). Static-export search repair is not a blocker for shipping reconciliation work.

## Residual Phase 1 work outside this item

Full `make test` can still report inherited Phase 1 **built-app** convergence failures that are separate from the static-export repair path:

- `run-phase-1-built-app-convergence-validator` customer-ask rows such as `search.page.page-level-hits`, `search.page.row-hover-coherence`, and `search.page.matched-text-selection-contrast` can fail against a spawned `next start` production server even when static export passes.
- Built HTML layout convergence tests (`src/tests/layout/*-built-route-convergence.test.tsx`, `site-routes-shell.test.tsx`, glossary presentation rows) can fail when `.next/` production artifacts are stale or removed mid-suite.
- Phase 1 follow-up and route-search-UX integration scripts (`make internal-verify-phase-1-follow-up-convergence`, `make internal-verify-phase-1-ux`) exercise the same built-app server path.

These failures are owned by the Phase 1 built-app convergence verifier track (`factory/docs/phase-1-built-app-convergence-validator.md`, `factory/docs/phase-1-follow-up-customer-ask-convergence-validator.md`), not by static-export repair. They do not invalidate the Phase 2/3 reconciliation gate.

**Recommended follow-up (do not implement in this work item):** queue a `phase-1-built-app-convergence-repair` batch to refresh Phase 1 built-app customer-ask convergence after reconciliation lands if `make ci` must return green on `main` before Phase advancement. Do not patch `src/lib/verify/static-export-*`, `src/tests/build/static-export-*`, or `scripts/verify-phase-1-export-*` from reconciliation work.

## Files intentionally not modified

This reconciliation item did not edit the active Phase 1 static-export search repair implementation path. Owned prefixes (see also `phase-2-3-reconciliation-phase-1-dependency.ts`):

- `src/lib/verify/static-export-*`
- `src/lib/verify/phase-1-github-pages-*`
- `src/tests/build/static-export-*`
- `scripts/verify-phase-1-export-*`
- `scripts/run-phase-1-github-pages-*`
- `factory/docs/phase-1-github-pages-*`

## Phase 2/3 verification entry points

- `make internal-verify-phase-2-3-reconciliation-convergence` — registry validation plus six-domain reconciliation gate (source discovery, attention tag grouping, architecture-forward links, search document kind facets, representative search queries).
- `make internal-validate-data` — registry validation CLI used by the convergence pass.
