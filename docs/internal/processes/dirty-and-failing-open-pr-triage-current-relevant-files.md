# Dirty and Failing Open PR Triage — Evidence Snapshot

Planner-facing evidence for the `dirty-and-failing-open-pr-triage-current` lane.
Captured **2026-07-02T21:00:00Z UTC**. This lane triages PRs #293, #292, #288,
#283, #279, and #277 with fresh branch, worktree, check, mergeability, and PR
conversation evidence. Story 001 records evidence only; per-lane outcomes are
assigned in stories 002–007.

## `origin/main` identity (mergeability base)

| Field | Value |
| --- | --- |
| `origin/main` SHA | `a502405d49badc50b8b3c0ea49cd8d35a402738e` |
| Fetched at (UTC) | 2026-07-02T21:00:00Z |
| Triage worktree branch | `dirty-and-failing-open-pr-triage-current` |
| Triage worktree HEAD | `a502405d` (matches `origin/main`) |
| Triage worktree dirty paths | 0 (clean before evidence doc commit) |

Commands:

```bash
git fetch origin main
git rev-parse origin/main
git worktree list
```

## Stale queue notes vs fresh evidence

The customer ask listed these lanes as dirty/unstable/failing. Fresh evidence
below supersedes that queue snapshot where it diverges.

| PR | Stale queue note | Fresh evidence summary (2026-07-02 UTC) |
| --- | --- | --- |
| #293 | failing test/CI | **11/11 CI checks SUCCESS**; `MERGEABLE` / `CLEAN`; blocking review on unrelated `progress.txt` deletion in PR diff |
| #292 | DIRTY, no checks | **MERGED** at 2026-07-02T21:04:48Z on head `46f76782`; last CI 11/11 SUCCESS; stale "no checks" and "DIRTY" notes obsolete |
| #288 | UNSTABLE, failing test/CI | **MERGED** at 2026-07-02T19:58:31Z; last head CI 11/11 SUCCESS; no further triage action |
| #283 | DIRTY, passing checks | **11/11 CI checks SUCCESS** on head `c120a785`; `MERGEABLE` / `CLEAN`; worktree clean except untracked local `progress.txt`; conflict refresh complete per PR conversation |
| #279 | DIRTY, passing checks | Last recorded CI **11/11 SUCCESS** (2026-07-02T12:41Z); GitHub now **`CONFLICTING` / `DIRTY`**; `merge-tree` conflict in `src/tests/search/search-page-panel.test.tsx`; blocking review: local `make test` failed |
| #277 | DIRTY, passing checks | Last recorded CI **11/11 SUCCESS** (2026-07-02T14:27Z); GitHub now **`CONFLICTING` / `DIRTY`**; `merge-tree` conflict in `src/tests/search/search-api.test.ts`; blocking review: merge attempt failed |

## Per-lane evidence records

### PR #293 — `blog-content-collection-loader`

| Field | Value |
| --- | --- |
| Branch | `blog-content-collection-loader` |
| Head SHA (remote) | `661856de61e42b7f28b86b190eb2635d21faa2d3` |
| PR state | OPEN |
| Mergeability (GitHub) | `MERGEABLE` / `CLEAN` |
| Mergeability (`merge-tree` vs `origin/main`) | no conflict markers |
| Behind/ahead `origin/main` | 20 behind / 7 ahead |
| CI status | **passing** — lint, typecheck, test, test-verify-contract, coverage, test-build-contract, build-export, test-integration, validate-data, linkcheck, ci — all SUCCESS (run 28618847002, completed ~2026-07-02T20:22Z UTC) |
| Worktree path | `.claude/worktrees/blog-content-collection-loader` |
| Worktree dirty paths | `M src/lib/content/generated/table-registry.generated.ts` (generated drift); `?? progress.txt` (untracked local) |
| PR conversation (blocking) | **REJECTED/BLOCKING** — unrelated `progress.txt` deletion (65 lines removed) still in PR diff; lane isolation violation |

Preliminary lane outcome for story 002: **active-review handoff** or **focused test fix** — CI is green but review blocks on removing `progress.txt` from the PR diff.

#### Story 002 lane outcome (2026-07-02T22:05:00Z UTC)

