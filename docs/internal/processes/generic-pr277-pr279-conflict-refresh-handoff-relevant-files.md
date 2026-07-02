# Generic PR #277 / PR #279 Conflict Refresh Handoff — Evidence Snapshot

Planner-facing evidence for the `generic-pr277-pr279-conflict-refresh-handoff`
lane. Captured 2026-07-02 UTC. This lane decides whether PR #277 and PR #279
should be refreshed in their owned worktrees, handed off to the existing batch
066 drain items, or blocked — without duplicating drain work or broadening generic
shell scope.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session omits generic-shell page lanes)

## Original work item intent

| PR | Work item | Intent |
| --- | --- | --- |
| #277 | `generic-search-ai-enrichment-plugin` | Move AI-specific search facet enrichment behind a Model Atlas-owned adapter while keeping generic topology/base enrichment in shared search code. Shared enrichment must not import AI record types for model/module facets; AI facets (`modelFamily`, `sourceType`, `modalities`, `trainingRegimeIds`, `optimizes`) remain on current Model Atlas records via the builder adapter. |
| #279 | `generic-site-config-neutral-surfaces` | Make the shared `SiteConfig` contract domain-neutral (string route surface ids, arbitrary collection placeholders, generic home featured-link copy) while preserving `modelAtlasSiteConfig` and current header/home behavior. |

Both original worktree PRDs mark all implementation stories `passes: true`. Queue
tokens for the original lanes remain `idea:to-complete` with `task:failed` on
trace `trace-generic-shell-hardening-batch-002` because open PRs are blocked on
merge conflicts and review-loop quality gates, not incomplete implementation
stories.

## Batch 066 drain ownership (no duplicate drain work)

Batch 066 (`trace-green-pr-drain-and-conflict-triage-batch-066`) already owns
dedicated drain ideas for both PRs. This batch 073 handoff lane must not create
competing drain lanes.

| Work id | Type | State | Trace | Intended ownership |
| --- | --- | --- | --- | --- |
| `batch-green-pr-drain-and-conflict-triage-batch-066-generic-search-ai-enrichment-pr277-drain` | idea | `init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` | Inspect PR #277 queue tokens, lane metadata, and worktree state; complete review/consume, merge/hand off the green PR, or document the exact blocker. |
| `batch-green-pr-drain-and-conflict-triage-batch-066-generic-site-config-pr279-drain` | idea | `init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` | Inspect PR #279 queue tokens, lane metadata, and worktree state; complete review/consume, merge/hand off the green PR, or document the exact blocker. |

Command used:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name generic-search-ai-enrichment-pr277-drain --json
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 \
  --name generic-site-config-pr279-drain --json
```

Default-session lookup (`you work list --name … --json`) returns empty for all
four generic lane names. Documented session `0fdc5077-95ed-4396-a183-06e5b16555ca`
returns 404 (`factory session not found`) in this environment.

This lane (`batch-fresh-pr-drain-and-conflict-refresh-batch-073`) is a separate
planner handoff on trace `trace-fresh-pr-drain-and-conflict-refresh-batch-073`
with `idea:to-complete` and `work-task-91` at `task:init`. It gathers evidence
and selects recovery outcomes; it does not replace the batch 066 drain ideas.

## Lane metadata

### PR #277 — `generic-search-ai-enrichment-plugin`

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/generic-search-ai-enrichment-plugin`

| Field | Value |
| --- | --- |
| Lane metadata file | present |
| Work item name | `generic-search-ai-enrichment-plugin` |
| Branch | `generic-search-ai-enrichment-plugin` |
| Stamped PR | #277 (`linkage.pullRequest.status=current`) |
| Stamped branch linkage | `current` |
| Metadata refreshed at | 2026-07-02T17:01:25.270Z |
| Branch HEAD (remote) | `6a1530a0ce11a9633760a7595b14e17038e4df39` |

Lane metadata file:
`.claude/worktrees/generic-search-ai-enrichment-plugin/.claude/lane-metadata.json`

### PR #279 — `generic-site-config-neutral-surfaces`

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/generic-site-config-neutral-surfaces`

| Field | Value |
| --- | --- |
| Lane metadata file | present |
| Work item name | `generic-site-config-neutral-surfaces` |
| Branch | `generic-site-config-neutral-surfaces` |
| Stamped PR | #279 (`linkage.pullRequest.status=current`) |
| Stamped branch linkage | `current` |
| Metadata refreshed at | 2026-07-02T17:01:26.823Z |
| Branch HEAD (remote) | `e5defbc8babefd3da5a1a9f4304e9763f3545e40` |

Lane metadata file:
`.claude/worktrees/generic-site-config-neutral-surfaces/.claude/lane-metadata.json`

### This handoff lane

Worktree path:
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/generic-pr277-pr279-conflict-refresh-handoff`

| Field | Value |
| --- | --- |
| Work item name | `generic-pr277-pr279-conflict-refresh-handoff` |
| Stamped PR | null (`linkage.pullRequest.status=missing`) |
| Created at | 2026-07-02T17:20:41.786765Z |

