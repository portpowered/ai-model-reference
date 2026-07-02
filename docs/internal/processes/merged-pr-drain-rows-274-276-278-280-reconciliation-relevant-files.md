# Merged PR Drain Rows #274/#275/#276/#278/#280 — Evidence Snapshot

Planner-facing evidence for the
`merged-pr-drain-rows-274-276-278-280-reconciliation` lane. Captured
2026-07-02 UTC. This lane reconciles stale drain rows for PRs already merged
into current `origin/main` without editing page content or reverting user/root
work.

Session: `930b51a6-07ce-44e6-a639-7a6217f6e864` (model-atlas content lanes;
default factory session omits page lanes)

## `origin/main` identity and root checkout (pre-mutation)

| Field | Value |
| --- | --- |
| `origin/main` SHA | `209d1bd8ced0cced5fd99992fe50f23296d126e8` |
| Commit date | 2026-07-02 12:04:51 -0700 |
| Subject | Merge pull request #294 from portpowered/generic-pr277-pr279-conflict-refresh-handoff |
| Root repo path | `/Users/abdifamily/work/learn-agent-factories` |
| Root branch | `main` |
| Root HEAD | `209d1bd8ced0cced5fd99992fe50f23296d126e8` (matches `origin/main`) |
| Root dirty paths | 0 |

All five target PR merge commits are ancestors of current `origin/main`:

| PR | Merge commit | On `origin/main` |
| --- | --- | --- |
| #274 | `bfc8858e1d4dc88816b72285d7a4b4d69c4c4e52` | yes |
| #275 | `798a0c7bd709d2a38037eecd6a01323507810e1b` | yes |
| #276 | `9136cb1ef90e1eb5942cf811b7310191c8a5ea93` | yes |
| #278 | `c59b4c31cd8be7dce8307cb1b038b42d71fa4eb2` | yes |
| #280 | `3469da8362a9ce6eeb9c8b3b4a1eaabfb2fcf95a` | yes |

## GitHub PR truth (live, 2026-07-02T19:13Z UTC)

