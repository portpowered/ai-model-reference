type QueueHealthBucket =
  | "active"
  | "expected-blocked"
  | "repairable-failures"
  | "ignorable-stale-noise";

export type QueueHealthStateType =
  | "INITIAL"
  | "PROCESSING"
  | "TERMINAL"
  | "UNKNOWN";

export interface QueueHealthDependency {
  targetWorkId?: string;
  targetWorkName: string;
  relationType: string;
  requiredState?: string;
}

export interface QueueHealthItem {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  traceId?: string;
  stateName: string;
  stateType: QueueHealthStateType;
  bucket: QueueHealthBucket;
  dependencies: QueueHealthDependency[];
  reasons: string[];
}

export interface QueueHealthBucketSummary {
  bucket: QueueHealthBucket;
  label: string;
  items: QueueHealthItem[];
}

export interface QueueHealthReport {
  generatedAtUtc: string;
  sourceSession: string;
  activeWork: QueueHealthBucketSummary;
  expectedBlockedItems: QueueHealthBucketSummary;
  repairableFailures: QueueHealthBucketSummary;
  ignorableStaleNoise: QueueHealthBucketSummary;
  issues: string[];
}

interface ParsedQueueRecord {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  traceId?: string;
  stateName: string;
  stateType: QueueHealthStateType;
  relations: QueueHealthDependency[];
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

function normalizeStateType(value: string | undefined): QueueHealthStateType {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === "INITIAL" ||
    normalized === "PROCESSING" ||
    normalized === "TERMINAL"
  ) {
    return normalized;
  }
  return "UNKNOWN";
}

function parseQueueDependencies(value: unknown): QueueHealthDependency[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((relation) => {
    const targetWorkName =
      readStringField(relation, ["targetWorkName", "targetName"]) ??
      readStringField(relation, ["sourceWorkName", "sourceName"]) ??
      "unknown";
    return {
      targetWorkId: readStringField(relation, ["targetWorkId"]),
      targetWorkName,
      relationType: readStringField(relation, ["type"]) ?? "unknown",
      requiredState: readStringField(relation, ["requiredState"]),
    };
  });
}