## Live GitHub PR state (2026-07-02T17:30Z UTC)

### PR #277

| Field | Value |
| --- | --- |
| Number | 277 |
| Title | `generic-search-ai-enrichment-plugin` |
| URL | https://github.com/portpowered/ai-model-reference/pull/277 |
| State | OPEN |
| Mergeability | CONFLICTING |
| Merge state status | DIRTY |
| Head branch | `generic-search-ai-enrichment-plugin` |
| Base branch | `main` |
| Head SHA | `6a1530a0ce11a9633760a7595b14e17038e4df39` |
| Updated at | 2026-07-02T14:59:47Z |

All required CI checks on PR #277 report SUCCESS (lint, typecheck, test,
test-verify-contract, coverage, test-build-contract, build-export,
test-integration, validate-data, linkcheck, ci).

Latest PR conversation feedback (blocking unless superseded):

1. **BLOCKING MERGE** (2026-07-02T14:59:47Z): review clear and CI green on head
   `6a1530a0`, but `gh pr merge 277 --merge` failed — GitHub cannot create a
   clean merge commit. Suggested repair: merge or rebase `origin/main`, resolve
   conflicts, push, rerun checks.
2. **REVIEW CLEAR** (2026-07-02T14:56:54Z): supersedes earlier `make test`
   timeout blockers; local `make test` 3411 pass / 0 fail on `6a1530a0`.

### PR #279

| Field | Value |
| --- | --- |
| Number | 279 |
| Title | `generic-site-config-neutral-surfaces` |
| URL | https://github.com/portpowered/ai-model-reference/pull/279 |
| State | OPEN |
| Mergeability | CONFLICTING |
| Merge state status | DIRTY |
| Head branch | `generic-site-config-neutral-surfaces` |
| Base branch | `main` |
| Head SHA | `e5defbc8babefd3da5a1a9f4304e9763f3545e40` |
| Updated at | 2026-07-02T13:12:04Z |

All required CI checks on PR #279 report SUCCESS (same 11-check CI matrix as
#277).

Latest PR conversation feedback (blocking unless superseded):

1. **BLOCKING** (2026-07-02T13:12:04Z): local `make test` failed — one a11y
   search-page-panel smoke test timed out at 15s on head `e5defbc8`. GitHub CI
   and mergeability were CLEAN at the time of that comment; live inspection now
   reports DIRTY/CONFLICTING again.
2. Earlier merge-conflict and `make test` blockers were addressed in commits
   `95dd6861` and `e5defbc8` per follow-up comments; the latest blocking comment
   supersedes cleared merge-conflict feedback with a new local-gate failure.

## `origin/main` identity

| Field | Value |
| --- | --- |
| SHA | `d22d1e0dd88f94341fc6a8590eff26aaac29ce51` |
| Commit date | 2026-07-02T10:39:20-07:00 |
| Subject | Merge pull request #282 from portpowered/MAMBA |

Fetched with `git fetch origin main` (read-only) before recording SHAs.

## Branch drift vs `origin/main` (non-mutating)

| Branch | Ahead | Behind | Merge base |
| --- | ---: | ---: | --- |
| `origin/generic-search-ai-enrichment-plugin` | 8 | 58 | `798a0c7bd709d2a38037eecd6a01323507810e1b` |
| `origin/generic-site-config-neutral-surfaces` | 6 | 70 | `9136cb1ef90e1eb5942cf811b7310191c8a5ea93` |

Non-mutating `git merge-tree` conflict paths (changed in both):

**PR #277**

- `src/lib/content/time-to-first-token-discovery.test.tsx`
- `src/tests/search/search-api.test.ts`
- `src/tests/search/search-page-panel.test.tsx`

**PR #279**

- `src/tests/search/search-page-panel.test.tsx`

Both PR branches also carry lane-owned file deltas outside the conflict set (for
example PR #277 search enrichment adapter files; PR #279 site-config contract
files). Story 002 classifies refresh safety and collision risk from this drift
evidence.

## Related active generic-shell worktrees (collision context)

Present under `.claude/worktrees/` and potentially overlapping search, sidebar,
route, or site-config surfaces:

