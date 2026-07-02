import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type CommandResult,
  type RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import { readWorktreeLaneMetadata } from "@/lib/factory/worktree-lane-metadata";

export const MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER =
  "Merged PR Drain Rows Reconciliation";

export const MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID =
  "930b51a6-07ce-44e6-a639-7a6217f6e864";

export interface MergedPrDrainRowDefinition {
  branchName: string;
  drainWorkItemName?: string;
  mergeCommitSha: string;
  pullRequestNumber: number;
  workItemName: string;
}

export const MERGED_PR_DRAIN_ROW_DEFINITIONS: MergedPrDrainRowDefinition[] = [
  {
    workItemName: "ltx-23",
    pullRequestNumber: 281,
    drainWorkItemName: "ltx-23-pr281-drain",
    branchName: "ltx-23",
    mergeCommitSha: "d9ef966b7ecaa46cc19699033ec7d8bfdca16e24",
  },
  {
    workItemName: "MAMBA",
    pullRequestNumber: 282,
    drainWorkItemName: "mamba-pr282-drain",
    branchName: "MAMBA",
    mergeCommitSha: "d22d1e0dd88f94341fc6a8590eff26aaac29ce51",
  },
  {
    workItemName: "glossary-decomposition",
    pullRequestNumber: 284,
    drainWorkItemName: "glossary-decomposition-pr284-conflict-refresh",
    branchName: "glossary-decomposition",
    mergeCommitSha: "737acd35b88214436317217a3dfdb6e8e5e067bd",
  },
  {
    workItemName: "bpe-page",
    pullRequestNumber: 286,
    branchName: "bpe-page",
    mergeCommitSha: "52cfeb699497dac6fac560a367efaed021135582",
  },
];

export type QueueTokenAvailability = "present" | "missing-from-queue";

export interface QueueTokenEvidence {
  availability: QueueTokenAvailability;
  stateName?: string;
  stateType?: string;
  traceId?: string;
  workId?: string;
  workItemName: string;
  workTypeName?: string;
}

export type PullRequestTruthAvailability =
  | "present"
  | "merged-closed"
  | "open"
  | "unavailable";

export interface PullRequestTruthEvidence {
  availability: PullRequestTruthAvailability;
  baseRefName?: string;
  failureReason?: string;
  headRefName?: string;
  mergeCommitSha?: string;
  mergedAt?: string;
  mergePresentInOriginMainLineage: boolean;
  pullRequestNumber: number;
  state?: string;
  title?: string;
  url?: string;
}

export type WorktreeMetadataAvailability = "present" | "unavailable";

export interface WorktreeMetadataEvidence {
  availability: WorktreeMetadataAvailability;
  branchHeadSha?: string;
  branchLinkageStatus?: string;
  branchName?: string;
  metadataPath?: string;
  pullRequestLinkageStatus?: string;
  pullRequestNumber?: number;
  refreshedAtUtc?: string;
  unavailableReason?: string;
  worktreePath?: string;
}

export type QueueCompletionTruth =
  | "content-lane-terminal-complete"
  | "drain-row-initial"
  | "no-drain-row"
  | "missing-from-queue"
  | "non-terminal";

export interface MergedVsQueueTruthDistinction {
  contentLaneQueueTruth: QueueCompletionTruth;
  drainRowQueueTruth: QueueCompletionTruth;
  distinctionNote: string;
  mergedPullRequestTruth: "merged-into-origin-main" | "not-merged" | "unavailable";
}

export interface MergedPrDrainRowEvidence {
  branchName: string;
  contentLaneTokens: QueueTokenEvidence[];
  definition: MergedPrDrainRowDefinition;
  drainRowTokens: QueueTokenEvidence[];
  mergedVsQueueTruth: MergedVsQueueTruthDistinction;
  pullRequestTruth: PullRequestTruthEvidence;
  worktreeMetadata: WorktreeMetadataEvidence;
}

export interface RootCheckoutEvidence {
  originMainSha?: string;
  remoteBaseRef: string;
  rootCheckoutDirtyPathCount: number;
  rootRepoPath: string;
  unavailableReason?: string;
}

export interface MergedPrDrainRowsEvidenceReport {
  generatedAtUtc: string;
  rootCheckout: RootCheckoutEvidence;
  rows: MergedPrDrainRowEvidence[];
  sourceSession: string;
}

