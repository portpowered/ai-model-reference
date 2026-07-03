import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { RunCommand } from "@/lib/factory/active-pr-mergeability-watchdog";
import {
  createIsolatedGitProcessEnv,
  resolveDefaultWorktreesDir,
  resolveMainRepoRoot,
} from "@/lib/factory/repo-path-resolution";

function runCommandStub(commonDirByRepoRoot: Map<string, string>): RunCommand {
  return (binary, args, cwd) => {
    if (binary === "git" && args[0] === "rev-parse" && cwd) {
      const commonDir = commonDirByRepoRoot.get(cwd);
      if (commonDir) {
        return {
          ok: true,
          stdout: `${commonDir}\n`,
          stderr: "",
          exitCode: 0,
        };
      }
    }
    return {
      ok: false,
      stdout: "",
      stderr: "unsupported command",
      exitCode: 1,
    };
  };
}

describe("repo-path-resolution", () => {
  test("strips inherited git worktree env vars for isolated subprocesses", () => {
    const env = createIsolatedGitProcessEnv({
      ...process.env,
      GIT_COMMON_DIR: "/repo/.git",
      GIT_DIR: "/repo/.git/worktrees/lane-a",
      GIT_INDEX_FILE: "/repo/.git/worktrees/lane-a/index",
      GIT_WORK_TREE: "/repo/.claude/worktrees/lane-a",
      PATH: process.env.PATH,
    });

    expect(env.GIT_DIR).toBeUndefined();
    expect(env.GIT_WORK_TREE).toBeUndefined();
    expect(env.GIT_COMMON_DIR).toBeUndefined();
    expect(env.GIT_INDEX_FILE).toBeUndefined();
    expect(env.PATH).toBe(process.env.PATH);
  });

  test("resolves nested worktree checkout roots to the main repository root", () => {
    const checkoutRoot = "/repo/.claude/worktrees/lane-a";
    const mainRepoRoot = "/repo";
    const runCommand = runCommandStub(new Map([[checkoutRoot, "/repo/.git"]]));

    expect(resolveMainRepoRoot(checkoutRoot, runCommand)).toBe(mainRepoRoot);
    expect(resolveDefaultWorktreesDir(checkoutRoot, runCommand)).toBe(
      join(mainRepoRoot, ".claude", "worktrees"),
    );
  });

  test("keeps standalone repository roots unchanged", () => {
    const repoRoot = "/repo";
    const runCommand = runCommandStub(new Map([[repoRoot, ".git"]]));

    expect(resolveMainRepoRoot(repoRoot, runCommand)).toBe(repoRoot);
    expect(resolveDefaultWorktreesDir(repoRoot, runCommand)).toBe(
      join(repoRoot, ".claude", "worktrees"),
    );
  });
});
