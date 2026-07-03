# Generated Table Registry Root Drift Cleanup Proof — Relevant Files

Read-only proof lane for ownerless dirty generated artifact
`src/lib/content/generated/table-registry.generated.ts`, especially
`looped-transformers-comparison.json` import/source/payload entries. Do not
revert, stage, overwrite, or commit the root artifact during evidence capture.

## Core proof module

* `src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts` —
  story 001 read-only root checkout evidence: `HEAD` and `origin/main` SHAs,
  ahead/behind counts, `git status --short --branch` for the generated artifact,
  full artifact diff, and looped-transformers-comparison import/source/payload
  highlight extraction.
* `src/lib/factory/generated-table-registry-root-drift-cleanup-proof.test.ts` —
  fixture diff/status tests plus temp-git-repo integration proving the report
  script does not mutate porcelain state.
* `scripts/report-generated-table-registry-root-drift-cleanup-proof.ts` —
  planner-facing CLI with `--repo-root`, `--remote-base-ref`,
  `--status-output`, `--diff-output`, `--generated-at-utc`, and `--json` /
  `--format json`. Does not invoke `you`.

## Upstream evidence reuse

* `src/lib/factory/merged-pr-drain-rows-reconciliation.ts` — `resolveMainRepoRoot`
  so nested worktrees resolve the main root checkout.
* `src/lib/factory/planner-root-checkout-reconciliation.ts` —
  `detectDefaultRemoteBaseRef`.
* `src/lib/factory/active-pr-mergeability-watchdog.ts` — `classifyBranchDrift`
  for `origin/main...HEAD` rev-list counts.

## Planner-facing command

| When | Command |
| --- | --- |
| Capture current root drift evidence (story 001) | `bun run report:generated-table-registry-root-drift-cleanup-proof` |
| Point at the planner root checkout explicitly | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --repo-root /path/to/root` |
| Fixture-backed status/diff replay | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --repo-root /path/to/root --status-output /path/to/status.txt --diff-output /path/to/diff.txt` |

## Fixture-backed verification

Fixtures live under
`src/tests/fixtures/generated-table-registry-root-drift-cleanup-proof/`:

* `dirty-table-registry-status.txt` — behind `origin/main` with modified generated artifact
* `looped-transformers-table-registry.diff` — added import, source, and payload lines

```bash
bun test src/lib/factory/generated-table-registry-root-drift-cleanup-proof.test.ts
```

## Live root evidence (2026-07-03 UTC)

Captured via `bun run report:generated-table-registry-root-drift-cleanup-proof`
from this worktree (resolves main repo root automatically).

| Field | Value |
| --- | --- |
| Root repo path | `/Users/abdifamily/work/learn-agent-factories` |
| `origin/main` SHA | `a0c57068c45d692ff192f645d58afd3ec54d8618` |
| Root `HEAD` SHA | `a0c57068c45d692ff192f645d58afd3ec54d8618` |
| Ahead / behind | `0` / `0` (aligned) |
| Generated artifact cleanliness | `clean` |
| Generated artifact diff | none at capture time |
| `looped-transformers-comparison` diff highlights | none at capture time |

The PRD customer ask referenced root checkout that was 9 commits behind with
dirty `table-registry.generated.ts` looped-transformers entries. Live capture
shows the root checkout is now aligned with `origin/main` and the generated
artifact is clean; story 002 must prove whether looped-transformers entries on
`origin/main` are reproducible from canonical source tables.

## Preserve policy

* Do not revert, restore, stage, unstage, clean, delete, overwrite, or commit
  `src/lib/content/generated/table-registry.generated.ts` during evidence capture.
* Hold page refills until reproducibility proof (story 002) and the single
  allowed outcome lane (stories 003–005) are resolved.
