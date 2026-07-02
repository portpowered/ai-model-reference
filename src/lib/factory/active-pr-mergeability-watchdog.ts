import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  readWorktreeLaneMetadata,
  refreshWorktreeLaneMetadata,
  type WorktreeLaneMetadataLinkageField,
  type WorktreeLaneMetadataPullRequest,
} from "@/lib/factory/worktree-lane-metadata";

export type QueueLaneState = "active" | "failed";
export type LaneDiscoveryStatus = "pr-backed" | "unclassified";
export type BranchDriftStatus =
  | "up-to-date"
  | "ahead"
  | "behind"
  | "diverged"
  | "unknown";
export type CheckHealthStatus =
  | "passing"
  | "pending"
  | "failing"
  | "unavailable";
export type MergeabilityClass =
  | "mergeable"
  | "conflicting"
  | "check-blocked"
  | "unknown";
export type QueueMismatchRisk =
  | "none"
  | "queue-stale"
  | "conflict-drift"
  | "checks-blocked"
  | "metadata-unavailable";
export type PlannerNextAction =
  | "wait"
  | "refresh-branch"
  | "repair-token"
  | "open-follow-up-throughput-prd";
export type PlannerLaneKind =
  | "stale-clean-pr-mismatch"
  | "merge-conflict"
  | "checks-blocked"
  | "metadata-unavailable"
  | "active-page-implementation"
  | "unclassified";
export type PullRequestLookupFailureKind =
  | "not-found"
  | "auth"
  | "api"
  | "unknown";

export interface QueueLaneRecord {
  workItemName: string;
  queueState: QueueLaneState;
  rawState: string;
  sessionId?: string;
  workTypeName?: string;
  hasDependsOnRelation: boolean;
}

export interface SessionLaneRecord {
  workItemName: string;
  sessionId?: string;
  rawState?: string;
}

export interface WorktreeLaneRecord {
  worktreeName: string;
  worktreePath: string;
  workItemName: string;
  workItemNameSource: "metadata" | "directory";
  branchName?: string;
  branchMetadataSource?: "metadata" | "git" | "prd";
  gitBranchName?: string;
  prdBranchName?: string;
  metadataStatus: "present" | "missing" | "incomplete" | "conflicting";
  metadataIssues: string[];
  metadataSessionId?: string | null;
  metadataPullRequest?: WorktreeLaneMetadataPullRequest | null;
  metadataBranchLinkage?: WorktreeLaneMetadataLinkageField;
  metadataPullRequestLinkage?: WorktreeLaneMetadataLinkageField;
}

export interface PullRequestRecord {
  number: number;
  headRefName?: string;
  baseRefName?: string;
  mergeStateStatus?: string;
  statusCheckRollup?: unknown[];
  url?: string;
  state?: string;
}

export interface PullRequestLookupResult {
  pullRequest: PullRequestRecord | null;
  failureKind?: PullRequestLookupFailureKind;
  failureReason?: string;
  resolvedBranchName?: string;
}

export interface BranchDriftRecord {
  status: BranchDriftStatus;
  commitsAheadOfMain?: number;
  commitsBehindMain?: number;
}

export interface LaneDiscoveryRecord {
  status: LaneDiscoveryStatus;
  workItemName: string;
  queueState: QueueLaneState;
  rawQueueState: string;
  workTypeName?: string;
  hasDependsOnRelation?: boolean;
  worktreePath?: string;
  branchName?: string;
  workItemNameSource?: "metadata" | "directory" | "queue";
  branchMetadataSource?: "metadata" | "git" | "prd";
  metadataStatus?: "present" | "missing" | "incomplete" | "conflicting";
  prNumber?: number;
  prUrl?: string;
  prLookupFailureKind?: PullRequestLookupFailureKind;
  prLookupFailureReason?: string;
  sessionId?: string;
  sessionIdSource?: "queue" | "session" | "metadata";
  sessionState?: string;
  driftStatus?: BranchDriftStatus;
  commitsAheadOfMain?: number;
  commitsBehindMain?: number;
  checkHealth?: CheckHealthStatus;
  mergeabilityClass?: MergeabilityClass;
  queueMismatchRisk?: QueueMismatchRisk;
  plannerLaneKind?: PlannerLaneKind;
  staleMismatchReason?: string;
  nextAction?: PlannerNextAction;
  metadataRefreshHints?: string[];
  reasons: string[];
}

export interface LaneDiscoveryReport {
  lanes: LaneDiscoveryRecord[];
  issues: string[];
}

export interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export type RunCommand = (
  binary: string,
  args: string[],
  cwd?: string,
) => CommandResult;

export interface WatchdogDataSources {
  workListJsonText: string;
  sessionListJsonText?: string;
  worktreesDir: string;
}

export interface DiscoverActivePrLanesOptions extends WatchdogDataSources {
  baseBranchName?: string;
  repoRoot?: string;
  refreshWorktreeMetadata?: boolean;
  runCommand?: RunCommand;
  lookupPullRequest?: (
    branchName: string,
    runCommand: RunCommand,
  ) => PullRequestLookupResult;
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

function readStringField(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function readNestedStringField(
  record: Record<string, unknown>,
  nestedKeys: string[],
  keys: string[],
): string {
  for (const nestedKey of nestedKeys) {
    const nestedValue = record[nestedKey];
    if (!isRecord(nestedValue)) {
      continue;
    }
    const value = readStringField(nestedValue, keys);
    if (value) {
      return value;
    }
  }
  return "";
}

function hasDependsOnRelation(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      (item) =>
        isRecord(item) &&
        readStringField(item, ["type"]).trim().toUpperCase() === "DEPENDS_ON",
    )
  );
}

