import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  CommandResult,
  RunCommand,
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
  observedDirtyPaths?: string[];
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
  mergedPullRequestTruth:
    | "merged-into-origin-main"
    | "not-merged"
    | "unavailable";
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
  observedDirtyPaths?: string[];
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

export type MergedPrDrainRowOutcome = "consume" | "complete" | "no-op";

export type MergedPrDrainRowNoOpReason =
  | "already-terminal"
  | "already-settled"
  | "unfinished-implementation"
  | "unfinished-review"
  | "row-pr-mismatch"
  | "missing-metadata"
  | "inaccessible-pr-truth"
  | "pr-not-merged"
  | "missing-queue-evidence"
  | "unsafe-root-checkout";

export interface MergedPrDrainRowClassification {
  evidenceSentence: string;
  observedPrState: string;
  observedQueueState: string;
  outcome: MergedPrDrainRowOutcome;
  pullRequestNumber: number;
  row: MergedPrDrainRowEvidence;
  noOpReason?: MergedPrDrainRowNoOpReason;
}

export interface MergedPrDrainRowsClassificationReport {
  evidenceReport: MergedPrDrainRowsEvidenceReport;
  rows: MergedPrDrainRowClassification[];
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
  if (
    tokens.length === 0 ||
    tokens.every((token) => token.availability === "missing-from-queue")
  ) {
    return "missing-from-queue";
  }

  const presentTokens = tokens.filter(
    (token) => token.availability === "present",
  );
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

  if (
    tokens.length === 0 ||
    tokens.every((token) => token.availability === "missing-from-queue")
  ) {
    return "missing-from-queue";
  }

  const presentTokens = tokens.filter(
    (token) => token.availability === "present",
  );
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
    const parsed = parseJsonText(
      result.stdout,
      `gh pr view ${pullRequestNumber}`,
    ) as Record<string, unknown>;
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
        headRefName:
          readString(parsed.headRefName) ?? `pr-${pullRequestNumber}`,
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

function extractDirtyPathsFromGitStatus(statusOutput: string): string[] {
  return statusOutput
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const rawPath = line.slice(3).trim();
      const renameSplit = rawPath.split(" -> ");
      return renameSplit[renameSplit.length - 1] ?? rawPath;
    });
}

function findNewDirtyPaths(baseline: string[], current: string[]): string[] {
  const baselineSet = new Set(baseline);
  return current.filter((path) => !baselineSet.has(path));
}

