import {
  type CheckHealthStatus,
  type DiscoverActivePrLanesOptions,
  discoverActivePrLaneReport,
  type LaneDiscoveryRecord,
  type MergeabilityClass,
  type PlannerNextAction,
  type QueueLaneState,
  type QueueMismatchRisk,
} from "@/lib/factory/active-pr-mergeability-watchdog";

export type QueueWorktreePrLinkageStatus = "linked" | "linked-with-gaps";

export interface QueueWorktreePrIdentity {
  number: number;
  url?: string;
}

export interface QueueWorktreePrLinkageLane {
  laneName: string;
  queueState: QueueLaneState;
  rawQueueState: string;
  linkageStatus: QueueWorktreePrLinkageStatus;
  worktreePath?: string;
  branchName?: string;
  branchMetadataSource?: "git" | "prd";
  pullRequest: QueueWorktreePrIdentity | null;
  missingLinkageReasons: string[];
  sessionId?: string;
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
    branchName: lane.branchName,
    branchMetadataSource: lane.branchMetadataSource,
    pullRequest:
      typeof lane.prNumber === "number"
        ? {
            number: lane.prNumber,
            url: lane.prUrl,
          }
        : null,
    missingLinkageReasons,
    sessionId: lane.sessionId,
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
      `branch=${lane.branchName ?? "?"}`,
      `branch-source=${lane.branchMetadataSource ?? "?"}`,
      `worktree=${lane.worktreePath ?? "?"}`,
      `pr=${lane.pullRequest ? `#${lane.pullRequest.number}` : "?"}`,
      `drift=${formatDrift(lane)}`,
    ];

    if (lane.sessionId) {
      details.push(`session=${lane.sessionId}`);
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
    if (lane.missingLinkageReasons.length > 0) {
      details.push(`missing=${lane.missingLinkageReasons.join("; ")}`);
    }

    lines.push(`- ${details.join(" ")}`);
  }

  return lines.join("\n");
}
