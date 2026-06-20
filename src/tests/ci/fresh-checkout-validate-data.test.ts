/**
 * Fresh-checkout validate-data proof.
 *
 * Simulates a clean clone without mutating the developer workspace: provisions a
 * detached git worktree at HEAD, poisons the generated runtime artifacts, then
 * runs `make validate-data` inside the isolated tree.
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
  expectGeneratedRuntimeArtifactsRefreshed,
  formatSubprocessOutput,
  isGitWorktreeDirty,
  poisonGeneratedRuntimeArtifacts,
  repoRoot,
} from "./fresh-checkout-command-proof";

const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

describe("fresh-checkout validate-data", () => {
  test(
    "make validate-data refreshes stale generated runtime artifacts before validation",
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
        const staleArtifactPaths = poisonGeneratedRuntimeArtifacts(
          fixture.worktreePath,
        );

        const result = spawnSync("make", ["validate-data"], {
          cwd: fixture.worktreePath,
          encoding: "utf8",
          env: process.env,
        });

        if (result.status === null) {
          throw new Error(
            `make validate-data did not finish within the test budget.\n${formatSubprocessOutput(result)}`,
          );
        }

        if (result.status !== 0) {
          throw new Error(
            `make validate-data exited non-zero.\n${formatSubprocessOutput(result)}`,
          );
        }

        expectGeneratedRuntimeArtifactsRefreshed(staleArtifactPaths);
      } finally {
        fixture.cleanup();
      }

      expect(existsSync(mainSourceDir)).toBe(mainHadSourceBefore);
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