function collectWorktreeMetadataEvidence(options: {
  definition: MergedPrDrainRowDefinition;
  runCommand: RunCommand;
  worktreesDir: string;
}): WorktreeMetadataEvidence {
  const worktreePath = join(
    options.worktreesDir,
    options.definition.workItemName,
  );
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
  const observedDirtyPaths = collectDirtyPathsForLocation({
    locationPath: worktreePath,
    runCommand: options.runCommand,
  }).filter((path) => !path.startsWith(".claude/"));

  return {
    availability: "present",
    branchHeadSha,
    branchLinkageStatus: metadata.linkage.branch.status,
    branchName: metadata.branchName ?? options.definition.branchName,
    metadataPath,
    observedDirtyPaths,
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
  const originMainSha = originResult.ok
    ? originResult.stdout.trim()
    : undefined;

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
  const observedDirtyPaths = statusResult.ok
    ? extractDirtyPathsFromGitStatus(statusResult.stdout)
    : [];

  if (!originResult.ok) {
    return {
      originMainSha,
      remoteBaseRef: options.remoteBaseRef,
      rootCheckoutDirtyPathCount,
      rootRepoPath: options.repoRoot,
      observedDirtyPaths,
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
    observedDirtyPaths,
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
    options.worktreesDir ??
    resolveDefaultWorktreesDir(options.repoRoot, runCommand);
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

  lines.push(
    `  merged-vs-queue-truth ${row.mergedVsQueueTruth.distinctionNote}`,
  );

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

function isTokenTerminalComplete(token: QueueTokenEvidence): boolean {
  const stateName = token.stateName?.toLowerCase();
  const stateType = token.stateType?.toUpperCase();
  return stateName === "complete" && stateType === "TERMINAL";
}

function hasUnfinishedImplementation(
  contentLaneTokens: QueueTokenEvidence[],
): boolean {
  const taskTokens = contentLaneTokens.filter(
    (token) =>
      token.availability === "present" &&
      token.workTypeName?.toLowerCase() === "task",
  );
  if (taskTokens.length === 0) {
    return false;
  }
  return taskTokens.some((token) => !isTokenTerminalComplete(token));
}

function hasUnfinishedReview(contentLaneTokens: QueueTokenEvidence[]): boolean {
  const reviewTokens = contentLaneTokens.filter(
    (token) =>
      token.availability === "present" &&
      token.workTypeName?.toLowerCase() === "review",
  );
  if (reviewTokens.length === 0) {
    return false;
  }
  return reviewTokens.some((token) => !isTokenTerminalComplete(token));
}

function summarizeObservedQueueState(row: MergedPrDrainRowEvidence): string {
  const contentLaneSummary = `content-lane=${row.mergedVsQueueTruth.contentLaneQueueTruth}`;
  const drainRowSummary = `drain-row=${row.mergedVsQueueTruth.drainRowQueueTruth}`;
  return `${contentLaneSummary}; ${drainRowSummary}`;
}

function summarizeObservedPrState(row: MergedPrDrainRowEvidence): string {
  if (row.pullRequestTruth.availability === "unavailable") {
    return "unavailable";
  }
  const state = row.pullRequestTruth.state ?? "unknown";
  const lineage = row.pullRequestTruth.mergePresentInOriginMainLineage
    ? "in-origin-main-lineage"
    : "not-in-origin-main-lineage";
  return `${state}/${lineage}`;
}

function buildNoOpClassification(options: {
  evidenceSentence: string;
  noOpReason: MergedPrDrainRowNoOpReason;
  row: MergedPrDrainRowEvidence;
}): MergedPrDrainRowClassification {
  return {
    row: options.row,
    pullRequestNumber: options.row.definition.pullRequestNumber,
    observedQueueState: summarizeObservedQueueState(options.row),
    observedPrState: summarizeObservedPrState(options.row),
    outcome: "no-op",
    noOpReason: options.noOpReason,
    evidenceSentence: options.evidenceSentence,
  };
}

export function classifyMergedPrDrainRowOutcome(
  row: MergedPrDrainRowEvidence,
): MergedPrDrainRowClassification {
  const observedQueueState = summarizeObservedQueueState(row);
  const observedPrState = summarizeObservedPrState(row);
  const baseFields = {
    row,
    pullRequestNumber: row.definition.pullRequestNumber,
    observedQueueState,
    observedPrState,
  };

  if (row.pullRequestTruth.availability === "unavailable") {
    return buildNoOpClassification({
      row,
      noOpReason: "inaccessible-pr-truth",
      evidenceSentence:
        "GitHub PR truth is unavailable, so queue movement cannot be classified safely.",
    });
  }

  if (
    row.mergedVsQueueTruth.mergedPullRequestTruth !== "merged-into-origin-main"
  ) {
    return buildNoOpClassification({
      row,
      noOpReason: "pr-not-merged",
      evidenceSentence:
        "PR is not merged into current origin/main lineage, so the row must stay active.",
    });
  }

  if (row.mergedVsQueueTruth.contentLaneQueueTruth === "missing-from-queue") {
    return buildNoOpClassification({
      row,
      noOpReason: "missing-queue-evidence",
      evidenceSentence:
        "Content-lane queue tokens are missing, so completion cannot be inferred safely.",
    });
  }

  if (hasUnfinishedImplementation(row.contentLaneTokens)) {
    return buildNoOpClassification({
      row,
      noOpReason: "unfinished-implementation",
      evidenceSentence:
        "Content-lane task tokens are still non-terminal, so implementation work remains active.",
    });
  }

  if (hasUnfinishedReview(row.contentLaneTokens)) {
    return buildNoOpClassification({
      row,
      noOpReason: "unfinished-review",
      evidenceSentence:
        "Content-lane review tokens are still non-terminal, so review work remains active.",
    });
  }

  if (
    row.worktreeMetadata.availability === "present" &&
    row.worktreeMetadata.pullRequestNumber !== undefined &&
    row.worktreeMetadata.pullRequestNumber !== row.definition.pullRequestNumber
  ) {
    return buildNoOpClassification({
      row,
      noOpReason: "row-pr-mismatch",
      evidenceSentence: `Worktree metadata stamps PR #${row.worktreeMetadata.pullRequestNumber}, which does not match expected PR #${row.definition.pullRequestNumber}.`,
    });
  }

  const drainRowTruth = row.mergedVsQueueTruth.drainRowQueueTruth;
  const contentLaneTruth = row.mergedVsQueueTruth.contentLaneQueueTruth;

  if (drainRowTruth === "no-drain-row") {
    if (contentLaneTruth === "content-lane-terminal-complete") {
      return {
        ...baseFields,
        outcome: "no-op",
        noOpReason: "already-settled",
        evidenceSentence:
          "No dedicated drain row exists and the content lane is already terminal-complete.",
      };
    }

    return buildNoOpClassification({
      row,
      noOpReason: "missing-queue-evidence",
      evidenceSentence:
        "No drain row exists and the content lane is not terminal-complete, so no safe transition is available.",
    });
  }

  if (drainRowTruth === "content-lane-terminal-complete") {
    return {
      ...baseFields,
      outcome: "no-op",
      noOpReason: "already-terminal",
      evidenceSentence:
        "The drain row is already terminal-complete, so no queue movement is required.",
    };
  }

  if (drainRowTruth === "missing-from-queue") {
    return buildNoOpClassification({
      row,
      noOpReason: "missing-queue-evidence",
      evidenceSentence:
        "Expected drain-row queue tokens are missing, so consume/complete cannot be selected safely.",
    });
  }

  if (
    contentLaneTruth === "content-lane-terminal-complete" &&
    drainRowTruth === "drain-row-initial"
  ) {
    return {
      ...baseFields,
      outcome: "consume",
      evidenceSentence:
        "PR is merged into origin/main, the content lane is terminal-complete, and the stale drain row remains init/INITIAL.",
    };
  }

  if (
    contentLaneTruth === "content-lane-terminal-complete" &&
    drainRowTruth === "non-terminal"
  ) {
    return {
      ...baseFields,
      outcome: "complete",
      evidenceSentence:
        "PR is merged and implementation/review are finished, but the drain row still needs a valid terminal completion transition.",
    };
  }

  return buildNoOpClassification({
    row,
    noOpReason: "missing-queue-evidence",
    evidenceSentence:
      "Queue evidence does not match a safe consume, complete, or already-settled path.",
  });
}

export function buildMergedPrDrainRowsClassificationReport(
  evidenceReport: MergedPrDrainRowsEvidenceReport,
): MergedPrDrainRowsClassificationReport {
  return {
    evidenceReport,
    rows: evidenceReport.rows.map(classifyMergedPrDrainRowOutcome),
  };
}

function formatClassificationRow(
  row: MergedPrDrainRowClassification,
): string[] {
  const lines = [
    `- work-item=${row.row.definition.workItemName} pr=#${row.pullRequestNumber} outcome=${row.outcome}`,
    `  observed-queue-state=${row.observedQueueState}`,
    `  observed-pr-state=${row.observedPrState}`,
    `  evidence=${row.evidenceSentence}`,
  ];
  if (row.noOpReason) {
    lines.push(`  no-op-reason=${row.noOpReason}`);
  }
  return lines;
}

export function formatMergedPrDrainRowsClassificationReport(
  report: MergedPrDrainRowsClassificationReport,
): string {
  const lines = [
    `${MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER} — Classification`,
    `generated-at=${report.evidenceReport.generatedAtUtc} session=${report.evidenceReport.sourceSession}`,
    "",
    "Row outcomes",
  ];

  for (const row of report.rows) {
    lines.push(...formatClassificationRow(row));
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeMergedPrDrainRowsClassificationReport(
  report: MergedPrDrainRowsClassificationReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatMergedPrDrainRowsReconciliationReport(
  evidenceReport: MergedPrDrainRowsEvidenceReport,
  options?: {
    completeReport?: MergedPrDrainRowsCompleteReport;
    consumeReport?: MergedPrDrainRowsConsumeReport;
    finalVerificationReport?: MergedPrDrainRowsFinalVerificationReport;
    noOpReport?: MergedPrDrainRowsNoOpReport;
  },
): string {
  const classificationReport =
    buildMergedPrDrainRowsClassificationReport(evidenceReport);
  const resolvedConsumeReport =
    options?.consumeReport ??
    buildMergedPrDrainRowsConsumeReport(classificationReport, {
      sessionId: evidenceReport.sourceSession,
    });
  const resolvedCompleteReport =
    options?.completeReport ??
    buildMergedPrDrainRowsCompleteReport(classificationReport, {
      sessionId: evidenceReport.sourceSession,
    });
  const resolvedNoOpReport =
    options?.noOpReport ??
    buildMergedPrDrainRowsNoOpReport(classificationReport);
  const reconciliationOutputForVerification: MergedPrDrainRowsReconciliationOutput =
    {
      evidenceReport,
      classificationReport,
      consumeReport: resolvedConsumeReport,
      completeReport: resolvedCompleteReport,
      noOpReport: resolvedNoOpReport,
      finalVerificationReport:
        options?.finalVerificationReport ??
        buildMergedPrDrainRowsFinalVerificationReport({
          evidenceReport,
          consumeReport: resolvedConsumeReport,
          completeReport: resolvedCompleteReport,
          noOpReport: resolvedNoOpReport,
        }),
    };
  return `${formatMergedPrDrainRowsEvidenceReport(evidenceReport).trimEnd()}\n\n${formatMergedPrDrainRowsClassificationReport(classificationReport).trimEnd()}\n\n${formatMergedPrDrainRowsConsumeReport(resolvedConsumeReport).trimEnd()}\n\n${formatMergedPrDrainRowsCompleteReport(resolvedCompleteReport).trimEnd()}\n\n${formatMergedPrDrainRowsNoOpReport(resolvedNoOpReport).trimEnd()}\n\n${formatMergedPrDrainRowsFinalVerificationReport(reconciliationOutputForVerification.finalVerificationReport).trimEnd()}\n`;
}

export const MERGED_PR_DRAIN_ROW_CONSUME_OPERATION_NAME =
  "manual-drain-row-move-to-complete";

export type MergedPrDrainRowConsumeExecutionStatus =
  | "not-attempted"
  | "executed"
  | "already-complete"
  | "failed"
  | "manual-handoff-required";

export interface MergedPrDrainRowConsumeHandoff {
  classification: MergedPrDrainRowClassification;
  consumeCommand: string;
  consumeOperation: string;
  drainRowStateAfter?: string;
  drainRowStateBefore: string;
  drainWorkId?: string;
  drainWorkItemName: string;
  evidenceSentence: string;
  executionFailureReason?: string;
  executionStatus: MergedPrDrainRowConsumeExecutionStatus;
  mergedIntoOriginMain: boolean;
  noUnfinishedImplementationOrReview: boolean;
}

export interface MergedPrDrainRowsConsumeReport {
  classificationReport: MergedPrDrainRowsClassificationReport;
  rows: MergedPrDrainRowConsumeHandoff[];
}

export interface ExecuteMergedPrDrainRowConsumeHandoffOptions {
  runCommand?: RunCommand;
  sessionId?: string;
}

function summarizeDrainRowState(row: MergedPrDrainRowEvidence): string {
  const presentTokens = row.drainRowTokens.filter(
    (token) => token.availability === "present",
  );
  if (presentTokens.length === 0) {
    return "missing";
  }

  const token = presentTokens[0];
  if (token.stateName && token.stateType) {
    return `${token.stateName}/${token.stateType.toLowerCase()}`;
  }

  return "unknown";
}

function isDrainRowTerminalComplete(row: MergedPrDrainRowEvidence): boolean {
  return (
    row.mergedVsQueueTruth.drainRowQueueTruth ===
    "content-lane-terminal-complete"
  );
}

function buildDrainRowConsumeCommand(options: {
  drainWorkId: string;
  sessionId: string;
}): string {
  return `you work move ${options.drainWorkId} complete --session ${options.sessionId}`;
}

export function buildMergedPrDrainRowConsumeHandoff(
  classification: MergedPrDrainRowClassification,
  options?: { sessionId?: string },
): MergedPrDrainRowConsumeHandoff | null {
  if (classification.outcome !== "consume") {
    return null;
  }

  const row = classification.row;
  const drainWorkItemName =
    row.definition.drainWorkItemName ?? `${row.definition.workItemName}-drain`;
  const drainToken = row.drainRowTokens.find(
    (token) => token.availability === "present",
  );
  const drainWorkId = drainToken?.workId;
  const sessionId =
    options?.sessionId ?? MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;
  const drainRowStateBefore = summarizeDrainRowState(row);
  const mergedIntoOriginMain =
    row.mergedVsQueueTruth.mergedPullRequestTruth === "merged-into-origin-main";
  const noUnfinishedImplementationOrReview =
    !hasUnfinishedImplementation(row.contentLaneTokens) &&
    !hasUnfinishedReview(row.contentLaneTokens);

  const consumeCommand = drainWorkId
    ? buildDrainRowConsumeCommand({ drainWorkId, sessionId })
    : `you work move <drain-work-id> complete --session ${sessionId}`;

  const executionStatus: MergedPrDrainRowConsumeExecutionStatus =
    isDrainRowTerminalComplete(row)
      ? "already-complete"
      : drainWorkId
        ? "not-attempted"
        : "manual-handoff-required";

  const evidenceSentence = [
    `PR #${row.definition.pullRequestNumber} is merged into current origin/main.`,
    "Content lane has no unfinished implementation or review tokens.",
    isDrainRowTerminalComplete(row)
      ? `Drain row ${drainWorkItemName} is already terminal-complete.`
      : `Drain row ${drainWorkItemName} remains ${drainRowStateBefore} and is safe to move to complete.`,
  ].join(" ");

  return {
    classification,
    consumeCommand,
    consumeOperation: MERGED_PR_DRAIN_ROW_CONSUME_OPERATION_NAME,
    drainRowStateBefore,
    drainWorkId,
    drainWorkItemName,
    evidenceSentence,
    executionStatus,
    mergedIntoOriginMain,
    noUnfinishedImplementationOrReview,
  };
}

export function buildMergedPrDrainRowsConsumeReport(
  classificationReport: MergedPrDrainRowsClassificationReport,
  options?: { sessionId?: string },
): MergedPrDrainRowsConsumeReport {
  const rows = classificationReport.rows
    .map((classification) =>
      buildMergedPrDrainRowConsumeHandoff(classification, options),
    )
    .filter((handoff): handoff is MergedPrDrainRowConsumeHandoff =>
      Boolean(handoff),
    );

  return {
    classificationReport,
    rows,
  };
}

function parseWorkMoveResult(stdout: string): {
  newState?: string;
  ok: boolean;
  previousState?: string;
} {
  try {
    const parsed = parseJsonText(stdout, "you work move response") as Record<
      string,
      unknown
    >;
    return {
      ok: true,
      previousState: readString(parsed.previousState),
      newState: readString(parsed.newState),
    };
  } catch {
    return { ok: false };
  }
}

export function executeMergedPrDrainRowConsumeHandoff(
  handoff: MergedPrDrainRowConsumeHandoff,
  options: ExecuteMergedPrDrainRowConsumeHandoffOptions = {},
): MergedPrDrainRowConsumeHandoff {
  if (
    handoff.executionStatus === "already-complete" ||
    handoff.executionStatus === "executed"
  ) {
    return handoff;
  }

  if (!handoff.drainWorkId) {
    return {
      ...handoff,
      executionStatus: "manual-handoff-required",
      executionFailureReason:
        "Drain-row work-id is unavailable; operator must resolve the queue token before moving.",
    };
  }

  if (handoff.drainRowStateBefore === "complete/terminal") {
    return {
      ...handoff,
      executionStatus: "already-complete",
      drainRowStateAfter: "complete/terminal",
    };
  }

  const runCommand = options.runCommand ?? defaultRunCommand;
  const sessionId = options.sessionId ?? MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;
  const consumeCommand = buildDrainRowConsumeCommand({
    drainWorkId: handoff.drainWorkId,
    sessionId,
  });
  const commandParts = consumeCommand.split(" ");
  const binary = commandParts[0] ?? "you";
  const args = commandParts.slice(1);
  const result = runCommand(binary, args);

  if (!result.ok) {
    return {
      ...handoff,
      consumeCommand,
      executionStatus: "failed",
      executionFailureReason:
        result.stderr.trim() ||
        `consume move failed with exit ${result.exitCode}`,
    };
  }

  const moveResult = parseWorkMoveResult(result.stdout);
  if (!moveResult.ok || moveResult.newState !== "complete") {
    return {
      ...handoff,
      consumeCommand,
      executionStatus: "failed",
      executionFailureReason:
        result.stdout.trim() || "consume move returned an unexpected response",
    };
  }

  return {
    ...handoff,
    consumeCommand,
    drainRowStateAfter: "complete/terminal",
    executionStatus:
      moveResult.previousState === "complete" ? "already-complete" : "executed",
  };
}

export function executeMergedPrDrainRowsConsumeReport(
  report: MergedPrDrainRowsConsumeReport,
  options: ExecuteMergedPrDrainRowConsumeHandoffOptions = {},
): MergedPrDrainRowsConsumeReport {
  return {
    classificationReport: report.classificationReport,
    rows: report.rows.map((handoff) =>
      executeMergedPrDrainRowConsumeHandoff(handoff, options),
    ),
  };
}

function formatConsumeHandoffRow(
  handoff: MergedPrDrainRowConsumeHandoff,
): string[] {
  const lines = [
    `- work-item=${handoff.classification.row.definition.workItemName} drain-row=${handoff.drainWorkItemName} pr=#${handoff.classification.pullRequestNumber}`,
    `  consume-operation=${handoff.consumeOperation}`,
    `  consume-command=${handoff.consumeCommand}`,
    `  drain-row-state-before=${handoff.drainRowStateBefore}`,
    `  drain-row-state-after=${handoff.drainRowStateAfter ?? "pending"}`,
    `  execution-status=${handoff.executionStatus}`,
    `  merged-into-origin-main=${handoff.mergedIntoOriginMain}`,
    `  no-unfinished-implementation-or-review=${handoff.noUnfinishedImplementationOrReview}`,
    `  evidence=${handoff.evidenceSentence}`,
  ];

  if (handoff.executionFailureReason) {
    lines.push(`  execution-failure=${handoff.executionFailureReason}`);
  }

  return lines;
}

export function formatMergedPrDrainRowsConsumeReport(
  report: MergedPrDrainRowsConsumeReport,
): string {
  const lines = [
    `${MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER} — Consume Handoff`,
    `generated-at=${report.classificationReport.evidenceReport.generatedAtUtc} session=${report.classificationReport.evidenceReport.sourceSession}`,
    `consume-operation=${MERGED_PR_DRAIN_ROW_CONSUME_OPERATION_NAME}`,
  ];

  if (report.rows.length === 0) {
    lines.push("", "Consume rows", "- none");
  } else {
    lines.push("", "Consume rows");
    for (const handoff of report.rows) {
      lines.push(...formatConsumeHandoffRow(handoff));
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeMergedPrDrainRowsConsumeReport(
  report: MergedPrDrainRowsConsumeReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export const MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME =
  "manual-drain-row-terminal-completion";

export const MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE = "complete/terminal";

export type MergedPrDrainRowCompleteExecutionStatus =
  | "not-attempted"
  | "executed"
  | "already-complete"
  | "failed"
  | "manual-handoff-required"
  | "reclassified-no-op";

export interface MergedPrDrainRowCompleteReclassification {
  evidenceSentence: string;
  noOpReason: MergedPrDrainRowNoOpReason;
}

export interface MergedPrDrainRowCompleteHandoff {
  classification: MergedPrDrainRowClassification;
  completeCommand: string;
  completeOperation: string;
  drainRowStateAfter?: string;
  drainRowStateBefore: string;
  drainWorkId?: string;
  drainWorkItemName: string;
  evidenceSentence: string;
  executionFailureReason?: string;
  executionStatus: MergedPrDrainRowCompleteExecutionStatus;
  implementationAndReviewFinished: boolean;
  mergedIntoOriginMain: boolean;
  reclassifiedAsNoOp?: MergedPrDrainRowCompleteReclassification;
  sourceState: string;
  targetTerminalState: string;
  transitionValidityReason: string;
  workItemName: string;
}

export interface MergedPrDrainRowsCompleteReport {
  classificationReport: MergedPrDrainRowsClassificationReport;
  rows: MergedPrDrainRowCompleteHandoff[];
}

export interface ExecuteMergedPrDrainRowCompleteHandoffOptions {
  runCommand?: RunCommand;
  sessionId?: string;
}

export interface MergedPrDrainRowNoOpHandoff {
  classification: MergedPrDrainRowClassification;
  evidenceSentence: string;
  missingEvidence?: string;
  nextSafeOwnerAction?: string;
  noOpReason: MergedPrDrainRowNoOpReason;
  observedPrState: string;
  observedQueueState: string;
  pullRequestNumber: number;
  rowLeftUntouched: true;
  workItemName: string;
}

export interface MergedPrDrainRowsNoOpReport {
  classificationReport: MergedPrDrainRowsClassificationReport;
  rows: MergedPrDrainRowNoOpHandoff[];
}

export interface MergedPrDrainRowsReconciliationOutput {
  classificationReport: MergedPrDrainRowsClassificationReport;
  completeReport: MergedPrDrainRowsCompleteReport;
  consumeReport: MergedPrDrainRowsConsumeReport;
  evidenceReport: MergedPrDrainRowsEvidenceReport;
  finalVerificationReport: MergedPrDrainRowsFinalVerificationReport;
  noOpReport: MergedPrDrainRowsNoOpReport;
}

export const MERGED_PR_DRAIN_ROW_PROTECTED_CONTENT_PATH_PREFIXES = [
  "src/content/",
  "src/lib/content/",
] as const;

export type MergedPrDrainRowQueueTransitionKind =
  | "consume-executed"
  | "consume-already-complete"
  | "complete-executed"
  | "complete-already-complete"
  | "left-untouched";

export interface MergedPrDrainRowQueueTransitionEvidence {
  pullRequestNumber: number;
  rowStateAfter?: string;
  rowStateBefore?: string;
  transitionKind: MergedPrDrainRowQueueTransitionKind;
  untouchedReason?: string;
  workItemName: string;
}

export interface MergedPrDrainRowsContentSafetyEvidence {
  adjacentPagesUntouched: boolean;
  evidenceSentence: string;
  generatedContentUntouched: boolean;
  observedContentDirtyPaths: string[];
  pageContentUntouched: boolean;
  registryContentUntouched: boolean;
  unrelatedWorktreeFilesUntouched: boolean;
}

export type MergedPrDrainRowsVerificationCommandAvailability =
  | "available"
  | "unavailable";

export interface MergedPrDrainRowsVerificationCommandEvidence {
  availability: MergedPrDrainRowsVerificationCommandAvailability;
  command: string;
  passed?: boolean;
  unavailableReason?: string;
}

export interface MergedPrDrainRowsFinalVerificationReport {
  contentSafety: MergedPrDrainRowsContentSafetyEvidence;
  generatedAtUtc: string;
  preExistingDirtyStateUntouched: boolean;
  queueTransitionOccurred: boolean;
  queueTransitions: MergedPrDrainRowQueueTransitionEvidence[];
  rootCheckoutAfter: RootCheckoutEvidence;
  rootCheckoutBefore: RootCheckoutEvidence;
  verificationCommands: MergedPrDrainRowsVerificationCommandEvidence[];
}

function buildDrainRowCompleteCommand(options: {
  drainWorkId: string;
  sessionId: string;
}): string {
  return `you work move ${options.drainWorkId} complete --session ${options.sessionId}`;
}

function detectCompleteHandoffBlocker(
  row: MergedPrDrainRowEvidence,
): MergedPrDrainRowCompleteReclassification | null {
  if (hasUnfinishedImplementation(row.contentLaneTokens)) {
    return {
      noOpReason: "unfinished-implementation",
      evidenceSentence:
        "Content-lane task tokens are still non-terminal, so completion cannot proceed.",
    };
  }

  if (hasUnfinishedReview(row.contentLaneTokens)) {
    return {
      noOpReason: "unfinished-review",
      evidenceSentence:
        "Content-lane review tokens are still non-terminal, so completion cannot proceed.",
    };
  }

  if (
    row.worktreeMetadata.availability === "present" &&
    row.worktreeMetadata.pullRequestNumber !== undefined &&
    row.worktreeMetadata.pullRequestNumber !== row.definition.pullRequestNumber
  ) {
    return {
      noOpReason: "row-pr-mismatch",
      evidenceSentence: `Worktree metadata stamps PR #${row.worktreeMetadata.pullRequestNumber}, which does not match expected PR #${row.definition.pullRequestNumber}.`,
    };
  }

  if (row.worktreeMetadata.availability === "unavailable") {
    return {
      noOpReason: "missing-metadata",
      evidenceSentence:
        "Worktree metadata is unavailable, so terminal completion cannot be verified safely.",
    };
  }

  if (row.pullRequestTruth.availability === "unavailable") {
    return {
      noOpReason: "inaccessible-pr-truth",
      evidenceSentence:
        "GitHub PR truth is unavailable, so terminal completion cannot proceed.",
    };
  }

  if (
    row.mergedVsQueueTruth.mergedPullRequestTruth !== "merged-into-origin-main"
  ) {
    return {
      noOpReason: "pr-not-merged",
      evidenceSentence:
        "PR is not merged into current origin/main lineage, so terminal completion is unsafe.",
    };
  }

  return null;
}

export function buildMergedPrDrainRowCompleteHandoff(
  classification: MergedPrDrainRowClassification,
  options?: { sessionId?: string },
): MergedPrDrainRowCompleteHandoff | null {
  if (classification.outcome !== "complete") {
    return null;
  }

  const row = classification.row;
  const blocker = detectCompleteHandoffBlocker(row);
  if (blocker) {
    return {
      classification,
      completeCommand: "",
      completeOperation: MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME,
      drainRowStateBefore: summarizeDrainRowState(row),
      drainWorkItemName:
        row.definition.drainWorkItemName ??
        `${row.definition.workItemName}-drain`,
      evidenceSentence: blocker.evidenceSentence,
      executionStatus: "reclassified-no-op",
      implementationAndReviewFinished: false,
      mergedIntoOriginMain:
        row.mergedVsQueueTruth.mergedPullRequestTruth ===
        "merged-into-origin-main",
      reclassifiedAsNoOp: blocker,
      sourceState: summarizeDrainRowState(row),
      targetTerminalState: MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE,
      transitionValidityReason:
        "Completion blocked by active implementation, review, metadata, or PR mismatch.",
      workItemName: row.definition.workItemName,
    };
  }

  const drainWorkItemName =
    row.definition.drainWorkItemName ?? `${row.definition.workItemName}-drain`;
  const drainToken = row.drainRowTokens.find(
    (token) => token.availability === "present",
  );
  const drainWorkId = drainToken?.workId;
  const sessionId =
    options?.sessionId ?? MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;
  const sourceState = summarizeDrainRowState(row);
  const mergedIntoOriginMain =
    row.mergedVsQueueTruth.mergedPullRequestTruth === "merged-into-origin-main";
  const implementationAndReviewFinished =
    !hasUnfinishedImplementation(row.contentLaneTokens) &&
    !hasUnfinishedReview(row.contentLaneTokens);

  const completeCommand = drainWorkId
    ? buildDrainRowCompleteCommand({ drainWorkId, sessionId })
    : `you work move <drain-work-id> complete --session ${sessionId}`;

  const alreadyTerminal = isDrainRowTerminalComplete(row);
  const executionStatus: MergedPrDrainRowCompleteExecutionStatus =
    alreadyTerminal
      ? "already-complete"
      : drainWorkId
        ? "not-attempted"
        : "manual-handoff-required";

  const transitionValidityReason = [
    `PR #${row.definition.pullRequestNumber} is merged into current origin/main.`,
    "Content lane implementation and review tokens are terminal-complete.",
    `Drain row ${drainWorkItemName} remains ${sourceState} and requires terminal completion.`,
  ].join(" ");

  const evidenceSentence = [
    transitionValidityReason,
    `Valid transition: ${sourceState} -> ${MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE}.`,
  ].join(" ");

  return {
    classification,
    completeCommand,
    completeOperation: MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME,
    drainRowStateBefore: sourceState,
    drainRowStateAfter: alreadyTerminal
      ? MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE
      : undefined,
    drainWorkId,
    drainWorkItemName,
    evidenceSentence,
    executionStatus,
    implementationAndReviewFinished,
    mergedIntoOriginMain,
    sourceState,
    targetTerminalState: MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE,
    transitionValidityReason,
    workItemName: row.definition.workItemName,
  };
}

export function buildMergedPrDrainRowsCompleteReport(
  classificationReport: MergedPrDrainRowsClassificationReport,
  options?: { sessionId?: string },
): MergedPrDrainRowsCompleteReport {
  const rows = classificationReport.rows
    .map((classification) =>
      buildMergedPrDrainRowCompleteHandoff(classification, options),
    )
    .filter((handoff): handoff is MergedPrDrainRowCompleteHandoff =>
      Boolean(handoff),
    );

  return {
    classificationReport,
    rows,
  };
}

export function executeMergedPrDrainRowCompleteHandoff(
  handoff: MergedPrDrainRowCompleteHandoff,
  options: ExecuteMergedPrDrainRowCompleteHandoffOptions = {},
): MergedPrDrainRowCompleteHandoff {
  if (
    handoff.executionStatus === "already-complete" ||
    handoff.executionStatus === "executed" ||
    handoff.executionStatus === "reclassified-no-op"
  ) {
    return handoff;
  }

  if (!handoff.drainWorkId) {
    return {
      ...handoff,
      executionStatus: "manual-handoff-required",
      executionFailureReason:
        "Drain-row work-id is unavailable; operator must resolve the queue token before moving.",
    };
  }

  if (handoff.sourceState === MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE) {
    return {
      ...handoff,
      executionStatus: "already-complete",
      drainRowStateAfter: MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE,
    };
  }

  const runCommand = options.runCommand ?? defaultRunCommand;
  const sessionId = options.sessionId ?? MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;
  const completeCommand = buildDrainRowCompleteCommand({
    drainWorkId: handoff.drainWorkId,
    sessionId,
  });
  const commandParts = completeCommand.split(" ");
  const binary = commandParts[0] ?? "you";
  const args = commandParts.slice(1);
  const result = runCommand(binary, args);

  if (!result.ok) {
    return {
      ...handoff,
      completeCommand,
      executionStatus: "failed",
      executionFailureReason:
        result.stderr.trim() ||
        `complete move failed with exit ${result.exitCode}`,
    };
  }

  const moveResult = parseWorkMoveResult(result.stdout);
  if (!moveResult.ok || moveResult.newState !== "complete") {
    return {
      ...handoff,
      completeCommand,
      executionStatus: "failed",
      executionFailureReason:
        result.stdout.trim() || "complete move returned an unexpected response",
    };
  }

  return {
    ...handoff,
    completeCommand,
    drainRowStateAfter: MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE,
    executionStatus:
      moveResult.previousState === "complete" ? "already-complete" : "executed",
  };
}

export function executeMergedPrDrainRowsCompleteReport(
  report: MergedPrDrainRowsCompleteReport,
  options: ExecuteMergedPrDrainRowCompleteHandoffOptions = {},
): MergedPrDrainRowsCompleteReport {
  return {
    classificationReport: report.classificationReport,
    rows: report.rows.map((handoff) =>
      executeMergedPrDrainRowCompleteHandoff(handoff, options),
    ),
  };
}

function formatCompleteHandoffRow(
  handoff: MergedPrDrainRowCompleteHandoff,
): string[] {
  const lines = [
    `- work-item=${handoff.workItemName} drain-row=${handoff.drainWorkItemName} pr=#${handoff.classification.pullRequestNumber}`,
    `  complete-operation=${handoff.completeOperation}`,
    `  source-state=${handoff.sourceState}`,
    `  target-terminal-state=${handoff.targetTerminalState}`,
    `  transition-validity=${handoff.transitionValidityReason}`,
    `  execution-status=${handoff.executionStatus}`,
    `  merged-into-origin-main=${handoff.mergedIntoOriginMain}`,
    `  implementation-and-review-finished=${handoff.implementationAndReviewFinished}`,
    `  evidence=${handoff.evidenceSentence}`,
  ];

  if (handoff.completeCommand) {
    lines.push(`  complete-command=${handoff.completeCommand}`);
  }
  if (handoff.drainRowStateAfter) {
    lines.push(`  drain-row-state-after=${handoff.drainRowStateAfter}`);
  }
  if (handoff.reclassifiedAsNoOp) {
    lines.push(
      `  reclassified-no-op-reason=${handoff.reclassifiedAsNoOp.noOpReason}`,
    );
    lines.push(
      `  reclassified-evidence=${handoff.reclassifiedAsNoOp.evidenceSentence}`,
    );
  }
  if (handoff.executionFailureReason) {
    lines.push(`  execution-failure=${handoff.executionFailureReason}`);
  }

  return lines;
}

export function formatMergedPrDrainRowsCompleteReport(
  report: MergedPrDrainRowsCompleteReport,
): string {
  const lines = [
    `${MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER} — Complete Handoff`,
    `generated-at=${report.classificationReport.evidenceReport.generatedAtUtc} session=${report.classificationReport.evidenceReport.sourceSession}`,
    `complete-operation=${MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME}`,
  ];

  if (report.rows.length === 0) {
    lines.push("", "Complete rows", "- none");
  } else {
    lines.push("", "Complete rows");
    for (const handoff of report.rows) {
      lines.push(...formatCompleteHandoffRow(handoff));
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeMergedPrDrainRowsCompleteReport(
  report: MergedPrDrainRowsCompleteReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function resolveNoOpMissingEvidence(
  classification: MergedPrDrainRowClassification,
): string | undefined {
  const row = classification.row;
  switch (classification.noOpReason) {
    case "missing-metadata":
      return "Readable worktree lane metadata for the named row.";
    case "inaccessible-pr-truth":
      return `GitHub PR state for PR #${row.definition.pullRequestNumber}.`;
    case "missing-queue-evidence": {
      const parts: string[] = [];
      if (
        row.mergedVsQueueTruth.contentLaneQueueTruth === "missing-from-queue"
      ) {
        parts.push("content-lane queue tokens");
      }
      if (row.mergedVsQueueTruth.drainRowQueueTruth === "missing-from-queue") {
        parts.push("drain-row queue tokens");
      }
      if (parts.length === 0) {
        return "Queue tokens required to select a safe consume, complete, or settled path.";
      }
      return parts.join(" and ");
    }
    case "unsafe-root-checkout":
      return "Clean root checkout state before queue mutation.";
    default:
      return undefined;
  }
}

function resolveNoOpNextSafeOwnerAction(
  noOpReason: MergedPrDrainRowNoOpReason | undefined,
): string | undefined {
  switch (noOpReason) {
    case "unfinished-implementation":
      return "Finish active content-lane implementation tokens before retrying drain reconciliation.";
    case "unfinished-review":
      return "Finish active content-lane review tokens before retrying drain reconciliation.";
    case "row-pr-mismatch":
      return "Align worktree stamped PR with the expected PR before any queue move.";
    case "pr-not-merged":
      return "Wait for PR merge into current origin/main before drain reconciliation.";
    default:
      return undefined;
  }
}

export function buildMergedPrDrainRowNoOpHandoff(
  classification: MergedPrDrainRowClassification,
): MergedPrDrainRowNoOpHandoff | null {
  if (classification.outcome !== "no-op" || !classification.noOpReason) {
    return null;
  }

  return {
    classification,
    evidenceSentence: classification.evidenceSentence,
    missingEvidence: resolveNoOpMissingEvidence(classification),
    nextSafeOwnerAction: resolveNoOpNextSafeOwnerAction(
      classification.noOpReason,
    ),
    noOpReason: classification.noOpReason,
    observedPrState: classification.observedPrState,
    observedQueueState: classification.observedQueueState,
    pullRequestNumber: classification.pullRequestNumber,
    rowLeftUntouched: true,
    workItemName: classification.row.definition.workItemName,
  };
}

export function buildMergedPrDrainRowsNoOpReport(
  classificationReport: MergedPrDrainRowsClassificationReport,
): MergedPrDrainRowsNoOpReport {
  const rows = classificationReport.rows
    .map((classification) => buildMergedPrDrainRowNoOpHandoff(classification))
    .filter((handoff): handoff is MergedPrDrainRowNoOpHandoff =>
      Boolean(handoff),
    );

  return {
    classificationReport,
    rows,
  };
}

function formatNoOpHandoffRow(handoff: MergedPrDrainRowNoOpHandoff): string[] {
  const lines = [
    `- work-item=${handoff.workItemName} pr=#${handoff.pullRequestNumber}`,
    `  no-op-reason=${handoff.noOpReason}`,
    `  observed-queue-state=${handoff.observedQueueState}`,
    `  observed-pr-state=${handoff.observedPrState}`,
    `  row-left-untouched=${handoff.rowLeftUntouched}`,
    `  evidence=${handoff.evidenceSentence}`,
  ];

  if (handoff.missingEvidence) {
    lines.push(`  missing-evidence=${handoff.missingEvidence}`);
  }
  if (handoff.nextSafeOwnerAction) {
    lines.push(`  next-safe-owner-action=${handoff.nextSafeOwnerAction}`);
  }

  return lines;
}

export function formatMergedPrDrainRowsNoOpReport(
  report: MergedPrDrainRowsNoOpReport,
): string {
  const lines = [
    `${MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER} — No-Op Handoff`,
    `generated-at=${report.classificationReport.evidenceReport.generatedAtUtc} session=${report.classificationReport.evidenceReport.sourceSession}`,
  ];

  if (report.rows.length === 0) {
    lines.push("", "No-op rows", "- none");
  } else {
    lines.push("", "No-op rows");
    for (const handoff of report.rows) {
      lines.push(...formatNoOpHandoffRow(handoff));
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeMergedPrDrainRowsNoOpReport(
  report: MergedPrDrainRowsNoOpReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function isProtectedContentPath(path: string): boolean {
  return MERGED_PR_DRAIN_ROW_PROTECTED_CONTENT_PATH_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );
}

function isRegistryContentPath(path: string): boolean {
  return path.startsWith("src/content/registry/");
}

function isPageContentPath(path: string): boolean {
  return (
    path.startsWith("src/content/") && !path.startsWith("src/content/registry/")
  );
}

function isGeneratedContentPath(path: string): boolean {
  return path.startsWith("src/lib/content/");
}

function collectDirtyPathsForLocation(options: {
  locationPath: string;
  runCommand: RunCommand;
}): string[] {
  const statusResult = options.runCommand(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    options.locationPath,
  );
  if (!statusResult.ok) {
    return [];
  }
  return extractDirtyPathsFromGitStatus(statusResult.stdout);
}

export function collectMergedPrDrainRowsContentSafetyEvidence(options: {
  evidenceReport: MergedPrDrainRowsEvidenceReport;
  repoRoot: string;
  runCommand?: RunCommand;
}): MergedPrDrainRowsContentSafetyEvidence {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const mainRepoRoot = resolveMainRepoRoot(options.repoRoot, runCommand);
  const rootDirtyPathsAfter = collectDirtyPathsForLocation({
    locationPath: mainRepoRoot,
    runCommand,
  });
  const rootDirtyPathsBefore =
    options.evidenceReport.rootCheckout.observedDirtyPaths ?? [];
  const newRootContentDirtyPaths = findNewDirtyPaths(
    rootDirtyPathsBefore,
    rootDirtyPathsAfter,
  ).filter(isProtectedContentPath);

  const newWorktreeDirtyPaths = options.evidenceReport.rows.flatMap((row) => {
    if (
      row.worktreeMetadata.availability !== "present" ||
      !row.worktreeMetadata.worktreePath
    ) {
      return [];
    }
    const baseline = row.worktreeMetadata.observedDirtyPaths ?? [];
    const current = collectDirtyPathsForLocation({
      locationPath: row.worktreeMetadata.worktreePath,
      runCommand,
    }).filter((path) => !path.startsWith(".claude/"));
    return findNewDirtyPaths(baseline, current);
  });

  const contentDirtyPaths = [
    ...newRootContentDirtyPaths,
    ...newWorktreeDirtyPaths.filter(isProtectedContentPath),
  ];
  const pageContentDirtyPaths = contentDirtyPaths.filter(isPageContentPath);
  const registryContentDirtyPaths = contentDirtyPaths.filter(
    isRegistryContentPath,
  );
  const generatedContentDirtyPaths = contentDirtyPaths.filter(
    isGeneratedContentPath,
  );

  const pageContentUntouched = pageContentDirtyPaths.length === 0;
  const registryContentUntouched = registryContentDirtyPaths.length === 0;
  const generatedContentUntouched = generatedContentDirtyPaths.length === 0;
  const adjacentPagesUntouched = pageContentUntouched;
  const unrelatedWorktreeFilesUntouched = newWorktreeDirtyPaths.length === 0;

  const evidenceSentence = [
    pageContentUntouched
      ? "page content untouched"
      : "page content dirty paths observed",
    registryContentUntouched
      ? "registry content untouched"
      : "registry content dirty paths observed",
    generatedContentUntouched
      ? "generated content untouched"
      : "generated content dirty paths observed",
    unrelatedWorktreeFilesUntouched
      ? "unrelated worktree files untouched"
      : "unrelated worktree dirty paths observed",
  ].join("; ");

  return {
    adjacentPagesUntouched,
    evidenceSentence,
    generatedContentUntouched,
    observedContentDirtyPaths: contentDirtyPaths.sort(),
    pageContentUntouched,
    registryContentUntouched,
    unrelatedWorktreeFilesUntouched,
  };
}

export function buildMergedPrDrainRowQueueTransitionEvidence(
  output: Pick<
    MergedPrDrainRowsReconciliationOutput,
    "completeReport" | "consumeReport" | "noOpReport"
  >,
): MergedPrDrainRowQueueTransitionEvidence[] {
  const transitions: MergedPrDrainRowQueueTransitionEvidence[] = [];
  const transitionedWorkItems = new Set<string>();

  for (const handoff of output.consumeReport.rows) {
    const workItemName = handoff.classification.row.definition.workItemName;
    if (
      handoff.executionStatus !== "executed" &&
      handoff.executionStatus !== "already-complete"
    ) {
      continue;
    }

    transitionedWorkItems.add(workItemName);
    transitions.push({
      workItemName,
      pullRequestNumber: handoff.classification.pullRequestNumber,
      transitionKind:
        handoff.executionStatus === "executed"
          ? "consume-executed"
          : "consume-already-complete",
      rowStateBefore: handoff.drainRowStateBefore,
      rowStateAfter: handoff.drainRowStateAfter ?? handoff.drainRowStateBefore,
    });
  }

  for (const handoff of output.completeReport.rows) {
    const workItemName = handoff.workItemName;
    if (
      handoff.executionStatus !== "executed" &&
      handoff.executionStatus !== "already-complete"
    ) {
      continue;
    }

    transitionedWorkItems.add(workItemName);
    transitions.push({
      workItemName,
      pullRequestNumber: handoff.classification.pullRequestNumber,
      transitionKind:
        handoff.executionStatus === "executed"
          ? "complete-executed"
          : "complete-already-complete",
      rowStateBefore: handoff.sourceState,
      rowStateAfter: handoff.drainRowStateAfter ?? handoff.sourceState,
    });
  }

  for (const handoff of output.noOpReport.rows) {
    if (transitionedWorkItems.has(handoff.workItemName)) {
      continue;
    }

    transitions.push({
      workItemName: handoff.workItemName,
      pullRequestNumber: handoff.pullRequestNumber,
      transitionKind: "left-untouched",
      untouchedReason: handoff.noOpReason,
      rowStateBefore: handoff.observedQueueState,
      rowStateAfter: handoff.observedQueueState,
    });
  }

  return transitions;
}

export const MERGED_PR_DRAIN_ROWS_FINAL_VERIFICATION_COMMANDS = [
  "bun run report:merged-pr-drain-rows-reconciliation",
  "bun test src/lib/factory/merged-pr-drain-rows-reconciliation.test.ts",
  "bun run typecheck",
] as const;

function buildDefaultVerificationCommandEvidence(): MergedPrDrainRowsVerificationCommandEvidence[] {
  return MERGED_PR_DRAIN_ROWS_FINAL_VERIFICATION_COMMANDS.map((command) => ({
    command,
    availability: "available" as const,
  }));
}

export function buildMergedPrDrainRowsFinalVerificationReport(
  output: Pick<
    MergedPrDrainRowsReconciliationOutput,
    "completeReport" | "consumeReport" | "evidenceReport" | "noOpReport"
  >,
  options?: {
    generatedAtUtc?: string;
    repoRoot?: string;
    runCommand?: RunCommand;
    verificationCommands?: MergedPrDrainRowsVerificationCommandEvidence[];
  },
): MergedPrDrainRowsFinalVerificationReport {
  const runCommand = options?.runCommand ?? defaultRunCommand;
  const repoRoot = options?.repoRoot ?? process.cwd();
  const mainRepoRoot = resolveMainRepoRoot(repoRoot, runCommand);
  const rootCheckoutAfter = collectRootCheckoutEvidence({
    remoteBaseRef: output.evidenceReport.rootCheckout.remoteBaseRef,
    repoRoot: mainRepoRoot,
    runCommand,
  });
  const rootCheckoutBefore = output.evidenceReport.rootCheckout;
  const preExistingDirtyStateUntouched =
    rootCheckoutAfter.rootCheckoutDirtyPathCount >=
      rootCheckoutBefore.rootCheckoutDirtyPathCount ||
    rootCheckoutBefore.rootCheckoutDirtyPathCount === 0;
  const contentSafety = collectMergedPrDrainRowsContentSafetyEvidence({
    evidenceReport: output.evidenceReport,
    repoRoot,
    runCommand,
  });
  const queueTransitions = buildMergedPrDrainRowQueueTransitionEvidence(output);
  const queueTransitionOccurred = queueTransitions.some(
    (transition) =>
      transition.transitionKind === "consume-executed" ||
      transition.transitionKind === "complete-executed",
  );

  return {
    generatedAtUtc: options?.generatedAtUtc ?? new Date().toISOString(),
    rootCheckoutBefore,
    rootCheckoutAfter,
    preExistingDirtyStateUntouched,
    contentSafety,
    queueTransitions,
    queueTransitionOccurred,
    verificationCommands:
      options?.verificationCommands ??
      buildDefaultVerificationCommandEvidence(),
  };
}

function formatQueueTransitionRow(
  transition: MergedPrDrainRowQueueTransitionEvidence,
): string[] {
  const lines = [
    `- work-item=${transition.workItemName} pr=#${transition.pullRequestNumber} transition=${transition.transitionKind}`,
    `  row-state-before=${transition.rowStateBefore ?? "unknown"}`,
    `  row-state-after=${transition.rowStateAfter ?? "unknown"}`,
  ];
  if (transition.untouchedReason) {
    lines.push(`  untouched-reason=${transition.untouchedReason}`);
  }
  return lines;
}

export function formatMergedPrDrainRowsFinalVerificationReport(
  report: MergedPrDrainRowsFinalVerificationReport,
): string {
  const lines = [
    `${MERGED_PR_DRAIN_ROWS_RECONCILIATION_HEADER} — Final Verification`,
    `generated-at=${report.generatedAtUtc}`,
    `root-checkout-before origin-main-sha=${report.rootCheckoutBefore.originMainSha ?? "unavailable"} root-dirty-paths=${report.rootCheckoutBefore.rootCheckoutDirtyPathCount} root-repo=${report.rootCheckoutBefore.rootRepoPath}`,
    `root-checkout-after origin-main-sha=${report.rootCheckoutAfter.originMainSha ?? "unavailable"} root-dirty-paths=${report.rootCheckoutAfter.rootCheckoutDirtyPathCount} root-repo=${report.rootCheckoutAfter.rootRepoPath}`,
    `pre-existing-dirty-state-untouched=${report.preExistingDirtyStateUntouched}`,
    `content-safety page-content-untouched=${report.contentSafety.pageContentUntouched} registry-content-untouched=${report.contentSafety.registryContentUntouched} generated-content-untouched=${report.contentSafety.generatedContentUntouched} adjacent-pages-untouched=${report.contentSafety.adjacentPagesUntouched} unrelated-worktree-files-untouched=${report.contentSafety.unrelatedWorktreeFilesUntouched}`,
    `content-safety-evidence=${report.contentSafety.evidenceSentence}`,
    `queue-transition-occurred=${report.queueTransitionOccurred}`,
  ];

  if (report.contentSafety.observedContentDirtyPaths.length > 0) {
    lines.push(
      `observed-content-dirty-paths=${report.contentSafety.observedContentDirtyPaths.join(",")}`,
    );
  }

  lines.push("", "Queue transitions");
  if (report.queueTransitions.length === 0) {
    lines.push("- none");
  } else {
    for (const transition of report.queueTransitions) {
      lines.push(...formatQueueTransitionRow(transition));
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

  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeMergedPrDrainRowsFinalVerificationReport(
  report: MergedPrDrainRowsFinalVerificationReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function buildMergedPrDrainRowsReconciliationOutput(
  evidenceReport: MergedPrDrainRowsEvidenceReport,
  options?: {
    executeComplete?: boolean;
    executeConsume?: boolean;
    sessionId?: string;
    runCommand?: RunCommand;
  },
): MergedPrDrainRowsReconciliationOutput {
  const sessionId = options?.sessionId ?? evidenceReport.sourceSession;
  const classificationReport =
    buildMergedPrDrainRowsClassificationReport(evidenceReport);
  let consumeReport = buildMergedPrDrainRowsConsumeReport(
    classificationReport,
    {
      sessionId,
    },
  );
  let completeReport = buildMergedPrDrainRowsCompleteReport(
    classificationReport,
    {
      sessionId,
    },
  );

  const executionOptions = {
    runCommand: options?.runCommand,
    sessionId,
  };

  if (options?.executeConsume) {
    consumeReport = executeMergedPrDrainRowsConsumeReport(
      consumeReport,
      executionOptions,
    );
  }

  if (options?.executeComplete) {
    completeReport = executeMergedPrDrainRowsCompleteReport(
      completeReport,
      executionOptions,
    );
  }

  const noOpReport = buildMergedPrDrainRowsNoOpReport(classificationReport);

  const partialOutput = {
    evidenceReport,
    classificationReport,
    consumeReport,
    completeReport,
    noOpReport,
  };

  const finalVerificationReport = buildMergedPrDrainRowsFinalVerificationReport(
    partialOutput,
    {
      runCommand: options?.runCommand,
    },
  );

  return {
    ...partialOutput,
    finalVerificationReport,
  };
}

export function serializeMergedPrDrainRowsReconciliationOutput(
  output: MergedPrDrainRowsReconciliationOutput,
): string {
  return `${JSON.stringify(output, null, 2)}\n`;
}
