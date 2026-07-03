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
  highlight extraction;   story 002 reproducibility proof via dry-run generation
  (`createTableRegistrySourceEntries` + `renderGeneratedTableRegistryModule`),
  canonical source presence on `origin/main` / root `HEAD` / checkout filesystem,
  and in-process `verifyGeneratedTableRegistryState` validation problems; story 003
  expected-output classification (`already-aligned-no-commit` vs
  `land-minimal-expected-output-required`), looped-transformers table/source
  discoverability via `getTableById` and `generatedTableRegistrySourceFiles`, and
  optional `--apply` write of only `table-registry.generated.ts`; story 004 stale-drift
  operator handoff (`classifyGeneratedTableRegistryStaleDriftApplicable`,
  `buildGeneratedTableRegistryStaleDriftHandoff`) with reproduction-failure evidence,
  operator-safe preserve/restore/regenerate/verify actions, and page-refill hold rule.
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
| Prove generator reproducibility (story 002) | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --reproducibility` |
| Classify expected generated output lane (story 003) | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --expected-output` |
| Apply minimal generated artifact when dirty and reproducible (story 003) | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --expected-output --apply` |
| Document operator-safe stale drift handoff (story 004) | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --stale-drift-handoff` |
| Capture drift evidence and reproducibility proof together | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --full-proof` |
| Point at the planner root checkout explicitly | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --repo-root /path/to/root` |
| Fixture-backed status/diff replay | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --repo-root /path/to/root --status-output /path/to/status.txt --diff-output /path/to/diff.txt` |

Generation and validation commands recorded by the reproducibility proof:

| When | Command |
| --- | --- |
| Regenerate table registry artifact | `bun run generate:table-registry` |
| Verify generated table registry completeness | `bun run verify:table-registry` |

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

## Live reproducibility proof (2026-07-03 UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --reproducibility`
from this worktree.

| Field | Value |
| --- | --- |
| Generation command | `bun run generate:table-registry` |
| Validation command | `bun run verify:table-registry` |
| `looped-transformers-comparison.json` on `origin/main` | `present` |
| `looped-transformers-comparison.json` on root `HEAD` | `present` |
| `looped-transformers-comparison.json` on checkout filesystem | `present` |
| Reproducibility outcome | `matches-deterministic-generation` |
| Current artifact matches dry-run | `true` |
| Looped-transformers entries match dry-run | `true` |

Story 003 should land minimal expected generated output only if this proof
remains `matches-deterministic-generation` while the generated artifact is
dirty; when the artifact is already clean and aligned, no registry commit is
required.

## Live expected-output outcome (2026-07-03 UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --expected-output`
from this worktree.

| Field | Value |
| --- | --- |
| Outcome kind | `already-aligned-no-commit` |
| Reproducibility outcome | `matches-deterministic-generation` |
| Root generated artifact cleanliness | `clean` |
| Validation command | `bun run verify:table-registry` |
| Looped-transformers table discoverable | `true` (`table.looped-transformers-comparison`) |
| Looped-transformers source discoverable | `true` (`looped-transformers-comparison.json`) |
| Changed paths | none |
| Unrelated paths note | No unrelated dirty root paths were modified, reverted, staged, overwritten, or deleted. |
| Operational summary | Expected looped-transformers generated entries are already on `origin/main`; no registry commit required. |

Stories 004–005 apply only when reproducibility is **not**
`matches-deterministic-generation` or when drift belongs to an active PR lane.

## Live stale-drift handoff (2026-07-03 UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --stale-drift-handoff`
from this worktree.

| Field | Value |
| --- | --- |
| Applicable | `false` |
| Reproducibility outcome | `matches-deterministic-generation` |
| Not-applicable reason | Story 004 does not apply; artifact is reproducible from canonical sources |
| Page refill hold rule | Hold page refills until root artifact is clean or explicitly accepted |
| Operator-safe actions | none (stale drift lane not active) |

When reproducibility is `differs-from-deterministic-generation` or
`missing-canonical-source-table`, the handoff emits preserve, restore-from-main,
restore-from-head, regenerate, and verify-after-cleanup actions scoped to only
`src/lib/content/generated/table-registry.generated.ts`.

## Preserve policy

* Do not revert, restore, stage, unstage, clean, delete, overwrite, or commit
  `src/lib/content/generated/table-registry.generated.ts` during evidence capture.
* Hold page refills until reproducibility proof (story 002) and the single
  allowed outcome lane (stories 003–005) are resolved.
