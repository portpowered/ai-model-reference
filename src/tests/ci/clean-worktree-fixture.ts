import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * A "clean tree" for the fresh-checkout proof is a detached git worktree at the
 * commit under test with `bun install --frozen-lockfile` completed and no
 * pre-existing Fumadocs MDX bindings (`.source/`). It must not reuse the
 * developer workspace's node_modules, `.next/`, or generated artifacts.
 */
export const CLEAN_WORKTREE_SOURCE_DIR = ".source";

export class CleanWorktreeSetupError extends Error {
  readonly phase = "setup" as const;

  constructor(message: string) {
    super(message);
    this.name = "CleanWorktreeSetupError";
  }
}

export class CleanWorktreeInstallError extends Error {
  readonly phase = "install" as const;

  constructor(message: string) {
    super(message);
    this.name = "CleanWorktreeInstallError";
  }
}

export class CleanWorktreeArtifactError extends Error {
  readonly phase = "artifact-presence" as const;

  constructor(message: string) {
    super(message);
    this.name = "CleanWorktreeArtifactError";
  }
}

export interface CleanWorktreeFixture {
  /** Absolute path to the isolated worktree root. */
  worktreePath: string;
  /** Removes the worktree and its parent temporary directory. */
  cleanup: () => void;
}

function formatSpawnFailure(
  label: string,
  result: SpawnSyncReturns<string>,
): string {
  const chunks = [`${label} failed.`];
  if (result.status !== null) {
    chunks.push(`exit status: ${result.status}`);
  } else if (result.signal) {
    chunks.push(`signal: ${result.signal}`);
  }
  if (result.error) {
    chunks.push(`spawn error: ${result.error.message}`);
  }
  const stderr = result.stderr?.trim();
  const stdout = result.stdout?.trim();
  if (stderr) {
    chunks.push(`stderr:\n${stderr}`);
  }
  if (stdout) {
    chunks.push(`stdout:\n${stdout}`);
  }
  return chunks.join("\n");
}

function runGit(repoRoot: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

function assertNoSourceDir(worktreePath: string): void {
  const sourceDir = join(worktreePath, CLEAN_WORKTREE_SOURCE_DIR);
  if (existsSync(sourceDir)) {
    throw new CleanWorktreeArtifactError(
      `Expected ${CLEAN_WORKTREE_SOURCE_DIR}/ to be absent in the isolated worktree at ${worktreePath}, but it already exists before the gate under test.`,
    );
  }
}

/**
 * Provisions an isolated detached git worktree at HEAD with a frozen lockfile
 * install. Asserts `.source/` is absent before returning. Call `cleanup()` when
 * finished to remove the worktree reliably.
 */
export function provisionCleanWorktree(repoRoot: string): CleanWorktreeFixture {
  const commitResult = runGit(repoRoot, ["rev-parse", "HEAD"]);
  if (commitResult.status !== 0 || !commitResult.stdout?.trim()) {
    throw new CleanWorktreeSetupError(
      formatSpawnFailure("git rev-parse HEAD", commitResult),
    );
  }
  const commit = commitResult.stdout.trim();

  const parentDir = mkdtempSync(join(tmpdir(), "model-atlas-clean-worktree-"));
  const worktreePath = join(parentDir, "worktree");

  const addResult = runGit(repoRoot, [
    "worktree",
    "add",
    "--detach",
    worktreePath,
    commit,
  ]);
  if (addResult.status !== 0) {
    rmSync(parentDir, { recursive: true, force: true });
    throw new CleanWorktreeSetupError(
      formatSpawnFailure(
        `git worktree add --detach ${worktreePath} ${commit}`,
        addResult,
      ),
    );
  }

  const installResult = spawnSync("bun", ["install", "--frozen-lockfile"], {
    cwd: worktreePath,
    encoding: "utf8",
    env: process.env,
  });
  if (installResult.status !== 0) {
    removeWorktree(repoRoot, worktreePath, parentDir);
    throw new CleanWorktreeInstallError(
      formatSpawnFailure("bun install --frozen-lockfile", installResult),
    );
  }

  try {
    assertNoSourceDir(worktreePath);
  } catch (error) {
    removeWorktree(repoRoot, worktreePath, parentDir);
    throw error;
  }

  return {
    worktreePath,
    cleanup: () => removeWorktree(repoRoot, worktreePath, parentDir),
  };
}

function removeWorktree(
  repoRoot: string,
  worktreePath: string,
  parentDir: string,
): void {
  if (existsSync(worktreePath)) {
    const removeResult = runGit(repoRoot, [
      "worktree",
      "remove",
      "--force",
      worktreePath,
    ]);
    if (removeResult.status !== 0) {
      // Best-effort prune so later runs are not blocked by stale registrations.
      runGit(repoRoot, ["worktree", "prune"]);
    }
  }
  if (existsSync(parentDir)) {
    rmSync(parentDir, { recursive: true, force: true });
  }
}
