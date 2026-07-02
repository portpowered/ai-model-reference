/**
 * Fresh-checkout typecheck proof.
 *
 * Simulates a clean clone without mutating the developer workspace: provisions a
 * detached git worktree at HEAD, runs `bun install --frozen-lockfile`, asserts
 * `.source/` is absent, then runs `make typecheck` inside the isolated tree.
 * See README.md § Quality Gates — Fresh-checkout CI proof.
 */
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
  missingSourceServerPattern,
  poisonGeneratedRuntimeArtifacts,
  repoRoot,
  STALE_CONTENT_RUNTIME_SENTINEL,
} from "./fresh-checkout-command-proof";

const mainSourceDir = join(repoRoot, CLEAN_WORKTREE_SOURCE_DIR);

describe("fresh-checkout typecheck", () => {
  test(
    "make typecheck succeeds when .source is absent and regenerates output",
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

        // Full Makefile gate: prepare:content-runtime, then fumadocs-mdx, then tsc.
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

  test(
    "make typecheck refreshes stale generated runtime artifacts before compiling",
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
        const staleArtifactPaths = poisonGeneratedRuntimeArtifacts(
          fixture.worktreePath,
        );

        expect(existsSync(isolatedSourceDir)).toBe(false);
        for (const artifactPath of staleArtifactPaths) {
          expect(readFileSync(artifactPath, "utf8")).toContain(
            STALE_CONTENT_RUNTIME_SENTINEL,
          );
        }

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
        expectGeneratedRuntimeArtifactsRefreshed(staleArtifactPaths);
      } finally {
        fixture.cleanup();
      }

      expect(existsSync(mainSourceDir)).toBe(mainHadSourceBefore);
    },
    FRESH_CHECKOUT_TYPECHECK_TEST_TIMEOUT_MS,
  );
});
