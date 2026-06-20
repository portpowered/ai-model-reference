import {
  parseQueueLaneRecords,
  type QueueLaneRecord,
} from "./active-pr-mergeability-watchdog";
import {
  discoverPlannerQueueHealthReport,
  type QueueHealthItem,
} from "./planner-queue-health";

export type PlannerConcurrencyFloorStatus =
  | "below-target"
  | "at-target"
  | "above-target";

export interface PlannerUsefulActiveLane {
  workItemName: string;
  rawState: string;
  sessionId?: string;
}

export interface PlannerStaleNoiseEvidence {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  stateName: string;
  stateType: QueueHealthItem["stateType"];
  reasons: string[];
  occurrenceCount?: number;
}

export interface PlannerConcurrencyFloorReport {
  advisoryOnly: true;
  generatedAtUtc: string;
  sourceSession: string;
  concurrencyFloor: number;
  usefulActiveLaneCount: number;
  floorStatus: PlannerConcurrencyFloorStatus;
  lanesNeededToReachFloor: number;
  usefulActiveLanes: PlannerUsefulActiveLane[];
  ignoredStaleNoise: PlannerStaleNoiseEvidence[];
  issues: string[];
}

function summarizeUsefulActiveLane(
  record: QueueLaneRecord,
): PlannerUsefulActiveLane {
  return {
    workItemName: record.workItemName,
    rawState: record.rawState,
    sessionId: record.sessionId,
  };
}

function summarizeStaleNoise(item: QueueHealthItem): PlannerStaleNoiseEvidence {
  return {
    workId: item.workId,
    workItemName: item.workItemName,
    workTypeName: item.workTypeName,
    stateName: item.stateName,
    stateType: item.stateType,
    reasons: [...item.reasons],
    occurrenceCount: item.occurrenceCount,
  };
}

function classifyFloorStatus(
  usefulActiveLaneCount: number,
  concurrencyFloor: number,
): PlannerConcurrencyFloorStatus {
  if (usefulActiveLaneCount < concurrencyFloor) {
    return "below-target";
  }
  if (usefulActiveLaneCount === concurrencyFloor) {
    return "at-target";
  }
  return "above-target";
}

export function serializePlannerConcurrencyFloorReport(
  report: PlannerConcurrencyFloorReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function discoverPlannerConcurrencyFloorReport(options: {
  concurrencyFloor: number;
  generatedAtUtc?: string;
  sourceSession?: string;
  workListJsonText: string;
}): PlannerConcurrencyFloorReport {
  const sourceSession = options.sourceSession ?? "~default";
  const queueHealth = discoverPlannerQueueHealthReport({
    generatedAtUtc: options.generatedAtUtc,
    sourceSession,
    workListJsonText: options.workListJsonText,
  });
  const usefulActiveLanes = parseQueueLaneRecords(options.workListJsonText)
    .filter((record) => record.queueState === "active")
    .map(summarizeUsefulActiveLane)
    .sort((left, right) => left.workItemName.localeCompare(right.workItemName));
  const usefulActiveLaneCount = usefulActiveLanes.length;

  return {
    advisoryOnly: true,
    generatedAtUtc: queueHealth.generatedAtUtc,
    sourceSession,
    concurrencyFloor: options.concurrencyFloor,
    usefulActiveLaneCount,
    floorStatus: classifyFloorStatus(
      usefulActiveLaneCount,
      options.concurrencyFloor,
    ),
    lanesNeededToReachFloor: Math.max(
      options.concurrencyFloor - usefulActiveLaneCount,
      0,
    ),
    usefulActiveLanes,
    ignoredStaleNoise:
      queueHealth.ignorableStaleNoise.items.map(summarizeStaleNoise),
    issues: [...queueHealth.issues],
  };
}

function formatUsefulActiveLanes(
  usefulActiveLanes: PlannerUsefulActiveLane[],
): string[] {
  const lines = [`Useful Active Lanes (${usefulActiveLanes.length})`];
  if (usefulActiveLanes.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const lane of usefulActiveLanes) {
    const fields = [
      `work-item=${lane.workItemName}`,
      `raw-state=${lane.rawState}`,
    ];
    if (lane.sessionId) {
      fields.push(`session=${lane.sessionId}`);
    }
    lines.push(`- ${fields.join(" ")}`);
  }
  return lines;
}

function formatIgnoredStaleNoise(
  ignoredStaleNoise: PlannerStaleNoiseEvidence[],
): string[] {
  const lines = [`Ignored Stale Noise (${ignoredStaleNoise.length})`];
  if (ignoredStaleNoise.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const item of ignoredStaleNoise) {
    const fields = [
      `work-item=${item.workItemName}`,
      `state=${item.stateName}/${item.stateType.toLowerCase()}`,
      `work-id=${item.workId}`,
    ];
    if (item.workTypeName) {
      fields.push(`type=${item.workTypeName}`);
    }
    if (item.occurrenceCount && item.occurrenceCount > 1) {
      fields.push(`occurrences=${item.occurrenceCount}`);
    }
    fields.push(`reason=${item.reasons.join("; ")}`);
    lines.push(`- ${fields.join(" ")}`);
  }
  return lines;
}

export function formatPlannerConcurrencyFloorReport(
  report: PlannerConcurrencyFloorReport,
): string {
  const lines = [
    "Planner concurrency-floor summary",
    `generated-at=${report.generatedAtUtc} session=${report.sourceSession}`,
    `summary useful-active=${report.usefulActiveLaneCount} floor=${report.concurrencyFloor} status=${report.floorStatus} refill-needed=${report.lanesNeededToReachFloor} advisory-only=${report.advisoryOnly}`,
    "",
    ...formatUsefulActiveLanes(report.usefulActiveLanes),
    "",
    ...formatIgnoredStaleNoise(report.ignoredStaleNoise),
  ];

  if (report.issues.length > 0) {
    lines.push("", "Issues");
    for (const issue of report.issues) {
      lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}
