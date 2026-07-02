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
  workTypeName?: string;
  hasDependsOnRelation?: boolean;
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
  metadataRefreshHints?: string[];
}

export type LaneLinkageNoiseClass =
  | "actionable-gap"
  | "queue-only-missing-linkage"
  | "stale-failed-loopback";

export interface QueueWorktreePrLinkageLedger {
  generatedAtUtc: string;
  laneCount: number;
  activeLaneCount: number;
  failedLaneCount: number;
  linkedLaneCount: number;
  linkedWithGapsLaneCount: number;
  prBackedLaneCount: number;
  actionableLinkageGapLaneCount: number;
  queueOnlyControlNoiseLaneCount: number;
  lanes: QueueWorktreePrLinkageLane[];
  issues: string[];
}

export function isQueueOnlyMissingLinkageLane(
  lane: QueueWorktreePrLinkageLane,
): boolean {
  return (
    !lane.pullRequest &&
    !lane.worktreePath &&
    lane.missingLinkageReasons.some((reason) =>
      reason.includes("no matching worktree under .claude/worktrees"),
    )
  );
}

export function isStaleFailedLoopbackLane(
  lane: QueueWorktreePrLinkageLane,
): boolean {
  return (
    lane.queueState === "failed" &&
    !lane.pullRequest &&
    lane.workTypeName === "thoughts" &&
    lane.hasDependsOnRelation === true &&
    lane.nextAction !== "repair-token" &&
    !isQueueOnlyMissingLinkageLane(lane)
  );
}

export function classifyLaneLinkageNoise(
  lane: QueueWorktreePrLinkageLane,
): LaneLinkageNoiseClass | null {
  if (isQueueOnlyMissingLinkageLane(lane)) {
    return "queue-only-missing-linkage";
  }
  if (isStaleFailedLoopbackLane(lane)) {
    return "stale-failed-loopback";
  }
  if (lane.linkageStatus === "linked-with-gaps") {
    return "actionable-gap";
  }
  return null;
}

export function isActionableLinkageGapLane(
  lane: QueueWorktreePrLinkageLane,
): boolean {
  return classifyLaneLinkageNoise(lane) === "actionable-gap";
}

export function isQueueOnlyControlNoiseLane(
  lane: QueueWorktreePrLinkageLane,
): boolean {
  const noiseClass = classifyLaneLinkageNoise(lane);
  return (
    noiseClass === "queue-only-missing-linkage" ||
    noiseClass === "stale-failed-loopback"
  );
}

function summarizeLinkageClassificationCounts(
  lanes: QueueWorktreePrLinkageLane[],
): Pick<
  QueueWorktreePrLinkageLedger,
  | "prBackedLaneCount"
  | "actionableLinkageGapLaneCount"
  | "queueOnlyControlNoiseLaneCount"
> {
  return {
    prBackedLaneCount: lanes.filter((lane) => lane.pullRequest).length,
    actionableLinkageGapLaneCount: lanes.filter(isActionableLinkageGapLane)
      .length,
    queueOnlyControlNoiseLaneCount: lanes.filter(isQueueOnlyControlNoiseLane)
      .length,
  };
}