function readQueueStateValues(record: Record<string, unknown>): string[] {
  const stateRecord = isRecord(record.state) ? record.state : undefined;
  const values = [
    readStringField(record, ["state", "status", "queueState", "phase"]),
    readStringField(stateRecord ?? {}, ["name", "status", "type"]),
    readNestedStringField(record, ["runtime", "workItem"], ["state", "status"]),
  ];
  return values.filter((value): value is string => value.length > 0);
}

function resolveQueueState(
  record: Record<string, unknown>,
): { rawState: string; queueState: QueueLaneState } | null {
  for (const rawState of readQueueStateValues(record)) {
    const queueState = normalizeQueueState(rawState);
    if (queueState) {
      return { rawState, queueState };
    }
  }
  return null;
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
    "items",
    "works",
    "workItems",
    "data",
    "results",
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

function normalizeQueueState(rawState: string): QueueLaneState | null {
  const value = rawState.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (value.includes("fail")) {
    return "failed";
  }
  if (
    value.includes("active") ||
    value.includes("running") ||
    value.includes("progress") ||
    value.includes("review") ||
    value.includes("started")
  ) {
    return "active";
  }
  return null;
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

export function parseQueueLaneRecords(jsonText: string): QueueLaneRecord[] {
  const parsed = parseJsonText(jsonText, "work list payload");
  const items = extractCandidateItemArray(parsed);
  const records: QueueLaneRecord[] = [];

  for (const item of items) {
    const workItemName =
      readStringField(item, ["name", "workItemName", "title", "id"]) ||
      readNestedStringField(item, ["workItem", "item"], ["name", "id"]);
    const state = resolveQueueState(item);
    if (!workItemName || !state) {
      continue;
    }
    const sessionId =
      readStringField(item, ["sessionId", "runtimeSessionId"]) ||
      readNestedStringField(
        item,
        ["runtime", "session"],
        ["id", "sessionId"],
      ) ||
      undefined;
    records.push({
      workItemName,
      queueState: state.queueState,
      rawState: state.rawState,
      sessionId,
      workTypeName:
        readStringField(item, ["workTypeName"]) ||
        readNestedStringField(item, ["workItem", "item"], ["workTypeName"]) ||
        undefined,
      hasDependsOnRelation: hasDependsOnRelation(item.relations),
    });
  }

  return records;
}

export function parseSessionLaneRecords(jsonText: string): SessionLaneRecord[] {
  const parsed = parseJsonText(jsonText, "session list payload");
  const items = extractCandidateItemArray(parsed);
  const records: SessionLaneRecord[] = [];

  for (const item of items) {
    const workItemName =
      readStringField(item, ["workItemName", "name", "title"]) ||
      readNestedStringField(item, ["workItem", "item"], ["name", "id"]);
    if (!workItemName) {
      continue;
    }
    const sessionId =
      readStringField(item, ["id", "sessionId"]) ||
      readNestedStringField(item, ["session"], ["id", "sessionId"]) ||
      undefined;
    const rawState =
      readQueueStateValues(item)[0] ||
      readNestedStringField(
        item,
        ["runtime", "session"],
        ["state", "status"],
      ) ||
      undefined;
    records.push({ workItemName, sessionId, rawState });
  }

  return records;
}

function tryReadPrdBranchName(worktreePath: string): string | undefined {
  const prdPath = join(worktreePath, "prd.json");
  if (!existsSync(prdPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(prdPath, "utf8")) as {
      branchName?: unknown;
    };
    return typeof parsed.branchName === "string" && parsed.branchName.trim()
      ? parsed.branchName.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function readGitBranchName(
  worktreePath: string,
  runCommand: RunCommand,
): string | undefined {
  const result = runCommand("git", ["branch", "--show-current"], worktreePath);
  if (!result.ok) {
    return undefined;
  }
  const branchName = result.stdout.trim();
  return branchName.length > 0 ? branchName : undefined;
}

export function discoverWorktreeLaneRecords(
  worktreesDir: string,
  runCommand: RunCommand = defaultRunCommand,
): WorktreeLaneRecord[] {
  if (!existsSync(worktreesDir)) {
    return [];
  }

  return readdirSync(worktreesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const worktreePath = join(worktreesDir, entry.name);
      const metadata = readWorktreeLaneMetadata(worktreePath);
      const prdBranchName = tryReadPrdBranchName(worktreePath);
      const gitBranchName = readGitBranchName(worktreePath, runCommand);
      const metadataIssues: string[] = [];
      const metadataWorkItemName = metadata?.workItemName?.trim() || undefined;
      const metadataBranchName = metadata?.branchName?.trim() || undefined;
      const metadataSessionId = metadata?.sessionId;

      if (!metadata) {
        metadataIssues.push(
          "stamped lane metadata missing; fell back to worktree heuristics",
        );
      } else {
        if (!metadataWorkItemName) {
          metadataIssues.push(
            "stamped lane metadata is incomplete: missing work item name",
          );
        }
        if (!metadataBranchName) {
          metadataIssues.push(
            "stamped lane metadata is incomplete: missing branch name",
          );
        }
        if (
          metadata.worktreePath?.trim() &&
          metadata.worktreePath !== worktreePath
        ) {
          metadataIssues.push(
            `stamped lane metadata points to ${metadata.worktreePath} but worktree is ${worktreePath}`,
          );
        }
        if (
          metadataWorkItemName &&
          metadataWorkItemName !== entry.name &&
          normalizeWorktreeName(metadataWorkItemName) !== entry.name
        ) {
          metadataIssues.push(
            `stamped work item ${metadataWorkItemName} does not match worktree directory ${entry.name}`,
          );
        }
      }

      if (
        metadataBranchName &&
        gitBranchName &&
        metadataBranchName !== gitBranchName
      ) {
        metadataIssues.push(
          `stamped branch ${metadataBranchName} disagrees with git branch ${gitBranchName}`,
        );
      }
      if (
        metadataBranchName &&
        prdBranchName &&
        metadataBranchName !== prdBranchName
      ) {
        metadataIssues.push(
          `stamped branch ${metadataBranchName} disagrees with prd branch ${prdBranchName}`,
        );
      }

      let metadataStatus: WorktreeLaneRecord["metadataStatus"];
      if (!metadata) {
        metadataStatus = "missing";
      } else if (
        metadataIssues.some(
          (issue) =>
            issue.startsWith("stamped branch ") ||
            issue.startsWith("stamped work item ") ||
            issue.startsWith("stamped lane metadata points to "),
        )
      ) {
        metadataStatus = "conflicting";
      } else if (!metadataWorkItemName || !metadataBranchName) {
        metadataStatus = "incomplete";
      } else {
        metadataStatus = "present";
      }

      const branchName = metadataBranchName ?? gitBranchName ?? prdBranchName;
      const branchMetadataSource = metadataBranchName
        ? "metadata"
        : gitBranchName
          ? "git"
          : prdBranchName
            ? "prd"
            : undefined;

      return {
        worktreeName: entry.name,
        worktreePath,
        workItemName: metadataWorkItemName ?? entry.name,
        workItemNameSource: metadataWorkItemName ? "metadata" : "directory",
        branchName,
        branchMetadataSource,
        gitBranchName,
        prdBranchName,
        metadataStatus,
        metadataIssues,
        metadataSessionId,
        metadataPullRequest: metadata?.pullRequest ?? null,
        metadataBranchLinkage: metadata?.linkage.branch,
        metadataPullRequestLinkage: metadata?.linkage.pullRequest,
      } satisfies WorktreeLaneRecord;
    });
}

function worktreeAliases(record: WorktreeLaneRecord): Set<string> {
  const aliases = new Set<string>();
  aliases.add(record.worktreeName);
  aliases.add(record.workItemName);
  aliases.add(normalizeWorktreeName(record.workItemName));
  if (record.branchName) {
    aliases.add(record.branchName);
    aliases.add(normalizeWorktreeName(record.branchName));
  }
  if (record.prdBranchName) {
    aliases.add(record.prdBranchName);
    aliases.add(normalizeWorktreeName(record.prdBranchName));
  }
  return aliases;
}

function normalizeWorktreeName(name: string): string {
  return name.replaceAll("/", "-");
}

function pushUniqueReason(reasons: string[], reason?: string): void {
  const normalizedReason = reason?.trim();
  if (!normalizedReason || reasons.includes(normalizedReason)) {
    return;
  }
  reasons.push(normalizedReason);
}

function relativeDisplayPath(path: string, repoRoot?: string): string {
  if (!repoRoot) {
    return path;
  }
  const relativePath = relative(repoRoot, path);
  return relativePath && !relativePath.startsWith("..") ? relativePath : path;
}

function toRefreshableBranchMetadataSource(
  source: WorktreeLaneRecord["branchMetadataSource"],
): "git" | "prd" | undefined {
  return source === "git" || source === "prd" ? source : undefined;
}

function hasCurrentStampedPullRequestEvidence(
  worktree: WorktreeLaneRecord,
): worktree is WorktreeLaneRecord & {
  metadataPullRequest: WorktreeLaneMetadataPullRequest;
} {
  return (
    typeof worktree.metadataPullRequest?.number === "number" &&
    worktree.metadataPullRequestLinkage?.status === "current"
  );
}

function pullRequestRecordFromMetadata(
  metadataPullRequest: WorktreeLaneMetadataPullRequest,
  branchName: string,
): PullRequestRecord {
  return {
    number: metadataPullRequest.number,
    url: metadataPullRequest.url,
    headRefName: branchName,
  };
}

function pushUniqueBranchCandidate(
  candidates: string[],
  branchName?: string,
): void {
  const normalized = branchName?.trim();
  if (!normalized || candidates.includes(normalized)) {
    return;
  }
  candidates.push(normalized);
}

export function collectWorktreeBranchCandidates(
  worktree: WorktreeLaneRecord,
): string[] {
  const candidates: string[] = [];
  pushUniqueBranchCandidate(candidates, worktree.branchName);
  pushUniqueBranchCandidate(candidates, worktree.gitBranchName);
  pushUniqueBranchCandidate(candidates, worktree.prdBranchName);
  return candidates;
}

function shouldStopBranchLookupFallback(
  failureKind?: PullRequestLookupFailureKind,
): boolean {
  return failureKind === "auth" || failureKind === "api";
}

export function resolvePullRequestEvidence(
  worktree: WorktreeLaneRecord,
  branchName: string,
  lookupPullRequest: (
    branchName: string,
    runCommand: RunCommand,
  ) => PullRequestLookupResult,
  runCommand: RunCommand,
): PullRequestLookupResult {
  const branchCandidates = collectWorktreeBranchCandidates(worktree);
  if (branchCandidates.length === 0) {
    pushUniqueBranchCandidate(branchCandidates, branchName);
  }

  let lastLookupResult: PullRequestLookupResult = {
    pullRequest: null,
    failureKind: "not-found",
    failureReason: `no open PR metadata found for branch ${branchName}`,
  };

  for (const candidateBranchName of branchCandidates) {
    const lookupResult = lookupPullRequest(candidateBranchName, runCommand);
    if (lookupResult.pullRequest) {
      return {
        ...lookupResult,
        resolvedBranchName: candidateBranchName,
      };
    }

    lastLookupResult = lookupResult;
    if (shouldStopBranchLookupFallback(lookupResult.failureKind)) {
      break;
    }
  }

  if (hasCurrentStampedPullRequestEvidence(worktree)) {
    const metadataBranchName = branchCandidates[0] ?? branchName;
    return {
      pullRequest: pullRequestRecordFromMetadata(
        worktree.metadataPullRequest,
        metadataBranchName,
      ),
      resolvedBranchName: metadataBranchName,
    };
  }

  return lastLookupResult;
}

function parseIntegerPair(stdout: string): [number, number] | null {
  const parts = stdout
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseInt(part, 10));
  if (
    parts.length !== 2 ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  ) {
    return null;
  }
  return [parts[0], parts[1]];
}

export function classifyBranchDrift(
  branchName: string,
  runCommand: RunCommand = defaultRunCommand,
  baseBranchName = "main",
  cwd?: string,
): BranchDriftRecord {
  const result = runCommand(
    "git",
    [
      "rev-list",
      "--left-right",
      "--count",
      `${baseBranchName}...${branchName}`,
    ],
    cwd,
  );
  if (!result.ok) {
    return { status: "unknown" };
  }

  const counts = parseIntegerPair(result.stdout);
  if (!counts) {
    return { status: "unknown" };
  }

  const [commitsBehindMain, commitsAheadOfMain] = counts;
  if (commitsBehindMain === 0 && commitsAheadOfMain === 0) {
    return { status: "up-to-date", commitsAheadOfMain, commitsBehindMain };
  }
  if (commitsBehindMain > 0 && commitsAheadOfMain > 0) {
    return { status: "diverged", commitsAheadOfMain, commitsBehindMain };
  }
  if (commitsBehindMain > 0) {
    return { status: "behind", commitsAheadOfMain, commitsBehindMain };
  }
  return { status: "ahead", commitsAheadOfMain, commitsBehindMain };
}

function normalizeCheckState(value: string): CheckHealthStatus | null {
  const state = value.trim().toLowerCase();
  if (!state) {
    return null;
  }
  if (
    state.includes("pending") ||
    state.includes("queued") ||
    state.includes("progress") ||
    state.includes("waiting") ||
    state.includes("requested")
  ) {
    return "pending";
  }
  if (
    state.includes("fail") ||
    state.includes("error") ||
    state.includes("cancel") ||
    state.includes("timed_out") ||
    state.includes("action_required")
  ) {
    return "failing";
  }
  if (
    state.includes("success") ||
    state.includes("neutral") ||
    state.includes("skip") ||
    state.includes("pass")
  ) {
    return "passing";
  }
  return null;
}

export function summarizeCheckHealth(
  statusCheckRollup: unknown[] | undefined,
): CheckHealthStatus {
  if (!statusCheckRollup) {
    return "unavailable";
  }
  if (statusCheckRollup.length === 0) {
    return "passing";
  }

  let sawPending = false;
  let sawPassing = false;
  for (const item of statusCheckRollup) {
    if (!isRecord(item)) {
      continue;
    }
    const normalized =
      normalizeCheckState(
        readStringField(item, ["conclusion", "state", "status"]),
      ) ??
      normalizeCheckState(
        readNestedStringField(
          item,
          ["commit", "checkRun"],
          ["conclusion", "state", "status"],
        ),
      );
    if (normalized === "failing") {
      return "failing";
    }
    if (normalized === "pending") {
      sawPending = true;
      continue;
    }
    if (normalized === "passing") {
      sawPassing = true;
    }
  }

  if (sawPending) {
    return "pending";
  }
  if (sawPassing) {
    return "passing";
  }
  return "unavailable";
}

export function classifyMergeability(
  mergeStateStatus: string | undefined,
  checkHealth: CheckHealthStatus,
): MergeabilityClass {
  const state = mergeStateStatus?.trim().toUpperCase() ?? "";
  if (state === "DIRTY") {
    return "conflicting";
  }
  if (checkHealth === "pending" || checkHealth === "failing") {
    return "check-blocked";
  }
  if (
    state === "CLEAN" ||
    state === "HAS_HOOKS" ||
    state === "UNSTABLE" ||
    state === "BEHIND"
  ) {
    return "mergeable";
  }
  if (state === "BLOCKED") {
    return checkHealth === "passing" ? "mergeable" : "check-blocked";
  }
  if (checkHealth === "passing") {
    return "mergeable";
  }
  return "unknown";
}

function summarizeLookupFailure(
  stderr: string,
): Pick<PullRequestLookupResult, "failureKind" | "failureReason"> {
  const normalized = stderr.trim().toLowerCase();
  if (!normalized) {
    return {
      failureKind: "unknown",
      failureReason: "GitHub CLI returned no PR metadata",
    };
  }
  if (
    normalized.includes("authentication") ||
    normalized.includes("auth") ||
    normalized.includes("token") ||
    normalized.includes("login")
  ) {
    return {
      failureKind: "auth",
      failureReason: stderr.trim(),
    };
  }
  return {
    failureKind: "api",
    failureReason: stderr.trim(),
  };
}

export function defaultPullRequestLookup(
  branchName: string,
  runCommand: RunCommand = defaultRunCommand,
): PullRequestLookupResult {
  const result = runCommand("gh", [
    "pr",
    "list",
    "--head",
    branchName,
    "--state",
    "open",
    "--json",
    "number,headRefName,url,state",
    "--limit",
    "1",
  ]);
  if (!result.ok) {
    return {
      pullRequest: null,
      ...summarizeLookupFailure(result.stderr),
    };
  }
  if (!result.stdout.trim()) {
    return {
      pullRequest: null,
      failureKind: "not-found",
      failureReason: `no open PR metadata found for branch ${branchName}`,
    };
  }

  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0 || !isRecord(parsed[0])) {
      return {
        pullRequest: null,
        failureKind: "not-found",
        failureReason: `no open PR metadata found for branch ${branchName}`,
      };
    }
    const first = parsed[0];
    const number = typeof first.number === "number" ? first.number : NaN;
    if (!Number.isFinite(number)) {
      return {
        pullRequest: null,
        failureKind: "unknown",
        failureReason: `PR lookup returned invalid number for branch ${branchName}`,
      };
    }
    const detailResult = runCommand("gh", [
      "pr",
      "view",
      String(number),
      "--json",
      "number,headRefName,baseRefName,mergeStateStatus,statusCheckRollup,url,state",
    ]);
    if (detailResult.ok && detailResult.stdout.trim()) {
      try {
        const details = JSON.parse(detailResult.stdout) as unknown;
        if (isRecord(details)) {
          return {
            pullRequest: {
              number,
              headRefName:
                typeof details.headRefName === "string"
                  ? details.headRefName
                  : undefined,
              baseRefName:
                typeof details.baseRefName === "string"
                  ? details.baseRefName
                  : undefined,
              mergeStateStatus:
                typeof details.mergeStateStatus === "string"
                  ? details.mergeStateStatus
                  : undefined,
              statusCheckRollup: Array.isArray(details.statusCheckRollup)
                ? details.statusCheckRollup
                : undefined,
              url: typeof details.url === "string" ? details.url : undefined,
              state:
                typeof details.state === "string" ? details.state : undefined,
            },
          };
        }
      } catch {
        // Fall through to the basic list metadata when detail JSON is unavailable.
      }
    }
    return {
      pullRequest: {
        number,
        headRefName:
          typeof first.headRefName === "string" ? first.headRefName : undefined,
        baseRefName:
          typeof first.baseRefName === "string" ? first.baseRefName : undefined,
        url: typeof first.url === "string" ? first.url : undefined,
        state: typeof first.state === "string" ? first.state : undefined,
      },
    };
  } catch {
    return {
      pullRequest: null,
      failureKind: "unknown",
      failureReason: `PR lookup returned invalid JSON for branch ${branchName}`,
    };
  }
}