| Field | Value |
| --- | --- |
| Head SHA (after fix) | `daab2e84` |
| Failing CI at triage time | **none** — stale queue note "failing test/CI" superseded; 11/11 SUCCESS on prior head `661856de` |
| Prior CI failure (resolved) | `test` job SIGTERM at 5-minute timeout before merge with `main`; fixed by adopting main's per-matrix timeout budget |
| Blocking review feedback | **REJECTED/BLOCKING** — `progress.txt` deleted in PR diff (unrelated `prefill-decode-split-concept-page` lane state) |
| Fix applied | Restored `progress.txt` from `origin/main` on `blog-content-collection-loader` (`daab2e84`); PR diff no longer touches `progress.txt` |
| Blog-loader cause? | **no** — loader tests and CI pass; blocker was scope-isolation churn, not loader behavior |
| **Final lane outcome** | **active-review handoff** — CI green, mergeable, blocking `progress.txt` deletion addressed; awaiting reviewer re-check |

### PR #292 — `tokens-per-second-glossary-page`

| Field | Value |
| --- | --- |
| Branch | `tokens-per-second-glossary-page` |
| Head SHA (remote) | `46f76782c335ead7a69fe9f48cf2d72be8192689` |
| PR state | OPEN |
| Mergeability (GitHub) | `MERGEABLE` / `CLEAN` |
| Mergeability (`merge-tree` vs `origin/main`) | no conflict markers |
| Behind/ahead `origin/main` | 49 behind / 7 ahead |
| CI status | **passing** — 11/11 SUCCESS (run 28619543307, completed ~2026-07-02T20:35Z UTC) |
| Worktree path | `.claude/worktrees/tokens-per-second-glossary-page` |
| Worktree dirty paths | `?? progress.txt` (untracked local only) |
| PR conversation | Surface-audit **BLOCKING** addressed on `46f76782`; author posted fix mapping; no newer BLOCKING conversation comment |

Preliminary lane outcome for story 003: **merge-ready handoff** pending CI confirmation on latest push (checks now present and green; stale "no checks" note is obsolete).

#### Story 003 lane outcome (2026-07-02T22:15:00Z UTC)

| Field | Value |
| --- | --- |
| Head SHA at merge | `46f76782c335ead7a69fe9f48cf2d72be8192689` |
| PR state | **MERGED** (2026-07-02T21:04:48Z UTC by AndreasAbdi) |
| Stale queue notes superseded | "DIRTY" and "no checks" — checks were triggered and 11/11 SUCCESS on head before merge |
| Prior blocking feedback | **REJECTED/BLOCKING** surface-audit over-budget on shared test paths |
| Fix applied (on lane branch) | Removed `tokens-per-second-slice-verification.test.tsx`, reverted `memory-system-page.test.ts`, narrowed aliases — audit `within-budget / keep-routine` on `46f76782` |
| Reviewer follow-up | **Review complete — previous BLOCKING feedback cleared** (2026-07-02T21:04:40Z UTC); merged immediately after |
| Worktree dirty state | `?? progress.txt` only (untracked factory local; not in PR diff) |
| Browser / page verification | Page shipped on `main` via merge; no additional triage edits required on this lane |
| **Final lane outcome** | **merge-complete** — no further triage action; reconcile queue/drain tokens only |

### PR #288 — `looped-transformers`

| Field | Value |
| --- | --- |
| Branch | `looped-transformers` |
| Head SHA at merge | `feaa2f9fe2ba001f3802c8305e437b6cfbe438a8` |
| PR state | **MERGED** (2026-07-02T19:58:31Z by AndreasAbdi) |
| Mergeability | N/A (merged) |
| CI status at last head | **passing** — 11/11 SUCCESS (run 28615638409) |
| Worktree path | `.claude/worktrees/looped-transformers` |
| Worktree dirty paths | `?? progress.txt` (untracked local); HEAD `feaa2f9f` is 32 behind / 0 ahead `origin/main` |
| PR conversation | Reviewer **Ready to merge**; prior blocking comments superseded |

Preliminary lane outcome for story 004: **merge-complete** — no further triage action; reconcile queue/drain tokens only.

### PR #283 — `gated-deltanet`

| Field | Value |
| --- | --- |
| Branch | `gated-deltanet` |
| Head SHA (remote) | `c120a78501692fefbe26b06ec6fa538a57840d5f` |
| PR state | OPEN |
| Mergeability (GitHub) | `MERGEABLE` / `CLEAN` |
| Mergeability (`merge-tree` vs `origin/main`) | no conflict markers |
| Behind/ahead `origin/main` | 49 behind / 11 ahead |
| CI status | **passing** — 11/11 SUCCESS (run 28616230564, completed ~2026-07-02T19:35Z UTC) |
| Worktree path | `.claude/worktrees/gated-deltanet` |
| Worktree dirty paths | `?? progress.txt` (untracked local only) |
| PR conversation | Conflict refresh complete on `c120a785`; CI green; **MERGEABLE** confirmed in conversation |

Preliminary lane outcome for story 005: **merge-ready handoff** or **active-review handoff** — conflict refresh done; checks passing.

