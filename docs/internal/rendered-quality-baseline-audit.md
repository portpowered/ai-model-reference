# Rendered quality baseline audit

Audited at (UTC): 2026-06-11T13:47:35.401Z
Routes visited: 15
Viewport checks: 34

## Standards baseline

- docs/quality-documents-standards.md present: no
- Documentation gap: docs/quality-documents-standards.md is absent; writing-standards.md, documentation-template.md, and graphing-standards.md are the active rendered-quality baseline.
- Active standards: docs/writing-standards.md, docs/documentation-template.md, docs/graphing-standards.md

## Implementation-facing issue list

No high-impact rendered failures were recorded in this audit pass.
## Manual follow-up

- Re-run `bun run verify:rendered-quality-baseline` after `make build` when validating fixes from stories 002–007.
- Graph pan/zoom and MHA/GQA toggle probes run automatically for grouped-query-attention during this audit.
- Rich-content table, code, and math scroll probes run for grouped-query-attention and backpropagation at desktop and mobile viewports.
- Pair remaining manual checks with desktop and mobile focus and keyboard navigation when those lanes are in scope.