export function determineQueueMismatchRisk(
  lane: Pick<
    LaneDiscoveryRecord,
    "queueState" | "mergeabilityClass" | "checkHealth"
  >,
): QueueMismatchRisk {
  if (lane.mergeabilityClass === "conflicting") {
    return "conflict-drift";
  }
  if (
    lane.mergeabilityClass === "check-blocked" ||
    lane.checkHealth === "pending" ||
    lane.checkHealth === "failing"
  ) {
    return "checks-blocked";
  }
  if (lane.queueState === "failed" && lane.mergeabilityClass === "mergeable") {
    return "queue-stale";
  }
  if (
    lane.mergeabilityClass === "unknown" &&
    (lane.checkHealth === "unavailable" || lane.checkHealth === undefined)
  ) {
    return "metadata-unavailable";
  }
  return "none";
}

export function classifyPlannerLaneKind(
  lane: Pick<
    LaneDiscoveryRecord,
    | "status"
    | "queueState"
    | "queueMismatchRisk"
    | "mergeabilityClass"
    | "checkHealth"
  >,
): PlannerLaneKind {
  switch (lane.queueMismatchRisk) {
    case "queue-stale":
      return "stale-clean-pr-mismatch";
    case "conflict-drift":
      return "merge-conflict";
    case "checks-blocked":
      return "checks-blocked";
    case "metadata-unavailable":
      return "metadata-unavailable";
    default:
      break;
  }

  if (lane.status === "pr-backed" && lane.queueState === "active") {
    return "active-page-implementation";
  }

  return "unclassified";
}

