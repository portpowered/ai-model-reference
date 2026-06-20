import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CommandResult,
  discoverActivePrLaneReport,
  formatActivePrLaneReport,
  type PullRequestRecord,
} from "@/lib/factory/active-pr-mergeability-watchdog";

const repoRoot = join(import.meta.dir, "..");

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

function runYouJsonCommand(args: string[]): CommandResult {
  const proc = Bun.spawnSync(["you", ...args], {
    cwd: repoRoot,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    ok: proc.exitCode === 0,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
    exitCode: proc.exitCode,
  };
}

function readLiveQueueJson(args: string[], label: string): string {
  const attempts = [
    [...args, "--json"],
    [...args, "--format", "json"],
  ];

  for (const attempt of attempts) {
    const result = runYouJsonCommand(attempt);
    if (result.ok && result.stdout.trim()) {
      return result.stdout;
    }
  }

  throw new Error(
    `Unable to read ${label} from \`you ${args.join(" ")}\` with JSON output.`,
  );
}

const workListPath = readFlagValue("--work-list-json");
const sessionListPath = readFlagValue("--session-list-json");
const worktreesDir =
  readFlagValue("--worktrees-dir") ?? join(repoRoot, ".claude", "worktrees");
const prMapPath = readFlagValue("--pr-map-json");

let pullRequestMap: Record<string, PullRequestRecord> | undefined;
if (prMapPath) {
  pullRequestMap = JSON.parse(
    readRequiredJsonFile(prMapPath, "PR map"),
  ) as Record<string, PullRequestRecord>;
}

function lookupPullRequestFromFixture(
  branchName: string,
): PullRequestRecord | null {
  return pullRequestMap?.[branchName] ?? null;
}

const workListJsonText = workListPath
  ? readRequiredJsonFile(workListPath, "work list")
  : readLiveQueueJson(["work", "list"], "work list");
const sessionListJsonText = sessionListPath
  ? readRequiredJsonFile(sessionListPath, "session list")
  : readLiveQueueJson(["session", "list"], "session list");

const report = discoverActivePrLaneReport({
  repoRoot,
  workListJsonText,
  sessionListJsonText,
  worktreesDir,
  lookupPullRequest: pullRequestMap ? lookupPullRequestFromFixture : undefined,
});

console.log(formatActivePrLaneReport(report));
