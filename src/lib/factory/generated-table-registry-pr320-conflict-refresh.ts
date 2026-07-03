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

export const PR320_PROOF_ON_MAIN_MARKER_PATHS = [
  "src/lib/factory/generated-table-registry-root-drift-cleanup-proof.ts",
  "scripts/report-generated-table-registry-root-drift-cleanup-proof.ts",
] as const;

export const PR320_CLEANUP_PROOF_SCOPE_PRESERVE_POLICY =
  "Preserve generated-table-registry cleanup-proof intent: limit refreshed PR #320 diff to proof module, CLI script, fixtures, minimum planner linkage, and conflict-resolution edits only.";

export const PR320_CLEANUP_PROOF_SCOPE_LIMIT =
  "No adjacent page content, broad generated registry runtime behavior, or unrelated planner-report rewrites beyond minimum linkage updates.";

export const PR320_CLEANUP_PROOF_ALLOWED_PATH_PREFIXES = [
  "docs/internal/processes/generated-table-registry-root-drift-cleanup-proof-relevant-files.md",
  "docs/internal/processes/factory-linkage-relevant-files.md",
  "package.json",
  "scripts/report-generated-table-registry-root-drift-cleanup-proof.ts",
  "src/lib/factory/generated-table-registry-root-drift-cleanup-proof",
  "src/tests/fixtures/generated-table-registry-root-drift-cleanup-proof/",
] as const;

export const PR320_CLEANUP_PROOF_PROHIBITED_PATH_PREFIXES = [
  "src/content/",
  "src/content/registry/tables/",
  "src/lib/content/generated/",
] as const;

export interface Pr320ConflictRefreshScopeBoundaries {
  preservePolicy: string;
  scopeLimit: string;
}

export interface Pr320ConflictRefreshScopeProof {
  allowedPaths: string[];
  boundaries: Pr320ConflictRefreshScopeBoundaries;
  changedPaths: string[];
  outOfScopePaths: string[];
  preserveEvidence: string[];
  preserved: boolean;
  prohibitedPaths: string[];
}

export function buildPr320ConflictRefreshScopeBoundaries(): Pr320ConflictRefreshScopeBoundaries {
  return {
    preservePolicy: PR320_CLEANUP_PROOF_SCOPE_PRESERVE_POLICY,
    scopeLimit: PR320_CLEANUP_PROOF_SCOPE_LIMIT,
  };
}

