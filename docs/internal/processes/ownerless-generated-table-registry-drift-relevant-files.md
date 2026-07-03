# Ownerless Generated Table Registry Drift — Relevant Files

Use these files when changing the narrow ownerless generated table registry
drift evidence lane. This lane is read-only: it must not mutate
`src/lib/content/generated/table-registry.generated.ts` or unrelated generated
artifacts.

## Target artifact

The evidence lane focuses on exactly one generated artifact:

* `src/lib/content/generated/table-registry.generated.ts`

The observed table entry under investigation is
`looped-transformers-comparison.json` (`table.looped-transformers-comparison`).

## Core evidence module

* `src/lib/factory/ownerless-generated-table-registry-drift.ts` — read-only
  evidence capture for root `HEAD`, `origin/main`, ahead/behind relationship,
  scoped dirty status for the generated artifact, and
  `looped-transformers-comparison.json` import/source-list/payload observation
  from HEAD, worktree, and scoped diff excerpts. Resolves the main repo root
  from nested worktrees via `resolveMainRepoRoot`.
* `scripts/report-ownerless-generated-table-registry-drift.ts` — planner-facing
  CLI with fixture flags aligned to other factory reports.

## Planner-facing command

| When | Command |
| --- | --- |
| Capture read-only generated table registry drift evidence for the ownerless priority blocker | `bun run report:ownerless-generated-table-registry-drift` |

Fixture flags:

* `--repo-root`
* `--remote-base-ref`
* `--status-output`
* `--diff-output`
* `--json` or `--format json`

## Fixture-backed verification

When report or evidence logic changes, add or extend fixture-backed tests under
`src/lib/factory/ownerless-generated-table-registry-drift.test.ts` using
fixtures in
`src/tests/fixtures/ownerless-generated-table-registry-drift/`. Tests should
assert observable emitted behavior (root git truth, artifact dirty status,
table-entry observation kind, preserve policy) without meta inventories of
routes, docs links, or command lists.

## Related process docs

* [factory-linkage-relevant-files](./factory-linkage-relevant-files.md) —
  upstream root checkout reconciliation and table-registry drift grouping.
* [content-page-generation-workflow-relevant-files](./content-page-generation-workflow-relevant-files.md) —
  table registry generation and validation proof surfaces for later
  classification stories.
