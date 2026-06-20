# Stabilize full-suite timeout boundaries for `bun run test`

## Problem

`bun run test` intermittently fails in long worktree runs because unrelated slow convergence tests can hit Bun's per-test timeout even when the same file passes in isolation. This repeatedly creates false negatives during executor iterations and makes it harder to tell whether a story introduced a real regression.

## Why this matters

- It blocks otherwise-healthy story branches from getting a clean standard verification run.
- It encourages repeated manual reruns and ad hoc evidence gathering.
- The failure mode is cross-cutting and likely to recur for future frontend and content work, not just this topology branch.

## Suggested direction

- Audit the slowest convergence tests that currently run under `bun run test`.
- Move long-running cross-domain gates behind a more appropriate timeout budget or a narrower package script.
- Keep the default test command representative, but prevent known heavy tests from failing due to scheduler timing rather than assertion failures.
- Document which verification commands are expected for executor story work versus slower governance-style convergence gates.

## Evidence from this branch

- `WEBSITE_TEST_PARALLEL_WORKERS=1 bun run test` reproduced a timeout in `src/lib/content/content-reconciliation-convergence.test.ts`.
- `bun test src/lib/content/content-reconciliation-convergence.test.ts` passed immediately afterward, including the previously timed-out combined convergence assertion.
