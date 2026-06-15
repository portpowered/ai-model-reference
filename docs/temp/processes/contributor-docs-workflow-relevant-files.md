# Contributor docs workflow — validation and governance surfaces

This document inventories the contributor-facing docs workflow surfaces and the
real local validation commands contributors should use.

## Contributor guide

| Surface | Path | Role |
| --- | --- | --- |
| Contributor workflow guide | `docs/contributors/CONTRIBUTING.md` | Durable contributor contract: page kinds, content requirements, local validation, factory requests |

## Local validation entrypoints

| Command | Script | Contributor use |
| --- | --- | --- |
| `make validate-data` | `scripts/validate-registry.ts` | Fast loop — registry schema, frontmatter ↔ registry alignment, message keys, asset ids, tags, citations |
| `make linkcheck` | `scripts/validate-links.ts` | Fast loop — internal links and `#section` anchors in published Fumadocs docs pages |
| `make ci` | root `Makefile` | Full PR gate — lint, typecheck, test, coverage, build, build-export, test-integration, validate-data, linkcheck |

`linkcheck` scans `src/content/docs/**/page.mdx` routes served through Fumadocs,
not arbitrary markdown under `docs/`. Contributor guide links under `docs/` are
maintainer references; keep relative paths valid when editing them.

## Not part of the default contributor loop

- `make validate-pdf` — stub (skipped)
- `make verify-phase-1-ux` and `make verify-phase-1-*-convergence` — maintainer convergence tools
- `make component-examples` — dev-only component gallery

Contributors should not manually validate bundle internals, route inventories, or
export artifact file lists unless a maintainer requests convergence evidence.
