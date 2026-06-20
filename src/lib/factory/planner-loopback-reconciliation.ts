export type LoopbackReconciliationStateType =
  | "INITIAL"
  | "PROCESSING"
  | "TERMINAL"
  | "UNKNOWN";

export type LoopbackDependencyStatus =
  | "complete"
  | "active"
  | "failed"
  | "missing-from-queue"
  | "unknown";

export type LoopbackReconciliationClassification =
  | "stale-noise"
  | "blocked"
  | "repairable";

export interface LoopbackDependencyEvidence {
  relationType: string;
  targetWorkId?: string;
  targetWorkName: string;
  requiredState?: string;
  status: LoopbackDependencyStatus;
  resolvedWorkId?: string;
  resolvedWorkTypeName?: string;
  resolvedStateName?: string;
  resolvedStateType?: LoopbackReconciliationStateType;
}

export interface LoopbackReconciliationItem {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  traceId?: string;
  stateName: string;
  stateType: LoopbackReconciliationStateType;
  classification: LoopbackReconciliationClassification;
  reasons: string[];
  recommendedNextStep?: string;
  dependencies: LoopbackDependencyEvidence[];
}

export interface LoopbackReconciliationSummary {
  loopbackCount: number;
  dependencyCount: number;
  staleNoiseLoopbacks: number;
  blockedLoopbacks: number;
  repairableLoopbacks: number;
  completeDependencies: number;
  activeDependencies: number;
  failedDependencies: number;
  missingFromQueueDependencies: number;
  unknownDependencies: number;
}

export interface LoopbackReconciliationReport {
  generatedAtUtc: string;
  sourceSession: string;
  summary: LoopbackReconciliationSummary;
  loopbacks: LoopbackReconciliationItem[];
}

interface ParsedDependency {
  relationType: string;
  targetWorkId?: string;
  targetWorkName: string;
  requiredState?: string;
}

interface ParsedQueueRecord {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  traceId?: string;
  stateName: string;
  stateType: LoopbackReconciliationStateType;
  relations: ParsedDependency[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readStringField(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function extractCandidateItemArray(
  payload: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const preferredKeys = ["results", "items", "works", "workItems", "data"];
  for (const key of preferredKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.every((item) => isRecord(item))) {
      return value as Record<string, unknown>[];
    }
  }

  return [];
}

function normalizeStateType(
  value: string | undefined,
): LoopbackReconciliationStateType {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === "INITIAL" ||
    normalized === "PROCESSING" ||
    normalized === "TERMINAL" ||
    normalized === "FAILED"
  ) {
    return normalized === "FAILED" ? "TERMINAL" : normalized;
  }
  return "UNKNOWN";
}

function inferStateTypeFromStateName(
  value: string | undefined,
): LoopbackReconciliationStateType {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "UNKNOWN";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("reject") ||
    normalized.includes("complete") ||
    normalized.includes("done")
  ) {
    return "TERMINAL";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("progress") ||
    normalized.includes("review") ||
    normalized.includes("running") ||
    normalized.includes("started")
  ) {
    return "PROCESSING";
  }

  if (
    normalized === "init" ||
    normalized === "initial" ||
    normalized.includes("queued") ||
    normalized.includes("pending") ||
    normalized.includes("todo")
  ) {
    return "INITIAL";
  }

  return "UNKNOWN";
}

function parseQueueDependencies(value: unknown): ParsedDependency[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((relation) => {
    const targetWorkName =
      readStringField(relation, ["targetWorkName", "targetName"]) ??
      readStringField(relation, ["sourceWorkName", "sourceName"]) ??
      "unknown";

    return {
      relationType: readStringField(relation, ["type"]) ?? "unknown",
      targetWorkId: readStringField(relation, ["targetWorkId"]),
      targetWorkName,
      requiredState: readStringField(relation, ["requiredState"]),
    };
  });
}

