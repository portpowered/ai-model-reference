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
  operator-safe preserve/restore/regenerate/verify actions, and page-refill hold rule; story 005
  active-lane ownership handoff (`classifyGeneratedTableRegistryActiveLaneOwnershipApplicable`,
  `buildGeneratedTableRegistryActiveLaneOwnershipHandoff`) with worktree-drift ownership evidence,
  linkage-backed PR metadata, explicit refill hold rule, and not-applicable paths for clean or ownerless drift;
  `resolveGeneratedTableRegistryProofContext` keeps drift evidence, reproducibility, validation, and `--apply`
  on the main repo root checkout when invoked from nested worktrees.
* `src/lib/factory/generated-table-registry-root-drift-cleanup-proof.test.ts` —
  fixture diff/status tests plus temp-git-repo integration proving the report
  script does not mutate porcelain state, including nested-worktree regression
  where root and worktree artifacts differ.
* `scripts/report-generated-table-registry-root-drift-cleanup-proof.ts` —
  planner-facing CLI with `--repo-root`, optional `--checkout-repo-path` override,
  `--remote-base-ref`,
  `--status-output`, `--diff-output`, `--generated-at-utc`, and `--json` /
  `--format json`. Does not invoke `you`.

## Upstream evidence reuse

* `src/lib/factory/merged-pr-drain-rows-reconciliation.ts` — `resolveMainRepoRoot`
  so nested worktrees resolve the main root checkout; paired with
  `resolveGeneratedTableRegistryProofContext` so reproducibility/apply use that
  root checkout instead of the invocation worktree path.
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
| Record active-lane ownership when drift is PR-owned (story 005) | `bun run report:generated-table-registry-root-drift-cleanup-proof -- --active-lane-ownership` |
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

## Live root evidence (2026-07-03T06:11:11Z UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --full-proof --json`
from this worktree. Drift evidence, reproducibility, expected-output, and apply
all target the main repo root checkout (`checkoutRepoPath` =
`/Users/abdifamily/work/learn-agent-factories`) even though invocation came from
this nested worktree.

| Field | Value |
| --- | --- |
| Root repo path | `/Users/abdifamily/work/learn-agent-factories` |
| Invocation repo path | `/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/generated-table-registry-root-drift-cleanup-proof` |
| Proof target uses root checkout | `true` |
| `origin/main` SHA | `f39808ba0cacda29eacb3a3c9893493aabd48282` |
| Root `HEAD` SHA | `f39808ba0cacda29eacb3a3c9893493aabd48282` |
| Ahead / behind | `0` / `0` (aligned) |
| Generated artifact cleanliness | `dirty` (root checkout has unrelated staged drift at capture time) |
| Generated artifact diff | empty at capture time (staged-only drift) |
| `looped-transformers-comparison` diff highlights | none at capture time |

The PRD customer ask referenced root checkout that was 9 commits behind with
dirty `table-registry.generated.ts` looped-transformers entries. The current
live proof shows root aligned with `origin/main` while the generated artifact
may be dirty from unrelated root checkout work; reproducibility still evaluates
the root checkout artifact and reports `matches-deterministic-generation`.

Prior captures remain historical:
- 2026-07-03T05:02:04Z UTC — root 31 commits behind, artifact clean
- 2026-07-03T03:27:47Z UTC — root aligned at `a0c57068...`

Re-run the proof command above for the current `origin/main` / ahead-behind
relationship.

## Live reproducibility proof (2026-07-03T06:11:11Z UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --full-proof`
from this worktree.

| Field | Value |
| --- | --- |
| Checkout repo path | `/Users/abdifamily/work/learn-agent-factories` (main root, not worktree) |
| Proof target uses root checkout | `true` |
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

## Live expected-output outcome (2026-07-03T06:11:11Z UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --full-proof`
from this worktree.

| Field | Value |
| --- | --- |
| Checkout repo path | `/Users/abdifamily/work/learn-agent-factories` |
| Outcome kind | `land-minimal-expected-output-required` |
| Reproducibility outcome | `matches-deterministic-generation` |
| Root generated artifact cleanliness | `dirty` |
| Validation command | `bun run verify:table-registry` |
| Looped-transformers table discoverable | `true` (`table.looped-transformers-comparison`) |
| Looped-transformers source discoverable | `true` (`looped-transformers-comparison.json`) |
| Changed paths | none (`--apply` not requested) |
| Unrelated paths note | No unrelated dirty root paths were modified, reverted, staged, overwritten, or deleted. |
| Operational summary | Expected looped-transformers generated entries while root artifact is dirty; land minimal regenerated artifact after `bun run generate:table-registry`. |

Stories 004–005 apply only when reproducibility is **not**
`matches-deterministic-generation` or when drift belongs to an active PR lane.

## Live stale-drift handoff (2026-07-03T06:11:11Z UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --full-proof`
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

## Live active-lane ownership (2026-07-03T06:11:11Z UTC)

Captured via
`bun run report:generated-table-registry-root-drift-cleanup-proof -- --full-proof`
from this worktree.

| Field | Value |
| --- | --- |
| Applicable | `false` |
| Root generated artifact cleanliness | `dirty` |
| Not-applicable reason | Story 005 does not apply because worktree drift discovery is unavailable without queue/worktree inputs |
| Page refill hold rule | Hold page refills until the owning active lane lands, refreshes, or releases the generated artifact |
| Ownership evidence | watchdog/linkage command references only (no dirty artifact to attribute) |

When root `table-registry.generated.ts` is dirty and the worktree drift watchdog
attributes it to a single active lane, the handoff names the owning lane, branch,
PR number, worktree path, and explicit refill hold rule until that lane lands or
releases the artifact.

## Preserve policy

* Do not revert, restore, stage, unstage, clean, delete, overwrite, or commit
  `src/lib/content/generated/table-registry.generated.ts` during evidence capture.
* Hold page refills until reproducibility proof (story 002) and the single
  allowed outcome lane (stories 003–005) are resolved.