export function isPr320CleanupProofAllowedPath(path: string): boolean {
  return PR320_CLEANUP_PROOF_ALLOWED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

export function isPr320CleanupProofProhibitedPath(path: string): boolean {
  return PR320_CLEANUP_PROOF_PROHIBITED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

export function listPr320TargetBranchChangedPaths(options: {
  remoteBaseRef?: string;
  repoRoot: string;
  runCommand?: RunCommand;
  targetBranchRef?: string;
}): string[] {
  const remoteBaseRef = options.remoteBaseRef ?? "origin/main";
  const targetBranchRef =
    options.targetBranchRef ?? `origin/${PR320_TARGET_BRANCH_NAME}`;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const result = runCommand(
    "git",
    ["diff", "--name-only", `${remoteBaseRef}...${targetBranchRef}`],
    options.repoRoot,
  );

  if (result.exitCode !== 0) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort();
}

export function buildPr320ConflictRefreshScopeProof(options: {
  changedPaths: string[];
}): Pr320ConflictRefreshScopeProof {
  const boundaries = buildPr320ConflictRefreshScopeBoundaries();
  const changedPaths = [...options.changedPaths].sort();
  const allowedPaths = changedPaths.filter(isPr320CleanupProofAllowedPath);
  const prohibitedPaths = changedPaths.filter(
    isPr320CleanupProofProhibitedPath,
  );
  const outOfScopePaths = changedPaths.filter(
    (path) => !isPr320CleanupProofAllowedPath(path),
  );
  const preserved =
    prohibitedPaths.length === 0 && outOfScopePaths.length === 0;
  const preserveEvidence = [
    `changed-path-count=${changedPaths.length}`,
    `allowed-path-count=${allowedPaths.length}`,
    `prohibited-path-count=${prohibitedPaths.length}`,
    `out-of-scope-path-count=${outOfScopePaths.length}`,
    `preserved=${preserved}`,
  ];

  return {
    allowedPaths,
    boundaries,
    changedPaths,
    outOfScopePaths,
    preserveEvidence,
    preserved,
    prohibitedPaths,
  };
}

export function capturePr320ConflictRefreshScopeProof(options: {
  remoteBaseRef?: string;
  repoRoot: string;
  runCommand?: RunCommand;
  targetBranchRef?: string;
}): Pr320ConflictRefreshScopeProof {
  const changedPaths = listPr320TargetBranchChangedPaths(options);
  return buildPr320ConflictRefreshScopeProof({ changedPaths });
}

export function formatPr320ConflictRefreshScopeProof(
  scopeProof: Pr320ConflictRefreshScopeProof,
): string {
  const lines = [
    "[scope]",
    `preserved=${scopeProof.preserved}`,
    `preserve-policy=${scopeProof.boundaries.preservePolicy}`,
    `scope-limit=${scopeProof.boundaries.scopeLimit}`,
  ];

  for (const evidence of scopeProof.preserveEvidence) {
    lines.push(`preserveEvidence=${evidence}`);
  }

  for (const path of scopeProof.changedPaths) {
    lines.push(`changedPath=${path}`);
  }

  for (const path of scopeProof.prohibitedPaths) {
    lines.push(`prohibitedPath=${path}`);
  }

  for (const path of scopeProof.outOfScopePaths) {
    lines.push(`outOfScopePath=${path}`);
  }

  return lines.join("\n");
}

export type Pr320ConflictRefreshOutcome =
  | "merge-ready"
  | "consumed-on-main"
  | "operator-handoff";

export type Pr320ConflictRefreshUnsafeReason =
  | "checks-not-passing"
  | "merge-conflicts-detected"
  | "merge-tree-evidence-unavailable"
  | "proof-evidence-unavailable"
  | "pull-request-unavailable";

export interface Pr320ProofOnMainEvidence {
  consumed: boolean;
  markerPaths: readonly string[];
  missingMarkerPaths: string[];
  presentMarkerPaths: string[];
}

export interface Pr320MergeTreeConflictEvidence {
  conflictPaths: string[];
  mergeTreeCommand: string;
  mergeTreeExitCode: number;
  mergeTreeOutputExcerpt: string;
}

export interface Pr320ConflictRefreshOutcomeClassification {
  classificationEvidence: string[];
  mergeTreeConflicts: Pr320MergeTreeConflictEvidence;
  nextSafeAction: string;
  outcome: Pr320ConflictRefreshOutcome;
  proofOnMain: Pr320ProofOnMainEvidence;
  refreshRecommended: boolean;
  unsafeReason?: Pr320ConflictRefreshUnsafeReason;
}

export interface Pr320ConflictRefreshOperatorHandoff {
  conflictingFiles: string[];
  nextOperatorAction: string;
  summary: string;
  unsafeCondition: string;
}

export interface Pr320ConflictRefreshOutcomeReport {
  classification: Pr320ConflictRefreshOutcomeClassification;
  evidenceReport: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport;
  operatorHandoff: Pr320ConflictRefreshOperatorHandoff | null;
  scopeProof?: Pr320ConflictRefreshScopeProof;
}

export interface ClassifyPr320ConflictRefreshOutcomeOptions {
  mergeTreeConflictPaths?: string[];
  mergeTreeExitCode?: number;
  mergeTreeOutputExcerpt?: string;
  proofOnMain?: Pr320ProofOnMainEvidence;
}

const MERGE_TREE_CONFLICT_PATH_PATTERN =
  /CONFLICT \([^)]+\): Merge conflict in (.+)/g;

export function extractMergeTreeConflictPaths(
  mergeTreeOutput: string,
): string[] {
  const paths = new Set<string>();
  for (const match of mergeTreeOutput.matchAll(
    MERGE_TREE_CONFLICT_PATH_PATTERN,
  )) {
    const path = match[1]?.trim();
    if (path) {
      paths.add(path);
    }
  }
  return [...paths].sort();
}

export function detectPr320ProofOnMainEvidence(options: {
  markerPaths?: readonly string[];
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
}): Pr320ProofOnMainEvidence {
  const markerPaths = options.markerPaths ?? PR320_PROOF_ON_MAIN_MARKER_PATHS;
  const presentMarkerPaths: string[] = [];
  const missingMarkerPaths: string[] = [];

  for (const markerPath of markerPaths) {
    const result = options.runCommand(
      "git",
      ["cat-file", "-e", `${options.remoteBaseRef}:${markerPath}`],
      options.repoRoot,
    );
    if (result.ok) {
      presentMarkerPaths.push(markerPath);
    } else {
      missingMarkerPaths.push(markerPath);
    }
  }

  return {
    consumed: missingMarkerPaths.length === 0 && presentMarkerPaths.length > 0,
    markerPaths,
    missingMarkerPaths,
    presentMarkerPaths,
  };
}

export function detectPr320MergeTreeConflictEvidence(options: {
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
  targetBranchRef: string;
}): Pr320MergeTreeConflictEvidence {
  const mergeTreeCommand = `git merge-tree ${options.remoteBaseRef} ${options.targetBranchRef}`;
  const result = options.runCommand(
    "git",
    ["merge-tree", options.remoteBaseRef, options.targetBranchRef],
    options.repoRoot,
  );
  const mergeTreeOutput = `${result.stdout}${result.stderr}`.trim();
  const conflictPaths = extractMergeTreeConflictPaths(mergeTreeOutput);

  return {
    conflictPaths,
    mergeTreeCommand,
    mergeTreeExitCode: result.exitCode ?? 1,
    mergeTreeOutputExcerpt:
      mergeTreeOutput.length > 0
        ? mergeTreeOutput.slice(0, 500)
        : "merge-tree produced no output",
  };
}

function isOriginalLaneTaskFailed(
  evidenceReport: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
): boolean {
  const taskToken = evidenceReport.originalLane.queueTokens.find(
    (token) => token.workTypeName === "task",
  );
  return taskToken?.stateName === "failed";
}

function buildMergeReadyNextSafeAction(
  evidenceReport: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
  refreshRecommended: boolean,
): string {
  if (refreshRecommended) {
    return `PR #${PR320_TARGET_PULL_REQUEST_NUMBER} is mergeable with passing checks but ${evidenceReport.branchDrift.commitsBehindMain ?? 0} commits behind ${evidenceReport.originMain.remoteBaseRef}; optional merge-refresh in the ${PR320_ORIGINAL_WORK_ITEM_NAME} worktree is recommended before merge.`;
  }
  if (isOriginalLaneTaskFailed(evidenceReport)) {
    return `PR #${PR320_TARGET_PULL_REQUEST_NUMBER} conflict drift is cleared (mergeable/CLEAN with passing checks); return review focus to the original ${PR320_ORIGINAL_WORK_ITEM_NAME} lane for any unresolved PR conversation blockers.`;
  }
  return `PR #${PR320_TARGET_PULL_REQUEST_NUMBER} is merge-ready with no conflict-refresh action required.`;
}

function buildOperatorHandoffNextSafeAction(
  handoff: Pr320ConflictRefreshOperatorHandoff,
): string {
  return `${handoff.summary} Next operator action: ${handoff.nextOperatorAction}`;
}

export function buildPr320ConflictRefreshOperatorHandoff(
  classification: Pr320ConflictRefreshOutcomeClassification,
): Pr320ConflictRefreshOperatorHandoff | null {
  if (classification.outcome !== "operator-handoff") {
    return null;
  }

  const conflictingFiles = classification.mergeTreeConflicts.conflictPaths;
  const mergeTreeEvidence = classification.mergeTreeConflicts;
  const unsafeCondition =
    classification.unsafeReason === "checks-not-passing"
      ? "Required checks are not passing on PR #320."
      : classification.unsafeReason === "merge-tree-evidence-unavailable"
        ? `git merge-tree failed with exit code ${mergeTreeEvidence.mergeTreeExitCode}; no verified clean merge-tree result is available. Output excerpt: ${mergeTreeEvidence.mergeTreeOutputExcerpt}`
        : classification.unsafeReason === "proof-evidence-unavailable"
          ? "Proof-on-main or PR evidence is unavailable for a safe refresh decision."
          : classification.unsafeReason === "pull-request-unavailable"
            ? "PR #320 metadata is unavailable."
            : conflictingFiles.length > 0
              ? `Non-mutating merge-tree reports ${conflictingFiles.length} conflicting path(s) between origin/main and the PR branch.`
              : "Automated conflict refresh is unsafe from current evidence.";

  const nextOperatorAction =
    conflictingFiles.length > 0
      ? `Resolve the listed conflicts in the ${PR320_ORIGINAL_WORK_ITEM_NAME} worktree while preserving generated-table-registry cleanup-proof intent, then rerun bun run report:generated-table-registry-pr320-conflict-refresh.`
      : "Restore PR/git evidence and rerun bun run report:generated-table-registry-pr320-conflict-refresh before attempting refresh.";

  return {
    conflictingFiles,
    nextOperatorAction,
    summary: unsafeCondition,
    unsafeCondition,
  };
}

export function classifyPr320ConflictRefreshOutcome(
  evidenceReport: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
  options?: ClassifyPr320ConflictRefreshOutcomeOptions,
): Pr320ConflictRefreshOutcomeClassification {
  const proofOnMain =
    options?.proofOnMain ??
    ({
      consumed: false,
      markerPaths: PR320_PROOF_ON_MAIN_MARKER_PATHS,
      missingMarkerPaths: [...PR320_PROOF_ON_MAIN_MARKER_PATHS],
      presentMarkerPaths: [],
    } satisfies Pr320ProofOnMainEvidence);
  const mergeTreeConflicts: Pr320MergeTreeConflictEvidence = {
    conflictPaths: options?.mergeTreeConflictPaths ?? [],
    mergeTreeCommand: `git merge-tree ${evidenceReport.originMain.remoteBaseRef} ${evidenceReport.branchDrift.targetBranchRef}`,
    mergeTreeExitCode: options?.mergeTreeExitCode ?? 0,
    mergeTreeOutputExcerpt: options?.mergeTreeOutputExcerpt ?? "not-run",
  };
  const classificationEvidence: string[] = [
    `pull-request-number=${PR320_TARGET_PULL_REQUEST_NUMBER}`,
    `proof-on-main=${proofOnMain.consumed}`,
    `merge-tree-conflict-count=${mergeTreeConflicts.conflictPaths.length}`,
  ];

  if (proofOnMain.consumed) {
    classificationEvidence.push(
      `present-marker-paths=${proofOnMain.presentMarkerPaths.join(",")}`,
    );
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction:
        "PR #320 cleanup proof is already on origin/main; close or consume PR #320 without duplicating proof work.",
      outcome: "consumed-on-main",
      proofOnMain,
      refreshRecommended: false,
    };
  }

  const pullRequest = evidenceReport.pullRequest;
  if (pullRequest.availability !== "present") {
    classificationEvidence.push("pull-request-availability=unavailable");
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction:
        "Restore PR #320 metadata via gh pr view before choosing a conflict-refresh outcome.",
      outcome: "operator-handoff",
      proofOnMain,
      refreshRecommended: false,
      unsafeReason: "pull-request-unavailable",
    };
  }

  classificationEvidence.push(
    `mergeability-class=${pullRequest.mergeabilityClass ?? "unknown"}`,
    `merge-state-status=${pullRequest.mergeStateStatus ?? "unknown"}`,
    `check-health=${pullRequest.checkHealth ?? "unknown"}`,
    `commits-behind-main=${evidenceReport.branchDrift.commitsBehindMain ?? 0}`,
  );

  if (pullRequest.checkHealth === "failing") {
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction:
        "Wait for or repair failing required checks on PR #320 before merge-refresh.",
      outcome: "operator-handoff",
      proofOnMain,
      refreshRecommended: false,
      unsafeReason: "checks-not-passing",
    };
  }

  const refreshRecommended =
    (evidenceReport.branchDrift.commitsBehindMain ?? 0) > 0 &&
    evidenceReport.branchDrift.status !== "up-to-date";

  if (mergeTreeConflicts.conflictPaths.length > 0) {
    classificationEvidence.push(
      `merge-tree-conflict-paths=${mergeTreeConflicts.conflictPaths.join(",")}`,
    );
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction: buildOperatorHandoffNextSafeAction({
        conflictingFiles: mergeTreeConflicts.conflictPaths,
        nextOperatorAction:
          "Resolve merge-tree conflicts in the original worktree while preserving proof intent.",
        summary:
          "Automated merge-refresh is unsafe until listed conflicts are resolved manually.",
        unsafeCondition: "merge-tree conflicts detected",
      }),
      outcome: "operator-handoff",
      proofOnMain,
      refreshRecommended,
      unsafeReason: "merge-conflicts-detected",
    };
  }

  classificationEvidence.push(
    `merge-tree-exit-code=${mergeTreeConflicts.mergeTreeExitCode}`,
  );

  if (mergeTreeConflicts.mergeTreeExitCode !== 0) {
    classificationEvidence.push(
      `merge-tree-output-excerpt=${mergeTreeConflicts.mergeTreeOutputExcerpt}`,
    );
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction: buildOperatorHandoffNextSafeAction({
        conflictingFiles: [],
        nextOperatorAction:
          "Restore git refs and rerun bun run report:generated-table-registry-pr320-conflict-refresh before choosing merge-ready.",
        summary:
          "git merge-tree did not return a verified clean result; automated merge-ready classification is blocked.",
        unsafeCondition: `merge-tree exit code ${mergeTreeConflicts.mergeTreeExitCode}`,
      }),
      outcome: "operator-handoff",
      proofOnMain,
      refreshRecommended,
      unsafeReason: "merge-tree-evidence-unavailable",
    };
  }

  if (pullRequest.mergeabilityClass === "conflicting") {
    classificationEvidence.push(
      "github-mergeability=conflicting-with-clean-merge-tree",
    );
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction:
        "GitHub reports CONFLICTING but merge-tree is clean; rerun gh pr view after fetch or perform a cautious merge-refresh in the original worktree.",
      outcome: "operator-handoff",
      proofOnMain,
      refreshRecommended: true,
      unsafeReason: "proof-evidence-unavailable",
    };
  }

  if (
    pullRequest.mergeabilityClass === "mergeable" &&
    pullRequest.checkHealth === "passing"
  ) {
    return {
      classificationEvidence,
      mergeTreeConflicts,
      nextSafeAction: buildMergeReadyNextSafeAction(
        evidenceReport,
        refreshRecommended,
      ),
      outcome: "merge-ready",
      proofOnMain,
      refreshRecommended,
    };
  }

  return {
    classificationEvidence,
    mergeTreeConflicts,
    nextSafeAction:
      "Gather fresher PR mergeability/check evidence before attempting automated conflict refresh.",
    outcome: "operator-handoff",
    proofOnMain,
    refreshRecommended,
    unsafeReason: "proof-evidence-unavailable",
  };
}