function parseQueueRecord(item: Record<string, unknown>): ParsedQueueRecord {
  const stateRecord = isRecord(item.state) ? item.state : undefined;
  const stringStateName =
    !stateRecord && typeof item.state === "string"
      ? readString(item.state)
      : undefined;
  const stateName =
    readStringField(stateRecord ?? {}, ["name"]) ??
    stringStateName ??
    readStringField(item, ["status", "phase"]) ??
    "unknown";
  const explicitStateType = normalizeStateType(
    readStringField(stateRecord ?? {}, ["type"]) ??
      readStringField(item, ["stateType"]),
  );

  return {
    workId:
      readStringField(item, ["workId", "id"]) ??
      readStringField(item, ["name"]) ??
      "unknown-work-id",
    workItemName:
      readStringField(item, ["name", "workItemName"]) ??
      readStringField(item, ["workId", "id"]) ??
      "unknown-work-item",
    workTypeName:
      readStringField(item, ["workTypeName"]) ??
      (isRecord(item.tags)
        ? readStringField(item.tags, ["_work_type"])
        : undefined),
    traceId: readStringField(item, ["traceId", "currentChainingTraceId"]),
    stateName,
    stateType:
      explicitStateType === "UNKNOWN"
        ? inferStateTypeFromStateName(stateName)
        : explicitStateType,
    relations: parseQueueDependencies(item.relations),
  };
}

function parseQueueRecords(jsonText: string): ParsedQueueRecord[] {
  const parsed = JSON.parse(jsonText) as unknown;
  return extractCandidateItemArray(parsed).map(parseQueueRecord);
}

function isCompleteState(record: ParsedQueueRecord | undefined): boolean {
  if (!record) {
    return false;
  }

  const stateName = record.stateName.toLowerCase();
  return (
    record.stateType === "TERMINAL" &&
    !stateName.includes("fail") &&
    !stateName.includes("error") &&
    !stateName.includes("reject")
  );
}

function isFailureState(record: ParsedQueueRecord | undefined): boolean {
  if (!record) {
    return false;
  }

  const stateName = record.stateName.toLowerCase();
  return (
    stateName.includes("fail") ||
    stateName.includes("error") ||
    stateName.includes("reject")
  );
}

function isActiveState(record: ParsedQueueRecord | undefined): boolean {
  if (!record) {
    return false;
  }

  return (
    !isFailureState(record) &&
    (record.stateType === "INITIAL" || record.stateType === "PROCESSING")
  );
}

function resolveDependencyStatus(
  target: ParsedQueueRecord | undefined,
): LoopbackDependencyStatus {
  if (!target) {
    return "missing-from-queue";
  }
  if (isCompleteState(target)) {
    return "complete";
  }
  if (isFailureState(target)) {
    return "failed";
  }
  if (isActiveState(target)) {
    return "active";
  }
  return "unknown";
}

function summarizeDependencyStatuses(
  dependencies: LoopbackDependencyEvidence[],
  status: LoopbackDependencyStatus,
): string {
  return dependencies
    .filter((dependency) => dependency.status === status)
    .map((dependency) => {
      const resolvedState = dependency.resolvedStateName
        ? `${dependency.resolvedStateName}/${dependency.resolvedStateType?.toLowerCase() ?? "unknown"}`
        : dependency.status;
      return `${dependency.targetWorkName} (${resolvedState})`;
    })
    .join(", ");
}

function buildRepairableNextStep(
  dependencies: LoopbackDependencyEvidence[],
): string {
  const missingDependencies = dependencies.filter(
    (dependency) => dependency.status === "missing-from-queue",
  );
  if (missingDependencies.length > 0) {
    return `dispatch the missing dependency targets before moving this loopback: ${missingDependencies
      .map((dependency) => dependency.targetWorkName)
      .join(", ")}`;
  }

  const unknownDependencies = dependencies.filter(
    (dependency) => dependency.status === "unknown",
  );
  return `inspect the live queue state for ${unknownDependencies
    .map((dependency) => dependency.targetWorkName)
    .join(", ")} before moving this loopback`;
}

function classifyLoopback(
  dependencies: LoopbackDependencyEvidence[],
): Pick<
  LoopbackReconciliationItem,
  "classification" | "reasons" | "recommendedNextStep"
