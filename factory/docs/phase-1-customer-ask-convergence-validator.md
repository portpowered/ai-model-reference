# Phase 1 customer-ask convergence validator

The built-app manual gate (`make build && make verify-phase-1-ux`) runs legacy
Phase 1 UX verification, then prints a structured **Customer-ask convergence
report** for batch-008 customer-ask repairs. Planners use the report during
loopback to record `pass`, `fail`, or `uncertain` evidence per checklist row.

## Command

```sh
make build
make verify-phase-1-ux
# or: bun run verify:phase-1-ux
```

Requires a production build (`.next/`), Bun dependencies, and Playwright Chromium
for search and Command-K probes. See README "Phase 1 route and search UX
verification" for server lifecycle, stub env vars, and keyboard fallback.

## Exit semantics

| Condition | Exit code |
| --- | --- |
| Phase 1 UX checks pass and every customer-ask row is `pass` or `uncertain` | `0` |
| Any legacy Phase 1 UX check fails | `1` |
| Any customer-ask row is `fail` | `1` |

`uncertain` rows are non-blocking. Copy them into convergence notes for manual
follow-up.

## Report line format

Each row prints as:

```txt
[STATUS] checkId — title (route=..., query=...) — reason — checklistRow=...
```

Example:

```txt
Customer-ask convergence report
[PASS] home.header-search-entry — Home exposes header-only search entry (route=/) — checklistRow=phase-1-home-header-polish
[FAIL] search.page.page-level-hits — Search page lists canonical page-level hits without fragment URLs (route=/search, query=GQA) — first visible result URL includes a hash fragment — checklistRow=phase-1-search-surface
[UNCERTAIN] glossary.footer-hover — Glossary footer previous/next label and sublabel hover styles pair (route=/docs/glossary/token) — footer nav present but hover pairing not observable in built HTML — checklistRow=phase-1-glossary-page
```

## Check inventory

| checkId | Route / surface | Queries (when applicable) | checklistRow |
| --- | --- | --- | --- |
| `home.header-search-entry` | `/` | — | `phase-1-home-header-polish` |
| `home.primary-nav-no-duplicate-search` | `/` | — | `phase-1-home-header-polish` |
| `home.command-k-affordance` | `/` | — | `phase-1-home-header-polish` |
| `home.command-k-hover-contrast` | `/` | — | `phase-1-home-header-polish` |
| `tags.grouped-list-spacing` | `/tags` | — | `phase-1-tag-list-styling` |
| `tags.attention.grouped-list-spacing` | `/tags/attention` | — | `phase-1-tag-list-styling` |
| `tags.list-disc` | `/tags` | — | `phase-1-tag-list-styling` |
| `tags.attention.list-disc` | `/tags/attention` | — | `phase-1-tag-list-styling` |
| `search.page.page-level-hits` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` |
| `search.page.no-matched-tags` | `/search` | GQA, attention, KV cache | `phase-1-search-surface` |
| `search.dialog.no-matched-tags` | header search dialog | GQA, attention, KV cache | `phase-1-search-surface` |
| `search.api.gqa-canonical-first-hit` | `/api/search` | GQA | `phase-1-search-surface` |
| `glossary.presentation` | `/docs/glossary/token` | — | `phase-1-glossary-page` |
| `glossary.chrome-links` | `/docs/glossary/token` | — | `phase-1-glossary-page` |
| `glossary.footer-hover` | `/docs/glossary/token` | — | `phase-1-glossary-page` |
| `module.presentation` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.graph-build-markers` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.list-disc` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |
| `module.mha-gqa-comparison` | `/docs/modules/grouped-query-attention` | — | `phase-1-module-page` |

## Source modules

Implementation lives under `src/lib/verify/`:

| Surface | Pure row builders | HTTP / Playwright runner |
| --- | --- | --- |
| Home / header | `customer-ask-home-header-convergence.ts` | `customer-ask-home-header-convergence-http.ts` |
| Tag lists | `customer-ask-tag-list-convergence.ts` | `customer-ask-tag-list-convergence-http.ts` |
| Search | `customer-ask-search-surface-convergence.ts` | `customer-ask-search-surface-convergence-http.ts` |
| Glossary | `customer-ask-glossary-convergence.ts` | `customer-ask-glossary-convergence-http.ts` |
| GQA module | `customer-ask-gqa-module-convergence.ts` | `customer-ask-gqa-module-convergence-http.ts` |

The orchestrator (`customer-ask-convergence-orchestrator.ts`) aggregates rows and
prints the report via `customer-ask-convergence-reporter.ts`. The CLI entrypoint
is `scripts/verify-phase-1-route-search-ux.ts`.

## Loopback usage

During batch-008 loopback, ideafy planners should:

1. Run `make build && make verify-phase-1-ux` after customer-ask repairs land.
2. Record the process exit code.
3. Copy each customer-ask row status (`pass` / `fail` / `uncertain`) into
   convergence notes with the `checkId` and `checklistRow`.
4. Choose narrow repair (any `fail`), manual follow-up (any `uncertain`), or
   Phase 1 stop-and-wait when all automatable rows pass.