export function buildPr320ConflictRefreshOutcomeReport(
  evidenceReport: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
  options?: ClassifyPr320ConflictRefreshOutcomeOptions & {
    scopeProof?: Pr320ConflictRefreshScopeProof;
  },
): Pr320ConflictRefreshOutcomeReport {
  const classification = classifyPr320ConflictRefreshOutcome(
    evidenceReport,
    options,
  );
  return {
    classification,
    evidenceReport,
    operatorHandoff: buildPr320ConflictRefreshOperatorHandoff(classification),
    scopeProof: options?.scopeProof,
  };
}

export function buildGeneratedTableRegistryPr320ConflictRefreshOutput(
  options: CaptureGeneratedTableRegistryPr320ConflictRefreshEvidenceOptions & {
    classifyOutcome?: boolean;
    finalVerificationReport?: Pr320ConflictRefreshFinalVerificationReport;
    includeFinalVerification?: boolean;
    mergeTreeConflictPaths?: string[];
    mergeTreeExitCode?: number;
    mergeTreeOutputExcerpt?: string;
    proofOnMain?: Pr320ProofOnMainEvidence;
    scopeProof?: Pr320ConflictRefreshScopeProof;
  },
): {
  evidenceReport: GeneratedTableRegistryPr320ConflictRefreshEvidenceReport;
  finalVerificationReport?: Pr320ConflictRefreshFinalVerificationReport;
  outcomeReport?: Pr320ConflictRefreshOutcomeReport;
  scopeProof?: Pr320ConflictRefreshScopeProof;
} {
  const evidenceReport =
    captureGeneratedTableRegistryPr320ConflictRefreshEvidence(options);
  if (options.classifyOutcome === false) {
    return { evidenceReport };
  }

  const repoRoot = options.repoRoot ?? resolveMainRepoRoot(process.cwd());
  const remoteBaseRef = options.remoteBaseRef ?? "origin/main";
  const runCommand = options.runCommand ?? defaultRunCommand;
  const targetBranchRef = `origin/${PR320_TARGET_BRANCH_NAME}`;

  const proofOnMain =
    options.proofOnMain ??
    detectPr320ProofOnMainEvidence({
      remoteBaseRef,
      repoRoot,
      runCommand,
    });
  const mergeTreeConflicts =
    options.mergeTreeConflictPaths !== undefined
      ? {
          conflictPaths: options.mergeTreeConflictPaths,
          mergeTreeCommand: `git merge-tree ${remoteBaseRef} ${targetBranchRef}`,
          mergeTreeExitCode: options.mergeTreeExitCode ?? 0,
          mergeTreeOutputExcerpt:
            options.mergeTreeOutputExcerpt ?? "fixture-merge-tree",
        }
      : detectPr320MergeTreeConflictEvidence({
          remoteBaseRef,
          repoRoot,
          runCommand,
          targetBranchRef,
        });

  const scopeProof =
    options.scopeProof ??
    capturePr320ConflictRefreshScopeProof({
      remoteBaseRef,
      repoRoot,
      runCommand,
      targetBranchRef,
    });

  const outcomeReport = buildPr320ConflictRefreshOutcomeReport(evidenceReport, {
    mergeTreeConflictPaths: mergeTreeConflicts.conflictPaths,
    mergeTreeExitCode: mergeTreeConflicts.mergeTreeExitCode,
    mergeTreeOutputExcerpt: mergeTreeConflicts.mergeTreeOutputExcerpt,
    proofOnMain,
    scopeProof,
  });

  const partialOutput = {
    evidenceReport,
    outcomeReport,
    scopeProof,
  };

  const finalVerificationReport =
    options.finalVerificationReport ??
    (options.includeFinalVerification === false
      ? undefined
      : buildPr320ConflictRefreshFinalVerificationReport(partialOutput));

  return {
    ...partialOutput,
    finalVerificationReport,
  };
}

