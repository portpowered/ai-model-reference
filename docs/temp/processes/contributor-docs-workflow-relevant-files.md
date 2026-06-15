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

## Factory request surfaces

| Surface | Path | Contributor use |
| --- | --- | --- |
| Factory overview | `factory/docs/overview.md` | Workstation flow, phase control, `you submit batch` entry points |
| Batch inputs guide | `factory/docs/batch-inputs.md` | Human-readable batch ingress and dry-run notes |
| Batch example | `factory/docs/batch-input-example.json` | Canonical `FACTORY_REQUEST_BATCH` with `idea` work items |
| Batch ingress folder | `factory/inputs/BATCH/default/<request_id>.json` | Maintainer watched-folder submission (same JSON shape) |

Contributors who do not run the factory should file issues with idea-shaped fields
(page kind, slug, source material, starting path, scope). Maintainers submit
batches with `you submit batch --dry-run` then `you submit batch`.
