# Stabilize website test sharding for long render and accessibility suites

## Problem

The default `bun run test` website runner was previously sharding across multiple workers by default. Several long-running docs render and accessibility files pass in isolation but time out under that default sharding because the suite becomes scheduler-dependent under concurrent heavy SSR/axe load.

## Why this matters

- It creates noisy mergeability failures unrelated to the branch under review.
- Executors have to spend time proving failures are inherited instead of shipping story work.
- The current safe fix is to run serially by default, which improves determinism but slows the suite.

## Suggested follow-up

- Profile the slowest website test files under 1, 2, and 4 shards.
- Separate the known heavy files into their own serial bucket while keeping the rest parallel.
- Add a lightweight regression check for the runner so future sharding changes do not reintroduce scheduler-driven timeouts.

## Evidence

- `search-page-panel.a11y.test.tsx`, `content-reconciliation-single-title.test.ts`, `glossary-opening-convergence.test.tsx`, and `glossary-shell-description-auto-link.test.tsx` all passed in isolation but timed out under the old default multi-shard run.