export function formatPr320ConflictRefreshOutcomeReport(
  outcomeReport: Pr320ConflictRefreshOutcomeReport,
): string {
  const classification = outcomeReport.classification;
  const lines = [
    "[outcome]",
    `selectedOutcome=${classification.outcome}`,
    `refreshRecommended=${classification.refreshRecommended}`,
    `nextSafeAction=${classification.nextSafeAction}`,
    `proofOnMain=${classification.proofOnMain.consumed}`,
    `mergeTreeConflictCount=${classification.mergeTreeConflicts.conflictPaths.length}`,
    `mergeTreeExitCode=${classification.mergeTreeConflicts.mergeTreeExitCode}`,
  ];

  if (classification.unsafeReason) {
    lines.push(`unsafeReason=${classification.unsafeReason}`);
  }

  for (const evidence of classification.classificationEvidence) {
    lines.push(`classificationEvidence=${evidence}`);
  }

  if (outcomeReport.operatorHandoff) {
    lines.push(
      `operatorHandoffSummary=${outcomeReport.operatorHandoff.summary}`,
      `operatorHandoffUnsafeCondition=${outcomeReport.operatorHandoff.unsafeCondition}`,
      `operatorHandoffNextAction=${outcomeReport.operatorHandoff.nextOperatorAction}`,
    );
    for (const path of outcomeReport.operatorHandoff.conflictingFiles) {
      lines.push(`conflictingFile=${path}`);
    }
  }

  return lines.join("\n");
}

