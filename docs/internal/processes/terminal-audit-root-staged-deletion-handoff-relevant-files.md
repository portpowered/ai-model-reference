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
- Use `--repo-root` against the root checkout for live evidence; default fixture fallback keeps review deterministic when the root checkout is unavailable.

## Commands

| When | Command |
| --- | --- |
| Emit terminal-audit root staged deletion handoff evidence | `bun run report:planner-terminal-audit-root-staged-deletion-handoff` |
| Write markdown artifact from live root checkout | `bun ./scripts/report-planner-terminal-audit-root-staged-deletion-handoff.ts --repo-root <root> --write-artifact docs/internal/processes/terminal-audit-root-staged-deletion-handoff-evidence.md` |
