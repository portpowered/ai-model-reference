/**
 * Fresh-checkout typecheck proof.
 *
 * Simulates a clean clone without mutating the developer workspace: provisions a
 * detached git worktree at HEAD, runs `bun install --frozen-lockfile`, asserts
 * `.source/` is absent, then runs `make typecheck` inside the isolated tree.
 * See README.md § Quality Gates — Fresh-checkout CI proof.
 */
import { describe, expect, test } from "bun:test";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLEAN_WORKTREE_SOURCE_DIR,
  provisionCleanWorktree,
} from "./clean-worktree-fixture";

const repoRoot = join(import.meta.dir, "../../..");
const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

/**
 * Bun's default per-test timeout is 5s. This proof provisions an isolated
 * worktree (git add + bun install --frozen-lockfile) then runs cold
 * `make typecheck` inside it. Measured locally (2026-06-04 UTC): install alone
 * can take ~60–120s on a cold worktree; typecheck adds ~7–11s. GitHub Actions
 * ubuntu-latest can be slower. Use 300s so CI runners have headroom.
 */
const FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS = 300_000;

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
      const mainHadSourceBefore = existsSync(mainSourceDir);

      const fixture = provisionCleanWorktree(repoRoot);

      try {
        const isolatedSourceDir = join(
          fixture.worktreePath,
          CLEAN_WORKTREE_SOURCE_DIR,
        );
        const isolatedSourceServerModule = join(isolatedSourceDir, "server.ts");

        expect(existsSync(isolatedSourceDir)).toBe(false);

        // Full Makefile gate: pretypecheck (fumadocs-mdx) then tsc — not fumadocs-mdx alone.
        const result = spawnSync("make", ["typecheck"], {
          cwd: fixture.worktreePath,
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

        expect(existsSync(isolatedSourceServerModule)).toBe(true);
      } finally {
        fixture.cleanup();
      }

      expect(existsSync(mainSourceDir)).toBe(mainHadSourceBefore);
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