> {
  const completeDependencies = dependencies.filter(
    (dependency) => dependency.status === "complete",
  );
  const activeOrFailedDependencies = dependencies.filter(
    (dependency) =>
      dependency.status === "active" || dependency.status === "failed",
  );
  const repairableDependencies = dependencies.filter(
    (dependency) =>
      dependency.status === "missing-from-queue" ||
      dependency.status === "unknown",
  );

  if (
    dependencies.length > 0 &&
    completeDependencies.length === dependencies.length
  ) {
    return {
      classification: "stale-noise",
      reasons: [
        `all DEPENDS_ON targets already satisfy the loopback: ${summarizeDependencyStatuses(dependencies, "complete")}`,
      ],
    };
  }

  if (repairableDependencies.length > 0) {
    const missingDependencies = summarizeDependencyStatuses(
      dependencies,
      "missing-from-queue",
    );
    const unknownDependencies = summarizeDependencyStatuses(
      dependencies,
      "unknown",
    );
    const reasons: string[] = [];

    if (missingDependencies) {
      reasons.push(
        `dependency evidence is inconsistent because required targets are missing from the queue: ${missingDependencies}`,
      );
    }
    if (unknownDependencies) {
      reasons.push(
        `dependency evidence could not be classified from the queue snapshot: ${unknownDependencies}`,
      );
    }

    return {
      classification: "repairable",
      reasons,
      recommendedNextStep: buildRepairableNextStep(repairableDependencies),
    };
  }

  return {
    classification: "blocked",
    reasons: [
      `waiting on unfinished dependencies: ${activeOrFailedDependencies
        .map((dependency) => {
          const resolvedState = dependency.resolvedStateName
            ? `${dependency.resolvedStateName}/${dependency.resolvedStateType?.toLowerCase() ?? "unknown"}`
            : dependency.status;
          return `${dependency.targetWorkName} (${resolvedState})`;
        })
        .join(", ")}`,
    ],
  };
}

function formatDependencyEvidence(
  dependency: LoopbackDependencyEvidence,
): string {
  const fields = [
    `depends-on=${dependency.targetWorkName}`,
    `status=${dependency.status}`,
  ];

  if (dependency.requiredState) {
    fields.push(`required-state=${dependency.requiredState}`);
  }
  if (dependency.targetWorkId) {
    fields.push(`declared-target-work-id=${dependency.targetWorkId}`);
  }
  if (dependency.resolvedWorkId) {
    fields.push(`resolved-work-id=${dependency.resolvedWorkId}`);
  }
  if (dependency.resolvedWorkTypeName) {
    fields.push(`resolved-type=${dependency.resolvedWorkTypeName}`);
  }
  if (dependency.resolvedStateName && dependency.resolvedStateType) {
    fields.push(
      `resolved-state=${dependency.resolvedStateName}/${dependency.resolvedStateType.toLowerCase()}`,
    );
  }

  return fields.join(" ");
}

function formatLoopbackItem(item: LoopbackReconciliationItem): string {
  const fields = [
    `work-item=${item.workItemName}`,
    `state=${item.stateName}/${item.stateType.toLowerCase()}`,
    `classification=${item.classification}`,
  ];

  if (item.workTypeName) {
    fields.push(`type=${item.workTypeName}`);
  }
  if (item.traceId) {
    fields.push(`trace=${item.traceId}`);
  }

  fields.push(`work-id=${item.workId}`);
  if (item.reasons.length > 0) {
    fields.push(`reason=${item.reasons.join("; ")}`);
  }
  if (item.recommendedNextStep) {
    fields.push(`next-step=${item.recommendedNextStep}`);
  }
  if (item.dependencies.length > 0) {
    fields.push(
      `dependencies=${item.dependencies
        .map((dependency) => formatDependencyEvidence(dependency))
        .join(" ; ")}`,
    );
  }

  return `- ${fields.join(" ")}`;
}

function getLoopbacksForClassification(
  report: LoopbackReconciliationReport,
  classification: LoopbackReconciliationClassification,
): LoopbackReconciliationItem[] {
  return report.loopbacks.filter(
    (loopback) => loopback.classification === classification,
  );
}

