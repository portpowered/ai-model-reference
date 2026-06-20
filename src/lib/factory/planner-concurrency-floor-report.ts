import {
  parseQueueLaneRecords,
  type QueueLaneRecord,
} from "./active-pr-mergeability-watchdog";
import {
  discoverPlannerQueueHealthReport,
  type QueueHealthItem,
} from "./planner-queue-health";

const HOLD_SECTION_HEADING = /^##\s+holds\s*$/i;
const MARKDOWN_HEADING = /^#\s+(.+?)\s*$/;
const HOLD_KEYWORDS = [
  "hold",
  "held",
  "blocked",
  "dependency",
  "dirty-surface",
  "dirty surface",
] as const;
const LEADING_MARKER_CHARACTERS = new Set([
  "-",
  "*",
  "[",
  "]",
  "x",
  "X",
  ".",
  " ",
  "\t",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
]);

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

export type PlannerBacklogCandidateStatus = "ready" | "held" | "already-active";

export interface PlannerBacklogTaskFile {
  path: string;
  text: string;
}

export interface PlannerTempStateFile {
  path: string;
  text: string;
}

export interface PlannerBacklogCandidate {
  taskPath: string;
  taskId: string;
  title: string;
  status: PlannerBacklogCandidateStatus;
  eligibleForRefill: boolean;
  holdReasons: string[];
  activeLaneName?: string;
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
  plannerOwnedBacklogCandidates: PlannerBacklogCandidate[];
  refillCandidates: PlannerBacklogCandidate[];
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

function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanizeTaskStem(taskStem: string): string {
  return taskStem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function extractTitle(
  taskFile: PlannerBacklogTaskFile,
  taskStem: string,
): string {
  const heading = taskFile.text.match(MARKDOWN_HEADING)?.[1]?.trim();
  return heading && heading.length > 0 ? heading : humanizeTaskStem(taskStem);
}

function deriveTaskId(taskPath: string): string {
  const normalizedPath = taskPath.replace(/\\/g, "/");
  const trimmedPath = normalizedPath
    .replace(/^tasks\//, "")
    .replace(/\.md$/i, "");
  return trimmedPath.length > 0
    ? trimmedPath
    : normalizedPath.replace(/\.md$/i, "");
}

function collectCandidateAliases(taskPath: string, title: string): string[] {
  const normalizedPath = taskPath.replace(/\\/g, "/");
  const taskStem =
    normalizedPath.split("/").pop()?.replace(/\.md$/i, "") ?? normalizedPath;

  return [
    ...new Set([
      normalizeAlias(taskStem),
      normalizeAlias(title),
      normalizeAlias(normalizedPath),
      normalizeAlias(normalizedPath.replace(/^tasks\//, "")),
    ]),
  ].filter(Boolean);
}

function collectActiveLaneAliasMap(
  usefulActiveLanes: PlannerUsefulActiveLane[],
): Map<string, string> {
  const activeAliases = new Map<string, string>();

  for (const lane of usefulActiveLanes) {
    const alias = normalizeAlias(lane.workItemName);
    if (alias) {
      activeAliases.set(alias, lane.workItemName);
    }
  }

  return activeAliases;
}

function collectHoldReasonsForAliases(
  aliases: string[],
  tempStateFiles: PlannerTempStateFile[],
): string[] {
  const reasons = new Set<string>();

  for (const file of tempStateFiles) {
    let insideChecklistHolds = false;
    for (const rawLine of file.text.split("\n")) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      if (/^##\s+/i.test(line)) {
        insideChecklistHolds = HOLD_SECTION_HEADING.test(line);
      }

      const normalizedLine = normalizeAlias(line);
      let markerStrippedLine = line;
      while (
        markerStrippedLine.length > 0 &&
        LEADING_MARKER_CHARACTERS.has(markerStrippedLine[0] ?? "")
      ) {
        markerStrippedLine = markerStrippedLine.slice(1);
      }
      const mentionsAlias = aliases.some(
        (alias) =>
          normalizedLine.includes(alias) ||
          normalizeAlias(markerStrippedLine).includes(alias),
      );

      if (!mentionsAlias) {
        continue;
      }

      const hasHoldKeyword = HOLD_KEYWORDS.some((keyword) =>
        line.toLowerCase().includes(keyword),
      );

      if (!insideChecklistHolds && !hasHoldKeyword) {
        continue;
      }

      reasons.add(`${file.path}: ${line}`);
    }
  }

  return [...reasons].sort();
}

function discoverPlannerOwnedBacklogCandidates(options: {
  taskFiles: PlannerBacklogTaskFile[];
  tempStateFiles: PlannerTempStateFile[];
  usefulActiveLanes: PlannerUsefulActiveLane[];
}): PlannerBacklogCandidate[] {
  const activeAliases = collectActiveLaneAliasMap(options.usefulActiveLanes);

  return options.taskFiles
    .filter((taskFile) => taskFile.path.toLowerCase().endsWith(".md"))
    .map((taskFile) => {
      const normalizedPath = taskFile.path.replace(/\\/g, "/");
      const taskStem =
        normalizedPath.split("/").pop()?.replace(/\.md$/i, "") ??
        normalizedPath;
      const title = extractTitle(taskFile, taskStem);
      const aliases = collectCandidateAliases(normalizedPath, title);
      const taskId = deriveTaskId(normalizedPath);
      const activeLaneName = aliases
        .map((alias) => activeAliases.get(alias))
        .find((candidate): candidate is string => Boolean(candidate));
      const holdReasons = collectHoldReasonsForAliases(
        aliases,
        options.tempStateFiles,
      );
      const status: PlannerBacklogCandidateStatus = activeLaneName
        ? "already-active"
        : holdReasons.length > 0
          ? "held"
          : "ready";

      return {
        taskPath: normalizedPath,
        taskId,
        title,
        status,
        eligibleForRefill: status === "ready",
        holdReasons,
        activeLaneName,
      };
    })
    .sort((left, right) => left.taskPath.localeCompare(right.taskPath));
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
  taskFiles?: PlannerBacklogTaskFile[];
  tempStateFiles?: PlannerTempStateFile[];
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
  const plannerOwnedBacklogCandidates = discoverPlannerOwnedBacklogCandidates({
    taskFiles: options.taskFiles ?? [],
    tempStateFiles: options.tempStateFiles ?? [],
    usefulActiveLanes,
  });
  const refillCandidates =
    usefulActiveLaneCount < options.concurrencyFloor
      ? plannerOwnedBacklogCandidates.filter(
          (candidate) => candidate.eligibleForRefill,
        )
      : [];

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
    plannerOwnedBacklogCandidates,
    refillCandidates,
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

function formatPlannerOwnedBacklogCandidates(
  candidates: PlannerBacklogCandidate[],
): string[] {
  const lines = [`Planner-Owned Backlog Candidates (${candidates.length})`];
  if (candidates.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const candidate of candidates) {
    const fields = [
      `task=${candidate.taskId}`,
      `status=${candidate.status}`,
      `eligible=${candidate.eligibleForRefill}`,
      `path=${candidate.taskPath}`,
    ];
    if (candidate.activeLaneName) {
      fields.push(`active-lane=${candidate.activeLaneName}`);
    }
    if (candidate.holdReasons.length > 0) {
      fields.push(`hold=${candidate.holdReasons.join(" | ")}`);
    }
    lines.push(`- ${fields.join(" ")}`);
  }

  return lines;
}

function formatRefillCandidates(
  candidates: PlannerBacklogCandidate[],
): string[] {
  const lines = [`Refill Candidates (${candidates.length})`];
  if (candidates.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const candidate of candidates) {
    lines.push(
      `- task=${candidate.taskId} title=${candidate.title} path=${candidate.taskPath}`,
    );
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
    "",
    ...formatPlannerOwnedBacklogCandidates(
      report.plannerOwnedBacklogCandidates,
    ),
    "",
    ...formatRefillCandidates(report.refillCandidates),
  ];

  if (report.issues.length > 0) {
    lines.push("", "Issues");
    for (const issue of report.issues) {
      lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}
