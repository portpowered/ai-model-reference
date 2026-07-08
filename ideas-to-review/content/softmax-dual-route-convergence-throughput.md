# Softmax dual-route convergence throughput lane

## Problem

Publishing `/docs/concepts/softmax` while keeping `/docs/glossary/softmax` changes registry-derived hrefs, search title ranking, auto-linked prose, and curated related-doc targets to prefer the concept route. Routine page-local work (page bundle + `concept.softmax` registry) is within the canonical-page surface budget, but ~21 shared convergence tests across the token-to-probability chain, sampling, graph-flow, and Vietnamese glossary lanes still expect `/docs/glossary/softmax`.

## Why this matters

- A routine canonical-page PR cannot stay within `audit:canonical-page-surface` budget while also updating the shared test surfaces those routes depend on.
- This is the same dual-registry-id pattern documented for embedding (`embedding-concept-discovery.test.ts` plus narrowly-scoped convergence fixture updates), and it will recur for other glossary-to-concept migrations on the token chain.
- Without a dedicated throughput lane, reviewers block the page PR for over-budget shared churn while executors cannot land the page without either failing CI or violating the surface budget.

## Suggested direction

- Open a throughput/conflict-reduction work item for softmax dual-route convergence only.
- Mirror the embedding pattern: one `softmax-concept-discovery.test.ts` using `getDocsPageDir("concepts", "softmax")`, plus the minimum convergence fixture updates where expectations must change from glossary to concept hrefs or `searchUrl` overrides.
- Keep the routine softmax page PR page-local (bundle + registry only); merge convergence work separately once audit and CI are both green on each lane.

## Evidence from softmax PR #344

- Page-local diff (`page.mdx`, `messages/en.json`, `assets.json`, `softmax.json`) passes `bun run audit:canonical-page-surface -- --page-dir src/content/docs/concepts/softmax` as **within-budget**.
- Reverting shared test/process-doc changes triggers 21 failures in tests that reference `/docs/glossary/softmax` expectations.
- BLOCKING review on PR #344 (2026-07-08 UTC) requires scoped audit in-budget; prior slice verification and 14-file shared test sweep were rejected as over-budget.
