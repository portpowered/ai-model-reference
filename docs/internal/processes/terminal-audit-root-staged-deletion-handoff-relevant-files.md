# Terminal Audit Root Staged Deletion Handoff Relevant Files

Planner-facing handoff for terminal-audit root staged deletion drift evidence.

## Core modules

- `src/lib/factory/planner-terminal-audit-root-staged-deletion-handoff.ts` — read-only evidence discovery for git status, cached diff stat, root checkout reconciliation, and worktree drift watchdog output.
- `scripts/report-planner-terminal-audit-root-staged-deletion-handoff.ts` — CLI entrypoint with human, JSON, and markdown output plus `--write-artifact`.

## Fixtures

- `src/tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff/six-dirty-paths-status.txt` — six-path staged-only porcelain snapshot for terminal-audit/root-tooling drift.
- `src/tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff/six-dirty-paths-cached-diff-stat.txt` — cached diff stat snapshot paired with the six-path status fixture.

## Artifacts

- `docs/internal/processes/terminal-audit-root-staged-deletion-handoff-evidence.md` — committed handoff evidence artifact (not one of the dirty root paths).

## Patterns

- Pass `statusOutput` with a leading `## branch...` line or porcelain-only lines; porcelain is extracted automatically for reconciliation.
- Inject `watchdogSnapshot` when tests need already-merged-owned evidence for `docs/internal/processes/factory-linkage-relevant-files.md` without live `you` queue discovery.
- `terminalAuditRemotePresentDeletions` lists the three terminal-audit deleted paths with `present-on-origin-main` evidence and `git cat-file -e origin/main:<path>` reviewer commands; group classification defaults to `remote-present-local-deletion-drift`.
- `dirtyRootPathClassifications` lists all six dirty root paths with `owner-state` (`already-merged-owned`, `ownerless`, `operator-hold`), optional `lane`, and per-path `next-safe-action`; `ownerlessDirtyPathPreservationStatement` states page refills must not overwrite ownerless root drift.
- `plannerRefillHandoffDecision` emits drift state (`terminal-audit-drift-cleared`, `terminal-audit-drift-explicitly-owned`, `terminal-audit-drift-remains-operator-hold`), page-refill hold when ownerless/operator-hold paths remain, meta-planner loop action, and active PR context (#264 mergeable/passing, #251 queue-stale) as decision support only.
- Use `--repo-root` against the root checkout for live evidence; default fixture fallback keeps review deterministic when the root checkout is unavailable.

## Commands

| When | Command |
| --- | --- |
| Emit terminal-audit root staged deletion handoff evidence | `bun run report:planner-terminal-audit-root-staged-deletion-handoff` |
| Write markdown artifact from live root checkout | `bun ./scripts/report-planner-terminal-audit-root-staged-deletion-handoff.ts --repo-root <root> --write-artifact docs/internal/processes/terminal-audit-root-staged-deletion-handoff-evidence.md` |
