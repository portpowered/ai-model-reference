import {
  buildQueueSessionIdByWorkId,
  discoverPlannerQueueHealthReport,
  type QueueHealthDependency,
  type QueueHealthItem,
  type QueueHealthReport,
  type QueueHealthStateType,
} from "./planner-queue-health";

const USEFUL_ACTIVE_WORK_TYPES = new Set(["task", "review"]);

const HOLD_SECTION_HEADING = /^##\s+holds\s*$/i;
const MARKDOWN_HEADING = /^#\s+(.+?)\s*$/;
const INLINE_CODE_SPAN = /`([^`\n]+)`/g;
const REPO_PATH_HINT =
  /(^|[^A-Za-z0-9._/-])((?:src|docs|scripts|factory|tasks|app|components|features|lib|tests?|packages)\/[A-Za-z0-9._/-]+)/g;
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

export interface PlannerBlockedDependencyEvidence {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  stateName: string;
  stateType: QueueHealthStateType;
  reasons: string[];
  dependencies: QueueHealthDependency[];
  sessionId?: string;
}

export type PlannerBacklogCandidateStatus = "ready" | "held" | "already-active";

export interface PlannerBacklogTaskFile {
  path: string;
  text: string;
}

export interface PlannerRootDirtyPathEvidence {
  path: string;
  surface: string;
}

export interface PlannerTempStateFile {
  path: string;
  text: string;
}

export type PlannerRefillRecommendation = "prefer" | "uncertain" | "hold";
export type PlannerCollisionEvidenceQuality =
  | "grounded"
  | "partial"
  | "missing";

export interface PlannerBacklogCandidate {
  taskPath: string;
  taskId: string;
  title: string;
  status: PlannerBacklogCandidateStatus;
  eligibleForRefill: boolean;
  holdReasons: string[];
  activeLaneName?: string;
  refillRecommendation: PlannerRefillRecommendation;
  evidenceQuality: PlannerCollisionEvidenceQuality;
  taskPathHints: string[];
  overlappingDirtyPaths: string[];
  overlappingDirtySurfaces: string[];
  recommendationReasons: string[];
}

export interface PlannerHeldBacklogEvidence {
  taskPath: string;
  taskId: string;
  title: string;
  status: Extract<PlannerBacklogCandidateStatus, "held" | "already-active">;
  holdReasons: string[];
  activeLaneName?: string;
  recommendationReasons: string[];
}

export interface PlannerAdvisoryUncertaintyEvidence {
  taskPath: string;
  taskId: string;
  title: string;
  evidenceQuality: PlannerCollisionEvidenceQuality;
  uncertaintyReasons: string[];
  overlappingDirtySurfaces: string[];
  taskPathHints: string[];
}

export interface PlannerConcurrencyFloorReport {
  contractVersion: "planner-concurrency-floor/v1";
  advisoryOnly: true;
  generatedAtUtc: string;
  sourceSession: string;
  concurrencyFloor: number;
  usefulActiveLaneCount: number;
  floorStatus: PlannerConcurrencyFloorStatus;
  lanesNeededToReachFloor: number;
  usefulActiveLanes: PlannerUsefulActiveLane[];
  blockedDependencyLanes: PlannerBlockedDependencyEvidence[];
  heldBacklogCandidates: PlannerHeldBacklogEvidence[];
  advisoryUncertainties: PlannerAdvisoryUncertaintyEvidence[];
  ignoredStaleNoise: PlannerStaleNoiseEvidence[];
  plannerOwnedBacklogCandidates: PlannerBacklogCandidate[];
  refillCandidates: PlannerBacklogCandidate[];
  issues: string[];
}

function summarizeUsefulActiveLane(
  item: QueueHealthItem,
  sessionId?: string,
): PlannerUsefulActiveLane {
  return {
    workItemName: item.workItemName,
    rawState: item.stateName,
    sessionId,
  };
}

function isUsefulActiveTaskReviewOrProcessingLane(
  item: QueueHealthItem,
): boolean {
  const workTypeName = item.workTypeName?.trim().toLowerCase();
  if (workTypeName && USEFUL_ACTIVE_WORK_TYPES.has(workTypeName)) {
    return true;
  }

  return !workTypeName && item.stateType === "PROCESSING";
}

function deriveUsefulActiveLanes(options: {
  queueHealth: QueueHealthReport;
  workListJsonText: string;
}): PlannerUsefulActiveLane[] {
  const sessionIdsByWorkId = buildQueueSessionIdByWorkId(
    options.workListJsonText,
  );

  return options.queueHealth.activeWork.items
    .filter(isUsefulActiveTaskReviewOrProcessingLane)
    .map((item) =>
      summarizeUsefulActiveLane(item, sessionIdsByWorkId.get(item.workId)),
    )
    .sort((left, right) => left.workItemName.localeCompare(right.workItemName));
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

function summarizeBlockedDependency(
  item: QueueHealthItem,
  sessionId?: string,
): PlannerBlockedDependencyEvidence {
  return {
    workId: item.workId,
    workItemName: item.workItemName,
    workTypeName: item.workTypeName,
    stateName: item.stateName,
    stateType: item.stateType,
    reasons: [...item.reasons],
    dependencies: item.dependencies.map((dependency) => ({ ...dependency })),
    sessionId,
  };
}

function deriveBlockedDependencyLanes(options: {
  queueHealth: QueueHealthReport;
  workListJsonText: string;
}): PlannerBlockedDependencyEvidence[] {
  const sessionIdsByWorkId = buildQueueSessionIdByWorkId(
    options.workListJsonText,
  );

  return options.queueHealth.expectedBlockedItems.items
    .map((item) =>
      summarizeBlockedDependency(item, sessionIdsByWorkId.get(item.workId)),
    )
    .sort((left, right) => left.workItemName.localeCompare(right.workItemName));
}

function deriveHeldBacklogCandidates(
  candidates: PlannerBacklogCandidate[],
): PlannerHeldBacklogEvidence[] {
  return candidates
    .filter(
      (
        candidate,
      ): candidate is PlannerBacklogCandidate & {
        status: Extract<
          PlannerBacklogCandidateStatus,
          "held" | "already-active"
        >;
      } => candidate.status === "held" || candidate.status === "already-active",
    )
    .map((candidate) => ({
      taskPath: candidate.taskPath,
      taskId: candidate.taskId,
      title: candidate.title,
      status: candidate.status,
      holdReasons: [...candidate.holdReasons],
      activeLaneName: candidate.activeLaneName,
      recommendationReasons: [...candidate.recommendationReasons],
    }));
}

function deriveAdvisoryUncertainties(
  candidates: PlannerBacklogCandidate[],
): PlannerAdvisoryUncertaintyEvidence[] {
  return candidates
    .filter((candidate) => candidate.refillRecommendation === "uncertain")
    .map((candidate) => ({
      taskPath: candidate.taskPath,
      taskId: candidate.taskId,
      title: candidate.title,
      evidenceQuality: candidate.evidenceQuality,
      uncertaintyReasons: [...candidate.recommendationReasons],
      overlappingDirtySurfaces: [...candidate.overlappingDirtySurfaces],
      taskPathHints: [...candidate.taskPathHints],
    }));
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

function normalizeRepoPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/[),.:;]+$/g, "");
}

function deriveSurfaceLabel(path: string): string {
  const normalizedPath = normalizeRepoPath(path);
  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return normalizedPath;
  }

  if (segments[0] === "src" || segments[0] === "factory") {
    return segments.slice(0, Math.min(3, segments.length)).join("/");
  }

  if (segments[0] === "docs") {
    return segments.length >= 3 ? segments.slice(0, 2).join("/") : "docs";
  }

  return segments.slice(0, Math.min(2, segments.length)).join("/");
}

function looksLikeRepoPathHint(value: string): boolean {
  if (!value || value.includes("://")) {
    return false;
  }

  const normalized = normalizeRepoPath(value);
  if (!normalized.includes("/")) {
    return false;
  }

  return /^(src|docs|scripts|factory|tasks|app|components|features|lib|tests?|packages)\//.test(
    normalized,
  );
}

function extractRepoPathHints(text: string): string[] {
  const hints = new Set<string>();

  for (const match of text.matchAll(INLINE_CODE_SPAN)) {
    const hint = normalizeRepoPath(match[1] ?? "");
    if (looksLikeRepoPathHint(hint)) {
      hints.add(hint);
    }
  }

  for (const match of text.matchAll(REPO_PATH_HINT)) {
    const hint = normalizeRepoPath(match[2] ?? "");
    if (looksLikeRepoPathHint(hint)) {
      hints.add(hint);
    }
  }

  return [...hints].sort();
}

function pathMatchesHint(target: string, hint: string): boolean {
  return (
    target === hint ||
    target.startsWith(`${hint}/`) ||
    hint.startsWith(`${target}/`)
  );
}

function rankRecommendation(
  recommendation: PlannerRefillRecommendation,
): number {
  switch (recommendation) {
    case "prefer":
      return 0;
    case "uncertain":
      return 1;
    case "hold":
      return 2;
  }
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

function buildReadyCandidateRecommendation(options: {
  rootDirtyPaths: PlannerRootDirtyPathEvidence[];
  rootDirtyPathsAvailable: boolean;
  taskFile: PlannerBacklogTaskFile;
}): Pick<
  PlannerBacklogCandidate,
  | "evidenceQuality"
  | "overlappingDirtyPaths"
  | "overlappingDirtySurfaces"
  | "recommendationReasons"
  | "refillRecommendation"
  | "taskPathHints"
> {
  const taskPathHints = extractRepoPathHints(options.taskFile.text);
  const overlappingDirtyPaths = [
    ...new Set(
      options.rootDirtyPaths
        .filter((dirtyPath) =>
          taskPathHints.some((hint) => pathMatchesHint(dirtyPath.path, hint)),
        )
        .map((dirtyPath) => dirtyPath.path),
    ),
  ].sort();
  const overlappingDirtySurfaces = [
    ...new Set(
      options.rootDirtyPaths
        .filter((dirtyPath) =>
          taskPathHints.map(deriveSurfaceLabel).includes(dirtyPath.surface),
        )
        .map((dirtyPath) => dirtyPath.surface),
    ),
  ]
    .filter(
      (surface) =>
        !overlappingDirtyPaths.some(
          (path) => deriveSurfaceLabel(path) === surface,
        ),
    )
    .sort();

  const recommendationReasons: string[] = [];
  let refillRecommendation: PlannerRefillRecommendation = "prefer";
  let evidenceQuality: PlannerCollisionEvidenceQuality = "grounded";

  if (taskPathHints.length === 0) {
    refillRecommendation = "uncertain";
    evidenceQuality = "missing";
    recommendationReasons.push(
      "Task file does not name repo-local paths, so collision evidence is incomplete.",
    );
  }

  if (!options.rootDirtyPathsAvailable) {
    refillRecommendation = "uncertain";
    evidenceQuality =
      evidenceQuality === "grounded" ? "partial" : evidenceQuality;
    recommendationReasons.push(
      "Planner root dirty-surface evidence was unavailable for this snapshot.",
    );
  }

  if (overlappingDirtyPaths.length > 0) {
    refillRecommendation = "hold";
    evidenceQuality = "partial";
    recommendationReasons.push(
      `Task hints overlap current planner dirty path(s): ${overlappingDirtyPaths.join(", ")}.`,
    );
  } else if (overlappingDirtySurfaces.length > 0) {
    refillRecommendation = "uncertain";
    evidenceQuality = "partial";
    recommendationReasons.push(
      `Task hints overlap current planner dirty surface(s): ${overlappingDirtySurfaces.join(", ")}.`,
    );
  }

  if (recommendationReasons.length === 0) {
    recommendationReasons.push(
      `No active alias conflict was found, and ${taskPathHints.length} repo-local path hint(s) avoid current planner dirty surfaces.`,
    );
  }

  return {
    evidenceQuality,
    overlappingDirtyPaths,
    overlappingDirtySurfaces,
    recommendationReasons,
    refillRecommendation,
    taskPathHints,
  };
}

function discoverPlannerOwnedBacklogCandidates(options: {
  taskFiles: PlannerBacklogTaskFile[];
  tempStateFiles: PlannerTempStateFile[];
  usefulActiveLanes: PlannerUsefulActiveLane[];
  rootDirtyPaths?: PlannerRootDirtyPathEvidence[];
  rootDirtyPathsAvailable?: boolean;
}): PlannerBacklogCandidate[] {
  const activeAliases = collectActiveLaneAliasMap(options.usefulActiveLanes);
  const rootDirtyPaths = options.rootDirtyPaths ?? [];
  const rootDirtyPathsAvailable = options.rootDirtyPathsAvailable ?? false;

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
      const readyRecommendation = buildReadyCandidateRecommendation({
        rootDirtyPaths,
        rootDirtyPathsAvailable,
        taskFile,
      });

      const refillRecommendation: PlannerRefillRecommendation = activeLaneName
        ? "hold"
        : holdReasons.length > 0
          ? "hold"
          : readyRecommendation.refillRecommendation;
      const evidenceQuality: PlannerCollisionEvidenceQuality = activeLaneName
        ? "grounded"
        : holdReasons.length > 0
          ? readyRecommendation.evidenceQuality
          : readyRecommendation.evidenceQuality;
      const recommendationReasons = activeLaneName
        ? [`An active lane already owns alias ${activeLaneName}.`]
        : holdReasons.length > 0
          ? ["Explicit hold evidence exists in planner temp-state notes."]
          : readyRecommendation.recommendationReasons;

      return {
        taskPath: normalizedPath,
        taskId,
        title,
        status,
        eligibleForRefill: status === "ready",
        holdReasons,
        activeLaneName,
        refillRecommendation,
        evidenceQuality,
        taskPathHints: readyRecommendation.taskPathHints,
        overlappingDirtyPaths: readyRecommendation.overlappingDirtyPaths,
        overlappingDirtySurfaces: readyRecommendation.overlappingDirtySurfaces,
        recommendationReasons,
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
  plannerRootDirtyPaths?: PlannerRootDirtyPathEvidence[];
  plannerRootDirtyPathsAvailable?: boolean;
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
  const usefulActiveLanes = deriveUsefulActiveLanes({
    queueHealth,
    workListJsonText: options.workListJsonText,
  });
  const usefulActiveLaneCount = usefulActiveLanes.length;
  const plannerOwnedBacklogCandidates = discoverPlannerOwnedBacklogCandidates({
    rootDirtyPaths: options.plannerRootDirtyPaths,
    rootDirtyPathsAvailable: options.plannerRootDirtyPathsAvailable,
    taskFiles: options.taskFiles ?? [],
    tempStateFiles: options.tempStateFiles ?? [],
    usefulActiveLanes,
  });
  const blockedDependencyLanes = deriveBlockedDependencyLanes({
    queueHealth,
    workListJsonText: options.workListJsonText,
  });
  const heldBacklogCandidates = deriveHeldBacklogCandidates(
    plannerOwnedBacklogCandidates,
  );
  const advisoryUncertainties = deriveAdvisoryUncertainties(
    plannerOwnedBacklogCandidates,
  );
  const refillCandidates =
    usefulActiveLaneCount < options.concurrencyFloor
      ? plannerOwnedBacklogCandidates
          .filter((candidate) => candidate.eligibleForRefill)
          .sort((left, right) => {
            const recommendationOrder =
              rankRecommendation(left.refillRecommendation) -
              rankRecommendation(right.refillRecommendation);
            if (recommendationOrder !== 0) {
              return recommendationOrder;
            }

            const pathOverlapOrder =
              left.overlappingDirtyPaths.length -
              right.overlappingDirtyPaths.length;
            if (pathOverlapOrder !== 0) {
              return pathOverlapOrder;
            }

            const surfaceOverlapOrder =
              left.overlappingDirtySurfaces.length -
              right.overlappingDirtySurfaces.length;
            if (surfaceOverlapOrder !== 0) {
              return surfaceOverlapOrder;
            }

            const evidenceHintOrder =
              right.taskPathHints.length - left.taskPathHints.length;
            if (evidenceHintOrder !== 0) {
              return evidenceHintOrder;
            }

            return left.taskPath.localeCompare(right.taskPath);
          })
      : [];

  return {
    contractVersion: "planner-concurrency-floor/v1",
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
    blockedDependencyLanes,
    heldBacklogCandidates,
    advisoryUncertainties,
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

function formatDependencyEvidence(
  dependencies: QueueHealthDependency[],
): string {
  if (dependencies.length === 0) {
    return "none";
  }

  return dependencies
    .map((dependency) => {
      const fields = [
        `depends-on=${dependency.targetWorkName}`,
        `relation=${dependency.relationType}`,
      ];
      if (dependency.targetWorkId) {
        fields.push(`target-work-id=${dependency.targetWorkId}`);
      }
      if (dependency.requiredState) {
        fields.push(`required-state=${dependency.requiredState}`);
      }
      return fields.join(" ");
    })
    .join(" | ");
}

function formatBlockedDependencyLanes(
  blockedDependencyLanes: PlannerBlockedDependencyEvidence[],
): string[] {
  const lines = [`Blocked Dependency Lanes (${blockedDependencyLanes.length})`];
  if (blockedDependencyLanes.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const lane of blockedDependencyLanes) {
    const fields = [
      `work-item=${lane.workItemName}`,
      `state=${lane.stateName}/${lane.stateType.toLowerCase()}`,
      `work-id=${lane.workId}`,
    ];
    if (lane.workTypeName) {
      fields.push(`type=${lane.workTypeName}`);
    }
    if (lane.sessionId) {
      fields.push(`session=${lane.sessionId}`);
    }
    fields.push(`dependencies=${formatDependencyEvidence(lane.dependencies)}`);
    fields.push(`reason=${lane.reasons.join("; ")}`);
    lines.push(`- ${fields.join(" ")}`);
  }
  return lines;
}

function formatHeldBacklogCandidates(
  heldBacklogCandidates: PlannerHeldBacklogEvidence[],
): string[] {
  const lines = [`Held Backlog Candidates (${heldBacklogCandidates.length})`];
  if (heldBacklogCandidates.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const candidate of heldBacklogCandidates) {
    const fields = [
      `task=${candidate.taskId}`,
      `status=${candidate.status}`,
      `path=${candidate.taskPath}`,
    ];
    if (candidate.activeLaneName) {
      fields.push(`active-lane=${candidate.activeLaneName}`);
    }
    if (candidate.holdReasons.length > 0) {
      fields.push(`hold=${candidate.holdReasons.join(" | ")}`);
    }
    fields.push(`reason=${candidate.recommendationReasons.join(" | ")}`);
    lines.push(`- ${fields.join(" ")}`);
  }
  return lines;
}

function formatAdvisoryUncertainties(
  advisoryUncertainties: PlannerAdvisoryUncertaintyEvidence[],
): string[] {
  const lines = [`Advisory Uncertainties (${advisoryUncertainties.length})`];
  if (advisoryUncertainties.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const uncertainty of advisoryUncertainties) {
    const fields = [
      `task=${uncertainty.taskId}`,
      `title=${uncertainty.title}`,
      `evidence=${uncertainty.evidenceQuality}`,
      `path=${uncertainty.taskPath}`,
    ];
    if (uncertainty.taskPathHints.length > 0) {
      fields.push(`path-hints=${uncertainty.taskPathHints.join(" | ")}`);
    }
    if (uncertainty.overlappingDirtySurfaces.length > 0) {
      fields.push(
        `dirty-surfaces=${uncertainty.overlappingDirtySurfaces.join(" | ")}`,
      );
    }
    fields.push(`reason=${uncertainty.uncertaintyReasons.join(" | ")}`);
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
      `recommendation=${candidate.refillRecommendation}`,
      `evidence=${candidate.evidenceQuality}`,
      `path=${candidate.taskPath}`,
    ];
    if (candidate.activeLaneName) {
      fields.push(`active-lane=${candidate.activeLaneName}`);
    }
    if (candidate.holdReasons.length > 0) {
      fields.push(`hold=${candidate.holdReasons.join(" | ")}`);
    }
    if (candidate.taskPathHints.length > 0) {
      fields.push(`path-hints=${candidate.taskPathHints.join(" | ")}`);
    }
    if (candidate.overlappingDirtyPaths.length > 0) {
      fields.push(`dirty-paths=${candidate.overlappingDirtyPaths.join(" | ")}`);
    }
    if (candidate.overlappingDirtySurfaces.length > 0) {
      fields.push(
        `dirty-surfaces=${candidate.overlappingDirtySurfaces.join(" | ")}`,
      );
    }
    fields.push(`reason=${candidate.recommendationReasons.join(" | ")}`);
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
      `- task=${candidate.taskId} title=${candidate.title} recommendation=${candidate.refillRecommendation} evidence=${candidate.evidenceQuality} path=${candidate.taskPath} reason=${candidate.recommendationReasons.join(" | ")}`,
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
    `summary useful-active=${report.usefulActiveLaneCount} floor=${report.concurrencyFloor} status=${report.floorStatus} refill-needed=${report.lanesNeededToReachFloor} blocked-dependencies=${report.blockedDependencyLanes.length} held-backlog=${report.heldBacklogCandidates.length} advisory-uncertain=${report.advisoryUncertainties.length} advisory-only=${report.advisoryOnly}`,
    "",
    ...formatUsefulActiveLanes(report.usefulActiveLanes),
    "",
    ...formatBlockedDependencyLanes(report.blockedDependencyLanes),
    "",
    ...formatHeldBacklogCandidates(report.heldBacklogCandidates),
    "",
    ...formatAdvisoryUncertainties(report.advisoryUncertainties),
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
