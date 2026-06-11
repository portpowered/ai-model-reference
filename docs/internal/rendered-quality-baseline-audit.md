# Rendered quality baseline audit

Audited at (UTC): 2026-06-11T11:23:18.068Z
Routes visited: 14
Viewport checks: 28

## Standards baseline

- docs/quality-documents-standards.md present: no
- Documentation gap: docs/quality-documents-standards.md is absent; writing-standards.md, documentation-template.md, and graphing-standards.md are the active rendered-quality baseline.
- Active standards: docs/writing-standards.md, docs/documentation-template.md, docs/graphing-standards.md

## Implementation-facing issue list

### content-standards

- [content-standards] / (all) — customer-visible process language: matched: Phase 1, Phase 1 sample
- [content-standards] /docs/modules/grouped-query-attention (all) — folded summary missing: openingSummary renders as visible prose without folded-summary marker
- [content-standards] /docs/modules/attention (all) — folded summary missing: openingSummary renders as visible prose without folded-summary marker
- [content-standards] /docs/glossary/vector (all) — customer-visible process language: matched: Phase 1, Phase 2, Phase 1 bridge page
- [content-standards] /docs/glossary/hidden-size (all) — customer-visible process language: matched: Phase 1, Phase 2, Phase 1 bridge page

## Manual follow-up

- Re-run `bun run verify:rendered-quality-baseline` after `make build` when validating fixes from stories 002–007.
- Pair this report with direct browser checks on desktop and mobile for focus, keyboard navigation, and graph pan/zoom when those lanes are in scope.