export function formatStaleCleanPrMismatchReason(
  lane: Pick<
    LaneDiscoveryRecord,
    | "prNumber"
    | "queueState"
    | "rawQueueState"
    | "mergeabilityClass"
    | "checkHealth"
    | "workItemName"
  >,
): string {
  const prLabel =
    typeof lane.prNumber === "number" ? `pr=#${lane.prNumber}` : "pr=?";
  return [
    "clean-passing-open-pr-with-queue-failed",
    prLabel,
    `queue=${lane.queueState}(${lane.rawQueueState})`,
    `mergeability=${lane.mergeabilityClass ?? "?"}`,
    `checks=${lane.checkHealth ?? "?"}`,
    `work-item=${lane.workItemName}`,
  ].join(" ");
}

export function summarizePlannerLaneKinds(
  lanes: Pick<LaneDiscoveryRecord, "plannerLaneKind">[],
): Record<PlannerLaneKind, number> {
  const counts: Record<PlannerLaneKind, number> = {
    "stale-clean-pr-mismatch": 0,
    "merge-conflict": 0,
    "checks-blocked": 0,
    "metadata-unavailable": 0,
    "active-page-implementation": 0,
    unclassified: 0,
  };

  for (const lane of lanes) {
    const kind = lane.plannerLaneKind ?? "unclassified";
    counts[kind] += 1;
  }

  return counts;
}

