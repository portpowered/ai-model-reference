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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONTENT_RUNTIME_PREPARATION_STEPS } from "@/lib/content/content-runtime-preparation";
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
const STALE_CONTENT_RUNTIME_SENTINEL = "__STALE_CONTENT_RUNTIME_SENTINEL__";

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

function poisonGeneratedRuntimeArtifacts(worktreePath: string): string[] {
  const artifactPaths = CONTENT_RUNTIME_PREPARATION_STEPS.map((step) =>
    join(worktreePath, step.outputPath),
  );

  for (const [index, artifactPath] of artifactPaths.entries()) {
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(
      artifactPath,
      `export const staleRuntimeArtifact${index} = "${STALE_CONTENT_RUNTIME_SENTINEL}:${index}";\n`,
      "utf8",
    );
  }

  return artifactPaths;
}

function expectGeneratedRuntimeArtifactsRefreshed(
  artifactPaths: readonly string[],
): void {
  for (const artifactPath of artifactPaths) {
    expect(existsSync(artifactPath)).toBe(true);
    expect(readFileSync(artifactPath, "utf8")).not.toContain(
      STALE_CONTENT_RUNTIME_SENTINEL,
    );
  }
}

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