| Work item | PR | State | Merged at (UTC) | Merge commit | Head SHA at merge |
| --- | --- | --- | --- | --- | --- |
| `rlhf-page` | [#274](https://github.com/portpowered/ai-model-reference/pull/274) | MERGED | 2026-07-02T10:30:19Z | `bfc8858e` | `de9f407b` |
| `rlvr` | [#275](https://github.com/portpowered/ai-model-reference/pull/275) | MERGED | 2026-07-02T13:34:27Z | `798a0c7b` | `cbe43469` |
| `diffusion-transformer-block-module` | [#276](https://github.com/portpowered/ai-model-reference/pull/276) | MERGED | 2026-07-02T12:00:33Z | `9136cb1e` | `519d9502` |
| `generic-sidebar-ai-adapter-extraction` | [#278](https://github.com/portpowered/ai-model-reference/pull/278) | MERGED | 2026-07-02T14:55:38Z | `c59b4c31` | `80626348` |
| `grpo-page` | [#280](https://github.com/portpowered/ai-model-reference/pull/280) | MERGED | 2026-07-02T15:02:55Z | `3469da83` | `2676c4ea` |

PR conversation comments on all five PRs end with reviewer merge approval; no
unresolved BLOCKING/REJECTED conversation comments remain on the merged PRs.

## Factory queue evidence (session `930b51a6-07ce-44e6-a639-7a6217f6e864`)

Command:

```bash
you work list --session 930b51a6-07ce-44e6-a639-7a6217f6e864 --name <work-item> --json
```

Default-session lookup (`you work list --name <work-item> --json`) returns empty
for these page lanes.

### `rlhf-page` (PR #274)

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-request-2a7a495ba202b7c766fdb2886cdb8fed-rlhf-page` | idea | `complete` / TERMINAL | `trace-bd671d53944a8fbb1bb26d36bb901210` |
| `work-plan-9` | plan | `complete` / TERMINAL | same |
| `work-review-30` | review | `complete` / TERMINAL | same |
| `work-task-10` | task | `complete` / TERMINAL | same |

Queue completion truth: all tokens terminal-complete. No active implementation
or review tokens.

### `rlvr` (PR #275)

Primary content trace (`trace-33c44bbf53a68499cb32584bac7ef541`):

| Work id | Type | State |
| --- | --- | --- |
| `batch-request-91c0dbaf26a36ce1efd1dc68477897cb-rlvr` | idea | `complete` / TERMINAL |
| `work-plan-11` | plan | `complete` / TERMINAL |
| `work-review-48` | review | `complete` / TERMINAL |
| `work-task-12` | task | `complete` / TERMINAL |

Additional stale drain/handoff ideas (separate traces, not the primary content
lane):

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-green-pr-drain-and-wordpiece-refill-batch-067-rlvr-pr275-drain` | idea | `init` / INITIAL | `trace-green-pr-drain-and-wordpiece-refill-batch-067` |
| `batch-conflict-drift-and-root-dirty-handoff-batch-071-ownerless-rlvr-navigation-root-dirty-handoff` | idea | `init` / INITIAL | `trace-conflict-drift-and-root-dirty-handoff-batch-071` |

Queue completion truth: primary `rlvr` trace is terminal-complete; two separate
drain/handoff ideas remain at `init` / INITIAL and are not inferred closed from
PR #275 merge status alone.

### `diffusion-transformer-block-module` (PR #276)

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-request-ef5112f962bb9c4332136f5e9c52b780-diffusion-transformer-block-module` | idea | `complete` / TERMINAL | `trace-d628c2883fff2f5669ef550565b2f345` |
| `work-plan-18` | plan | `complete` / TERMINAL | same |
| `work-review-37` | review | `complete` / TERMINAL | same |
| `work-task-19` | task | `complete` / TERMINAL | same |

Queue completion truth: all tokens terminal-complete.

### `generic-sidebar-ai-adapter-extraction` (PR #278)

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-generic-shell-hardening-batch-002-generic-sidebar-ai-adapter-extraction` | idea | `complete` / TERMINAL | `trace-generic-shell-hardening-batch-002` |
| `work-plan-1` | plan | `complete` / TERMINAL | same |
| `work-review-59` | review | `complete` / TERMINAL | same |
| `work-task-2` | task | `complete` / TERMINAL | same |

Queue completion truth: all tokens terminal-complete.

### `grpo-page` (PR #280)

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-request-7783e252e367f087daf4b5afa9026d5c-grpo-page` | idea | `complete` / TERMINAL | `trace-171559a3dbb95c08cdc49729ce68750a` |
| `work-plan-13` | plan | `complete` / TERMINAL | same |
| `work-review-58` | review | `complete` / TERMINAL | same |
| `work-task-14` | task | `complete` / TERMINAL | same |

Queue completion truth: all tokens terminal-complete.

### This reconciliation lane

| Work id | Type | State | Trace |
| --- | --- | --- | --- |
| `batch-pr-landing-reconciliation-and-conflict-refresh-batch-074-merged-pr-drain-rows-274-276-278-280-reconciliation` | idea | `to-complete` / PROCESSING | `trace-pr-landing-reconciliation-and-conflict-refresh-batch-074` |
| `work-task-108` | task | `init` / PROCESSING | same |
| `work-plan-107` | plan | `complete` / TERMINAL | same |

## Merged PR truth vs queue completion truth

| Work item | PR merged on `origin/main` | Primary queue trace terminal | Notes |
| --- | --- | --- | --- |
| `rlhf-page` | yes | yes | PR merge and queue agree |
| `rlvr` | yes | yes (primary trace) | Two separate `init` drain/handoff ideas remain |
| `diffusion-transformer-block-module` | yes | yes | PR merge and queue agree |
| `generic-sidebar-ai-adapter-extraction` | yes | yes | PR merge and queue agree |
| `grpo-page` | yes | yes | PR merge and queue agree |

Do not infer row closure from PR merge status alone when separate non-terminal
queue tokens exist (for example `rlvr` drain/handoff ideas at `init`).

## Lane / worktree metadata

| Work item | Metadata file | PR stamp | Linkage | Refreshed (UTC) |
| --- | --- | --- | --- | --- |
| `rlhf-page` | `.claude/worktrees/rlhf-page/.claude/lane-metadata.json` | #274 | branch `current`, PR `current` | 2026-07-02T10:01:43.822Z |
| `rlvr` | `.claude/worktrees/rlvr/.claude/lane-metadata.json` | #275 | branch `current`, PR `current` | 2026-07-02T12:01:27.471Z |
| `diffusion-transformer-block-module` | `.claude/worktrees/diffusion-transformer-block-module/.claude/lane-metadata.json` | #276 | branch `current`, PR `current` | 2026-07-02T09:01:28.843Z |
| `generic-sidebar-ai-adapter-extraction` | `.claude/worktrees/generic-sidebar-ai-adapter-extraction/.claude/lane-metadata.json` | #278 | branch `current`, PR `current` | 2026-07-02T09:01:30.448Z |
| `grpo-page` | `.claude/worktrees/grpo-page/.claude/lane-metadata.json` | #280 | branch `current`, PR `current` | 2026-07-02T15:01:28.453Z |

All five content worktrees exist under
`/Users/abdifamily/work/learn-agent-factories/.claude/worktrees/<work-item>`.

### Branch drift vs `origin/main` (read-only, 2026-07-02T19:13Z UTC)

Counts are `git rev-list --left-right --count origin/main...HEAD` (behind|ahead).

| Work item | Local HEAD | Behind main | Ahead of main | Working tree notes |
| --- | --- | --- | --- | --- |
| `rlhf-page` | `de9f407b` | 120 | 0 | dirty: `next-env.d.ts`; untracked `progress.txt` |
| `rlvr` | `cbe43469` | 96 | 0 | untracked `progress.txt` |
| `diffusion-transformer-block-module` | `519d9502` | 108 | 0 | untracked `progress.txt` |
| `generic-sidebar-ai-adapter-extraction` | `80626348` | 81 | 0 | untracked `progress.txt` |
| `grpo-page` | `2676c4ea` | 82 | 0 | untracked `progress.txt` |

Content worktrees retain post-merge branch heads behind current `origin/main`;
this is expected stale worktree evidence and was not modified during evidence
gathering.

## Active PR mergeability watchdog

The linkage ledger on the default session reports only queue-only noise lanes
(no PR-backed active lanes). The five merged PR rows do not appear as active or
failed queue lanes because their primary content traces are terminal-complete.

## Quality gate (story 001)

Handoff-only evidence capture; no page content, registry content, root work,
worktree files, queue rows, staging area, or branch history were changed.

```bash
bun run typecheck
```

Result: PASS (2026-07-02T19:15Z UTC).
