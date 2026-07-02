# Dirty and Failing Open PR Triage — Evidence Snapshot

Planner-facing evidence for the `dirty-and-failing-open-pr-triage-current` lane.
Captured **2026-07-02T21:00:00Z UTC**. This lane triages PRs #293, #292, #288,
#283, #279, and #277 with fresh branch, worktree, check, mergeability, and PR
conversation evidence. Story 001 records evidence only; per-lane outcomes are
assigned in stories 002–007.

## `origin/main` identity (mergeability base)

| Field | Value |
| --- | --- |
| `origin/main` SHA | `099b7198a73505948a073f77b546cd412da5afc8` |
| Fetched at (UTC) | 2026-07-02T21:15:00Z |
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
| #283 | DIRTY, passing checks | **11/11 CI SUCCESS** on head `c120a785`; `MERGEABLE` / `CLEAN`; worktree clean except untracked `progress.txt`; prior BLOCKING local `make test` on `4c6abf3a` superseded — clean `make test` on `c120a785` (3617 pass, 0 fail) |
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

#### Story 004 lane outcome (2026-07-02T21:12:00Z UTC)

| Field | Value |
| --- | --- |
| Head SHA at merge | `feaa2f9fe2ba001f3802c8305e437b6cfbe438a8` |
| Merge commit | `91f6beb3d048fc0d46f5173b78a7ebc14dc6d3c9` |
| PR state | **MERGED** (2026-07-02T19:58:31Z UTC by AndreasAbdi) |
| Stale queue notes superseded | "UNSTABLE" and "failing test/CI" — prior `test` SIGTERM at 300s timeout resolved by merging main CI stabilizations (`timeout_minutes: 6`, discovery smoke cache reuse); 11/11 SUCCESS on merge head |
| Prior blocking feedback | **REJECTED/BLOCKING** surface-audit over-budget and page-specific meta tests in shared verification paths |
| Fix applied (on lane branch) | Removed page-specific meta tests/helpers; split audit infrastructure to throughput PR #291; set `conceptType: looped-transformer-architecture`; merged main through `feaa2f9f` for inherited timeout fix |
| Reviewer follow-up | **Ready to merge** (latest PR conversation comment supersedes/clears blocking feedback); merged after all 11/11 CI SUCCESS |
| Worktree dirty state | `?? progress.txt` only (untracked factory local; not in PR diff); HEAD 40 behind `origin/main` (expected post-merge) |
| Browser / page verification | Page shipped on `main` via merge; prior lane verification confirmed title, graph, math, citation on built route |
| **Final lane outcome** | **merge-complete** — no further triage action; reconcile queue/drain tokens only |

### PR #283 — `gated-deltanet`

| Field | Value |
| --- | --- |
| Branch | `gated-deltanet` |
| Head SHA (remote) | `c120a78501692fefbe26b06ec6fa538a57840d5f` |
| PR state | OPEN |
| Mergeability (GitHub) | `MERGEABLE` / `CLEAN` |
| Mergeability (`merge-tree` vs `origin/main`) | no conflict markers |
| Behind/ahead `origin/main` | 57 behind / 11 ahead (as of 2026-07-02T21:15Z UTC) |
| CI status | **passing** — 11/11 SUCCESS (run 28616230564, completed ~2026-07-02T19:35Z UTC) |
| Worktree path | `.claude/worktrees/gated-deltanet` |
| Worktree dirty paths | `?? progress.txt` (untracked local only) |
| PR conversation | Conflict refresh complete on `c120a785`; CI green; prior **BLOCKING** local `make test` on `4c6abf3a` (2026-07-02T17:13Z UTC) |

Preliminary lane outcome for story 005: **merge-ready handoff** or **active-review handoff** — conflict refresh done; checks passing.

#### Story 005 lane outcome (2026-07-02T21:36:00Z UTC)

| Field | Value |
| --- | --- |
| Head SHA (triage time) | `c120a78501692fefbe26b06ec6fa538a57840d5f` |
| Dirty state | **clean** — only untracked factory `progress.txt`; no committed or modified paths in lane worktree |
| CI status | **passing** — 11/11 SUCCESS on head `c120a785` (unchanged since conflict refresh) |
| Mergeability (GitHub) | `MERGEABLE` / `CLEAN` |
| Mergeability (`merge-tree` vs `origin/main` @ `099b7198`) | no conflict markers |
| Prior blocking feedback | **BLOCKING** local `make test` failed on head `4c6abf3a` (2026-07-02T17:13Z UTC); conflict refresh to `c120a785` did not include explicit clean-rerun reply |
| Local quality gate rerun | `make test` on clean `gated-deltanet` worktree @ `c120a785`: **PASS** — 3617 pass, 0 fail (~1241s, completed 2026-07-02T21:36:15Z UTC) |
| Review state | No open review decision; awaiting reviewer re-check after blocking local-test feedback addressed |
| Browser / page verification | Prior lane verification on built route; no new page edits this triage pass |
| **Final lane outcome** | **active-review handoff** — CI green, mergeable, conflict refresh complete, local `make test` clean on refreshed head; awaiting reviewer re-check |

### PR #279 — `generic-site-config-neutral-surfaces`

