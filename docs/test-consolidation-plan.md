# Test Consolidation Plan

## Goal

Keep the project strict while preventing the default test suite from growing a
new full-system verifier for every phase, batch, or customer ask.

The target shape is:

- Fast unit, content, component, and pure verifier tests stay in `bun test`.
- Build/export/server/browser checks live in explicit system gates.
- Historical phase evidence is preserved as data or reports, not as permanent
  one-off system test files.
- New customer asks extend stable domains instead of adding new phase-specific
  harnesses.

## Test Gates

### Fast Regression Gate

Command: `bun test`, `bun run test`, or `make test`

Owns:

- pure TypeScript helpers
- schema and registry validation
- MDX/content compilation smoke tests
- component render and accessibility smoke tests
- verifier row builders with fixtures
- route/search ranking behavior that does not start a production server or run a
  build

Must not own:

- `next build`
- `bun run build`
- `bun run build:export`
- production server lifecycle checks
- served static-export browser probes

### Build Contract Gate

Command: `bun run test:build-contract` or `make internal-test-build-contract`

Owns:

- one production `next build` contract
- one GitHub Pages base-path static export contract
- static-export artifact, route, search bootstrap, handoff, shell, and script
  assertions that reuse the shared export artifact

Rule: a build artifact is created once per contract and all related assertions
run against that artifact.

### Production Integration Gate

Command: `bun run test:integration` or `make internal-test-integration`

Owns:

- production server lifecycle
- served static-export browser probes
- Playwright/browser checks that need a served app
- release/deploy evidence checks that are too slow or flaky for ordinary local
  development

## Consolidation Domains

Customer-facing and phase-facing checks should be expressed under these stable
domains:

- `docsShell`
- `searchSurface`
- `staticExport`
- `modulePage`
- `glossaryPage`
- `navigation`
- `contentRegistry`
- `accessibility`
- `deployPosture`

Batch names such as `batch-013` can remain in archived evidence fixtures or
factory documentation, but new regression tests should use the domain names.

## Migration Sequence

1. Done: merge repeated static export build tests into one base-path artifact
   contract.
2. Done: add a guard that rejects build/export invocations outside approved
   system test locations.
3. Done: move base-path export HTML assertions into one shared base-path
   contract and keep served export probes in the integration gate.
4. Done: convert per-module built-route verifier files into a route matrix.
5. Done: move slow build/export gates out of default `bun test` and into the
   explicit build-contract gate.
6. In progress: customer-ask check IDs now map to stable domains; continue
   moving historical batch-specific tests behind those domain row builders.

## Current Contract Files

- `src/tests/build/static-export-base-path-contract.test.ts` — one GitHub Pages
  base-path export artifact, route/search/shell/script checks and
  HTML/client-chunk checks.
- `src/tests/build/static-export-base-path-served-integration.test.ts` — served
  base-path export browser probes, run by the production integration gate.
- `src/lib/build/verify-module-built-routes.test.ts` — matrix coverage for
  module built-route verifier helpers.
- `src/lib/verify/customer-ask-domain.test.ts` — guard that every Phase 1
  customer-ask inventory row maps to a stable consolidation domain.
- `src/tests/ci/system-test-gates.test.ts` — guardrail against new build/export
  invocations outside approved system test locations.

## Add-New-Test Rule

Before adding a new test file, choose one:

- Add a row to an existing domain matrix.
- Add a pure fixture test beside the helper it protects.
- Add a system test only in `src/tests/build` or the production integration
  gate, with a reason it cannot be covered by fixtures.