export function formatGeneratedTableRegistryPr320ConflictRefreshOutput(
  output: ReturnType<
    typeof buildGeneratedTableRegistryPr320ConflictRefreshOutput
  >,
): string {
  const sections = [
    formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(
      output.evidenceReport,
    ),
  ];
  if (output.outcomeReport) {
    sections.push(
      "",
      formatPr320ConflictRefreshOutcomeReport(output.outcomeReport),
    );
  }
  if (output.scopeProof) {
    sections.push("", formatPr320ConflictRefreshScopeProof(output.scopeProof));
  }
  if (output.finalVerificationReport) {
    sections.push(
      "",
      formatPr320ConflictRefreshFinalVerificationReport(
        output.finalVerificationReport,
      ),
    );
  }
  return sections.join("\n");
}

export function serializeGeneratedTableRegistryPr320ConflictRefreshOutput(
  output: ReturnType<
    typeof buildGeneratedTableRegistryPr320ConflictRefreshOutput
  >,
): string {
  return JSON.stringify(output, null, 2);
}

export const PR320_CONFLICT_REFRESH_FINAL_VERIFICATION_HEADER =
  "Generated Table Registry PR320 Conflict Refresh — Final Verification";

export const PR320_CONFLICT_REFRESH_FINAL_VERIFICATION_COMMANDS = [
  "bun run typecheck",
  "bun run lint",
  "bun test src/lib/factory/generated-table-registry-pr320-conflict-refresh.test.ts",
] as const;