export function isStaleLinkageRefreshHint(reason: string): boolean {
  return (
    reason.startsWith("stamped branch linkage is stale") ||
    reason.startsWith("stamped pull request linkage is stale")
  );
}

export function partitionStaleLinkageRefreshHints(reasons: string[]): {
  reasons: string[];
  metadataRefreshHints: string[];
} {
  const metadataRefreshHints: string[] = [];
  const remainingReasons: string[] = [];

  for (const reason of reasons) {
    if (isStaleLinkageRefreshHint(reason)) {
      metadataRefreshHints.push(reason);
      continue;
    }
    remainingReasons.push(reason);
  }

  return { reasons: remainingReasons, metadataRefreshHints };
}

function collectWorktreeStaleLinkageRefreshHints(
  worktree: WorktreeLaneRecord,
): string[] {
  const hints: string[] = [];

  if (worktree.metadataBranchLinkage?.status === "stale") {
    hints.push(
      worktree.metadataBranchLinkage.issue
        ? `stamped branch linkage is stale: ${worktree.metadataBranchLinkage.issue}`
        : "stamped branch linkage is stale and should be refreshed",
    );
  }
  if (worktree.metadataPullRequestLinkage?.status === "stale") {
    hints.push(
      worktree.metadataPullRequestLinkage.issue
        ? `stamped pull request linkage is stale: ${worktree.metadataPullRequestLinkage.issue}`
        : "stamped pull request linkage is stale and should be refreshed",
    );
  }

  return hints;
}

