import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type BranchDriftRecord,
  type CheckHealthStatus,
  type CommandResult,
  classifyBranchDrift,
  classifyMergeability,
  type MergeabilityClass,
  type RunCommand,
  summarizeCheckHealth,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import type {
  QueueTokenEvidence,
  WorktreeMetadataEvidence,
} from "@/lib/factory/merged-pr-drain-rows-reconciliation";
import {
  resolveDefaultWorktreesDir,
  resolveMainRepoRoot,
} from "@/lib/factory/repo-path-resolution";
import { readWorktreeLaneMetadata } from "@/lib/factory/worktree-lane-metadata";

export const GENERATED_TABLE_REGISTRY_PR320_CONFLICT_REFRESH_HEADER =
  "Generated Table Registry PR320 Conflict Refresh Evidence";

export const PR320_TARGET_PULL_REQUEST_NUMBER = 320;

export const PR320_TARGET_BRANCH_NAME =
  "generated-table-registry-root-drift-cleanup-proof";

export const PR320_ORIGINAL_WORK_ITEM_NAME =
  "generated-table-registry-root-drift-cleanup-proof";

export const PR320_CONFLICT_REFRESH_WORK_ITEM_NAME =
  "generated-table-registry-pr320-conflict-refresh";

export const PR320_CONFLICT_REFRESH_TARGET_SESSION_ID =
  "930b51a6-07ce-44e6-a639-7a6217f6e864";

export const PR320_CONFLICT_REFRESH_CAPTURE_POLICY =
  "Read-only evidence capture for PR #320 conflict refresh; do not mutate source, generated registry, content, or planner-report files during capture.";

export type Pr320PullRequestAvailability = "present" | "unavailable";

export interface Pr320PullRequestEvidence {
  availability: Pr320PullRequestAvailability;
  baseRefName?: string;
  baseRefOid?: string;
  checkHealth?: CheckHealthStatus;
  failureReason?: string;
  headRefName?: string;
  headRefOid?: string;
  mergeabilityClass?: MergeabilityClass;
  mergeStateStatus?: string;
  mergeable?: boolean | string;
  pullRequestNumber: number;
  state?: string;
  title?: string;
  updatedAt?: string;
  url?: string;
}

export interface Pr320OriginMainEvidence {
  mergeBaseWithTargetBranch?: string;
  originMainSha?: string;
  remoteBaseRef: string;
  unavailableReason?: string;
}

export interface Pr320BranchDriftEvidence extends BranchDriftRecord {
  mergeBaseWithOriginMain?: string;
  targetBranchRef: string;
}

export interface Pr320QueueLaneEvidence {
  queueTokens: QueueTokenEvidence[];
  workItemName: string;
}

export interface Pr320WorktreeLaneEvidence {
  workItemName: string;
  worktreeMetadata: WorktreeMetadataEvidence;
}

export interface GeneratedTableRegistryPr320ConflictRefreshEvidenceReport {
  branchDrift: Pr320BranchDriftEvidence;
  capturePolicy: string;
  conflictRefreshLane: Pr320QueueLaneEvidence;
  conflictRefreshWorktree: Pr320WorktreeLaneEvidence;
  generatedAtUtc: string;
  originMain: Pr320OriginMainEvidence;
  originalLane: Pr320QueueLaneEvidence;
  originalWorktree: Pr320WorktreeLaneEvidence;
  pullRequest: Pr320PullRequestEvidence;
  sourceSession: string;
}

export interface CaptureGeneratedTableRegistryPr320ConflictRefreshEvidenceOptions {
  generatedAtUtc?: string;
  lookupPullRequestByNumber?: (
    pullRequestNumber: number,
    runCommand: RunCommand,
  ) => Pr320PullRequestLookupResult;
  pr320PullRequestJson?: string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runCommand?: RunCommand;
  sourceSession?: string;
  workListJsonText: string;
  worktreesDir?: string;
}

export interface Pr320PullRequestLookupResult {
  failureReason?: string;
  pullRequest: Pr320PullRequestEvidence | null;
}

function defaultRunCommand(
  binary: string,
  args: string[],
  cwd?: string,
): CommandResult {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status,
  };
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