### PR #279 — `generic-site-config-neutral-surfaces`

| Field | Value |
| --- | --- |
| Branch | `generic-site-config-neutral-surfaces` |
| Head SHA (remote) | `e5defbc8babefd3da5a1a9f4304e9763f3545e40` |
| PR state | OPEN |
| Mergeability (GitHub) | **`CONFLICTING` / `DIRTY`** |
| Mergeability (`merge-tree` vs `origin/main`) | **CONFLICT** in `src/tests/search/search-page-panel.test.tsx` |
| Behind/ahead `origin/main` | 156 behind / 6 ahead |
| CI status | **stale passing** — last full CI 11/11 SUCCESS at 2026-07-02T12:41Z UTC (run 28590483500); no CI on current `origin/main` divergence |
| Worktree path | `.claude/worktrees/generic-site-config-neutral-surfaces` |
| Worktree dirty paths | `?? progress.txt` (untracked local only) |
| PR conversation | **REJECTED/BLOCKING** — local `make test` failed (a11y test) despite remote CI green; conflict drift now also blocks merge |

Preliminary lane outcome for story 006: **conflict refresh** plus **focused test fix** — merge conflicts and local test gate failure both block.

### PR #277 — `generic-search-ai-enrichment-plugin`

| Field | Value |
| --- | --- |
| Branch | `generic-search-ai-enrichment-plugin` |
| Head SHA (remote) | `6a1530a0ce11a9633760a7595b14e17038e4df39` |
| PR state | OPEN |
| Mergeability (GitHub) | **`CONFLICTING` / `DIRTY`** |
| Mergeability (`merge-tree` vs `origin/main`) | **CONFLICT** in `src/tests/search/search-api.test.ts` |
| Behind/ahead `origin/main` | 144 behind / 8 ahead |
| CI status | **stale passing** — last full CI 11/11 SUCCESS at 2026-07-02T14:27Z UTC (run 28597394054); checks stale vs current `origin/main` |
| Worktree path | `.claude/worktrees/generic-search-ai-enrichment-plugin` |
| Worktree dirty paths | `?? progress.txt` (untracked local only) |
| PR conversation | **BLOCKING MERGE** — `gh pr merge 277 --merge` failed; requires merge/rebase with `origin/main` and conflict resolution |

Preliminary lane outcome for story 007: **conflict refresh** — primary blocker is merge conflicts, not failing CI on last recorded head.

## Evidence commands (reproducible)

```bash
# Base revision
git fetch origin main && git rev-parse origin/main

# Live PR metadata and checks
for pr in 293 292 288 283 279 277; do
  gh pr view $pr --json number,title,headRefName,state,mergeable,mergeStateStatus,statusCheckRollup,updatedAt
done

# PR conversation feedback (single feedback channel)
for pr in 293 292 288 283 279 277; do
  gh pr view $pr --comments
done

# Local worktree dirt
for branch in blog-content-collection-loader tokens-per-second-glossary-page looped-transformers gated-deltanet generic-site-config-neutral-surfaces generic-search-ai-enrichment-plugin; do
  git -C ".claude/worktrees/$branch" status --porcelain
done

# Merge-tree conflict probe vs current origin/main
MAIN=$(git rev-parse origin/main)
for branch in blog-content-collection-loader tokens-per-second-glossary-page gated-deltanet generic-site-config-neutral-surfaces generic-search-ai-enrichment-plugin; do
  git merge-tree "$MAIN" "origin/$branch"
done
```

## Check/CI status legend

| Status | PRs |
| --- | --- |
| **passing** (current head) | #293, #283 |
| **passing** (merged / terminal) | #288, #292 |
| **stale passing** (CI green on old head; branch now conflicts with `origin/main`) | #279, #277 |
| **missing checks** | none (stale #292 note obsolete) |
| **failing checks** | none on current recorded heads |
| **pending checks** | none at evidence capture time |

## Local worktree dirt patterns

- Untracked `progress.txt` appears in all six lane worktrees (factory local-only
  artifact; not part of review branches unless accidentally committed).
- `blog-content-collection-loader` also has modified
  `table-registry.generated.ts` (generated drift from local prepare/typecheck).
- PR #293 had `progress.txt` **deletion** in the remote PR diff (story 002
  restored from `origin/main` on `daab2e84`; no longer in PR diff).

## Story 001 quality gate (this worktree)

| Gate | Result |
| --- | --- |
| `bun run typecheck` | PASS |
| `bun run lint` | PASS (4 pre-existing warnings) |
| Source changes | evidence doc only (`docs/internal/processes/dirty-and-failing-open-pr-triage-current-relevant-files.md`) |