function mergeMetadataRefreshHints(...hintGroups: string[][]): string[] {
  const merged: string[] = [];
  for (const hints of hintGroups) {
    for (const hint of hints) {
      if (!merged.includes(hint)) {
        merged.push(hint);
      }
    }
  }
  return merged;
}

export function recommendPlannerNextAction(
  lane: Pick<
    LaneDiscoveryRecord,
    "checkHealth" | "mergeabilityClass" | "queueMismatchRisk"
  >,
): PlannerNextAction | undefined {
  switch (lane.queueMismatchRisk) {
    case "conflict-drift":
      return "refresh-branch";
    case "checks-blocked":
      return lane.checkHealth === "pending"
        ? "wait"
        : "open-follow-up-throughput-prd";
    case "metadata-unavailable":
      return "repair-token";
    case "queue-stale":
      return "open-follow-up-throughput-prd";
    default:
      return undefined;
  }
}

export function discoverActivePrLaneReport(
  options: DiscoverActivePrLanesOptions,
): LaneDiscoveryReport {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const lookupPullRequest =
    options.lookupPullRequest ?? defaultPullRequestLookup;
  const baseBranchName = options.baseBranchName ?? "main";
  const issues: string[] = [];

  let queueLanes: QueueLaneRecord[] = [];
  try {
    queueLanes = parseQueueLaneRecords(options.workListJsonText);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown work list failure";
    return { lanes: [], issues: [message] };
  }

  let sessions: SessionLaneRecord[] = [];
  if (options.sessionListJsonText) {
    try {
      sessions = parseSessionLaneRecords(options.sessionListJsonText);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown session list failure";
      issues.push(message);
    }
  }

  const worktrees = discoverWorktreeLaneRecords(
    options.worktreesDir,
    runCommand,
  );
  const sessionsByWorkItem = new Map(
    sessions.map((session) => [session.workItemName, session] as const),
  );

  const lanes = queueLanes.map((queueLane) => {
    const expectedWorktreeName = normalizeWorktreeName(queueLane.workItemName);
    const worktree =
      worktrees.find((candidate) =>
        worktreeAliases(candidate).has(queueLane.workItemName),
      ) ??
      worktrees.find(
        (candidate) => candidate.worktreeName === expectedWorktreeName,
      );
    const session = sessionsByWorkItem.get(queueLane.workItemName);
    const reasons: string[] = [];

    if (!worktree) {
      reasons.push("no matching worktree under .claude/worktrees");
      return {
        status: "unclassified",
        workItemName: queueLane.workItemName,
        queueState: queueLane.queueState,
        rawQueueState: queueLane.rawState,
        workTypeName: queueLane.workTypeName,
        hasDependsOnRelation: queueLane.hasDependsOnRelation,
        workItemNameSource: "queue",
        sessionId: queueLane.sessionId ?? session?.sessionId,
        sessionIdSource: queueLane.sessionId
          ? "queue"
          : session?.sessionId
            ? "session"
            : undefined,
        sessionState: session?.rawState,
        reasons,
      } satisfies LaneDiscoveryRecord;
    }

    reasons.push(...worktree.metadataIssues);
    if (worktree.metadataBranchLinkage?.status === "stale") {
      pushUniqueReason(
        reasons,
        worktree.metadataBranchLinkage.issue
          ? `stamped branch linkage is stale: ${worktree.metadataBranchLinkage.issue}`
          : "stamped branch linkage is stale and should be refreshed",
      );
    }

    const branchName = worktree.branchName ?? worktree.prdBranchName;
    if (!branchName) {
      reasons.push(
        "worktree exists but branch metadata could not be determined",
      );
      if (options.refreshWorktreeMetadata) {
        refreshWorktreeLaneMetadata({
          worktreePath: worktree.worktreePath,
          branchIssue: reasons[0],
        });
      }
      return {
        status: "unclassified",
        workItemName: queueLane.workItemName,
        queueState: queueLane.queueState,
        rawQueueState: queueLane.rawState,
        workTypeName: queueLane.workTypeName,
        hasDependsOnRelation: queueLane.hasDependsOnRelation,
        worktreePath: relativeDisplayPath(
          worktree.worktreePath,
          options.repoRoot,
        ),
        workItemNameSource: worktree.workItemNameSource,
        branchMetadataSource: worktree.branchMetadataSource,
        metadataStatus: worktree.metadataStatus,
        sessionId:
          queueLane.sessionId ??
          session?.sessionId ??
          worktree.metadataSessionId ??
          undefined,
        sessionIdSource: queueLane.sessionId
          ? "queue"
          : session?.sessionId
            ? "session"
            : worktree.metadataSessionId
              ? "metadata"
              : undefined,
        sessionState: session?.rawState,
        driftStatus: "unknown",
        reasons,
      } satisfies LaneDiscoveryRecord;
    }

    if (
      worktree.gitBranchName &&
      worktree.prdBranchName &&
      worktree.gitBranchName !== worktree.prdBranchName
    ) {
      reasons.push(
        `git branch ${worktree.gitBranchName} disagrees with prd branch ${worktree.prdBranchName}`,
      );
    }

    const pullRequestLookup = resolvePullRequestEvidence(
      worktree,
      branchName,
      lookupPullRequest,
      runCommand,
    );
    const pullRequest = pullRequestLookup.pullRequest;
    const resolvedBranchName =
      pullRequestLookup.resolvedBranchName ?? branchName;

    const drift = classifyBranchDrift(
      resolvedBranchName,
      runCommand,
      baseBranchName,
      options.repoRoot ?? worktree.worktreePath,
    );
    if (!pullRequest) {
      if (worktree.metadataPullRequestLinkage?.status === "stale") {
        pushUniqueReason(
          reasons,
          worktree.metadataPullRequestLinkage.issue
            ? `stamped pull request linkage is stale: ${worktree.metadataPullRequestLinkage.issue}`
            : "stamped pull request linkage is stale and should be refreshed",
        );
      }
      const failureReason =
        pullRequestLookup.failureReason ??
        `no open PR metadata found for branch ${branchName}`;
      pushUniqueReason(reasons, failureReason);
      const queueMismatchRisk =
        pullRequestLookup.failureKind &&
        pullRequestLookup.failureKind !== "not-found"
          ? "metadata-unavailable"
          : undefined;
      const nextAction =
        queueMismatchRisk === "metadata-unavailable"
          ? recommendPlannerNextAction({
              queueMismatchRisk,
              mergeabilityClass: "unknown",
              checkHealth: "unavailable",
            })
          : undefined;
      if (options.refreshWorktreeMetadata) {
        refreshWorktreeLaneMetadata({
          worktreePath: worktree.worktreePath,
          branchName,
          branchMetadataSource: toRefreshableBranchMetadataSource(
            worktree.branchMetadataSource,
          ),
          pullRequestLookup: {
            status: "missing",
            pullRequest: null,
            failureKind: pullRequestLookup.failureKind,
            failureReason: failureReason,
          },
        });
      }
      if (
        worktree.metadataStatus === "incomplete" ||
        worktree.metadataStatus === "missing"
      ) {
        pushUniqueReason(
          reasons,
          "missing pull request metadata for actionable task/review lane",
        );
      }

      return {
        status: "unclassified",
        workItemName: queueLane.workItemName,
        queueState: queueLane.queueState,
        rawQueueState: queueLane.rawState,
        workTypeName: queueLane.workTypeName,
        hasDependsOnRelation: queueLane.hasDependsOnRelation,
        worktreePath: relativeDisplayPath(
          worktree.worktreePath,
          options.repoRoot,
        ),
        branchName: resolvedBranchName,
        workItemNameSource: worktree.workItemNameSource,
        branchMetadataSource: worktree.branchMetadataSource,
        metadataStatus: worktree.metadataStatus,
        prLookupFailureKind: pullRequestLookup.failureKind,
        prLookupFailureReason: failureReason,
        sessionId:
          queueLane.sessionId ??
          session?.sessionId ??
          worktree.metadataSessionId ??
          undefined,
        sessionIdSource: queueLane.sessionId
          ? "queue"
          : session?.sessionId
            ? "session"
            : worktree.metadataSessionId
              ? "metadata"
              : undefined,
        sessionState: session?.rawState,
        driftStatus: drift.status,
        commitsAheadOfMain: drift.commitsAheadOfMain,
        commitsBehindMain: drift.commitsBehindMain,
        queueMismatchRisk,
        nextAction,
        reasons,
      } satisfies LaneDiscoveryRecord;
    }

    const checkHealth = summarizeCheckHealth(pullRequest.statusCheckRollup);
    const mergeabilityClass = classifyMergeability(
      pullRequest.mergeStateStatus,
      checkHealth,
    );

    if (
      resolvedBranchName !== branchName &&
      worktree.branchMetadataSource === "metadata"
    ) {
      pushUniqueReason(
        reasons,
        `PR resolved via worktree branch ${resolvedBranchName} after stamped branch ${branchName} had no open PR`,
      );
    }

    const laneRecord = {
      status: "pr-backed",
      workItemName: queueLane.workItemName,
      queueState: queueLane.queueState,
      rawQueueState: queueLane.rawState,
      workTypeName: queueLane.workTypeName,
      hasDependsOnRelation: queueLane.hasDependsOnRelation,
      worktreePath: relativeDisplayPath(
        worktree.worktreePath,
        options.repoRoot,
      ),
      branchName: resolvedBranchName,
      workItemNameSource: worktree.workItemNameSource,
      branchMetadataSource: worktree.branchMetadataSource,
      metadataStatus: worktree.metadataStatus,
      prNumber: pullRequest.number,
      prUrl: pullRequest.url,
      sessionId:
        queueLane.sessionId ??
        session?.sessionId ??
        worktree.metadataSessionId ??
        undefined,
      sessionIdSource: queueLane.sessionId
        ? "queue"
        : session?.sessionId
          ? "session"
          : worktree.metadataSessionId
            ? "metadata"
            : undefined,
      sessionState: session?.rawState,
      driftStatus: drift.status,
      commitsAheadOfMain: drift.commitsAheadOfMain,
      commitsBehindMain: drift.commitsBehindMain,
      checkHealth,
      mergeabilityClass,
      reasons,
    } satisfies LaneDiscoveryRecord;

    if (options.refreshWorktreeMetadata) {
      refreshWorktreeLaneMetadata({
        worktreePath: worktree.worktreePath,
        branchName: resolvedBranchName,
        branchMetadataSource: toRefreshableBranchMetadataSource(
          worktree.branchMetadataSource,
        ),
        pullRequestLookup: {
          status: "resolved",
          pullRequest: {
            number: pullRequest.number,
            url: pullRequest.url,
          },
        },
      });
    }

    const queueMismatchRisk = determineQueueMismatchRisk(laneRecord);
    const partitionedReasons = partitionStaleLinkageRefreshHints(
      laneRecord.reasons,
    );
    const metadataRefreshHints = mergeMetadataRefreshHints(
      partitionedReasons.metadataRefreshHints,
      collectWorktreeStaleLinkageRefreshHints(worktree),
    );
    const plannerLaneKind = classifyPlannerLaneKind({
      status: laneRecord.status,
      queueState: laneRecord.queueState,
      queueMismatchRisk,
      mergeabilityClass,
      checkHealth,
    });
    const staleMismatchReason =
      plannerLaneKind === "stale-clean-pr-mismatch"
        ? formatStaleCleanPrMismatchReason({
            ...laneRecord,
            mergeabilityClass,
            checkHealth,
          })
        : undefined;
    return {
      ...laneRecord,
      reasons: partitionedReasons.reasons,
      ...(metadataRefreshHints.length > 0 ? { metadataRefreshHints } : {}),
      queueMismatchRisk,
      plannerLaneKind,
      ...(staleMismatchReason ? { staleMismatchReason } : {}),
      nextAction: recommendPlannerNextAction({
        queueMismatchRisk,
        checkHealth,
        mergeabilityClass,
      }),
    } satisfies LaneDiscoveryRecord;
  });

  return { lanes, issues };
}

