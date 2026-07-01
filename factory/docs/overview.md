# Factory Overview

This factory coordinates autonomous work for a meta software factory, which is responsible for building lots of software.

## Read First

Before submitting work, read:

* `factory/factory.json`
* `factory/workstations/ideafy/AGENTS.md`
* `docs/temp/customer-ask.md`
* `docs/temp/checklist.md`
* `docs/temp/progress.md`
* `factory/docs/batch-inputs.md`
* `factory/docs/batch-input-example.json`
* `you docs agents`
* `you docs batch-inputs`

Contributor-facing docs that shape list work:

* `README.md`
* `CONTRIBUTING.md` — ten curated README categories (Theories through Related Lists), entry format, and **Local checks** (`make check`, `make test`, `make all`, optional `make lint` / `make links`, GitHub Actions table)
* `docs/taxonomy.md` — category definitions aligned with README section headings and CONTRIBUTING
* `docs/review-policy.md` — maintainer checklist and `resource:*` labels for the same ten categories

Routine canonical page executor policy for ordinary content-only page batches:

1. **Derived page directory lookup** — Resolve published page bundle paths with
   `getDocsPageDir(section, slug)` from `src/lib/content/content-paths.ts`.
   Do not add new page-specific `*_PAGE_DIR` exports, shared helper edits in
   `src/lib/content/content-paths.ts`, or hand-maintained content-path constants
   for a single page. Maintainer reference:
   `docs/internal/processes/content-page-generation-workflow-relevant-files.md`.

2. **Scanner-backed ordinary page validation** — Content-only published page
   bundles receive registry alignment, default-locale messages, route metadata,
   tags, citations, and local asset checks through derived validation inside
   `make validate-data`. Do not add a new per-page test that only re-checks
   those relationships unless the page introduces special rendering, graph/table
   runtime behavior, search/discovery behavior, page-generation workflow
   behavior, or a focused regression not expressible as derived bundle
   invariants. Maintainer reference:
   `docs/internal/processes/derived-page-validation-relevant-files.md`.

Low-collision batch boundaries for routine canonical page work:

* Add or update page bundles under `src/content/docs/<section>/<slug>/` and
  matching registry records under `src/content/registry/`.
* Avoid shared helper edits, generated artifact churn, broad registry/runtime
  edits, and new per-page tests unless the requested behavior requires them.
* Do not edit `src/lib/content/**`, `src/content/registry/**` generated
  surfaces, `src/lib/search/**`, or `src/lib/docs/**` for ordinary page-only
  batches unless fixing a broken reference.

Contributor and reviewer summaries of the same policies:

* `docs/contributors/CONTRIBUTING.md#routine-canonical-page-policies`
* `docs/review-standards.md#routine-canonical-page-review`

## Work Types

Configured work types:

```txt
thoughts       meta-planner loopback work
idea           product/implementation idea submitted by ideafy
plan           PRD planning output from an idea
task           executor/review implementation work
cron-triggers  runtime trigger type
```

Use `idea`, singular, for implementation proposals.
Use `thoughts`, plural, for ideafy loopback.

## Workstation Flow

```txt
thoughts:init -> ideafy -> thoughts:complete

idea:init -> plan -> idea:to-complete + plan:init
plan:init -> setup-workspace -> plan:complete + task:init
task:init -> process -> task:in-review
task:in-review -> review -> task:to-complete
idea:to-complete + task:to-complete with the same name -> consume
```

Executor and review workstations run in worktrees under
`.claude/worktrees/<work-item-name>/`, created by `factory/scripts/setup-workspace.py`.
Workspace setup also stamps canonical planner lane metadata at
`.claude/worktrees/<work-item-name>/.claude/lane-metadata.json`.
Planner linkage reporting can refresh mutable branch and PR linkage inside that
record later with `bun ./scripts/report-queue-worktree-pr-linkage-ledger.ts --refresh-metadata`
without recreating the worktree. Planner linkage discovery now reads that
stamped record first for local lane identity and reports explicit metadata gaps
before falling back to `git` or `prd.json` heuristics. If stamped linkage is
already marked `stale`, planner reports keep the lane visible and surface the
stale branch or PR issue text as an actionable gap instead of silently hiding
the lane.

## Batch Submission

Use the canonical `FACTORY_REQUEST_BATCH` shape from `you docs batch-inputs`.
Human-readable notes live in `factory/docs/batch-inputs.md`.

For a running factory, prefer:

```sh
you submit batch <path>
```

Always dry-run first:

```sh
you submit batch --dry-run <path>
```

For watched-folder operator ingress, use:

```txt
factory/inputs/BATCH/default/<request_id>.json
```

The checked-in example is:

```txt
factory/docs/batch-input-example.json
```

## State Inspection

Use:

```sh
you work list
you session list
```

`you work list` shows durable work state. `you session list` shows active or
recent runtime sessions. Check both before deciding that work is stuck or before
submitting a new batch.

## Repair

Use:

```sh
you work move
```

only for deliberate workflow repair. Record every manual move in
`docs/internal/progress.md` with the work item, old state, new state, reason,
and expected next workstation. Do not use work moves to skip implementation,
review, or validation.

## Local State Files

Planner-owned state under `docs/temp/`:

```txt
docs/temp/customer-ask.md  current customer ask and planner authorization notes
docs/temp/checklist.md     high-level outcomes and workstream board (meta-planner)
docs/temp/progress.md      append-only meta-planner progress log (meta-planner)
```

The meta-planner creates and maintains `checklist.md` and `progress.txt` when
they are not already present. Task executors append to the worktree `progress.txt`
at the repository root during implementation batches.

## Quality Gates

Before opening or merging reconciliation PRs, run from the repository root:

```sh
make check   # or make all — same README validation
make test
git diff --check
```

Optional pre-submit targets (`make lint`, `make links`) and GitHub workflow
gates are documented in `CONTRIBUTING.md` **Local checks** and **GitHub Actions**.
These commands mirror the Go README checks in `internal/checks`, `go test ./...`,
and whitespace hygiene enforced in CI.
