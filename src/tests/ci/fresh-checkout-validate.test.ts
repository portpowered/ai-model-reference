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
  generatedMaintainerArtifactsExist,
  isGitWorktreeDirty,
  missingSourceServerPattern,
  removeGeneratedMaintainerArtifacts,
} from "./fresh-checkout-test-helpers";

const repoRoot = join(import.meta.dir, "../../..");
const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

describe("fresh-checkout validate", () => {
  test(
    "make validate regenerates required artifacts before running maintainer validation",
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
        const isolatedSourceServerModule = join(
          fixture.worktreePath,
          CLEAN_WORKTREE_SOURCE_DIR,
          "server.ts",
        );

        removeGeneratedMaintainerArtifacts(fixture.worktreePath);

        expect(existsSync(isolatedSourceServerModule)).toBe(false);
        expect(generatedMaintainerArtifactsExist(fixture.worktreePath)).toBe(
          false,
        );

        const result = spawnSync("make", ["validate"], {
          cwd: fixture.worktreePath,
          encoding: "utf8",
          env: process.env,
        });

        if (result.status === null) {
          throw new Error(
            `make validate did not finish within the test budget.\n${formatSubprocessOutput(result)}`,
          );
        }

        const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
        expect(output).not.toMatch(missingSourceServerPattern);

        if (result.status !== 0) {
          throw new Error(
            `make validate exited non-zero.\n${formatSubprocessOutput(result)}`,
          );
        }

        expect(output).toMatch(/Link validation passed\./);
        expect(output).toMatch(/validate-registry|validate data|validation/i);
        expect(generatedMaintainerArtifactsExist(fixture.worktreePath)).toBe(
          true,
        );
        expect(existsSync(isolatedSourceServerModule)).toBe(true);
      } finally {
        fixture.cleanup();
      }

      expect(existsSync(mainSourceDir)).toBe(mainHadSourceBefore);
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