function mapLaneRecord(lane: LaneDiscoveryRecord): QueueWorktreePrLinkageLane {
  const missingLinkageReasons = [...lane.reasons];
  const metadataRefreshHints = [...(lane.metadataRefreshHints ?? [])];

  return {
    laneName: lane.workItemName,
    queueState: lane.queueState,
    rawQueueState: lane.rawQueueState,
    linkageStatus:
      missingLinkageReasons.length > 0 ? "linked-with-gaps" : "linked",
    workTypeName: lane.workTypeName,
    hasDependsOnRelation: lane.hasDependsOnRelation,
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
    metadataRefreshHints,
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
    ...summarizeLinkageClassificationCounts(lanes),
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

function formatNoiseWorkItems(lanes: QueueWorktreePrLinkageLane[]): string {
  const workItems = lanes.map((lane) => lane.laneName);
  if (workItems.length <= 3) {
    return workItems.join(",");
  }
  return `${workItems.slice(0, 3).join(",")},+${workItems.length - 3} more`;
}

function formatNoiseEvidence(lanes: QueueWorktreePrLinkageLane[]): string {
  const reasonCounts = new Map<string, number>();
  for (const lane of lanes) {
    for (const reason of new Set(lane.missingLinkageReasons)) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  return [...reasonCounts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 2)
    .map(([reason, count]) => `${count}x:${reason}`)
    .join(" | ");
}

export function formatLinkageNoiseSummaryRow(
  noiseClass: string,
  lanes: QueueWorktreePrLinkageLane[],
): string {
  const details = [
    `noise=${noiseClass}`,
    `count=${lanes.length}`,
    `work-items=${formatNoiseWorkItems(lanes)}`,
  ];
  const evidence = formatNoiseEvidence(lanes);
  if (evidence) {
    details.push(`evidence=${evidence}`);
  }
  return `- ${details.join(" ")}`;
}

export function partitionLinkageLanesForSummary(
  lanes: QueueWorktreePrLinkageLane[],
): {
  actionableLanes: QueueWorktreePrLinkageLane[];
  queueOnlyMissingLinkageLanes: QueueWorktreePrLinkageLane[];
  staleFailedLoopbackLanes: QueueWorktreePrLinkageLane[];
} {
  const orderedLanes = sortPlannerWatchdogLanes(lanes);
  const queueOnlyMissingLinkageLanes = orderedLanes.filter(
    isQueueOnlyMissingLinkageLane,
  );
  const staleFailedLoopbackLanes = orderedLanes.filter(
    isStaleFailedLoopbackLane,
  );
  const actionableLanes = orderedLanes.filter(
    (lane) =>
      !queueOnlyMissingLinkageLanes.includes(lane) &&
      !staleFailedLoopbackLanes.includes(lane),
  );

  return {
    actionableLanes,
    queueOnlyMissingLinkageLanes,
    staleFailedLoopbackLanes,
  };
}

export function formatQueueWorktreePrLinkageSummary(
  ledger: QueueWorktreePrLinkageLedger,
): string {
  const lines = [
    "Queue Worktree PR Linkage Ledger",
    `queue-derived-lanes=${ledger.laneCount} active=${ledger.activeLaneCount} failed=${ledger.failedLaneCount} pr-backed=${ledger.prBackedLaneCount} actionable-gaps=${ledger.actionableLinkageGapLaneCount} queue-only-noise=${ledger.queueOnlyControlNoiseLaneCount} linked=${ledger.linkedLaneCount} linked-with-gaps=${ledger.linkedWithGapsLaneCount}`,
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

  const {
    actionableLanes,
    queueOnlyMissingLinkageLanes,
    staleFailedLoopbackLanes,
  } = partitionLinkageLanesForSummary(ledger.lanes);

  if (actionableLanes.length > 0) {
    lines.push("");
    for (const lane of actionableLanes) {
      lines.push(formatLinkageLaneDetailRow(lane));
    }
  }

  if (
    staleFailedLoopbackLanes.length > 0 ||
    queueOnlyMissingLinkageLanes.length > 0
  ) {
    lines.push("");
    lines.push("Noise Summary");
    if (staleFailedLoopbackLanes.length > 0) {
      lines.push(
        formatLinkageNoiseSummaryRow(
          "stale-failed-loopbacks",
          staleFailedLoopbackLanes,
        ),
      );
    }
    if (queueOnlyMissingLinkageLanes.length > 0) {
      lines.push(
        formatLinkageNoiseSummaryRow(
          "queue-only-missing-linkage",
          queueOnlyMissingLinkageLanes,
        ),
      );
    }
  }

  return lines.join("\n");
}

function formatLinkageLaneDetailRow(lane: QueueWorktreePrLinkageLane): string {
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
  if (lane.metadataRefreshHints && lane.metadataRefreshHints.length > 0) {
    details.push(`metadata-refresh=${lane.metadataRefreshHints.join("; ")}`);
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

  return `- ${details.join(" ")}`;
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
