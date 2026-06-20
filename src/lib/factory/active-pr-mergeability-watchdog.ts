import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

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
}

export interface SessionLaneRecord {
  workItemName: string;
  sessionId?: string;
  rawState?: string;
}

export interface WorktreeLaneRecord {
  worktreeName: string;
  worktreePath: string;
  branchName?: string;
  branchMetadataSource?: "git" | "prd";
  gitBranchName?: string;
  prdBranchName?: string;
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
  worktreePath?: string;
  branchName?: string;
  branchMetadataSource?: "git" | "prd";
  prNumber?: number;
  prUrl?: string;
  prLookupFailureKind?: PullRequestLookupFailureKind;
  prLookupFailureReason?: string;
  sessionId?: string;
  sessionState?: string;
  driftStatus?: BranchDriftStatus;
  commitsAheadOfMain?: number;
  commitsBehindMain?: number;
  checkHealth?: CheckHealthStatus;
  mergeabilityClass?: MergeabilityClass;
  queueMismatchRisk?: QueueMismatchRisk;
  nextAction?: PlannerNextAction;
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
      const prdBranchName = tryReadPrdBranchName(worktreePath);
      const gitBranchName = readGitBranchName(worktreePath, runCommand);
      const branchName = gitBranchName ?? prdBranchName;
      const branchMetadataSource = gitBranchName
        ? "git"
        : prdBranchName
          ? "prd"
          : undefined;

      return {
        worktreeName: entry.name,
        worktreePath,
        branchName,
        branchMetadataSource,
        gitBranchName,
        prdBranchName,
      } satisfies WorktreeLaneRecord;
    });
}

function worktreeAliases(record: WorktreeLaneRecord): Set<string> {
  const aliases = new Set<string>();
  aliases.add(record.worktreeName);
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

function relativeDisplayPath(path: string, repoRoot?: string): string {
  if (!repoRoot) {
    return path;
  }
  const relativePath = relative(repoRoot, path);
  return relativePath && !relativePath.startsWith("..") ? relativePath : path;
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
    return checkHealth === "passing" ? "unknown" : "check-blocked";
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
  if (lane.mergeabilityClass === "unknown") {
    return "metadata-unavailable";
  }
  return "none";
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
        sessionId: queueLane.sessionId ?? session?.sessionId,
        sessionState: session?.rawState,
        reasons,
      } satisfies LaneDiscoveryRecord;
    }

    const branchName = worktree.branchName ?? worktree.prdBranchName;
    if (!branchName) {
      reasons.push(
        "worktree exists but branch metadata could not be determined",
      );
      return {
        status: "unclassified",
        workItemName: queueLane.workItemName,
        queueState: queueLane.queueState,
        rawQueueState: queueLane.rawState,
        worktreePath: relativeDisplayPath(
          worktree.worktreePath,
          options.repoRoot,
        ),
        branchMetadataSource: worktree.branchMetadataSource,
        sessionId: queueLane.sessionId ?? session?.sessionId,
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

    const drift = classifyBranchDrift(
      branchName,
      runCommand,
      baseBranchName,
      options.repoRoot ?? worktree.worktreePath,
    );

    const pullRequestLookup = lookupPullRequest(branchName, runCommand);
    const pullRequest = pullRequestLookup.pullRequest;
    if (!pullRequest) {
      const failureReason =
        pullRequestLookup.failureReason ??
        `no open PR metadata found for branch ${branchName}`;
      reasons.push(failureReason);
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
      return {
        status: "unclassified",
        workItemName: queueLane.workItemName,
        queueState: queueLane.queueState,
        rawQueueState: queueLane.rawState,
        worktreePath: relativeDisplayPath(
          worktree.worktreePath,
          options.repoRoot,
        ),
        branchName,
        branchMetadataSource: worktree.branchMetadataSource,
        prLookupFailureKind: pullRequestLookup.failureKind,
        prLookupFailureReason: failureReason,
        sessionId: queueLane.sessionId ?? session?.sessionId,
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

    const laneRecord = {
      status: "pr-backed",
      workItemName: queueLane.workItemName,
      queueState: queueLane.queueState,
      rawQueueState: queueLane.rawState,
      worktreePath: relativeDisplayPath(
        worktree.worktreePath,
        options.repoRoot,
      ),
      branchName,
      branchMetadataSource: worktree.branchMetadataSource,
      prNumber: pullRequest.number,
      prUrl: pullRequest.url,
      sessionId: queueLane.sessionId ?? session?.sessionId,
      sessionState: session?.rawState,
      driftStatus: drift.status,
      commitsAheadOfMain: drift.commitsAheadOfMain,
      commitsBehindMain: drift.commitsBehindMain,
      checkHealth,
      mergeabilityClass,
      reasons,
    } satisfies LaneDiscoveryRecord;

    const queueMismatchRisk = determineQueueMismatchRisk(laneRecord);
    return {
      ...laneRecord,
      queueMismatchRisk,
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

  const lines = [
    "Active PR Mergeability Watchdog",
    `lanes=${report.lanes.length} pr-backed=${prBackedCount} unclassified=${unclassifiedCount}`,
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
      `branch=${lane.branchName ?? "?"}`,
      `worktree=${lane.worktreePath ?? "?"}`,
      `pr=${lane.prNumber ? `#${lane.prNumber}` : "?"}`,
      `drift=${drift}`,
    ];
    if (lane.sessionId) {
      details.push(`session=${lane.sessionId}`);
    }
    if (lane.sessionState) {
      details.push(`session-state=${lane.sessionState}`);
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
