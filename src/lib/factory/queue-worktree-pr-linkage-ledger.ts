import {
  type CheckHealthStatus,
  type DiscoverActivePrLanesOptions,
  discoverActivePrLaneReport,
  type LaneDiscoveryRecord,
  type MergeabilityClass,
  type PlannerNextAction,
  type PullRequestLookupFailureKind,
  type QueueLaneState,
  type QueueMismatchRisk,
} from "@/lib/factory/active-pr-mergeability-watchdog";

export type QueueWorktreePrLinkageStatus = "linked" | "linked-with-gaps";

export interface QueueWorktreePrIdentity {
  number: number;
  url?: string;
}

export interface QueueWorktreePrLookup {
  status: "resolved" | "missing";
  failureKind?: PullRequestLookupFailureKind;
  failureReason?: string;
}

export interface QueueWorktreePrLinkageLane {
  laneName: string;
  queueState: QueueLaneState;
  rawQueueState: string;
  linkageStatus: QueueWorktreePrLinkageStatus;
  worktreePath?: string;
  workItemNameSource?: "metadata" | "directory" | "queue";
  branchName?: string;
  branchMetadataSource?: "metadata" | "git" | "prd";
  metadataStatus?: "present" | "missing" | "incomplete" | "conflicting";
  pullRequest: QueueWorktreePrIdentity | null;
  pullRequestLookup: QueueWorktreePrLookup;
  missingLinkageReasons: string[];
  sessionId?: string;
  sessionIdSource?: "queue" | "session" | "metadata";
  sessionState?: string;
  driftStatus?: LaneDiscoveryRecord["driftStatus"];
  commitsAheadOfMain?: number;
  commitsBehindMain?: number;
  checkHealth?: CheckHealthStatus;
  mergeabilityClass?: MergeabilityClass;
  queueMismatchRisk?: QueueMismatchRisk;
  nextAction?: PlannerNextAction;
}

export interface QueueWorktreePrLinkageLedger {
  generatedAtUtc: string;
  laneCount: number;
  activeLaneCount: number;
  failedLaneCount: number;
  linkedLaneCount: number;
  linkedWithGapsLaneCount: number;
  lanes: QueueWorktreePrLinkageLane[];
  issues: string[];
}

function mapLaneRecord(lane: LaneDiscoveryRecord): QueueWorktreePrLinkageLane {
  const missingLinkageReasons = [...lane.reasons];

  return {
    laneName: lane.workItemName,
    queueState: lane.queueState,
    rawQueueState: lane.rawQueueState,
    linkageStatus:
      missingLinkageReasons.length > 0 ? "linked-with-gaps" : "linked",
    worktreePath: lane.worktreePath,
    workItemNameSource: lane.workItemNameSource,
    branchName: lane.branchName,
    branchMetadataSource: lane.branchMetadataSource,
    metadataStatus: lane.metadataStatus,
    pullRequest:
      typeof lane.prNumber === "number"
        ? {
            number: lane.prNumber,
            url: lane.prUrl,
          }
        : null,
    pullRequestLookup:
      typeof lane.prNumber === "number"
        ? { status: "resolved" }
        : {
            status: "missing",
            failureKind: lane.prLookupFailureKind,
            failureReason: lane.prLookupFailureReason,
          },
    missingLinkageReasons,
    sessionId: lane.sessionId,
    sessionIdSource: lane.sessionIdSource,
    sessionState: lane.sessionState,
    driftStatus: lane.driftStatus,
    commitsAheadOfMain: lane.commitsAheadOfMain,
    commitsBehindMain: lane.commitsBehindMain,
    checkHealth: lane.checkHealth,
    mergeabilityClass: lane.mergeabilityClass,
    queueMismatchRisk: lane.queueMismatchRisk,
    nextAction: lane.nextAction,
  };
}

