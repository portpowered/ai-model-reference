import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  PullRequestLookupFailureKind,
  PullRequestLookupResult,
  PullRequestRecord,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import {
  readCompleteLiveWorkListSnapshotJson,
  readLiveYouJsonCommand,
} from "@/lib/factory/live-queue-snapshot";
import {
  discoverQueueWorktreePrLinkageLedger,
  type QueueWorktreePrLinkageLane,
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

const workListPath = readFlagValue("--work-list-json");
const sessionListPath = readFlagValue("--session-list-json");
const worktreesDir =
  readFlagValue("--worktrees-dir") ?? join(repoRoot, ".claude", "worktrees");
const prMapPath = readFlagValue("--pr-map-json");
const plannerSession = readFlagValue("--session") ?? "~default";

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
  : readCompleteLiveWorkListSnapshotJson(repoRoot, [
      "work",
      "list",
      "--session",
      plannerSession,
    ]);
const sessionListJsonText = sessionListPath
  ? readRequiredJsonFile(sessionListPath, "session list")
  : readLiveYouJsonCommand(repoRoot, ["session", "list"], "session list");

function formatDrift(lane: QueueWorktreePrLinkageLane): string {
  if (!lane.driftStatus || lane.driftStatus === "unknown") {
    return lane.driftStatus ?? "unknown";
  }

  return `${lane.driftStatus}(ahead=${lane.commitsAheadOfMain ?? 0},behind=${lane.commitsBehindMain ?? 0})`;
}

function formatWatchdogReportFromLedger(
  lanes: QueueWorktreePrLinkageLane[],
  issues: string[],
): string {
  const prBackedCount = lanes.filter((lane) => lane.pullRequest).length;
  const linkedWithGapsCount = lanes.filter(
    (lane) => lane.linkageStatus === "linked-with-gaps",
  ).length;

  const lines = [
    "Active PR Mergeability Watchdog",
    `lanes=${lanes.length} pr-backed=${prBackedCount} linked-with-gaps=${linkedWithGapsCount}`,
  ];

  if (issues.length > 0) {
    lines.push("");
    for (const issue of issues) {
      lines.push(`issue=${issue}`);
    }
  }

  if (lanes.length === 0) {
    lines.push("");
    lines.push("No active or failed queue lanes were discovered.");
    return lines.join("\n");
  }

  lines.push("");
  for (const lane of lanes) {
    const details = [
      `status=${lane.pullRequest ? "pr-backed" : lane.linkageStatus}`,
      `queue=${lane.queueState}`,
      `work-item=${lane.laneName}`,
      `work-item-source=${lane.workItemNameSource ?? "queue"}`,
      `branch=${lane.branchName ?? "?"}`,
      `branch-source=${lane.branchMetadataSource ?? "?"}`,
      `metadata=${lane.metadataStatus ?? "?"}`,
      `worktree=${lane.worktreePath ?? "?"}`,
      `pr=${lane.pullRequest ? `#${lane.pullRequest.number}` : "?"}`,
      `pr-status=${lane.pullRequestLookup.status}`,
      `drift=${formatDrift(lane)}`,
    ];

    if (lane.sessionId) {
      details.push(`session=${lane.sessionId}`);
      details.push(`session-source=${lane.sessionIdSource ?? "?"}`);
    }
    if (lane.sessionState) {
      details.push(`session-state=${lane.sessionState}`);
    }
    if (lane.mergeabilityClass) {
      details.push(`mergeability=${lane.mergeabilityClass}`);
    }
    if (lane.checkHealth) {
      details.push(`checks=${lane.checkHealth}`);
    }
    if (lane.queueMismatchRisk && lane.queueMismatchRisk !== "none") {
      details.push(`risk=${lane.queueMismatchRisk}`);
    }
    if (lane.nextAction) {
      details.push(`next-action=${lane.nextAction}`);
    }
    if (lane.pullRequestLookup.failureKind) {
      details.push(`pr-failure=${lane.pullRequestLookup.failureKind}`);
    }
    if (lane.missingLinkageReasons.length > 0) {
      details.push(`reason=${lane.missingLinkageReasons.join("; ")}`);
    }

    lines.push(`- ${details.join(" ")}`);
  }

  return lines.join("\n");
}

const ledger = discoverQueueWorktreePrLinkageLedger({
  repoRoot,
  workListJsonText,
  sessionListJsonText,
  worktreesDir,
  lookupPullRequest: pullRequestMap ? lookupPullRequestFromFixture : undefined,
});

console.log(formatWatchdogReportFromLedger(ledger.lanes, ledger.issues));
