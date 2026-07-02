# Merged PR Drain Rows Reconciliation — Evidence Snapshot

Planner-facing read-only evidence for reconciling stale queue drain rows whose
PRs are already merged into current `origin/main`: PR #281 (`ltx-23`), PR #282
(`MAMBA`), PR #284 (`glossary-decomposition`), and PR #286 (`bpe-page`).

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes).
Documented session `0fdc5077-95ed-4396-a183-06e5b16555ca` returns 404 in this
environment.

## Origin/main and root checkout (2026-07-02 UTC)

| Field | Value |
| --- | --- |
| `origin/main` SHA | `209d1bd8ced0cced5fd99992fe50f23296d126e8` |
| Root repo path | `/Users/abdifamily/work/learn-agent-factories` |
| Root dirty paths | `0` at capture time |

## Live evidence command

```bash
bun run report:merged-pr-drain-rows-reconciliation
```

Fixture-backed unit tests:

```bash
bun test src/lib/factory/merged-pr-drain-rows-reconciliation.test.ts
```

## Observed report (2026-07-02T19:17:41Z UTC)

```txt
Merged PR Drain Rows Reconciliation
generated-at=2026-07-02T19:17:41.381Z session=930b51a6-07ce-44e6-a639-7a6217f6e864
origin-main-sha=209d1bd8ced0cced5fd99992fe50f23296d126e8 remote-base-ref=origin/main root-dirty-paths=0 root-repo=/Users/abdifamily/work/learn-agent-factories

Rows
- work-item=ltx-23 pr=#281 branch=ltx-23
  pull-request-truth state=MERGED merged-at=2026-07-02T17:15:16Z merge-commit=d9ef966b7ecaa46cc19699033ec7d8bfdca16e24 merge-in-origin-main-lineage=true
  content-lane-queue-tokens count=4
    - work-item=ltx-23 type=idea state=complete/terminal ...
    - work-item=ltx-23 type=plan state=complete/terminal ...
    - work-item=ltx-23 type=review state=complete/terminal ...
    - work-item=ltx-23 type=task state=complete/terminal ...
  drain-row-queue-tokens count=1
    - work-item=ltx-23-pr281-drain type=idea state=init/initial ...
  worktree-metadata availability=present path=/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/ltx-23
    stamped-pr=#281 branch-linkage=current pr-linkage=current head=a7a4ecceccabbc2dfdb47683393911bc38902e15
  merged-vs-queue-truth merged-pr-truth=merged-into-origin-main; content-lane-queue-truth=content-lane-terminal-complete; drain-row-queue-truth=drain-row-initial; queue-completion-truth-is-not-inferred-from-pr-status-alone

- work-item=MAMBA pr=#282 branch=MAMBA
  pull-request-truth state=MERGED merged-at=2026-07-02T17:39:20Z merge-commit=d22d1e0dd88f94341fc6a8590eff26aaac29ce51 merge-in-origin-main-lineage=true
  content-lane-queue-tokens count=4 (idea/plan/review/task all complete/terminal)
  drain-row-queue-tokens count=1
    - work-item=mamba-pr282-drain type=idea state=init/initial ...
  worktree-metadata availability=present path=.../MAMBA stamped-pr=#282 head=bbe2f2d2a6045b6a463145d0eacd48e11bd0d1bd
  merged-vs-queue-truth merged-pr-truth=merged-into-origin-main; content-lane-queue-truth=content-lane-terminal-complete; drain-row-queue-truth=drain-row-initial

- work-item=glossary-decomposition pr=#284 branch=glossary-decomposition
  pull-request-truth state=MERGED merged-at=2026-07-02T17:55:13Z merge-commit=737acd35b88214436317217a3dfdb6e8e5e067bd merge-in-origin-main-lineage=true
  content-lane-queue-tokens count=4 (idea/plan/review/task all complete/terminal)
  drain-row-queue-tokens count=1
    - work-item=glossary-decomposition-pr284-conflict-refresh type=idea state=init/initial ...
  worktree-metadata availability=present path=.../glossary-decomposition stamped-pr=#284 head=b9d6e59efdeeef9b9e5154d6034ba2ad02569af2
  merged-vs-queue-truth merged-pr-truth=merged-into-origin-main; content-lane-queue-truth=content-lane-terminal-complete; drain-row-queue-truth=drain-row-initial

- work-item=bpe-page pr=#286 branch=bpe-page
  pull-request-truth state=MERGED merged-at=2026-07-02T16:31:24Z merge-commit=52cfeb699497dac6fac560a367efaed021135582 merge-in-origin-main-lineage=true
  content-lane-queue-tokens count=4 (idea/plan/review/task all complete/terminal)
  drain-row-queue-tokens count=0 (no dedicated drain row)
  worktree-metadata availability=present path=.../bpe-page stamped-pr=#286 head=127b6c69fa09c97c4051e4ab61819e57bd8ecaa1
  merged-vs-queue-truth merged-pr-truth=merged-into-origin-main; content-lane-queue-truth=content-lane-terminal-complete; drain-row-queue-truth=no-drain-row
```

## Merged PR truth vs queue completion truth

All four PRs report `state=MERGED` with merge commits present in `origin/main`
lineage. Content lanes (`ltx-23`, `MAMBA`, `glossary-decomposition`,
`bpe-page`) are `complete/terminal` across idea, plan, task, and review tokens.

Drain rows remain non-terminal:

| Work item | Drain row | Queue state |
| --- | --- | --- |
| `ltx-23` | `ltx-23-pr281-drain` | `init` / INITIAL |
| `MAMBA` | `mamba-pr282-drain` | `init` / INITIAL |
| `glossary-decomposition` | `glossary-decomposition-pr284-conflict-refresh` | `init` / INITIAL |
| `bpe-page` | _(none)_ | no dedicated drain row |

Merged PR status alone does not close drain rows; queue completion truth is
recorded separately in the report `merged-vs-queue-truth` field per row.

## Core module and script

* `src/lib/factory/merged-pr-drain-rows-reconciliation.ts` — read-only evidence
  capture for the four named rows: queue tokens, GitHub PR truth via
  `gh pr view`, worktree lane metadata, `origin/main` identity, main-repo root
  checkout dirty-path count, and explicit merged-vs-queue truth distinction.
* `scripts/report-merged-pr-drain-rows-reconciliation.ts` — planner-facing CLI.
  Resolves main-repo worktrees via `git rev-parse --git-common-dir` so reports
  work from nested git worktrees.

## Fixture flags

* `--work-list-json`
* `--worktrees-dir`
* `--session`
* `--remote-base-ref`
* `--repo-root`
* `--json` / `--format json`

## Scope guardrails

This lane gathers evidence only. It does not edit page content, registry content,
queue rows, worktree files, or root checkout state.

## Verification for story 001

| Gate | Result |
| --- | --- |
| Typecheck | `bun run typecheck` — pass |
| Unit tests | `merged-pr-drain-rows-reconciliation.test.ts` — pass |
| Live report | `bun run report:merged-pr-drain-rows-reconciliation` — pass |
| Content/page payload | not modified |