function parseQueueRecord(item: Record<string, unknown>): ParsedQueueRecord {
  const stateRecord = isRecord(item.state) ? item.state : undefined;
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
    stateName:
      readStringField(stateRecord ?? {}, ["name"]) ??
      readStringField(item, ["status", "phase"]) ??
      "unknown",
    stateType: normalizeStateType(
      readStringField(stateRecord ?? {}, ["type"]) ??
        readStringField(item, ["stateType"]),
    ),
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

function isFailureState(record: ParsedQueueRecord): boolean {
  const stateName = record.stateName.toLowerCase();
  return (
    stateName.includes("fail") ||
    stateName.includes("error") ||
    stateName.includes("reject")
  );
}

function classifyQueueRecord(
  record: ParsedQueueRecord,
  recordsByWorkId: Map<string, ParsedQueueRecord>,
  recordsByName: Map<string, ParsedQueueRecord>,
): QueueHealthItem | null {
  if (isCompleteState(record)) {
    return null;
  }

  const dependencyBlockers = record.relations
    .filter((relation) => relation.relationType === "DEPENDS_ON")
    .map((relation) => ({
      relation,
      target:
        (relation.targetWorkId
          ? recordsByWorkId.get(relation.targetWorkId)
          : undefined) ?? recordsByName.get(relation.targetWorkName),
    }))
    .filter(({ target, relation }) => {
      const requiredComplete =
        (relation.requiredState ?? "").toLowerCase() === "complete";
      return requiredComplete && !isCompleteState(target);
    });

  const reasons: string[] = [];
  let bucket: QueueHealthBucket = "active";

  if (dependencyBlockers.length > 0) {
    bucket = "expected-blocked";
    reasons.push(
      `waiting on ${dependencyBlockers
        .map(({ relation, target }) => {
          const targetState = target
            ? `${target.stateName}/${target.stateType.toLowerCase()}`
            : "missing-from-queue";
          return `${relation.targetWorkName} (${targetState})`;
        })
        .join(", ")}`,
    );
  } else if (isFailureState(record)) {
    bucket = "repairable-failures";
    reasons.push(`queue item is in failed state ${record.stateName}`);
  } else if (
    record.stateType === "INITIAL" ||
    record.stateType === "PROCESSING"
  ) {
    bucket = "active";
    reasons.push(`state ${record.stateName}/${record.stateType.toLowerCase()}`);
  } else {
    bucket = "ignorable-stale-noise";
    reasons.push(`unsupported non-terminal state ${record.stateName}`);
  }

  return {
    workId: record.workId,
    workItemName: record.workItemName,
    workTypeName: record.workTypeName,
    traceId: record.traceId,
    stateName: record.stateName,
    stateType: record.stateType,
    bucket,
    dependencies: record.relations,
    reasons,
  };
}

function createBucketSummary(
  bucket: QueueHealthBucket,
  label: string,
  items: QueueHealthItem[],
): QueueHealthBucketSummary {
  return {
    bucket,
    label,
    items: [...items].sort((left, right) =>
      left.workItemName.localeCompare(right.workItemName),
    ),
  };
}

export function discoverPlannerQueueHealthReport(options: {
  generatedAtUtc?: string;
  sourceSession?: string;
  workListJsonText: string;
}): QueueHealthReport {
  const records = parseQueueRecords(options.workListJsonText);
  const recordsByWorkId = new Map(
    records.map((record) => [record.workId, record]),
  );
  const recordsByName = new Map(
    records.map((record) => [record.workItemName, record]),
  );

  const items = records
    .map((record) =>
      classifyQueueRecord(record, recordsByWorkId, recordsByName),
    )
    .filter((record): record is QueueHealthItem => Boolean(record));

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    sourceSession: options.sourceSession ?? "~default",
    activeWork: createBucketSummary(
      "active",
      "Active Work",
      items.filter((item) => item.bucket === "active"),
    ),
    expectedBlockedItems: createBucketSummary(
      "expected-blocked",
      "Expected Blocked Items",
      items.filter((item) => item.bucket === "expected-blocked"),
    ),
    repairableFailures: createBucketSummary(
      "repairable-failures",
      "Repairable Failures",
      items.filter((item) => item.bucket === "repairable-failures"),
    ),
    ignorableStaleNoise: createBucketSummary(
      "ignorable-stale-noise",
      "Ignorable Stale Noise",
      items.filter((item) => item.bucket === "ignorable-stale-noise"),
    ),
    issues: [],
  };
}

function formatQueueHealthItem(item: QueueHealthItem): string {
  const fields = [
    `work-item=${item.workItemName}`,
    `state=${item.stateName}/${item.stateType.toLowerCase()}`,
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
  return `- ${fields.join(" ")}`;
}

function formatBucketSummary(summary: QueueHealthBucketSummary): string[] {
  const lines = [`${summary.label} (${summary.items.length})`];
  if (summary.items.length === 0) {
    lines.push("- none");
    return lines;
  }

  for (const item of summary.items) {
    lines.push(formatQueueHealthItem(item));
  }
  return lines;
}

export function formatPlannerQueueHealthReport(
  report: QueueHealthReport,
): string {
  const lines = [
    "Planner queue-health summary",
    `generated-at=${report.generatedAtUtc} session=${report.sourceSession}`,
    `totals active=${report.activeWork.items.length} blocked=${report.expectedBlockedItems.items.length} repairable=${report.repairableFailures.items.length} noise=${report.ignorableStaleNoise.items.length}`,
    "",
    ...formatBucketSummary(report.activeWork),
    "",
    ...formatBucketSummary(report.expectedBlockedItems),
    "",
    ...formatBucketSummary(report.repairableFailures),
    "",
    ...formatBucketSummary(report.ignorableStaleNoise),
  ];

  if (report.issues.length > 0) {
    lines.push("", "Issues");
    for (const issue of report.issues) {
      lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}