export type Pr320ConflictRefreshFinalOutcomeStatus =
  | "mergeable"
  | "consumed-closed"
  | "blocked-handoff";

export type Pr320VerificationCommandAvailability = "available" | "unavailable";

export interface Pr320VerificationCommandEvidence {
  availability: Pr320VerificationCommandAvailability;
  command: string;
  passed?: boolean;
  unavailableReason?: string;
}

export interface Pr320PlannerLinkageEvidence {
  consistent: boolean;
  conflictingNotes: string[];
  evidenceSentences: string[];
}

export interface Pr320ConflictRefreshFinalVerificationReport {
  finalOutcomeSentence: string;
  finalOutcomeStatus: Pr320ConflictRefreshFinalOutcomeStatus;
  generatedAtUtc: string;
  operatorHandoffConcise?: string;
  plannerLinkage: Pr320PlannerLinkageEvidence;
  pr320CheckHealth?: CheckHealthStatus;
  pr320HeadSha?: string;
  pr320MergeStateStatus?: string;
  pr320MergeabilityClass?: MergeabilityClass;
  queueTokenSummary: Array<{
    state: string;
    token: string;
    workItemName: string;
  }>;
  scopePreserved: boolean;
  verificationCommands: Pr320VerificationCommandEvidence[];
}

