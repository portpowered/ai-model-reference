import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import type {
  CommandResult,
  RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";

function defaultRunCommand(
  binary: string,
  args: string[],
  cwd?: string,
): CommandResult {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status,
  };
}

export function resolveMainRepoRoot(
  repoRoot: string,
  runCommand: RunCommand = defaultRunCommand,
): string {
  const commonDirResult = runCommand(
    "git",
    ["rev-parse", "--git-common-dir"],
    repoRoot,
  );
  if (commonDirResult.ok) {
    const commonDir = commonDirResult.stdout.trim();
    if (commonDir.length > 0 && commonDir !== ".git") {
      return resolve(commonDir, "..");
    }
  }

  return repoRoot;
}

export function resolveDefaultWorktreesDir(
  repoRoot: string,
  runCommand: RunCommand = defaultRunCommand,
): string {
  const mainRepoRoot = resolveMainRepoRoot(repoRoot, runCommand);
  if (mainRepoRoot !== repoRoot) {
    return join(mainRepoRoot, ".claude", "worktrees");
  }

  return join(repoRoot, ".claude", "worktrees");
}
