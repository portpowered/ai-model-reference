import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export type QueueLaneState = "active" | "failed";
export type LaneDiscoveryStatus = "pr-backed" | "unclassified";

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
  prdBranchName?: string;
}

export interface PullRequestRecord {
  number: number;
  headRefName?: string;
  url?: string;
  state?: string;
}

export interface LaneDiscoveryRecord {
  status: LaneDiscoveryStatus;
  workItemName: string;
  queueState: QueueLaneState;
  rawQueueState: string;
  worktreePath?: string;
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
  sessionId?: string;
  sessionState?: string;
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
  repoRoot?: string;
  runCommand?: RunCommand;
  lookupPullRequest?: (
    branchName: string,
    runCommand: RunCommand,
  ) => PullRequestRecord | null;
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
    const rawState =
      readStringField(item, ["state", "status", "queueState", "phase"]) ||
      readNestedStringField(item, ["runtime", "workItem"], ["state", "status"]);
    const queueState = normalizeQueueState(rawState);
    if (!workItemName || !queueState) {
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
      queueState,
      rawState,
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
      readStringField(item, ["state", "status", "phase"]) ||
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
      const branchName =
        readGitBranchName(worktreePath, runCommand) ?? prdBranchName;

      return {
        worktreeName: entry.name,
        worktreePath,
        branchName,
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

export function defaultPullRequestLookup(
  branchName: string,
  runCommand: RunCommand = defaultRunCommand,
): PullRequestRecord | null {
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
  if (!result.ok || !result.stdout.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0 || !isRecord(parsed[0])) {
      return null;
    }
    const first = parsed[0];
    const number = typeof first.number === "number" ? first.number : NaN;
    if (!Number.isFinite(number)) {
      return null;
    }
    return {
      number,
      headRefName:
        typeof first.headRefName === "string" ? first.headRefName : undefined,
      url: typeof first.url === "string" ? first.url : undefined,
      state: typeof first.state === "string" ? first.state : undefined,
    };
  } catch {
    return null;
  }
}

export function discoverActivePrLaneReport(
  options: DiscoverActivePrLanesOptions,
): LaneDiscoveryReport {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const lookupPullRequest =
    options.lookupPullRequest ?? defaultPullRequestLookup;
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
        sessionId: queueLane.sessionId ?? session?.sessionId,
        sessionState: session?.rawState,
        reasons,
      } satisfies LaneDiscoveryRecord;
    }

    const pullRequest = lookupPullRequest(branchName, runCommand);
    if (!pullRequest) {
      reasons.push(`no open PR metadata found for branch ${branchName}`);
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
        sessionId: queueLane.sessionId ?? session?.sessionId,
        sessionState: session?.rawState,
        reasons,
      } satisfies LaneDiscoveryRecord;
    }

    return {
      status: "pr-backed",
      workItemName: queueLane.workItemName,
      queueState: queueLane.queueState,
      rawQueueState: queueLane.rawState,
      worktreePath: relativeDisplayPath(
        worktree.worktreePath,
        options.repoRoot,
      ),
      branchName,
      prNumber: pullRequest.number,
      prUrl: pullRequest.url,
      sessionId: queueLane.sessionId ?? session?.sessionId,
      sessionState: session?.rawState,
      reasons,
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
    const details = [
      `status=${lane.status}`,
      `queue=${lane.queueState}`,
      `work-item=${lane.workItemName}`,
      `branch=${lane.branchName ?? "?"}`,
      `worktree=${lane.worktreePath ?? "?"}`,
      `pr=${lane.prNumber ? `#${lane.prNumber}` : "?"}`,
    ];
    if (lane.sessionId) {
      details.push(`session=${lane.sessionId}`);
    }
    if (lane.sessionState) {
      details.push(`session-state=${lane.sessionState}`);
    }
    if (lane.reasons.length > 0) {
      details.push(`reason=${lane.reasons.join("; ")}`);
    }
    lines.push(`- ${details.join(" ")}`);
  }

  return lines.join("\n");
}
