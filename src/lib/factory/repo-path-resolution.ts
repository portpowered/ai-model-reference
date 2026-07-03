import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import type {
  CommandResult,
  RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";

const GIT_ISOLATION_ENV_KEYS = [
  "GIT_COMMON_DIR",
  "GIT_DIR",
  "GIT_INDEX_FILE",
  "GIT_WORK_TREE",
] as const;

export function createIsolatedGitProcessEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env = { ...baseEnv };
  for (const key of GIT_ISOLATION_ENV_KEYS) {
    delete env[key];
  }
  return env;
}

function defaultRunCommand(
  binary: string,
  args: string[],
  cwd?: string,
): CommandResult {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: createIsolatedGitProcessEnv(),
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