- `generic-search-ai-enrichment-plugin` (PR #277 owner)
- `generic-site-config-neutral-surfaces` (PR #279 owner)
- `generic-search-domain-enrichment-boundary`
- `generic-sidebar-ai-adapter-extraction`
- `generic-sidebar-collection-builder`
- `generic-browse-sections-from-collections`
- `generic-message-boundary-adapter`
- `generic-pr277-pr279-conflict-refresh-handoff` (this lane; evidence only in
  story 001)

Story 002 completed formal collision preflight below; no branch refresh was
attempted in this lane.

## Branch drift and collision classification (story 002)

Captured 2026-07-02T18:10Z UTC. Read-only `git fetch` plus `git merge-tree` and
`git rev-list` only; no branch mutation, queue movement, or content edits outside
this evidence document.

### Drift summary vs `origin/main` (`d22d1e0`)

| Branch | Ahead | Behind | Merge base |
| --- | ---: | ---: | --- |
| `origin/generic-search-ai-enrichment-plugin` | 8 | 58 | `798a0c7bd709d2a38037eecd6a01323507810e1b` |
| `origin/generic-site-config-neutral-surfaces` | 6 | 70 | `9136cb1ef90e1eb5942cf811b7310191c8a5ea93` |

Both branches remain far behind `origin/main` with open PRs reporting
`mergeable: CONFLICTING` and `mergeStateStatus: DIRTY` while all 11 required CI
checks report SUCCESS.

### Conflict paths (`git merge-tree`, changed in both)

**PR #277 — `generic-search-ai-enrichment-plugin`**

| Path | In lane-owned delta? | Notes |
| --- | --- | --- |
| `src/lib/content/time-to-first-token-discovery.test.tsx` | yes | content discovery test; main and lane both touched |
| `src/tests/search/search-api.test.ts` | yes | search API contract test aligned with enrichment adapter |
| `src/tests/search/search-page-panel.test.tsx` | yes | **shared** with PR #279 conflict set |

**PR #279 — `generic-site-config-neutral-surfaces`**

| Path | In lane-owned delta? | Notes |
| --- | --- | --- |
| `src/tests/search/search-page-panel.test.tsx` | yes | **only** conflict path; core site-config contract files merge cleanly |

Lane-owned deltas outside the conflict set remain intact (PR #277:
`enrich-search-document.ts`, `model-atlas-ai-search-enrichment-adapter.ts`, and
related search tests; PR #279: `site-config.contract.ts`,
`model-atlas-site-config.ts`, header/nav tests).

### Active generic worktree collision preflight

| Worktree | Queue state (session `930b51a6…`) | Overlap risk |
| --- | --- | --- |
| `generic-search-ai-enrichment-plugin` | `idea:to-complete` + `task:failed` on trace `trace-generic-shell-hardening-batch-002` | PR #277 owner — not a third-party collision |
| `generic-site-config-neutral-surfaces` | `idea:to-complete` + `task:failed` on trace `trace-generic-shell-hardening-batch-002` | PR #279 owner — not a third-party collision |
| `generic-sidebar-ai-adapter-extraction` | `idea:complete` / TERMINAL on trace `trace-generic-shell-hardening-batch-002` | sidebar surface; no active in-flight work |
| `generic-search-domain-enrichment-boundary` | no queue token in session | worktree present; no scheduled overlap |
| `generic-sidebar-collection-builder` | no queue token in session | worktree present; no scheduled overlap |
| `generic-browse-sections-from-collections` | no queue token in session | worktree present; no scheduled overlap |
| `generic-message-boundary-adapter` | no queue token in session | worktree present; no scheduled overlap |
| `generic-pr277-pr279-conflict-refresh-handoff` | `idea:to-complete` / `task:init` on trace `trace-fresh-pr-drain-and-conflict-refresh-batch-073` | evidence/handoff lane only |

No third-party generic lane is actively mutating search, sidebar, route, or
site-config surfaces in parallel. The collision risk is **cross-PR shared
surface** (`search-page-panel.test.tsx`) plus **batch 066 drain ownership**, not
an unrelated active lane.

### Batch 066 drain duplication check

| Drain idea | State | Trace |
| --- | --- | --- |
| `generic-search-ai-enrichment-pr277-drain` | `idea:init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` |
| `generic-site-config-pr279-drain` | `idea:init` / INITIAL | `trace-green-pr-drain-and-conflict-triage-batch-066` |

Refreshing either PR branch from this batch 073 handoff lane would duplicate the
existing batch 066 drain items that already own review/consume, merge, and
branch-refresh completion for PR #277 and PR #279.

### Selected outcome per PR (story 002)

| PR | Classification | Rationale |
| --- | --- | --- |
| #277 | **handoff-to-batch-066** | Conflicts span shared search test surfaces including `search-page-panel.test.tsx` (also conflicted on #279). Batch 066 `generic-search-ai-enrichment-pr277-drain` already owns refresh/merge completion. Refresh here would duplicate drain work and require coordinated judgment on the shared test file. |
| #279 | **handoff-to-batch-066** | Sole conflict is `search-page-panel.test.tsx`, outside core site-config contract files. Requires cross-surface judgment with PR #277 on the same test file. Batch 066 `generic-site-config-pr279-drain` owns completion. Latest PR conversation still has unresolved **BLOCKING** local `make test` a11y timeout on head `e5defbc8` (no later clearing comment). |

Neither PR is **refresh-safe** under story 002 rules: batch 066 drain ownership
prevents non-duplicative refresh from this lane, and the shared
`search-page-panel.test.tsx` conflict requires owner judgment across PRs.

Story 003 (in-lane refresh) does **not** run for either target. Story 004
(handoff to batch 066) is the selected path for both PRs.

## Evidence gathering constraints (stories 001–002)

- No git branch mutation, queue movement, staging, committing of target PR
  branches, or unrelated content editing occurred while gathering evidence.
- Only `git fetch` (read-only remote refresh) and non-mutating `git merge-tree`,
  drift queries, and `you work list` reads were used.
