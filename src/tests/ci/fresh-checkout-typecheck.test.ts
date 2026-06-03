import { describe, expect, test } from "bun:test";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
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

function formatSubprocessOutput(result: SpawnSyncReturns<string>): string {
  const chunks: string[] = [];
  const stderr = result.stderr ?? "";
  const stdout = result.stdout ?? "";
  if (result.status === null) {
    chunks.push("subprocess did not finish (status is null)");
    if (result.signal) {
      chunks.push(`signal: ${result.signal}`);
    }
    if (result.error) {
      chunks.push(`spawn error: ${result.error.message}`);
    }
  } else {
    chunks.push(`exit status: ${result.status}`);
  }
  if (stderr.trim()) {
    chunks.push(`stderr:\n${stderr.trimEnd()}`);
  }
  if (stdout.trim()) {
    chunks.push(`stdout:\n${stdout.trimEnd()}`);
  }
  return chunks.join("\n");
}

describe("fresh-checkout typecheck", () => {
  test(
    "make typecheck succeeds when .source is absent and regenerates output",
    () => {
      if (existsSync(sourceDir)) {
        rmSync(sourceDir, { recursive: true, force: true });
      }
      expect(existsSync(sourceDir)).toBe(false);

      // Full Makefile gate: pretypecheck (fumadocs-mdx) then tsc — not fumadocs-mdx alone.
      const result = spawnSync("make", ["typecheck"], {
        cwd: repoRoot,
        encoding: "utf8",
        env: process.env,
      });

      if (result.status === null) {
        throw new Error(
          `make typecheck did not finish within the test budget.\n${formatSubprocessOutput(result)}`,
        );
      }

      const stderr = result.stderr ?? "";
      expect(stderr).not.toMatch(missingSourceServerPattern);
      expect(stderr).not.toContain(".source/server");

      if (result.status !== 0) {
        throw new Error(
          `make typecheck exited non-zero.\n${formatSubprocessOutput(result)}`,
        );
      }

      expect(existsSync(sourceServerModule)).toBe(true);
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