export function buildQueueWorktreePrLinkageLedger(
  report: ReturnType<typeof discoverActivePrLaneReport>,
  generatedAtUtc = new Date().toISOString(),
): QueueWorktreePrLinkageLedger {
  const lanes = report.lanes.map(mapLaneRecord);
  const activeLaneCount = lanes.filter(
    (lane) => lane.queueState === "active",
  ).length;
  const failedLaneCount = lanes.length - activeLaneCount;
  const linkedLaneCount = lanes.filter(
    (lane) => lane.linkageStatus === "linked",
  ).length;
  const linkedWithGapsLaneCount = lanes.length - linkedLaneCount;

  return {
    generatedAtUtc,
    laneCount: lanes.length,
    activeLaneCount,
    failedLaneCount,
    linkedLaneCount,
    linkedWithGapsLaneCount,
    lanes,
    issues: [...report.issues],
  };
}

export function discoverQueueWorktreePrLinkageLedger(
  options: DiscoverActivePrLanesOptions,
): QueueWorktreePrLinkageLedger {
  return buildQueueWorktreePrLinkageLedger(discoverActivePrLaneReport(options));
}

function formatDrift(
  lane: Pick<
    QueueWorktreePrLinkageLane,
    "driftStatus" | "commitsAheadOfMain" | "commitsBehindMain"
  >,
): string {
  if (!lane.driftStatus || lane.driftStatus === "unknown") {
    return lane.driftStatus ?? "unknown";
  }
  return `${lane.driftStatus}(ahead=${lane.commitsAheadOfMain ?? 0},behind=${lane.commitsBehindMain ?? 0})`;
}

export function formatQueueWorktreePrLinkageSummary(
  ledger: QueueWorktreePrLinkageLedger,
): string {
  const lines = [
    "Queue Worktree PR Linkage Ledger",
    `queue-derived-lanes=${ledger.laneCount} active=${ledger.activeLaneCount} failed=${ledger.failedLaneCount} linked=${ledger.linkedLaneCount} linked-with-gaps=${ledger.linkedWithGapsLaneCount}`,
  ];

  if (ledger.issues.length > 0) {
    lines.push("");
    for (const issue of ledger.issues) {
      lines.push(`issue=${issue}`);
    }
  }

  if (ledger.lanes.length === 0) {
    lines.push("");
    lines.push("No active or recently failed queue lanes were discovered.");
    return lines.join("\n");
  }

  lines.push("");
  for (const lane of ledger.lanes) {
    const details = [
      `lane=${lane.laneName}`,
      `queue=${lane.queueState}`,
      `linkage=${lane.linkageStatus}`,
      `work-item-source=${lane.workItemNameSource ?? "queue"}`,
      `branch=${lane.branchName ?? "?"}`,
      `branch-source=${lane.branchMetadataSource ?? "?"}`,
      `metadata=${lane.metadataStatus ?? "?"}`,
      `worktree=${lane.worktreePath ?? "?"}`,
      `pr=${lane.pullRequest ? `#${lane.pullRequest.number}` : "?"}`,
      `pr-status=${lane.pullRequestLookup.status}`,
      `drift=${formatDrift(lane)}`,
    ];

    if (lane.pullRequest?.url) {
      details.push(`pr-url=${lane.pullRequest.url}`);
    }

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
      details.push(`missing=${lane.missingLinkageReasons.join("; ")}`);
    }

    lines.push(`- ${details.join(" ")}`);
  }

  return lines.join("\n");
}

function rankPlannerWatchdogLane(lane: QueueWorktreePrLinkageLane): number {
  if (lane.pullRequest) {
    if (lane.nextAction === "refresh-branch") {
      return 0;
    }
    if (lane.checkHealth === "failing") {
      return 1;
    }
    if (lane.nextAction === "wait") {
      return 2;
    }
    return 3;
  }

  return 4;
}

export function sortPlannerWatchdogLanes(
  lanes: QueueWorktreePrLinkageLane[],
): QueueWorktreePrLinkageLane[] {
  return [...lanes].sort((left, right) => {
    const rankDifference =
      rankPlannerWatchdogLane(left) - rankPlannerWatchdogLane(right);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    const leftPrNumber = left.pullRequest?.number ?? Number.MAX_SAFE_INTEGER;
    const rightPrNumber = right.pullRequest?.number ?? Number.MAX_SAFE_INTEGER;
    if (leftPrNumber !== rightPrNumber) {
      return leftPrNumber - rightPrNumber;
    }

    return left.laneName.localeCompare(right.laneName);
  });
}
