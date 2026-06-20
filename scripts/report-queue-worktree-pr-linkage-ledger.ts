import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CommandResult,
  PullRequestLookupFailureKind,
  PullRequestLookupResult,
  PullRequestRecord,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import {
  discoverQueueWorktreePrLinkageLedger,
  formatQueueWorktreePrLinkageSummary,
} from "@/lib/factory/queue-worktree-pr-linkage-ledger";

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
const format = readFlagValue("--format") ?? "summary";

interface PullRequestFixtureFailure {
  failureKind?: PullRequestLookupFailureKind;
  failureReason?: string;
}

type PullRequestFixtureEntry =
  | PullRequestRecord
  | ({ pullRequest: PullRequestRecord | null } & PullRequestFixtureFailure)
  | ({ failureKind: PullRequestLookupFailureKind } & PullRequestFixtureFailure);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPullRequestFixtureRecord(
  value: unknown,
): value is PullRequestRecord & Record<string, unknown> {
  return isRecord(value) && typeof value.number === "number";
}

function readFixtureFailureKind(
  value: unknown,
): PullRequestLookupFailureKind | undefined {
  if (
    value === "not-found" ||
    value === "auth" ||
    value === "api" ||
    value === "unknown"
  ) {
    return value;
  }
  return undefined;
}

function readFixtureFailureReason(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

let pullRequestMap: Record<string, PullRequestFixtureEntry> | undefined;
if (prMapPath) {
  pullRequestMap = JSON.parse(
    readRequiredJsonFile(prMapPath, "PR map"),
  ) as Record<string, PullRequestFixtureEntry>;
}

function lookupPullRequestFromFixture(
  branchName: string,
): PullRequestLookupResult {
  const fixture = pullRequestMap?.[branchName];
  if (!fixture) {
    return {
      pullRequest: null,
      failureKind: "not-found",
      failureReason: `no open PR metadata found for branch ${branchName}`,
    };
  }

  if (isPullRequestFixtureRecord(fixture)) {
    return { pullRequest: fixture };
  }

  if (isRecord(fixture) && "pullRequest" in fixture) {
    return {
      pullRequest: isPullRequestFixtureRecord(fixture.pullRequest)
        ? fixture.pullRequest
        : null,
      failureKind: readFixtureFailureKind(fixture.failureKind),
      failureReason: readFixtureFailureReason(fixture.failureReason),
    };
  }

  return {
    pullRequest: null,
    failureKind: isRecord(fixture)
      ? (readFixtureFailureKind(fixture.failureKind) ?? "unknown")
      : "unknown",
    failureReason: isRecord(fixture)
      ? (readFixtureFailureReason(fixture.failureReason) ??
        `invalid PR fixture for branch ${branchName}`)
      : `invalid PR fixture for branch ${branchName}`,
  };
}

const workListJsonText = workListPath
  ? readRequiredJsonFile(workListPath, "work list")
  : readLiveQueueJson(["work", "list"], "work list");
const sessionListJsonText = sessionListPath
  ? readRequiredJsonFile(sessionListPath, "session list")
  : readLiveQueueJson(["session", "list"], "session list");

const ledger = discoverQueueWorktreePrLinkageLedger({
  repoRoot,
  workListJsonText,
  sessionListJsonText,
  worktreesDir,
  lookupPullRequest: pullRequestMap ? lookupPullRequestFromFixture : undefined,
});

if (format === "json") {
  console.log(JSON.stringify(ledger, null, 2));
} else {
  console.log(formatQueueWorktreePrLinkageSummary(ledger));
}