| Field | Value |
| --- | --- |
| Branch | `generic-site-config-neutral-surfaces` |
| Head SHA (remote) | `49454b53` (after story 006 conflict refresh) |
| PR state | OPEN |
| Mergeability (GitHub) | **`MERGEABLE` / `CLEAN`** on head `49454b53` |
| Mergeability (`merge-tree` vs `origin/main` @ `9fa3fa8b`) | **no conflict markers** after merge commit `49454b53` |
| Behind/ahead `origin/main` | 0 behind / 7 ahead (after merge) |
| CI status | **passing** — 11/11 SUCCESS on head `49454b53` (run 28624672849, completed ~2026-07-02T22:14Z UTC) |
| Worktree path | `.claude/worktrees/generic-site-config-neutral-surfaces` |
| Worktree dirty paths | clean except untracked `progress.txt.bak` (factory local) |
| PR conversation | Prior **BLOCKING** local `make test` a11y timeout on `e5defbc8`; merge with main adopts 30s a11y timeout from `origin/main` |

Preliminary lane outcome for story 006: **conflict refresh** complete; **focused test fix** inherited from main for a11y timeout.

#### Story 006 lane outcome (2026-07-02T22:10:00Z UTC)

| Field | Value |
| --- | --- |
| Head SHA (after fix) | `49454b53` |
| Stale evidence superseded | Story 001 `CONFLICTING`/`DIRTY` and stale CI on `e5defbc8`; prior merge-conflict fix on `e5defbc8` superseded by main advance to `9fa3fa8b` |
| Conflict refresh | Merged `origin/main` into `generic-site-config-neutral-surfaces`; resolved single conflict in `src/tests/search/search-page-panel.test.tsx` — kept classification handoff priming plus main's locale-aware `primeDocsSearchClient` and `findSearchPageResults` |
| Prior blocking feedback | **BLOCKING** local `make test` — `search-page-panel.a11y.test.tsx` empty-results test timed out at 15s on head `e5defbc8` |
| Fix applied | Main merge brings 30s default timeout and per-test 30s timeout for empty-results a11y smoke; classification handoff tests retain priming/wait helpers |
| Local validation | `bun test` classification handoff (4 pass) + a11y empty-results (1 pass); `bun run typecheck` + `bun run lint` pass; CI 11/11 SUCCESS on `49454b53` |
| **Final lane outcome** | **active-review handoff** — conflict refresh complete, blocking a11y timeout addressed, CI green on `49454b53`; awaiting reviewer re-check |

### PR #277 — `generic-search-ai-enrichment-plugin`

| Field | Value |
| --- | --- |
| Branch | `generic-search-ai-enrichment-plugin` |
| Head SHA (remote) | `6c47de90` (after story 007 conflict refresh) |
| PR state | OPEN |
| Mergeability (GitHub) | **`MERGEABLE` / `CLEAN`** on head `6c47de90` |
| Mergeability (`merge-tree` vs `origin/main` @ `9fa3fa8b`) | **no conflict markers** after merge commit `6c47de90` |
| Behind/ahead `origin/main` | 0 behind / 9 ahead (after merge) |
| CI status | **passing** — 11/11 SUCCESS on head `6c47de90` (run 28625164329, completed ~2026-07-02T22:38Z UTC) |
| Worktree path | `.claude/worktrees/generic-search-ai-enrichment-plugin` |
| Worktree dirty paths | `M table-registry.generated.ts` (generated drift); `?? progress.txt.bak` (factory local) |
| PR conversation | Prior **BLOCKING MERGE** (2026-07-02T14:59:47Z UTC) addressed via main merge and conflict resolution |

Preliminary lane outcome for story 007: **active-review handoff** after conflict refresh.

#### Story 007 lane outcome (2026-07-02T22:30:00Z UTC)

| Field | Value |
| --- | --- |
| Head SHA (after fix) | `6c47de901ca4bbdfa2700c6d26760ac54f087c81` |
| Stale evidence superseded | Story 001 `CONFLICTING`/`DIRTY` and stale CI on `6a1530a0`; prior review CLEAR on `6a1530a0` superseded by main advance |
| Conflict refresh | Merged `origin/main` @ `9fa3fa8b`; resolved conflicts in `search-api.test.ts` (combined `setDefaultTimeout` + `LIVE_SEARCH_API_GATE_TIMEOUT_MS`) and `search-page-panel.test.tsx` (main's `expectFirstSearchResultMatch` + 30s GQA waits; retained classification handoff priming) |
| Prior blocking feedback | **BLOCKING MERGE** — `gh pr merge 277 --merge` failed because merge commit could not be created cleanly |
| Fix applied | Main merge + conflict resolution pushed as `6c47de90`; merge state now `MERGEABLE`/`CLEAN` |
| Local validation | `bun run typecheck` + `bun run lint` pass; focused search tests 97 pass, 0 fail |
| **Final lane outcome** | **active-review handoff** — conflict refresh complete, mergeable, 11/11 CI SUCCESS on `6c47de90`; awaiting reviewer re-check |

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
| **stale passing** (CI green on old head; branch now conflicts with `origin/main`) | none (stale #279/#277 notes superseded by story 006/007 conflict refresh) |
| **pending checks** (conflict refresh pushed; CI rerun in flight) | none at story 007 completion |
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
