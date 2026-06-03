import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const sourceDir = join(repoRoot, ".source");
const sourceServerModule = join(sourceDir, "server.ts");

/**
 * Bun's default per-test timeout is 5s; cold `make typecheck` after deleting
 * `.source/` routinely exceeds that (fumadocs-mdx is fast; `tsc --noEmit` dominates).
 * Measured locally (2026-06-04 UTC): ~7–11s wall time on a warm dev machine;
 * GitHub Actions ubuntu-latest can be slower on cold caches. Use 120s so CI
 * runners have headroom without weakening the subprocess under test.
 */
const FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS = 120_000;

/** TypeScript missing-module errors for the gitignored Fumadocs import path. */
const missingSourceServerPattern =
  /cannot find module.*\.source\/server|cannot find module.*\.\.\/\.\.\/\.source\/server/i;

describe("fresh-checkout typecheck", () => {
  test("make typecheck succeeds when .source is absent and regenerates output", () => {
    if (existsSync(sourceDir)) {
      rmSync(sourceDir, { recursive: true, force: true });
    }
    expect(existsSync(sourceDir)).toBe(false);

    const result = spawnSync("make", ["typecheck"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    });

    const stderr = result.stderr ?? "";
    expect(stderr).not.toMatch(missingSourceServerPattern);
    expect(stderr).not.toContain(".source/server");

    expect(result.status).toBe(0);
    expect(existsSync(sourceServerModule)).toBe(true);
  }, FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS);
});
