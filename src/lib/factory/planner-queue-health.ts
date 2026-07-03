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
  occurrenceCount?: number;
  relatedWorkIds?: string[];
  relatedTraceIds?: string[];
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

export interface QueueHealthRepairRecommendation {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  currentStateName: string;
  currentStateType: QueueHealthStateType;
  suggestedStateName: string;
  reason: string;
  command: string;
}

export interface QueueHealthReport {
  generatedAtUtc: string;
  sourceSession: string;
  activeWork: QueueHealthBucketSummary;
  expectedBlockedItems: QueueHealthBucketSummary;
  repairableFailures: QueueHealthBucketSummary;
  ignorableStaleNoise: QueueHealthBucketSummary;
  repairRecommendations: QueueHealthRepairRecommendation[];
  issues: string[];
}

export function serializePlannerQueueHealthReport(
  report: QueueHealthReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

interface ParsedQueueRecord {
  workId: string;
  workItemName: string;
  workTypeName?: string;
  traceId?: string;
  sessionId?: string;
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
    normalized === "TERMINAL" ||
    normalized === "FAILED"
  ) {
    return normalized === "FAILED" ? "TERMINAL" : normalized;
  }
  return "UNKNOWN";
}

function inferStateTypeFromStateName(
  value: string | undefined,
): QueueHealthStateType {
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
    sessionId: readStringField(item, ["sessionId", "runtimeSessionId"]),
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

export function buildQueueSessionIdByWorkId(
  workListJsonText: string,
): Map<string, string> {
  const sessionIdsByWorkId = new Map<string, string>();

  for (const record of parseQueueRecords(workListJsonText)) {
    if (record.sessionId) {
      sessionIdsByWorkId.set(record.workId, record.sessionId);
    }
  }

  return sessionIdsByWorkId;
}

export interface QueueTerminalCompleteAliasEvidence {
  workId: string;
  workItemName: string;
  stateName: string;
}

function normalizeQueueWorkItemAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildQueueTerminalCompleteAliasMap(
  workListJsonText: string,
): Map<string, QueueTerminalCompleteAliasEvidence> {
  const aliasMap = new Map<string, QueueTerminalCompleteAliasEvidence>();

  for (const record of parseQueueRecords(workListJsonText)) {
    if (!isCompleteState(record)) {
      continue;
    }

    const alias = normalizeQueueWorkItemAlias(record.workItemName);
    if (!alias) {
      continue;
    }

    aliasMap.set(alias, {
      workId: record.workId,
      workItemName: record.workItemName,
      stateName: record.stateName,
    });
  }

  return aliasMap;
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

function isActiveState(record: ParsedQueueRecord): boolean {
  return (
    !isFailureState(record) &&
    (record.stateType === "INITIAL" || record.stateType === "PROCESSING")
  );
}

function summarizeRecord(record: ParsedQueueRecord): string {
  const fields = [
    `${record.workItemName}`,
    `${record.stateName}/${record.stateType.toLowerCase()}`,
  ];
  if (record.workTypeName) {
    fields.push(`type=${record.workTypeName}`);
  }
  fields.push(`work-id=${record.workId}`);
  if (record.traceId) {
    fields.push(`trace=${record.traceId}`);
  }
  return fields.join(" ");
}

function findSupersedingRecord(
  record: ParsedQueueRecord,
  relatedRecords: ParsedQueueRecord[],
): ParsedQueueRecord | undefined {
  return relatedRecords.find(
    (candidate) =>
      candidate.workId !== record.workId &&
      (isCompleteState(candidate) || isActiveState(candidate)),
  );
}

function classifyQueueRecord(
  record: ParsedQueueRecord,
  recordsByWorkId: Map<string, ParsedQueueRecord>,
  recordsByName: Map<string, ParsedQueueRecord[]>,
  recordsByTraceId: Map<string, ParsedQueueRecord[]>,
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
          : undefined) ?? recordsByName.get(relation.targetWorkName)?.[0],
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
    const siblingRecords = recordsByName.get(record.workItemName) ?? [];
    const traceSiblingRecords = record.traceId
      ? (recordsByTraceId.get(record.traceId) ?? [])
      : [];
    const relatedRecords = [
      ...new Map(
        [...siblingRecords, ...traceSiblingRecords].map((candidate) => [
          candidate.workId,
          candidate,
        ]),
      ).values(),
    ];
    const supersedingRecord = findSupersedingRecord(record, relatedRecords);

    if (supersedingRecord) {
      bucket = "ignorable-stale-noise";
      reasons.push(
        `failed item is superseded by ${summarizeRecord(supersedingRecord)}`,
      );
    } else if (
      record.workItemName === "cron:though-retrigger" &&
      record.workTypeName === "thoughts" &&
      siblingRecords.filter(isFailureState).length > 1
    ) {
      bucket = "ignorable-stale-noise";
      reasons.push("recurring failed cron thoughts noise");
    } else {
      bucket = "repairable-failures";
      reasons.push(`queue item is in failed state ${record.stateName}`);
    }
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

function collapseRecurringCronNoiseItems(
  items: QueueHealthItem[],
): QueueHealthItem[] {
  const recurringCronItems = items.filter(
    (item) =>
      item.bucket === "ignorable-stale-noise" &&
      item.workItemName === "cron:though-retrigger" &&
      item.workTypeName === "thoughts" &&
      item.reasons.includes("recurring failed cron thoughts noise"),
  );

  if (recurringCronItems.length <= 1) {
    return items;
  }

  const representative = [...recurringCronItems].sort((left, right) =>
    left.workId.localeCompare(right.workId),
  )[0];
  if (!representative) {
    return items;
  }

  const groupedItem: QueueHealthItem = {
    ...representative,
    occurrenceCount: recurringCronItems.length,
    relatedWorkIds: recurringCronItems.map((item) => item.workId),
    relatedTraceIds: recurringCronItems
      .map((item) => item.traceId)
      .filter((traceId): traceId is string => Boolean(traceId)),
    reasons: [
      `grouped ${recurringCronItems.length} repeated failed cron thoughts items`,
      `group-work-ids=${recurringCronItems.map((item) => item.workId).join(",")}`,
      `group-traces=${recurringCronItems
        .map((item) => item.traceId)
        .filter((traceId): traceId is string => Boolean(traceId))
        .join(",")}`,
    ],
  };

  return [
    ...items.filter((item) => !recurringCronItems.includes(item)),
    groupedItem,
  ];
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

function buildRepairRecommendations(
  items: QueueHealthItem[],
  sourceSession: string,
): QueueHealthRepairRecommendation[] {
  return items
    .filter((item) => item.bucket === "repairable-failures")
    .map((item) => ({
      workId: item.workId,
      workItemName: item.workItemName,
      workTypeName: item.workTypeName,
      currentStateName: item.stateName,
      currentStateType: item.stateType,
      suggestedStateName: "init",
      reason: [
        `queue evidence shows ${item.workItemName} is terminal failed`,
        "factory repair guidance only recommends manual moves for unique repairable failures",
        "factory workflow docs use `init` as the safe re-entry state after the failure is understood",
      ].join("; "),
      command: `you work move ${item.workId} init --session ${sourceSession}`,
    }))
    .sort((left, right) => left.workItemName.localeCompare(right.workItemName));
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
  const recordsByName = new Map<string, ParsedQueueRecord[]>();
  const recordsByTraceId = new Map<string, ParsedQueueRecord[]>();
  for (const record of records) {
    const siblings = recordsByName.get(record.workItemName) ?? [];
    siblings.push(record);
    recordsByName.set(record.workItemName, siblings);
    if (record.traceId) {
      const traceSiblings = recordsByTraceId.get(record.traceId) ?? [];
      traceSiblings.push(record);
      recordsByTraceId.set(record.traceId, traceSiblings);
    }
  }

  const items = collapseRecurringCronNoiseItems(
    records
      .map((record) =>
        classifyQueueRecord(
          record,
          recordsByWorkId,
          recordsByName,
          recordsByTraceId,
        ),
      )
      .filter((record): record is QueueHealthItem => Boolean(record)),
  );

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
    repairRecommendations: buildRepairRecommendations(
      items,
      options.sourceSession ?? "~default",
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
  if (item.occurrenceCount && item.occurrenceCount > 1) {
    fields.push(`occurrences=${item.occurrenceCount}`);
  }
  fields.push(`work-id=${item.workId}`);
  if (item.relatedWorkIds && item.relatedWorkIds.length > 0) {
    fields.push(`related-work-ids=${item.relatedWorkIds.join(",")}`);
  }
  if (item.relatedTraceIds && item.relatedTraceIds.length > 0) {
    fields.push(`related-traces=${item.relatedTraceIds.join(",")}`);
  }
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

function formatRepairRecommendations(
  recommendations: QueueHealthRepairRecommendation[],
): string[] {
  const lines = [`Repair Guidance (${recommendations.length})`];
  for (const recommendation of recommendations) {
    const fields = [
      `work-item=${recommendation.workItemName}`,
      `state=${recommendation.currentStateName}/${recommendation.currentStateType.toLowerCase()}`,
    ];
    if (recommendation.workTypeName) {
      fields.push(`type=${recommendation.workTypeName}`);
    }
    fields.push(`work-id=${recommendation.workId}`);
    fields.push(`suggested-state=${recommendation.suggestedStateName}`);
    fields.push(`command=${recommendation.command}`);
    fields.push(`reason=${recommendation.reason}`);
    lines.push(`- ${fields.join(" ")}`);
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

  if (report.repairRecommendations.length > 0) {
    lines.push(
      "",
      ...formatRepairRecommendations(report.repairRecommendations),
    );
  }

  return lines.join("\n");
}