function readMergeableField(
  record: Record<string, unknown>,
): boolean | string | undefined {
  const value = record.mergeable;
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function parseJsonText(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse failure";
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
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

  const preferredKeys = [
    "results",
    "items",
    "works",
    "workItems",
    "data",
    "rows",
  ];
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

function parseQueueTokenEvidence(
  record: Record<string, unknown>,
): QueueTokenEvidence {
  const stateRecord = isRecord(record.state) ? record.state : undefined;
  return {
    availability: "present",
    workItemName:
      readStringField(record, ["name", "workItemName", "title"]) ?? "unknown",
    workId: readStringField(record, ["workId", "id"]),
    workTypeName: readStringField(record, ["workTypeName"]),
    stateName: readStringField(stateRecord ?? {}, ["name", "status"]),
    stateType: readStringField(stateRecord ?? {}, ["type"]),
    traceId: readStringField(record, ["traceId", "currentChainingTraceId"]),
  };
}

export function findQueueTokensForWorkItemName(
  workListJsonText: string,
  workItemName: string,
): QueueTokenEvidence[] {
  const parsed = parseJsonText(workListJsonText, "work list payload");
  const items = extractCandidateItemArray(parsed);
  return items
    .filter(
      (item) =>
        readStringField(item, ["name", "workItemName", "title"]) ===
        workItemName,
    )
    .map(parseQueueTokenEvidence);
}

function collectQueueLaneEvidence(
  workListJsonText: string,
  workItemName: string,
): Pr320QueueLaneEvidence {
  const queueTokens = findQueueTokensForWorkItemName(
    workListJsonText,
    workItemName,
  );
  return {
    workItemName,
    queueTokens:
      queueTokens.length > 0
        ? queueTokens
        : [
            {
              availability: "missing-from-queue",
              workItemName,
            },
          ],
  };
}

function collectWorktreeLaneEvidence(options: {
  runCommand: RunCommand;
  workItemName: string;
  worktreesDir: string;
}): Pr320WorktreeLaneEvidence {
  const worktreePath = join(options.worktreesDir, options.workItemName);
  const metadataPath = join(worktreePath, ".claude", "lane-metadata.json");

  if (!existsSync(worktreePath)) {
    return {
      workItemName: options.workItemName,
      worktreeMetadata: {
        availability: "unavailable",
        unavailableReason: `worktree path missing at ${worktreePath}`,
      },
    };
  }

  const metadata = readWorktreeLaneMetadata(worktreePath);
  if (!metadata) {
    return {
      workItemName: options.workItemName,
      worktreeMetadata: {
        availability: "unavailable",
        metadataPath,
        unavailableReason: `lane metadata unreadable at ${metadataPath}`,
        worktreePath,
      },
    };
  }

  const headResult = options.runCommand(
    "git",
    ["-C", worktreePath, "rev-parse", "HEAD"],
    undefined,
  );
  const branchHeadSha = headResult.ok ? headResult.stdout.trim() : undefined;

  return {
    workItemName: options.workItemName,
    worktreeMetadata: {
      availability: "present",
      branchHeadSha,
      branchLinkageStatus: metadata.linkage.branch.status,
      branchName: metadata.branchName,
      metadataPath,
      pullRequestLinkageStatus: metadata.linkage.pullRequest.status,
      pullRequestNumber: metadata.pullRequest?.number,
      refreshedAtUtc: metadata.refreshedAtUtc,
      worktreePath,
    },
  };
}

export function defaultPr320PullRequestLookupByNumber(
  pullRequestNumber: number,
  runCommand: RunCommand = defaultRunCommand,
): Pr320PullRequestLookupResult {
  const result = runCommand("gh", [
    "pr",
    "view",
    String(pullRequestNumber),
    "--json",
    "number,title,url,state,mergeable,mergeStateStatus,baseRefName,headRefName,headRefOid,baseRefOid,statusCheckRollup,updatedAt",
  ]);

  if (!result.ok) {
    return {
      pullRequest: null,
      failureReason:
        result.stderr.trim() || `gh pr view ${pullRequestNumber} failed`,
    };
  }

  try {
    const parsed = parseJsonText(result.stdout, "gh pr view payload");
    if (!isRecord(parsed)) {
      return {
        pullRequest: null,
        failureReason: `gh pr view ${pullRequestNumber} returned non-object JSON`,
      };
    }

    const checkHealth = summarizeCheckHealth(
      Array.isArray(parsed.statusCheckRollup)
        ? parsed.statusCheckRollup
        : undefined,
    );
    const mergeStateStatus = readStringField(parsed, ["mergeStateStatus"]);
    const mergeabilityClass = classifyMergeability(
      mergeStateStatus,
      checkHealth,
    );

    return {
      pullRequest: {
        availability: "present",
        pullRequestNumber,
        baseRefName: readStringField(parsed, ["baseRefName"]),
        baseRefOid: readStringField(parsed, ["baseRefOid"]),
        checkHealth,
        headRefName: readStringField(parsed, ["headRefName"]),
        headRefOid: readStringField(parsed, ["headRefOid"]),
        mergeabilityClass,
        mergeStateStatus,
        mergeable: readMergeableField(parsed),
        state: readStringField(parsed, ["state"]),
        title: readStringField(parsed, ["title"]),
        updatedAt: readStringField(parsed, ["updatedAt"]),
        url: readStringField(parsed, ["url"]),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse failure";
    return {
      pullRequest: null,
      failureReason: message,
    };
  }
}

function parsePr320PullRequestEvidenceFromJson(
  pr320PullRequestJson: string,
): Pr320PullRequestEvidence {
  const parsed = parseJsonText(pr320PullRequestJson, "PR #320 JSON fixture");
  if (!isRecord(parsed)) {
    throw new Error("PR #320 JSON fixture must be an object");
  }

  const checkHealth = summarizeCheckHealth(
    Array.isArray(parsed.statusCheckRollup)
      ? parsed.statusCheckRollup
      : undefined,
  );
  const mergeStateStatus = readStringField(parsed, ["mergeStateStatus"]);
  const mergeabilityClass = classifyMergeability(mergeStateStatus, checkHealth);

  return {
    availability: "present",
    pullRequestNumber: PR320_TARGET_PULL_REQUEST_NUMBER,
    baseRefName: readStringField(parsed, ["baseRefName"]),
    baseRefOid: readStringField(parsed, ["baseRefOid"]),
    checkHealth,
    headRefName: readStringField(parsed, ["headRefName"]),
    headRefOid: readStringField(parsed, ["headRefOid"]),
    mergeabilityClass,
    mergeStateStatus,
    mergeable: readMergeableField(parsed),
    state: readStringField(parsed, ["state"]),
    title: readStringField(parsed, ["title"]),
    updatedAt: readStringField(parsed, ["updatedAt"]),
    url: readStringField(parsed, ["url"]),
  };
}

function collectOriginMainEvidence(options: {
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
  targetBranchRef: string;
}): Pr320OriginMainEvidence {
  const originMainResult = options.runCommand(
    "git",
    ["rev-parse", options.remoteBaseRef],
    options.repoRoot,
  );
  if (!originMainResult.ok) {
    return {
      remoteBaseRef: options.remoteBaseRef,
      unavailableReason:
        originMainResult.stderr.trim() ||
        `unable to resolve ${options.remoteBaseRef}`,
    };
  }

  const mergeBaseResult = options.runCommand(
    "git",
    ["merge-base", options.remoteBaseRef, options.targetBranchRef],
    options.repoRoot,
  );

  return {
    remoteBaseRef: options.remoteBaseRef,
    originMainSha: originMainResult.stdout.trim(),
    mergeBaseWithTargetBranch: mergeBaseResult.ok
      ? mergeBaseResult.stdout.trim()
      : undefined,
  };
}

function collectBranchDriftEvidence(options: {
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
  targetBranchRef: string;
}): Pr320BranchDriftEvidence {
  const drift = classifyBranchDrift(
    options.targetBranchRef,
    options.runCommand,
    options.remoteBaseRef,
    options.repoRoot,
  );
  const mergeBaseResult = options.runCommand(
    "git",
    ["merge-base", options.remoteBaseRef, options.targetBranchRef],
    options.repoRoot,
  );

  return {
    ...drift,
    mergeBaseWithOriginMain: mergeBaseResult.ok
      ? mergeBaseResult.stdout.trim()
      : undefined,
    targetBranchRef: options.targetBranchRef,
  };
}

export function captureGeneratedTableRegistryPr320ConflictRefreshEvidence(
  options: CaptureGeneratedTableRegistryPr320ConflictRefreshEvidenceOptions,
): GeneratedTableRegistryPr320ConflictRefreshEvidenceReport {
  const repoRoot = options.repoRoot ?? resolveMainRepoRoot(process.cwd());
  const worktreesDir =
    options.worktreesDir ?? resolveDefaultWorktreesDir(repoRoot);
  const remoteBaseRef = options.remoteBaseRef ?? "origin/main";
  const runCommand = options.runCommand ?? defaultRunCommand;
  const sourceSession =
    options.sourceSession ?? PR320_CONFLICT_REFRESH_TARGET_SESSION_ID;
  const targetBranchRef = `origin/${PR320_TARGET_BRANCH_NAME}`;

  const pullRequest =
    options.pr320PullRequestJson !== undefined
      ? parsePr320PullRequestEvidenceFromJson(options.pr320PullRequestJson)
      : (() => {
          const lookup = (
            options.lookupPullRequestByNumber ??
            defaultPr320PullRequestLookupByNumber
          )(PR320_TARGET_PULL_REQUEST_NUMBER, runCommand);
          if (!lookup.pullRequest) {
            return {
              availability: "unavailable" as const,
              failureReason: lookup.failureReason,
              pullRequestNumber: PR320_TARGET_PULL_REQUEST_NUMBER,
            };
          }
          return lookup.pullRequest;
        })();

  return {
    capturePolicy: PR320_CONFLICT_REFRESH_CAPTURE_POLICY,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    sourceSession,
    pullRequest,
    originMain: collectOriginMainEvidence({
      remoteBaseRef,
      repoRoot,
      runCommand,
      targetBranchRef,
    }),
    branchDrift: collectBranchDriftEvidence({
      remoteBaseRef,
      repoRoot,
      runCommand,
      targetBranchRef,
    }),
    originalLane: collectQueueLaneEvidence(
      options.workListJsonText,
      PR320_ORIGINAL_WORK_ITEM_NAME,
    ),
    conflictRefreshLane: collectQueueLaneEvidence(
      options.workListJsonText,
      PR320_CONFLICT_REFRESH_WORK_ITEM_NAME,
    ),
    originalWorktree: collectWorktreeLaneEvidence({
      runCommand,
      workItemName: PR320_ORIGINAL_WORK_ITEM_NAME,
      worktreesDir,
    }),
    conflictRefreshWorktree: collectWorktreeLaneEvidence({
      runCommand,
      workItemName: PR320_CONFLICT_REFRESH_WORK_ITEM_NAME,
      worktreesDir,
    }),
  };
}

function formatQueueToken(token: QueueTokenEvidence): string {
  if (token.availability === "missing-from-queue") {
    return `${token.workItemName}: missing-from-queue`;
  }
  const state =
    token.stateName && token.stateType
      ? `${token.stateName}/${token.stateType}`
      : "unknown-state";
  const workType = token.workTypeName ?? "unknown-type";
  const workId = token.workId ?? "unknown-id";
  return `${token.workItemName} (${workType}, ${workId}): ${state}`;
}

function formatWorktreeMetadata(lane: Pr320WorktreeLaneEvidence): string[] {
  const metadata = lane.worktreeMetadata;
  if (metadata.availability === "unavailable") {
    return [
      `${lane.workItemName}: unavailable (${metadata.unavailableReason ?? "unknown reason"})`,
    ];
  }

  return [
    `${lane.workItemName}: present`,
    `  worktreePath=${metadata.worktreePath ?? "unknown"}`,
    `  branchName=${metadata.branchName ?? "unknown"}`,
    `  branchHeadSha=${metadata.branchHeadSha ?? "unknown"}`,
    `  pullRequestNumber=${metadata.pullRequestNumber ?? "none"}`,
    `  branchLinkage=${metadata.branchLinkageStatus ?? "unknown"}`,
    `  pullRequestLinkage=${metadata.pullRequestLinkageStatus ?? "unknown"}`,
    `  metadataRefreshedAtUtc=${metadata.refreshedAtUtc ?? "unknown"}`,
  ];
}

export function formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(
  report: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
): string {
  const pullRequest = report.pullRequest;
  const pullRequestLines =
    pullRequest.availability === "present"
      ? [
          `pullRequestNumber=${pullRequest.pullRequestNumber}`,
          `title=${pullRequest.title ?? "unknown"}`,
          `url=${pullRequest.url ?? "unknown"}`,
          `state=${pullRequest.state ?? "unknown"}`,
          `headRefName=${pullRequest.headRefName ?? "unknown"}`,
          `headRefOid=${pullRequest.headRefOid ?? "unknown"}`,
          `baseRefName=${pullRequest.baseRefName ?? "unknown"}`,
          `baseRefOid=${pullRequest.baseRefOid ?? "unknown"}`,
          `mergeable=${String(pullRequest.mergeable ?? "unknown")}`,
          `mergeStateStatus=${pullRequest.mergeStateStatus ?? "unknown"}`,
          `mergeabilityClass=${pullRequest.mergeabilityClass ?? "unknown"}`,
          `checkHealth=${pullRequest.checkHealth ?? "unknown"}`,
          `updatedAt=${pullRequest.updatedAt ?? "unknown"}`,
        ]
      : [
          `pullRequestNumber=${pullRequest.pullRequestNumber}`,
          `availability=unavailable`,
          `failureReason=${pullRequest.failureReason ?? "unknown"}`,
        ];

  const originMainLines = report.originMain.unavailableReason
    ? [
        `remoteBaseRef=${report.originMain.remoteBaseRef}`,
        `unavailableReason=${report.originMain.unavailableReason}`,
      ]
    : [
        `remoteBaseRef=${report.originMain.remoteBaseRef}`,
        `originMainSha=${report.originMain.originMainSha ?? "unknown"}`,
        `mergeBaseWithTargetBranch=${report.originMain.mergeBaseWithTargetBranch ?? "unknown"}`,
      ];

  const branchDriftLines = [
    `targetBranchRef=${report.branchDrift.targetBranchRef}`,
    `driftStatus=${report.branchDrift.status}`,
    `commitsAheadOfMain=${report.branchDrift.commitsAheadOfMain ?? 0}`,
    `commitsBehindMain=${report.branchDrift.commitsBehindMain ?? 0}`,
    `mergeBaseWithOriginMain=${report.branchDrift.mergeBaseWithOriginMain ?? "unknown"}`,
  ];

  const originalLaneLines =
    report.originalLane.queueTokens.map(formatQueueToken);
  const conflictRefreshLaneLines =
    report.conflictRefreshLane.queueTokens.map(formatQueueToken);

  return [
    `[${GENERATED_TABLE_REGISTRY_PR320_CONFLICT_REFRESH_HEADER}]`,
    `generatedAtUtc=${report.generatedAtUtc}`,
    `sourceSession=${report.sourceSession}`,
    `capturePolicy=${report.capturePolicy}`,
    "",
    "[pull-request]",
    ...pullRequestLines,
    "",
    "[origin-main]",
    ...originMainLines,
    "",
    "[branch-drift]",
    ...branchDriftLines,
    "",
    `[queue-lane:${PR320_ORIGINAL_WORK_ITEM_NAME}]`,
    ...originalLaneLines,
    "",
    `[queue-lane:${PR320_CONFLICT_REFRESH_WORK_ITEM_NAME}]`,
    ...conflictRefreshLaneLines,
    "",
    `[worktree:${PR320_ORIGINAL_WORK_ITEM_NAME}]`,
    ...formatWorktreeMetadata(report.originalWorktree),
    "",
    `[worktree:${PR320_CONFLICT_REFRESH_WORK_ITEM_NAME}]`,
    ...formatWorktreeMetadata(report.conflictRefreshWorktree),
  ].join("\n");
}

export function serializeGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(
  report: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
): string {
  return JSON.stringify(report, null, 2);
}