export function serializePlannerLoopbackReconciliationReport(
  report: LoopbackReconciliationReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatPlannerLoopbackReconciliationReport(
  report: LoopbackReconciliationReport,
): string {
  const groupedLoopbacks: Array<{
    classification: LoopbackReconciliationClassification;
    count: number;
    items: LoopbackReconciliationItem[];
  }> = [
    {
      classification: "stale-noise",
      count: report.summary.staleNoiseLoopbacks,
      items: getLoopbacksForClassification(report, "stale-noise"),
    },
    {
      classification: "blocked",
      count: report.summary.blockedLoopbacks,
      items: getLoopbacksForClassification(report, "blocked"),
    },
    {
      classification: "repairable",
      count: report.summary.repairableLoopbacks,
      items: getLoopbacksForClassification(report, "repairable"),
    },
  ];

  const lines = [
    "Planner loopback reconciliation",
    `generated-at=${report.generatedAtUtc} session=${report.sourceSession}`,
    `totals loopbacks=${report.summary.loopbackCount} stale-noise=${report.summary.staleNoiseLoopbacks} blocked=${report.summary.blockedLoopbacks} repairable=${report.summary.repairableLoopbacks} dependencies=${report.summary.dependencyCount} complete=${report.summary.completeDependencies} active=${report.summary.activeDependencies} failed=${report.summary.failedDependencies} missing-from-queue=${report.summary.missingFromQueueDependencies} unknown=${report.summary.unknownDependencies}`,
    "",
  ];

  if (report.loopbacks.length === 0) {
    lines.push("Loopbacks", "- none");
    return lines.join("\n");
  }

  for (const group of groupedLoopbacks) {
    lines.push(`${group.classification} (${group.count})`);

    if (group.items.length === 0) {
      lines.push("- none");
    } else {
      for (const loopback of group.items) {
        lines.push(formatLoopbackItem(loopback));
      }
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function discoverPlannerLoopbackReconciliationReport(options: {
  generatedAtUtc?: string;
  sourceSession?: string;
  workListJsonText: string;
}): LoopbackReconciliationReport {
  const records = parseQueueRecords(options.workListJsonText);
  const recordsByWorkId = new Map(
    records.map((record) => [record.workId, record]),
  );
  const recordsByName = new Map<string, ParsedQueueRecord[]>();

  for (const record of records) {
    const siblings = recordsByName.get(record.workItemName) ?? [];
    siblings.push(record);
    recordsByName.set(record.workItemName, siblings);
  }

  const loopbacks = records
    .filter(
      (record) =>
        record.workTypeName === "thoughts" &&
        record.relations.some(
          (relation) => relation.relationType === "DEPENDS_ON",
        ),
    )
    .map((record) => {
      const dependencies = record.relations
        .filter((relation) => relation.relationType === "DEPENDS_ON")
        .map((relation) => {
          const target =
            (relation.targetWorkId
              ? recordsByWorkId.get(relation.targetWorkId)
              : undefined) ?? recordsByName.get(relation.targetWorkName)?.[0];

          return {
            relationType: relation.relationType,
            targetWorkId: relation.targetWorkId,
            targetWorkName: relation.targetWorkName,
            requiredState: relation.requiredState,
            status: resolveDependencyStatus(target),
            resolvedWorkId: target?.workId,
            resolvedWorkTypeName: target?.workTypeName,
            resolvedStateName: target?.stateName,
            resolvedStateType: target?.stateType,
          } satisfies LoopbackDependencyEvidence;
        });
      const classification = classifyLoopback(dependencies);

      return {
        workId: record.workId,
        workItemName: record.workItemName,
        workTypeName: record.workTypeName,
        traceId: record.traceId,
        stateName: record.stateName,
        stateType: record.stateType,
        classification: classification.classification,
        reasons: classification.reasons,
        recommendedNextStep: classification.recommendedNextStep,
        dependencies,
      } satisfies LoopbackReconciliationItem;
    })
    .sort((left, right) => left.workItemName.localeCompare(right.workItemName));

  const summary: LoopbackReconciliationSummary = {
    loopbackCount: loopbacks.length,
    dependencyCount: 0,
    staleNoiseLoopbacks: 0,
    blockedLoopbacks: 0,
    repairableLoopbacks: 0,
    completeDependencies: 0,
    activeDependencies: 0,
    failedDependencies: 0,
    missingFromQueueDependencies: 0,
    unknownDependencies: 0,
  };

  for (const loopback of loopbacks) {
    summary.dependencyCount += loopback.dependencies.length;
    if (loopback.classification === "stale-noise") {
      summary.staleNoiseLoopbacks += 1;
    } else if (loopback.classification === "blocked") {
      summary.blockedLoopbacks += 1;
    } else {
      summary.repairableLoopbacks += 1;
    }
    for (const dependency of loopback.dependencies) {
      if (dependency.status === "complete") {
        summary.completeDependencies += 1;
      } else if (dependency.status === "active") {
        summary.activeDependencies += 1;
      } else if (dependency.status === "failed") {
        summary.failedDependencies += 1;
      } else if (dependency.status === "missing-from-queue") {
        summary.missingFromQueueDependencies += 1;
      } else {
        summary.unknownDependencies += 1;
      }
    }
  }

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    sourceSession: options.sourceSession ?? "~default",
    summary,
    loopbacks,
  };
}