export interface MergedPullRequestLookupResult {
  pullRequest: {
    baseRefName?: string;
    headRefName?: string;
    mergeCommitSha?: string;
    mergedAt?: string;
    number: number;
    state?: string;
    title?: string;
    url?: string;
  } | null;
  failureReason?: string;
}

export interface CollectMergedPrDrainRowsEvidenceOptions {
  generatedAtUtc?: string;
  lookupPullRequestByNumber?: (
    pullRequestNumber: number,
    runCommand: RunCommand,
  ) => MergedPullRequestLookupResult;
  remoteBaseRef?: string;
  repoRoot: string;
  runCommand?: RunCommand;
  sourceSession?: string;
  workListJsonText: string;
  worktreesDir?: string;
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

export function resolveMainRepoRoot(
  repoRoot: string,
  runCommand: RunCommand = defaultRunCommand,
): string {
  const commonDirResult = runCommand(
    "git",
    ["rev-parse", "--git-common-dir"],
    repoRoot,
  );
  if (commonDirResult.ok) {
    const commonDir = commonDirResult.stdout.trim();
    if (commonDir.length > 0 && commonDir !== ".git") {
      return resolve(commonDir, "..");
    }
  }

  return repoRoot;
}

export function resolveDefaultWorktreesDir(
  repoRoot: string,
  runCommand: RunCommand = defaultRunCommand,
): string {
  const commonDirResult = runCommand(
    "git",
    ["rev-parse", "--git-common-dir"],
    repoRoot,
  );
  if (commonDirResult.ok) {
    const commonDir = commonDirResult.stdout.trim();
    if (commonDir.length > 0 && commonDir !== ".git") {
      const mainRepoRoot = resolve(commonDir, "..");
      return join(mainRepoRoot, ".claude", "worktrees");
    }
  }

  return join(repoRoot, ".claude", "worktrees");
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

function parseJsonText(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse failure";
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
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

function findQueueTokensForWorkItemName(
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

function missingQueueToken(workItemName: string): QueueTokenEvidence {
  return {
    availability: "missing-from-queue",
    workItemName,
  };
}

function classifyContentLaneQueueTruth(
  tokens: QueueTokenEvidence[],
): QueueCompletionTruth {
  if (tokens.length === 0 || tokens.every((token) => token.availability === "missing-from-queue")) {
    return "missing-from-queue";
  }

  const presentTokens = tokens.filter((token) => token.availability === "present");
  const hasTerminalComplete = presentTokens.some((token) => {
    const stateName = token.stateName?.toLowerCase();
    const stateType = token.stateType?.toUpperCase();
    return stateName === "complete" && stateType === "TERMINAL";
  });
  if (hasTerminalComplete) {
    return "content-lane-terminal-complete";
  }

  return "non-terminal";
}

function classifyDrainRowQueueTruth(
  drainWorkItemName: string | undefined,
  tokens: QueueTokenEvidence[],
): QueueCompletionTruth {
  if (!drainWorkItemName) {
    return "no-drain-row";
  }

  if (tokens.length === 0 || tokens.every((token) => token.availability === "missing-from-queue")) {
    return "missing-from-queue";
  }

  const presentTokens = tokens.filter((token) => token.availability === "present");
  const hasInitial = presentTokens.some((token) => {
    const stateName = token.stateName?.toLowerCase();
    const stateType = token.stateType?.toUpperCase();
    return stateName === "init" && stateType === "INITIAL";
  });
  if (hasInitial) {
    return "drain-row-initial";
  }

  const hasTerminalComplete = presentTokens.some((token) => {
    const stateName = token.stateName?.toLowerCase();
    const stateType = token.stateType?.toUpperCase();
    return stateName === "complete" && stateType === "TERMINAL";
  });
  if (hasTerminalComplete) {
    return "content-lane-terminal-complete";
  }

  return "non-terminal";
}

function buildMergedVsQueueTruthDistinction(options: {
  contentLaneTokens: QueueTokenEvidence[];
  definition: MergedPrDrainRowDefinition;
  drainRowTokens: QueueTokenEvidence[];
  pullRequestTruth: PullRequestTruthEvidence;
}): MergedVsQueueTruthDistinction {
  const contentLaneQueueTruth = classifyContentLaneQueueTruth(
    options.contentLaneTokens,
  );
  const drainRowQueueTruth = classifyDrainRowQueueTruth(
    options.definition.drainWorkItemName,
    options.drainRowTokens,
  );

  const mergedPullRequestTruth =
    options.pullRequestTruth.availability === "present" ||
    options.pullRequestTruth.availability === "merged-closed"
      ? options.pullRequestTruth.mergePresentInOriginMainLineage
        ? "merged-into-origin-main"
        : "not-merged"
      : "unavailable";

  const distinctionParts = [
    `merged-pr-truth=${mergedPullRequestTruth}`,
    `content-lane-queue-truth=${contentLaneQueueTruth}`,
    `drain-row-queue-truth=${drainRowQueueTruth}`,
    "queue-completion-truth-is-not-inferred-from-pr-status-alone",
  ];

  return {
    contentLaneQueueTruth,
    drainRowQueueTruth,
    mergedPullRequestTruth,
    distinctionNote: distinctionParts.join("; "),
  };
}

function isMergeCommitInOriginMainLineage(
  mergeCommitSha: string,
  remoteBaseRef: string,
  repoRoot: string,
  runCommand: RunCommand,
): boolean {
  const result = runCommand(
    "git",
    ["merge-base", "--is-ancestor", mergeCommitSha, remoteBaseRef],
    repoRoot,
  );
  return result.ok && result.exitCode === 0;
}

export function defaultMergedPullRequestLookupByNumber(
  pullRequestNumber: number,
  runCommand: RunCommand = defaultRunCommand,
): MergedPullRequestLookupResult {
  const result = runCommand("gh", [
    "pr",
    "view",
    String(pullRequestNumber),
    "--json",
    "number,title,url,state,mergedAt,mergeCommit,headRefName,baseRefName",
  ]);

  if (!result.ok) {
    return {
      pullRequest: null,
      failureReason:
        result.stderr.trim() || `gh pr view ${pullRequestNumber} failed`,
    };
  }

  try {
    const parsed = parseJsonText(result.stdout, `gh pr view ${pullRequestNumber}`) as Record<
      string,
      unknown
    >;
    const number = typeof parsed.number === "number" ? parsed.number : NaN;
    if (!Number.isFinite(number)) {
      return {
        pullRequest: null,
        failureReason: `PR lookup returned invalid number for PR #${pullRequestNumber}`,
      };
    }

    const mergeCommitRecord = isRecord(parsed.mergeCommit)
      ? parsed.mergeCommit
      : undefined;
    const mergeCommitSha = readStringField(mergeCommitRecord ?? {}, ["oid"]);

    return {
      pullRequest: {
        number,
        url: readString(parsed.url),
        headRefName: readString(parsed.headRefName) ?? `pr-${pullRequestNumber}`,
        state: readString(parsed.state),
        mergedAt: readString(parsed.mergedAt),
        mergeCommitSha,
        baseRefName: readString(parsed.baseRefName),
        title: readString(parsed.title),
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

function collectPullRequestTruthEvidence(options: {
  definition: MergedPrDrainRowDefinition;
  lookupPullRequestByNumber: (
    pullRequestNumber: number,
    runCommand: RunCommand,
  ) => MergedPullRequestLookupResult;
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
}): PullRequestTruthEvidence {
  const lookup = options.lookupPullRequestByNumber(
    options.definition.pullRequestNumber,
    options.runCommand,
  );

  const mergeCommitSha =
    lookup.pullRequest?.mergeCommitSha ?? options.definition.mergeCommitSha;
  const mergePresentInOriginMainLineage = isMergeCommitInOriginMainLineage(
    mergeCommitSha,
    options.remoteBaseRef,
    options.repoRoot,
    options.runCommand,
  );

  if (!lookup.pullRequest) {
    return {
      availability: "unavailable",
      failureReason: lookup.failureReason,
      mergePresentInOriginMainLineage,
      pullRequestNumber: options.definition.pullRequestNumber,
      mergeCommitSha,
    };
  }

  const state = lookup.pullRequest.state?.toUpperCase();
  const availability: PullRequestTruthAvailability =
    state === "MERGED"
      ? "present"
      : state === "OPEN"
        ? "open"
        : state === "CLOSED"
          ? "merged-closed"
          : "present";

  return {
    availability,
    baseRefName: lookup.pullRequest.baseRefName,
    headRefName: lookup.pullRequest.headRefName,
    mergeCommitSha,
    mergedAt: lookup.pullRequest.mergedAt,
    mergePresentInOriginMainLineage,
    pullRequestNumber: options.definition.pullRequestNumber,
    state: lookup.pullRequest.state,
    title: lookup.pullRequest.title,
    url: lookup.pullRequest.url,
  };
}

function collectWorktreeMetadataEvidence(options: {
  definition: MergedPrDrainRowDefinition;
  runCommand: RunCommand;
  worktreesDir: string;
}): WorktreeMetadataEvidence {
  const worktreePath = join(options.worktreesDir, options.definition.workItemName);
  const metadataPath = join(worktreePath, ".claude", "lane-metadata.json");

  if (!existsSync(worktreePath)) {
    return {
      availability: "unavailable",
      unavailableReason: `worktree path missing at ${worktreePath}`,
    };
  }

  const metadata = readWorktreeLaneMetadata(worktreePath);
  if (!metadata) {
    return {
      availability: "unavailable",
      metadataPath,
      unavailableReason: `lane metadata unreadable at ${metadataPath}`,
      worktreePath,
    };
  }

  const headResult = options.runCommand(
    "git",
    ["-C", worktreePath, "rev-parse", "HEAD"],
    undefined,
  );
  const branchHeadSha = headResult.ok ? headResult.stdout.trim() : undefined;

  return {
    availability: "present",
    branchHeadSha,
    branchLinkageStatus: metadata.linkage.branch.status,
    branchName: metadata.branchName ?? options.definition.branchName,
    metadataPath,
    pullRequestLinkageStatus: metadata.linkage.pullRequest.status,
    pullRequestNumber: metadata.pullRequest?.number,
    refreshedAtUtc: metadata.refreshedAtUtc,
    worktreePath,
  };
}

function collectRootCheckoutEvidence(options: {
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
}): RootCheckoutEvidence {
  const originResult = options.runCommand(
    "git",
    ["rev-parse", options.remoteBaseRef],
    options.repoRoot,
  );
  const originMainSha = originResult.ok ? originResult.stdout.trim() : undefined;

  const statusResult = options.runCommand(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    options.repoRoot,
  );
  const rootCheckoutDirtyPathCount = statusResult.ok
    ? statusResult.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0).length
    : 0;

  if (!originResult.ok) {
    return {
      originMainSha,
      remoteBaseRef: options.remoteBaseRef,
      rootCheckoutDirtyPathCount,
      rootRepoPath: options.repoRoot,
      unavailableReason:
        originResult.stderr.trim() ||
        `unable to resolve ${options.remoteBaseRef}`,
    };
  }

  return {
    originMainSha,
    remoteBaseRef: options.remoteBaseRef,
    rootCheckoutDirtyPathCount,
    rootRepoPath: options.repoRoot,
  };
}

function collectRowEvidence(options: {
  definition: MergedPrDrainRowDefinition;
  lookupPullRequestByNumber: (
    pullRequestNumber: number,
    runCommand: RunCommand,
  ) => MergedPullRequestLookupResult;
  remoteBaseRef: string;
  repoRoot: string;
  runCommand: RunCommand;
  workListJsonText: string;
  worktreesDir: string;
}): MergedPrDrainRowEvidence {
  const contentLaneTokens = findQueueTokensForWorkItemName(
    options.workListJsonText,
    options.definition.workItemName,
  );
  const drainRowTokens = options.definition.drainWorkItemName
    ? findQueueTokensForWorkItemName(
        options.workListJsonText,
        options.definition.drainWorkItemName,
      )
    : [missingQueueToken("no-drain-row")];

  const pullRequestTruth = collectPullRequestTruthEvidence(options);
  const worktreeMetadata = collectWorktreeMetadataEvidence({
    definition: options.definition,
    runCommand: options.runCommand,
    worktreesDir: options.worktreesDir,
  });
  const mergedVsQueueTruth = buildMergedVsQueueTruthDistinction({
    contentLaneTokens,
    definition: options.definition,
    drainRowTokens,
    pullRequestTruth,
  });

  return {
    branchName: options.definition.branchName,
    contentLaneTokens,
    definition: options.definition,
    drainRowTokens,
    mergedVsQueueTruth,
    pullRequestTruth,
    worktreeMetadata,
  };
}

export function collectMergedPrDrainRowsEvidence(
  options: CollectMergedPrDrainRowsEvidenceOptions,
): MergedPrDrainRowsEvidenceReport {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const remoteBaseRef = options.remoteBaseRef ?? "origin/main";
  const mainRepoRoot = resolveMainRepoRoot(options.repoRoot, runCommand);
  const worktreesDir =
    options.worktreesDir ?? resolveDefaultWorktreesDir(options.repoRoot, runCommand);
  const lookupPullRequestByNumber =
    options.lookupPullRequestByNumber ?? defaultMergedPullRequestLookupByNumber;
  const sourceSession =
    options.sourceSession ?? MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    sourceSession,
    rootCheckout: collectRootCheckoutEvidence({
      remoteBaseRef,
      repoRoot: mainRepoRoot,
      runCommand,
    }),
    rows: MERGED_PR_DRAIN_ROW_DEFINITIONS.map((definition) =>
      collectRowEvidence({
        definition,
        lookupPullRequestByNumber,
        remoteBaseRef,
        repoRoot: options.repoRoot,
        runCommand,
        workListJsonText: options.workListJsonText,
        worktreesDir,
      }),
    ),
  };
}

function formatQueueToken(token: QueueTokenEvidence): string {
  if (token.availability === "missing-from-queue") {
    return `work-item=${token.workItemName} availability=missing-from-queue`;
  }

  const fields = [
    `work-item=${token.workItemName}`,
    token.workTypeName ? `type=${token.workTypeName}` : undefined,
    token.stateName && token.stateType
      ? `state=${token.stateName}/${token.stateType.toLowerCase()}`
      : undefined,
    token.workId ? `work-id=${token.workId}` : undefined,
    token.traceId ? `trace=${token.traceId}` : undefined,
  ].filter((field): field is string => Boolean(field));

  return fields.join(" ");
}

function formatRowEvidence(row: MergedPrDrainRowEvidence): string[] {
  const lines = [
    `- work-item=${row.definition.workItemName} pr=#${row.definition.pullRequestNumber} branch=${row.branchName}`,
    `  pull-request-truth state=${row.pullRequestTruth.state ?? "unavailable"} merged-at=${row.pullRequestTruth.mergedAt ?? "unknown"} merge-commit=${row.pullRequestTruth.mergeCommitSha ?? "unknown"} merge-in-origin-main-lineage=${row.pullRequestTruth.mergePresentInOriginMainLineage}`,
    `  content-lane-queue-tokens count=${row.contentLaneTokens.filter((token) => token.availability === "present").length}`,
  ];

  for (const token of row.contentLaneTokens) {
    lines.push(`    - ${formatQueueToken(token)}`);
  }

  lines.push(
    `  drain-row-queue-tokens count=${row.drainRowTokens.filter((token) => token.availability === "present").length}`,
  );
  for (const token of row.drainRowTokens) {
    lines.push(`    - ${formatQueueToken(token)}`);
  }

  lines.push(
    `  worktree-metadata availability=${row.worktreeMetadata.availability}${
      row.worktreeMetadata.worktreePath
        ? ` path=${row.worktreeMetadata.worktreePath}`
        : ""
    }${
      row.worktreeMetadata.unavailableReason
        ? ` reason=${row.worktreeMetadata.unavailableReason}`
        : ""
    }`,
  );
  if (row.worktreeMetadata.availability === "present") {
    lines.push(
      `    stamped-pr=#${row.worktreeMetadata.pullRequestNumber ?? "unknown"} branch-linkage=${row.worktreeMetadata.branchLinkageStatus ?? "unknown"} pr-linkage=${row.worktreeMetadata.pullRequestLinkageStatus ?? "unknown"} head=${row.worktreeMetadata.branchHeadSha ?? "unknown"}`,
    );
  }

  lines.push(`  merged-vs-queue-truth ${row.mergedVsQueueTruth.distinctionNote}`);

  return lines;
}

export function formatMergedPrDrainRowsEvidenceReport(
  report: MergedPrDrainRowsEvidenceReport,
): string {
  const lines = [
    MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER,
    `generated-at=${report.generatedAtUtc} session=${report.sourceSession}`,
    `origin-main-sha=${report.rootCheckout.originMainSha ?? "unavailable"} remote-base-ref=${report.rootCheckout.remoteBaseRef} root-dirty-paths=${report.rootCheckout.rootCheckoutDirtyPathCount} root-repo=${report.rootCheckout.rootRepoPath}`,
    "",
    "Rows",
  ];

  for (const row of report.rows) {
    lines.push(...formatRowEvidence(row));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeMergedPrDrainRowsEvidenceReport(
  report: MergedPrDrainRowsEvidenceReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
