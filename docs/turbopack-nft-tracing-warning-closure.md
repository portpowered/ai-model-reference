# Turbopack NFT whole-project tracing warning — Phase 1 closure

## Outcome (warning-free)

As of 2026-06-04 UTC verification on this branch, a clean production build (`rm -rf .next && bun run build` from the repository root) exits **0** and combined stdout/stderr does **not** match any guarded diagnostic in `src/lib/build/turbopack-nft-tracing-warning.ts`.

Phase 1 production builds **must not** emit those guarded patterns. Regressions are blocked in CI by the integration test below—not by manual log review.

## What was wrong

Next.js 16+ (Turbopack) can print NFT whole-project filesystem tracing warnings when `next.config` appears in the NFT trace and the toolchain believes the repository root was traced unintentionally (see [vercel/next.js#89157](https://github.com/vercel/next.js/issues/89157)). The build may still exit 0, so the warning is easy to miss without an explicit guard.

Prior Phase 1 cleanup (`phase-1-turbopack-tracing-warning-cleanup`) scoped content loaders under `src/content/**`, moved filesystem scanners behind dynamic server-only boundaries, and set `turbopack.root` in `next.config.ts`. This work item closes the loop with deterministic verification and a regression gate.

## Guarded diagnostic families

Patterns live in `TURBOPACK_NFT_WHOLE_PROJECT_TRACING_WARNING_PATTERNS` in `src/lib/build/turbopack-nft-tracing-warning.ts`. They detect:

| Family | Intent |
| --- | --- |
| `Encountered unexpected file` … `NFT` | Primary Turbopack NFT list warning |
| `whole project` … `traced unintentionally` / `unintentionally traced` | Whole-project trace copy |
| `unintentional` … `whole-project` / `whole project` … `filesystem` … `trac` | Alternate unintentional-trace wording |
| `next.config` … `Import trace` … `node:fs` / `fs/promises` / `process.cwd` | Config pulled into NFT via content-loader `fs` chains |

Update these regexes when Next.js changes diagnostic text; keep comments in the detector file aligned with real build output.

## Enforcement

| Piece | Location |
| --- | --- |
| Detector | `src/lib/build/turbopack-nft-tracing-warning.ts` — `buildOutputHasTurbopackWholeProjectTracingWarning`, `firstMatchingTurbopackTracingWarningPattern` |
| Unit tests | `src/lib/build/turbopack-nft-tracing-warning.test.ts` — representative snippets and clean-output negatives |
| Integration test | `src/tests/build/next-build-tracing-warning.test.ts` — removes `.next`, runs `bun run build`, 180s timeout; on failure throws with the matched pattern **source** for CI logs |
| CI wiring | `make ci` → `make test` → `bun test` with **no** exclusion for the build regression test |

## `next.config.ts`

For this warning class, configuration uses **only** `turbopack.root` (project root). Do **not** add `outputFileTracing*` or other containment solely for this warning while builds remain warning-free.

```ts
turbopack: {
  root: projectRoot,
},
```

## Local verification

1. `bun install --frozen-lockfile` when `node_modules` is absent (fresh clones and worktrees).
2. `rm -rf .next && bun run build` — expect exit 0 and no guarded patterns in combined output.
3. `make ci` — includes the integration test and the rest of the quality gates.

## If a guarded warning returns

1. Capture the **exact** warning excerpt and import trace from build output.
2. Identify which guarded pattern matched (`firstMatchingTurbopackTracingWarningPattern`).
3. Prefer fixing import graph / loader scoping over silencing diagnostics.
4. Document excerpt, trace, root cause, mitigations tried, and follow-up in this file and `progress.txt` before accepting residual warnings.
