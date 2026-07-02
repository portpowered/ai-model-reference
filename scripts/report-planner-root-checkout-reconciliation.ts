import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  discoverActivePrLaneReport,
  type PullRequestLookupFailureKind,
  type PullRequestLookupResult,
  type PullRequestRecord,
} from "../src/lib/factory/active-pr-mergeability-watchdog";
import {
  readCompleteLiveWorkListSnapshotJson,
  readLiveYouJsonCommand,
} from "../src/lib/factory/live-queue-snapshot";
import {
  discoverPlannerRootCheckoutReconciliationReport,
  formatPlannerRootCheckoutReconciliationReport,
  serializePlannerRootCheckoutReconciliationReport,
} from "../src/lib/factory/planner-root-checkout-reconciliation";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readOptionalFile(path: string, label: string): string | undefined {
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

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const remoteBaseRef = readFlagValue("--remote-base-ref");
const statusOutputPath = readFlagValue("--status-output");
const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : undefined;
const skipLaneDiscovery = process.argv.includes("--skip-lane-discovery");
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
    readOptionalFile(prMapPath, "PR map") as string,
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

function discoverLaneReport() {
  const workListJsonText = workListPath
    ? readOptionalFile(workListPath, "work list")
    : readCompleteLiveWorkListSnapshotJson(repoRoot, [
        "work",
        "list",
        "--session",
        plannerSession,
      ]);
  const sessionListJsonText = sessionListPath
    ? readOptionalFile(sessionListPath, "session list")
    : readLiveYouJsonCommand(repoRoot, ["session", "list"], "session list");

  return discoverActivePrLaneReport({
    repoRoot,
    workListJsonText: workListJsonText as string,
    sessionListJsonText,
    worktreesDir,
    lookupPullRequest: pullRequestMap
      ? lookupPullRequestFromFixture
      : undefined,
  });
}

const report = discoverPlannerRootCheckoutReconciliationReport({
  laneDiscoveryReport: skipLaneDiscovery ? undefined : discoverLaneReport(),
  remoteBaseRef,
  repoRoot,
  statusOutput,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? serializePlannerRootCheckoutReconciliationReport(report)
    : `${formatPlannerRootCheckoutReconciliationReport(report)}\n`,
);
