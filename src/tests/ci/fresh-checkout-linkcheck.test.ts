/**
 * Fresh-checkout linkcheck proof.
 *
 * Simulates a clean clone without mutating the developer workspace: provisions a
 * detached git worktree at HEAD, runs `bun install --frozen-lockfile`, asserts
 * `.source/` is absent, then runs `make linkcheck` inside the isolated tree.
 */
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
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
import {
  formatSubprocessOutput,
  isGitWorktreeDirty,
  missingSourceServerPattern,
  repoRoot,
} from "./fresh-checkout-command-proof";

const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

describe("fresh-checkout linkcheck", () => {
  test(
    "make linkcheck succeeds when .source is absent and regenerates output",
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

        const result = spawnSync("make", ["linkcheck"], {
          cwd: fixture.worktreePath,
          encoding: "utf8",
          env: process.env,
        });

        if (result.status === null) {
          throw new Error(
            `make linkcheck did not finish within the test budget.\n${formatSubprocessOutput(result)}`,
          );
        }

        const stderr = result.stderr ?? "";
        expect(stderr).not.toMatch(missingSourceServerPattern);
        expect(stderr).not.toContain(".source/server");

        if (result.status !== 0) {
          throw new Error(
            `make linkcheck exited non-zero.\n${formatSubprocessOutput(result)}`,
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