function mapPr320OutcomeToFinalStatus(
  outcome: Pr320ConflictRefreshOutcome,
): Pr320ConflictRefreshFinalOutcomeStatus {
  switch (outcome) {
    case "merge-ready":
      return "mergeable";
    case "consumed-on-main":
      return "consumed-closed";
    case "operator-handoff":
      return "blocked-handoff";
  }
}

function buildDefaultPr320VerificationCommandEvidence(): Pr320VerificationCommandEvidence[] {
  return PR320_CONFLICT_REFRESH_FINAL_VERIFICATION_COMMANDS.map((command) => ({
    availability: "available" as const,
    command,
  }));
}

export function buildPr320ConflictRefreshPlannerLinkageEvidence(
  output: Pick<
    ReturnType<typeof buildGeneratedTableRegistryPr320ConflictRefreshOutput>,
    "evidenceReport" | "outcomeReport"
  >,
): Pr320PlannerLinkageEvidence {
  const evidenceSentences: string[] = [];
  const conflictingNotes: string[] = [];
  const { evidenceReport, outcomeReport } = output;
  const pullRequest = evidenceReport.pullRequest;
  const originalWorktree = evidenceReport.originalWorktree.worktreeMetadata;
  const selectedOutcome = outcomeReport?.classification.outcome;

  if (pullRequest.availability === "present") {
    evidenceSentences.push(
      `PR #${pullRequest.pullRequestNumber} is ${pullRequest.state ?? "unknown"} with mergeability=${pullRequest.mergeabilityClass ?? "unknown"} and check-health=${pullRequest.checkHealth ?? "unknown"}.`,
    );
  } else {
    conflictingNotes.push(
      "PR #320 evidence is unavailable for linkage verification.",
    );
  }

  if (originalWorktree.availability === "present") {
    evidenceSentences.push(
      `Original worktree stamps PR #${originalWorktree.pullRequestNumber ?? "none"} with linkage=${originalWorktree.pullRequestLinkageStatus ?? "unknown"}.`,
    );
    if (
      pullRequest.availability === "present" &&
      pullRequest.state === "OPEN" &&
      selectedOutcome !== "consumed-on-main" &&
      originalWorktree.pullRequestNumber !== PR320_TARGET_PULL_REQUEST_NUMBER
    ) {
      conflictingNotes.push(
        "Original worktree PR stamp does not match PR #320 while the PR remains open.",
      );
    }
    if (
      pullRequest.availability === "present" &&
      pullRequest.state === "OPEN" &&
      selectedOutcome !== "consumed-on-main" &&
      originalWorktree.pullRequestLinkageStatus !== "current"
    ) {
      conflictingNotes.push(
        "Original worktree pull-request linkage is not current for an open PR #320.",
      );
    }
  } else {
    conflictingNotes.push(
      "Original worktree metadata is unavailable for PR #320 linkage verification.",
    );
  }

  if (
    selectedOutcome === "merge-ready" &&
    pullRequest.availability === "present" &&
    pullRequest.mergeabilityClass === "conflicting"
  ) {
    conflictingNotes.push(
      "Outcome is merge-ready but GitHub mergeability is conflicting.",
    );
  }

  if (
    selectedOutcome === "operator-handoff" &&
    pullRequest.availability === "present" &&
    pullRequest.mergeabilityClass === "mergeable" &&
    pullRequest.checkHealth === "passing"
  ) {
    conflictingNotes.push(
      "Outcome is operator-handoff while GitHub reports mergeable checks passing without merge-tree conflicts.",
    );
  }

  const conflictRefreshWorktree =
    evidenceReport.conflictRefreshWorktree.worktreeMetadata;
  if (conflictRefreshWorktree.availability === "present") {
    evidenceSentences.push(
      `Conflict-refresh worktree has pull-request linkage=${conflictRefreshWorktree.pullRequestLinkageStatus ?? "unknown"} (expected missing for this lane).`,
    );
  }

  return {
    consistent: conflictingNotes.length === 0,
    conflictingNotes,
    evidenceSentences,
  };
}

