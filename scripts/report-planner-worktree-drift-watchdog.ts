import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  discoverPlannerWorktreeDriftSnapshot,
  formatPlannerWorktreeDriftReport,
  serializePlannerWorktreeDriftSnapshot,
} from "../src/lib/factory/planner-worktree-drift-watchdog";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readRequiredJsonFile(path: string, label: string): string {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label} fixture at ${path}`);
  }
  return readFileSync(path, "utf8");
}

function isJsonOutputRequested(argv: string[]): boolean {
  return (
    argv.includes("--json") ||
    (argv.includes("--format") &&
      argv[argv.indexOf("--format") + 1]?.trim().toLowerCase() === "json")
  );
}

function runYouJsonCommand(repoRoot: string, args: string[]): string {
  const attempts = [
    [...args, "--json"],
    [...args, "--format", "json"],
  ];

  for (const attempt of attempts) {
    const proc = Bun.spawnSync(["you", ...attempt], {
      cwd: repoRoot,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode === 0 && proc.stdout.toString().trim()) {
      return proc.stdout.toString();
    }
  }

  throw new Error(
    `Unable to read live queue JSON from \`you ${args.join(" ")}\`.`,
  );
}

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const plannerSession = readFlagValue("--session") ?? "~default";
const workListPath = readFlagValue("--work-list-json");
const sessionListPath = readFlagValue("--session-list-json");
const worktreesDir = readFlagValue("--worktrees-dir")
  ? resolve(readFlagValue("--worktrees-dir") as string)
  : resolve(repoRoot, ".claude", "worktrees");

const workListJsonText = workListPath
  ? readRequiredJsonFile(workListPath, "work list")
  : runYouJsonCommand(repoRoot, ["work", "list", "--session", plannerSession]);
const sessionListJsonText = sessionListPath
  ? readRequiredJsonFile(sessionListPath, "session list")
  : runYouJsonCommand(repoRoot, ["session", "list"]);

const snapshot = discoverPlannerWorktreeDriftSnapshot({
  repoRoot,
  sessionListJsonText,
  workListJsonText,
  worktreesDir,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? serializePlannerWorktreeDriftSnapshot(snapshot)
    : `${formatPlannerWorktreeDriftReport(snapshot)}\n`,
);