export function formatActivePrLaneReport(report: LaneDiscoveryReport): string {
  const prBackedCount = report.lanes.filter(
    (lane) => lane.status === "pr-backed",
  ).length;
  const unclassifiedCount = report.lanes.length - prBackedCount;
  const laneKindCounts = summarizePlannerLaneKinds(report.lanes);

  const lines = [
    "Active PR Mergeability Watchdog",
    `lanes=${report.lanes.length} pr-backed=${prBackedCount} unclassified=${unclassifiedCount}`,
    `classification active-page-implementation=${laneKindCounts["active-page-implementation"]} stale-clean-pr-mismatch=${laneKindCounts["stale-clean-pr-mismatch"]} merge-conflict=${laneKindCounts["merge-conflict"]} checks-blocked=${laneKindCounts["checks-blocked"]} metadata-unavailable=${laneKindCounts["metadata-unavailable"]} unclassified=${laneKindCounts.unclassified}`,
  ];

  if (report.issues.length > 0) {
    lines.push("");
    for (const issue of report.issues) {
      lines.push(`issue=${issue}`);
    }
  }

  if (report.lanes.length === 0) {
    lines.push("");
    lines.push("No active or failed queue lanes were discovered.");
    return lines.join("\n");
  }

  lines.push("");
  for (const lane of report.lanes) {
    const drift =
      lane.driftStatus && lane.driftStatus !== "unknown"
        ? `${lane.driftStatus}(ahead=${lane.commitsAheadOfMain ?? 0},behind=${lane.commitsBehindMain ?? 0})`
        : (lane.driftStatus ?? "unknown");
    const details = [
      `status=${lane.status}`,
      `queue=${lane.queueState}`,
      `work-item=${lane.workItemName}`,
      `work-item-source=${lane.workItemNameSource ?? "queue"}`,
      `branch=${lane.branchName ?? "?"}`,
      `branch-source=${lane.branchMetadataSource ?? "?"}`,
      `worktree=${lane.worktreePath ?? "?"}`,
      `pr=${lane.prNumber ? `#${lane.prNumber}` : "?"}`,
      `drift=${drift}`,
    ];
    if (lane.sessionId) {
      details.push(`session=${lane.sessionId}`);
      details.push(`session-source=${lane.sessionIdSource ?? "?"}`);
    }
    if (lane.sessionState) {
      details.push(`session-state=${lane.sessionState}`);
    }
    if (lane.metadataStatus) {
      details.push(`metadata=${lane.metadataStatus}`);
    }
    if (lane.mergeabilityClass) {
      details.push(`mergeability=${lane.mergeabilityClass}`);
    }
    if (lane.checkHealth) {
      details.push(`checks=${lane.checkHealth}`);
    }
    if (lane.queueMismatchRisk && lane.queueMismatchRisk !== "none") {
      details.push(`risk=${lane.queueMismatchRisk}`);
    }
    if (lane.plannerLaneKind) {
      details.push(`lane-kind=${lane.plannerLaneKind}`);
    }
    if (lane.staleMismatchReason) {
      details.push(`mismatch-reason=${lane.staleMismatchReason}`);
    }
    if (lane.metadataRefreshHints && lane.metadataRefreshHints.length > 0) {
      details.push(`metadata-refresh=${lane.metadataRefreshHints.join("; ")}`);
    }
    if (lane.nextAction) {
      details.push(`next-action=${lane.nextAction}`);
    }
    if (lane.reasons.length > 0) {
      details.push(`reason=${lane.reasons.join("; ")}`);
    }
    lines.push(`- ${details.join(" ")}`);
  }

  return lines.join("\n");
}
