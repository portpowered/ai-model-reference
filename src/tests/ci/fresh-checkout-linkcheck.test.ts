/**
 * Fresh-checkout linkcheck proof.
 *
 * Simulates a clean clone without mutating the developer workspace: provisions a
 * detached git worktree at HEAD, runs `bun install --frozen-lockfile`, asserts
 * `.source/` is absent, then runs `make internal-linkcheck` inside the isolated tree.
 */
import { describe, expect, test } from "bun:test";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  shouldRunFreshCheckoutTypecheckProof,
} from "@/lib/verify/server-lifecycle";
import {
  CLEAN_WORKTREE_SOURCE_DIR,
  provisionCleanWorktree,
} from "./clean-worktree-fixture";

const repoRoot = join(import.meta.dir, "../../..");
const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

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

function isGitWorktreeDirty(repoRoot: string): boolean {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    return true;
  }
  return (result.stdout ?? "").trim().length > 0;
}

describe("fresh-checkout linkcheck", () => {
  test(
    "make internal-linkcheck succeeds when .source is absent and regenerates output",
    () => {
      if (!shouldRunFreshCheckoutTypecheckProof()) {
        return;
      }
      if (isGitWorktreeDirty(repoRoot)) {
        return;
      }

      const mainHadSourceBefore = existsSync(mainSourceDir);
      const fixture = provisionCleanWorktree(repoRoot);

      try {
        const isolatedSourceDir = join(
          fixture.worktreePath,
          CLEAN_WORKTREE_SOURCE_DIR,
        );
        const isolatedSourceServerModule = join(isolatedSourceDir, "server.ts");

        expect(existsSync(isolatedSourceDir)).toBe(false);

        const result = spawnSync("make", ["internal-linkcheck"], {
          cwd: fixture.worktreePath,
          encoding: "utf8",
          env: process.env,
        });

        if (result.status === null) {
          throw new Error(
            `make internal-linkcheck did not finish within the test budget.\n${formatSubprocessOutput(result)}`,
          );
        }

        const stderr = result.stderr ?? "";
        expect(stderr).not.toMatch(missingSourceServerPattern);
        expect(stderr).not.toContain(".source/server");

        if (result.status !== 0) {
          throw new Error(
            `make internal-linkcheck exited non-zero.\n${formatSubprocessOutput(result)}`,
          );
        }

        expect(result.stdout ?? "").toContain("Link validation passed.");
        expect(existsSync(isolatedSourceServerModule)).toBe(true);
      } finally {
        fixture.cleanup();
      }

      expect(existsSync(mainSourceDir)).toBe(mainHadSourceBefore);
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