export function buildPr320ConflictRefreshFinalVerificationReport(
  output: ReturnType<
    typeof buildGeneratedTableRegistryPr320ConflictRefreshOutput
  >,
  options?: {
    generatedAtUtc?: string;
    verificationCommands?: Pr320VerificationCommandEvidence[];
  },
): Pr320ConflictRefreshFinalVerificationReport {
  const outcomeReport = output.outcomeReport;
  const evidenceReport = output.evidenceReport;
  const pullRequest = evidenceReport.pullRequest;
  const selectedOutcome =
    outcomeReport?.classification.outcome ?? "operator-handoff";
  const finalOutcomeStatus = mapPr320OutcomeToFinalStatus(selectedOutcome);
  const scopePreserved = output.scopeProof?.preserved ?? false;
  const plannerLinkage =
    buildPr320ConflictRefreshPlannerLinkageEvidence(output);

  const queueTokenSummary = [
    ...evidenceReport.originalLane.queueTokens,
    ...evidenceReport.conflictRefreshLane.queueTokens,
  ].map((token) => ({
    state: `${token.stateName ?? "unknown"}/${token.stateType ?? "unknown"}`,
    token: token.workTypeName ?? token.workId ?? "unknown",
    workItemName: token.workItemName,
  }));

  let finalOutcomeSentence: string;
  let operatorHandoffConcise: string | undefined;

  switch (finalOutcomeStatus) {
    case "mergeable":
      finalOutcomeSentence =
        "PR #320 is mergeable with required checks passing and cleanup-proof scope preserved.";
      break;
    case "consumed-closed":
      finalOutcomeSentence =
        "PR #320 proof is already on origin/main; close or consume the PR without duplicating proof work.";
      break;
    case "blocked-handoff":
      finalOutcomeSentence =
        outcomeReport?.operatorHandoff?.summary ??
        "PR #320 requires operator conflict resolution before merge.";
      operatorHandoffConcise =
        outcomeReport?.operatorHandoff?.nextOperatorAction ??
        "Resolve listed conflicts in the original worktree and rerun the conflict-refresh report.";
      break;
  }

  return {
    finalOutcomeSentence,
    finalOutcomeStatus,
    generatedAtUtc: options?.generatedAtUtc ?? new Date().toISOString(),
    operatorHandoffConcise,
    plannerLinkage,
    pr320CheckHealth: pullRequest.checkHealth,
    pr320HeadSha: pullRequest.headRefOid,
    pr320MergeStateStatus: pullRequest.mergeStateStatus,
    pr320MergeabilityClass: pullRequest.mergeabilityClass,
    queueTokenSummary,
    scopePreserved,
    verificationCommands:
      options?.verificationCommands ??
      buildDefaultPr320VerificationCommandEvidence(),
  };
}

export function formatPr320ConflictRefreshFinalVerificationReport(
  report: Pr320ConflictRefreshFinalVerificationReport,
): string {
  const lines = [
    `[final-verification]`,
    `generated-at=${report.generatedAtUtc}`,
    `final-outcome-status=${report.finalOutcomeStatus}`,
    `final-outcome-sentence=${report.finalOutcomeSentence}`,
    `pr320-head-sha=${report.pr320HeadSha ?? "unavailable"}`,
    `pr320-mergeability=${report.pr320MergeabilityClass ?? "unavailable"}`,
    `pr320-merge-state=${report.pr320MergeStateStatus ?? "unavailable"}`,
    `pr320-check-health=${report.pr320CheckHealth ?? "unavailable"}`,
    `scope-preserved=${report.scopePreserved}`,
    `planner-linkage-consistent=${report.plannerLinkage.consistent}`,
  ];

  for (const sentence of report.plannerLinkage.evidenceSentences) {
    lines.push(`planner-linkage-evidence=${sentence}`);
  }
  for (const note of report.plannerLinkage.conflictingNotes) {
    lines.push(`planner-linkage-conflict=${note}`);
  }

  if (report.operatorHandoffConcise) {
    lines.push(`operator-handoff-concise=${report.operatorHandoffConcise}`);
  }

  lines.push("", "Queue token summary");
  if (report.queueTokenSummary.length === 0) {
    lines.push("- none");
  } else {
    for (const token of report.queueTokenSummary) {
      lines.push(
        `- work-item=${token.workItemName} token=${token.token} state=${token.state}`,
      );
    }
  }

  lines.push("", "Verification commands");
  for (const command of report.verificationCommands) {
    lines.push(
      `- command=${command.command} availability=${command.availability}${
        command.passed === undefined ? "" : ` passed=${command.passed}`
      }${command.unavailableReason ? ` unavailable-reason=${command.unavailableReason}` : ""}`,
    );
  }

  return lines.join("\n");
}

export function serializePr320ConflictRefreshFinalVerificationReport(
  report: Pr320ConflictRefreshFinalVerificationReport,
): string {
  return JSON.stringify(report, null, 2);
}
