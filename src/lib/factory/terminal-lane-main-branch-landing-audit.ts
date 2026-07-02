import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  type CommandResult,
  discoverWorktreeLaneRecords,
  type RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import { isTerminalCompleteState } from "@/lib/factory/planner-merged-lane-evidence";
import { parsePlannerRelevantDirtyPaths } from "@/lib/factory/planner-worktree-drift-watchdog";
import { readWorktreeLaneMetadata } from "@/lib/factory/worktree-lane-metadata";

export const UNKNOWN_EVIDENCE = "unknown" as const;
export const UNAVAILABLE_EVIDENCE = "unavailable" as const;

export type TerminalLaneEvidenceStatus =
  | "present"
  | typeof UNKNOWN_EVIDENCE
  | typeof UNAVAILABLE_EVIDENCE;

export type TerminalLaneTerminalStateEvidence =
  | {
      status: "present";
      rawState: string;
      stateType?: string;
      workTypeName?: string;
    }
  | {
      status: typeof UNKNOWN_EVIDENCE | typeof UNAVAILABLE_EVIDENCE;
      reason?: string;
    };

export type TerminalLaneBranchIdentityEvidence =
  | {
      status: "present";
      branchName: string;
      source?: "metadata" | "git" | "prd";
    }
  | {
      status: typeof UNKNOWN_EVIDENCE | typeof UNAVAILABLE_EVIDENCE;
      reason?: string;
    };

export type TerminalLaneWorktreeIdentityEvidence =
  | {
      status: "present";
      worktreePath: string;
    }
  | {
      status: typeof UNKNOWN_EVIDENCE | typeof UNAVAILABLE_EVIDENCE;
      reason?: string;
    };

export type TerminalLaneLandingCandidateSource =
  | "explicit-lane"
  | "queue-near-terminal"
  | "queue-terminal-complete"
  | "worktree-only";

export interface TerminalLaneLandingCandidate {
  laneName: string;
  source: TerminalLaneLandingCandidateSource;
  terminalState: TerminalLaneTerminalStateEvidence;
  branchIdentity: TerminalLaneBranchIdentityEvidence;
  worktreeIdentity: TerminalLaneWorktreeIdentityEvidence;
}

export interface TerminalLaneLandingCandidateDiscovery {
  generatedAtUtc: string;
  repoRoot: string;
  candidateCount: number;
  candidates: TerminalLaneLandingCandidate[];
}

export interface DiscoverTerminalLaneLandingCandidatesOptions {
  explicitLaneNames?: string[];
  landingCandidates?: TerminalLaneLandingCandidate[];
  repoRoot: string;
  runCommand?: RunCommand;
  workListJsonText?: string;
  worktreesDir?: string;
}

export class TerminalLaneLandingAuditDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerminalLaneLandingAuditDiscoveryError";
  }
}

export class TerminalLaneLandingAuditComparisonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerminalLaneLandingAuditComparisonError";
  }
}

export type TerminalLaneLandingSurfaceKind =
  | "page-bundle"
  | "registry-record"
  | "focused-test";

export interface TerminalLaneLandingSurface {
  kind: TerminalLaneLandingSurfaceKind;
  path: string;
}

export type TerminalLaneMainEvidenceStatus =
  | "present"
  | "absent"
  | typeof UNAVAILABLE_EVIDENCE;

export type TerminalLanePlannerRootEvidenceStatus =
  | "clean"
  | "dirty"
  | "deleted"
  | typeof UNAVAILABLE_EVIDENCE;

export interface TerminalLaneLandingSurfaceEvidence {
  surface: TerminalLaneLandingSurface;
  main: {
    status: TerminalLaneMainEvidenceStatus;
    mainRef: string;
    reason?: string;
  };
  plannerRoot: {
    status: TerminalLanePlannerRootEvidenceStatus;
    changeKind?: string;
    reason?: string;
  };
}

export type TerminalLaneLandingSurfaceSource =
  | "explicit"
  | "branch-diff"
  | typeof UNAVAILABLE_EVIDENCE;

export interface TerminalLaneLandingSurfaceComparison {
  laneName: string;
  mainRef: string;
  surfaceSource: TerminalLaneLandingSurfaceSource;
  surfaces: TerminalLaneLandingSurfaceEvidence[];
  issues: string[];
}

export interface TerminalLaneLandingSurfaceComparisonReport {
  generatedAtUtc: string;
  repoRoot: string;
  mainRef: string;
  comparisonCount: number;
  comparisons: TerminalLaneLandingSurfaceComparison[];
}

export interface CompareTerminalLaneLandingSurfacesOptions {
  candidates: TerminalLaneLandingCandidate[];
  expectedLandingSurfacesByLane?: Record<string, TerminalLaneLandingSurface[]>;
  mainRef?: string;
  plannerRootGitStatusText?: string;
  repoRoot: string;
  runCommand?: RunCommand;
  surfaceComparisonReport?: TerminalLaneLandingSurfaceComparisonReport;
}

interface QueueLaneStateEvidence {
  laneName: string;
  rawState: string;
  sessionId?: string;
  source: "queue-near-terminal" | "queue-terminal-complete";
  stateType?: string;
  workTypeName?: string;
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

function readNestedStringField(
  record: Record<string, unknown>,
  nestedKeys: string[],
  keys: string[],
): string | undefined {
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
    throw new TerminalLaneLandingAuditDiscoveryError(
      `${label} is not valid JSON: ${message}`,
    );
  }
}

function isNearTerminalState(record: Record<string, unknown>): boolean {
  if (isTerminalCompleteState(record)) {
    return true;
  }

  const stateRecord = isRecord(record.state) ? record.state : undefined;
  const stateType = readStringField(stateRecord ?? {}, ["type"])?.toUpperCase();
  return stateType === "TERMINAL";
}

function parseQueueLaneStateEvidence(
  jsonText: string,
): QueueLaneStateEvidence[] {
  const parsed = parseJsonText(jsonText, "work list payload");
  const items = extractCandidateItemArray(parsed);
  const records: QueueLaneStateEvidence[] = [];

  for (const item of items) {
    if (!isNearTerminalState(item)) {
      continue;
    }

    const laneName =
      readStringField(item, ["name", "workItemName", "title", "id"]) ||
      readNestedStringField(item, ["workItem", "item"], ["name", "id"]);
    if (!laneName) {
      continue;
    }

    const stateRecord = isRecord(item.state) ? item.state : undefined;
    const rawState =
      readStringField(stateRecord ?? {}, ["name", "status", "type"]) ||
      readStringField(item, ["state", "status", "queueState"]) ||
      UNKNOWN_EVIDENCE;
    const stateType = readStringField(stateRecord ?? {}, ["type"]);

    records.push({
      laneName,
      rawState,
      sessionId:
        readStringField(item, ["sessionId", "runtimeSessionId"]) ||
        readNestedStringField(
          item,
          ["runtime", "session"],
          ["id", "sessionId"],
        ),
      source: isTerminalCompleteState(item)
        ? "queue-terminal-complete"
        : "queue-near-terminal",
      stateType,
      workTypeName:
        readStringField(item, ["workTypeName"]) ||
        readNestedStringField(item, ["workItem", "item"], ["workTypeName"]),
    });
  }

  return records;
}

function findWorktreePath(
  worktreesDir: string,
  laneName: string,
): string | undefined {
  if (!existsSync(worktreesDir)) {
    return undefined;
  }

  const directPath = join(worktreesDir, laneName);
  if (existsSync(directPath)) {
    return directPath;
  }

  for (const entry of readdirSync(worktreesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const metadata = readWorktreeLaneMetadata(join(worktreesDir, entry.name));
    if (metadata?.workItemName === laneName) {
      return join(worktreesDir, entry.name);
    }
  }

  return undefined;
}

function buildTerminalStateEvidence(
  queueEvidence: QueueLaneStateEvidence | undefined,
): TerminalLaneTerminalStateEvidence {
  if (!queueEvidence) {
    return {
      status: UNKNOWN_EVIDENCE,
      reason: "no queue terminal-state evidence for lane",
    };
  }

  return {
    status: "present",
    rawState: queueEvidence.rawState,
    stateType: queueEvidence.stateType,
    workTypeName: queueEvidence.workTypeName,
  };
}

function buildBranchIdentityEvidence(input: {
  branchName?: string;
  branchMetadataSource?: "metadata" | "git" | "prd";
}): TerminalLaneBranchIdentityEvidence {
  if (!input.branchName) {
    return {
      status: UNAVAILABLE_EVIDENCE,
      reason: "branch identity not available from worktree metadata or git",
    };
  }

  return {
    status: "present",
    branchName: input.branchName,
    source: input.branchMetadataSource,
  };
}

function buildWorktreeIdentityEvidence(
  worktreePath: string | undefined,
): TerminalLaneWorktreeIdentityEvidence {
  if (!worktreePath) {
    return {
      status: UNAVAILABLE_EVIDENCE,
      reason: "no matching worktree under configured worktrees directory",
    };
  }

  return {
    status: "present",
    worktreePath,
  };
}

function resolveWorktreeIdentity(
  worktreesDir: string,
  laneName: string,
  worktreeRecords: ReturnType<typeof discoverWorktreeLaneRecords>,
): {
  branchIdentity: TerminalLaneBranchIdentityEvidence;
  worktreeIdentity: TerminalLaneWorktreeIdentityEvidence;
} {
  const worktreePath = findWorktreePath(worktreesDir, laneName);
  const worktreeRecord = worktreeRecords.find(
    (record) => record.workItemName === laneName,
  );

  const branchName =
    worktreeRecord?.branchName ??
    worktreeRecord?.gitBranchName ??
    worktreeRecord?.prdBranchName ??
    (worktreePath
      ? readWorktreeLaneMetadata(worktreePath)?.branchName
      : undefined);

  return {
    branchIdentity: buildBranchIdentityEvidence({
      branchName,
      branchMetadataSource: worktreeRecord?.branchMetadataSource,
    }),
    worktreeIdentity: buildWorktreeIdentityEvidence(
      worktreePath ?? worktreeRecord?.worktreePath,
    ),
  };
}

function upsertCandidate(
  candidates: Map<string, TerminalLaneLandingCandidate>,
  candidate: TerminalLaneLandingCandidate,
): void {
  const existing = candidates.get(candidate.laneName);
  if (!existing) {
    candidates.set(candidate.laneName, candidate);
    return;
  }

  candidates.set(candidate.laneName, {
    ...existing,
    ...candidate,
    terminalState:
      candidate.terminalState.status === "present"
        ? candidate.terminalState
        : existing.terminalState,
    branchIdentity:
      candidate.branchIdentity.status === "present"
        ? candidate.branchIdentity
        : existing.branchIdentity,
    worktreeIdentity:
      candidate.worktreeIdentity.status === "present"
        ? candidate.worktreeIdentity
        : existing.worktreeIdentity,
    source:
      existing.source === "queue-terminal-complete" ||
      candidate.source === "queue-terminal-complete"
        ? "queue-terminal-complete"
        : existing.source === "queue-near-terminal" ||
            candidate.source === "queue-near-terminal"
          ? "queue-near-terminal"
          : candidate.source,
  });
}

export function discoverTerminalLaneLandingCandidates(
  options: DiscoverTerminalLaneLandingCandidatesOptions,
): TerminalLaneLandingCandidateDiscovery {
  if (options.landingCandidates) {
    const candidates = [...options.landingCandidates].sort((left, right) =>
      left.laneName.localeCompare(right.laneName),
    );
    return {
      generatedAtUtc: new Date().toISOString(),
      repoRoot: resolve(options.repoRoot),
      candidateCount: candidates.length,
      candidates,
    };
  }

  const repoRoot = resolve(options.repoRoot);
  const worktreesDir =
    options.worktreesDir ?? join(repoRoot, ".claude", "worktrees");
  const worktreeRecords = existsSync(worktreesDir)
    ? discoverWorktreeLaneRecords(worktreesDir, options.runCommand)
    : [];
  const candidates = new Map<string, TerminalLaneLandingCandidate>();
  const queueEvidenceByLane = new Map<string, QueueLaneStateEvidence>();

  if (options.workListJsonText) {
    for (const queueEvidence of parseQueueLaneStateEvidence(
      options.workListJsonText,
    )) {
      queueEvidenceByLane.set(queueEvidence.laneName, queueEvidence);
      const identities = resolveWorktreeIdentity(
        worktreesDir,
        queueEvidence.laneName,
        worktreeRecords,
      );
      upsertCandidate(candidates, {
        laneName: queueEvidence.laneName,
        source: queueEvidence.source,
        terminalState: buildTerminalStateEvidence(queueEvidence),
        branchIdentity: identities.branchIdentity,
        worktreeIdentity: identities.worktreeIdentity,
      });
    }
  }

  for (const laneName of options.explicitLaneNames ?? []) {
    const normalizedLaneName = laneName.trim();
    if (!normalizedLaneName) {
      continue;
    }

    const queueEvidence = queueEvidenceByLane.get(normalizedLaneName);
    const identities = resolveWorktreeIdentity(
      worktreesDir,
      normalizedLaneName,
      worktreeRecords,
    );
    upsertCandidate(candidates, {
      laneName: normalizedLaneName,
      source: queueEvidence?.source ?? "explicit-lane",
      terminalState: buildTerminalStateEvidence(queueEvidence),
      branchIdentity: identities.branchIdentity,
      worktreeIdentity: identities.worktreeIdentity,
    });
  }

  const discoveredLaneNames = new Set(candidates.keys());
  for (const worktree of worktreeRecords) {
    if (discoveredLaneNames.has(worktree.workItemName)) {
      continue;
    }

    upsertCandidate(candidates, {
      laneName: worktree.workItemName,
      source: "worktree-only",
      terminalState: {
        status: UNAVAILABLE_EVIDENCE,
        reason: "worktree present without queue terminal-state evidence",
      },
      branchIdentity: buildBranchIdentityEvidence({
        branchName:
          worktree.branchName ??
          worktree.gitBranchName ??
          worktree.prdBranchName,
        branchMetadataSource: worktree.branchMetadataSource,
      }),
      worktreeIdentity: buildWorktreeIdentityEvidence(worktree.worktreePath),
    });
  }

  const sortedCandidates = [...candidates.values()].sort((left, right) =>
    left.laneName.localeCompare(right.laneName),
  );

  return {
    generatedAtUtc: new Date().toISOString(),
    repoRoot,
    candidateCount: sortedCandidates.length,
    candidates: sortedCandidates,
  };
}

export function formatTerminalLaneLandingCandidateSummary(
  candidate: TerminalLaneLandingCandidate,
): string {
  const terminalState =
    candidate.terminalState.status === "present"
      ? candidate.terminalState.rawState
      : `${candidate.terminalState.status}${
          candidate.terminalState.reason
            ? ` (${candidate.terminalState.reason})`
            : ""
        }`;
  const branchIdentity =
    candidate.branchIdentity.status === "present"
      ? candidate.branchIdentity.branchName
      : candidate.branchIdentity.status;
  const worktreeIdentity =
    candidate.worktreeIdentity.status === "present"
      ? candidate.worktreeIdentity.worktreePath
      : candidate.worktreeIdentity.status;

  return `lane=${candidate.laneName} source=${candidate.source} terminal-state=${terminalState} branch=${branchIdentity} worktree=${worktreeIdentity}`;
}

export function formatTerminalLaneLandingCandidateDiscovery(
  discovery: TerminalLaneLandingCandidateDiscovery,
): string {
  const lines = [
    "Terminal Lane Main-Branch Landing Audit — candidate discovery",
    `Generated: ${discovery.generatedAtUtc}`,
    `Repo root: ${discovery.repoRoot}`,
    `Candidates: ${discovery.candidateCount}`,
  ];

  if (discovery.candidates.length === 0) {
    lines.push("No terminal or near-terminal landing candidates discovered.");
    return lines.join("\n");
  }

  lines.push("Candidates:");
  for (const candidate of discovery.candidates) {
    lines.push(`  - ${formatTerminalLaneLandingCandidateSummary(candidate)}`);
  }

  return lines.join("\n");
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

function normalizeRepoRelativePath(repoRoot: string, value: string): string {
  const normalized = value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
  const absolute = resolve(repoRoot, normalized);
  return relative(repoRoot, absolute).replace(/\\/g, "/");
}

function commandSucceeded(result: CommandResult): boolean {
  return result.ok && result.exitCode === 0;
}

function gitRefExists(
  repoRoot: string,
  ref: string,
  runCommand: RunCommand,
): boolean {
  const result = runCommand("git", ["rev-parse", "--verify", ref], repoRoot);
  return commandSucceeded(result);
}

export function resolveDefaultMainRef(
  repoRoot: string,
  runCommand: RunCommand = defaultRunCommand,
): string {
  const remoteHead = runCommand(
    "git",
    ["symbolic-ref", "refs/remotes/origin/HEAD"],
    repoRoot,
  );
  if (commandSucceeded(remoteHead) && remoteHead.stdout.trim().length > 0) {
    return remoteHead.stdout.trim().replace("refs/remotes/", "");
  }

  for (const candidate of ["origin/main", "main", "origin/master", "master"]) {
    if (gitRefExists(repoRoot, candidate, runCommand)) {
      return candidate;
    }
  }

  throw new TerminalLaneLandingAuditComparisonError(
    "Unable to determine a default main ref for landing-surface comparison. Pass mainRef explicitly.",
  );
}

export function classifyTerminalLaneLandingSurfaceKind(
  path: string,
): TerminalLaneLandingSurfaceKind | undefined {
  const normalizedPath = path.replace(/\\/g, "/");

  if (
    normalizedPath.startsWith("src/content/docs/") &&
    normalizedPath.endsWith("/page.mdx")
  ) {
    return "page-bundle";
  }

  if (
    normalizedPath.startsWith("src/content/registry/") &&
    normalizedPath.endsWith(".json") &&
    !normalizedPath.includes("/messages/")
  ) {
    return "registry-record";
  }

  if (
    normalizedPath.startsWith("src/lib/content/") &&
    /\.test\.(t|j)sx?$/.test(normalizedPath)
  ) {
    return "focused-test";
  }

  return undefined;
}

function isLandingSurfacePath(path: string): boolean {
  return classifyTerminalLaneLandingSurfaceKind(path) !== undefined;
}

function buildLandingSurface(path: string): TerminalLaneLandingSurface {
  const kind = classifyTerminalLaneLandingSurfaceKind(path);
  if (!kind) {
    throw new TerminalLaneLandingAuditComparisonError(
      `Path is not a recognized landing surface: ${path}`,
    );
  }
  return { kind, path };
}

function pathExistsOnGitRef(
  repoRoot: string,
  ref: string,
  path: string,
  runCommand: RunCommand,
): boolean {
  const result = runCommand(
    "git",
    ["cat-file", "-e", `${ref}:${path}`],
    repoRoot,
  );
  return commandSucceeded(result);
}

function collectBranchChangedPaths(
  repoRoot: string,
  branchName: string,
  mainRef: string,
  runCommand: RunCommand,
): { paths: string[]; issue?: string } {
  if (!gitRefExists(repoRoot, branchName, runCommand)) {
    return {
      paths: [],
      issue: `branch ref "${branchName}" is not available for landing-surface discovery`,
    };
  }

  const mergeBaseResult = runCommand(
    "git",
    ["merge-base", mainRef, branchName],
    repoRoot,
  );
  const mergeBase = mergeBaseResult.stdout.trim();
  if (!commandSucceeded(mergeBaseResult) || !mergeBase) {
    return {
      paths: [],
      issue: `unable to resolve merge-base between ${mainRef} and ${branchName}`,
    };
  }

  const diffResult = runCommand(
    "git",
    ["diff", "--name-only", `${mergeBase}..${branchName}`],
    repoRoot,
  );
  if (!commandSucceeded(diffResult)) {
    return {
      paths: [],
      issue: `unable to diff ${branchName} against merge-base ${mergeBase}`,
    };
  }

  const paths = [
    ...new Set(
      diffResult.stdout
        .split("\n")
        .map((line) => normalizeRepoRelativePath(repoRoot, line))
        .filter((path) => path.length > 0 && isLandingSurfacePath(path)),
    ),
  ].sort();

  return { paths };
}

function resolveExpectedLandingSurfaces(input: {
  candidate: TerminalLaneLandingCandidate;
  expectedLandingSurfacesByLane?: Record<string, TerminalLaneLandingSurface[]>;
  mainRef: string;
  repoRoot: string;
  runCommand: RunCommand;
}): {
  issues: string[];
  source: TerminalLaneLandingSurfaceSource;
  surfaces: TerminalLaneLandingSurface[];
} {
  const explicitSurfaces =
    input.expectedLandingSurfacesByLane?.[input.candidate.laneName];
  if (explicitSurfaces && explicitSurfaces.length > 0) {
    return {
      source: "explicit",
      surfaces: explicitSurfaces,
      issues: [],
    };
  }

  const branchName =
    input.candidate.branchIdentity.status === "present"
      ? input.candidate.branchIdentity.branchName
      : undefined;
  if (!branchName) {
    return {
      source: UNAVAILABLE_EVIDENCE,
      surfaces: [],
      issues: [
        "expected landing surfaces unavailable because branch identity is missing",
      ],
    };
  }

  const branchPaths = collectBranchChangedPaths(
    input.repoRoot,
    branchName,
    input.mainRef,
    input.runCommand,
  );
  if (branchPaths.paths.length === 0) {
    return {
      source: UNAVAILABLE_EVIDENCE,
      surfaces: [],
      issues: [
        branchPaths.issue ??
          `no landing surfaces discovered from branch diff for ${branchName}`,
      ],
    };
  }

  return {
    source: "branch-diff",
    surfaces: branchPaths.paths.map(buildLandingSurface),
    issues: branchPaths.issue ? [branchPaths.issue] : [],
  };
}

function readPlannerRootDirtyPathIndex(
  repoRoot: string,
  plannerRootGitStatusText: string | undefined,
  runCommand: RunCommand,
): {
  available: boolean;
  dirtyPathsByPath: Map<string, { changeKind: string; statusCode: string }>;
} {
  let statusText = plannerRootGitStatusText;
  if (statusText === undefined) {
    const statusResult = runCommand(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      repoRoot,
    );
    if (!commandSucceeded(statusResult)) {
      return {
        available: false,
        dirtyPathsByPath: new Map(),
      };
    }
    statusText = statusResult.stdout;
  }

  const dirtyPathsByPath = new Map<
    string,
    { changeKind: string; statusCode: string }
  >();
  for (const dirtyPath of parsePlannerRelevantDirtyPaths(statusText, "root")) {
    dirtyPathsByPath.set(dirtyPath.path, {
      changeKind: dirtyPath.changeKind,
      statusCode: dirtyPath.statusCode,
    });
  }

  return {
    available: true,
    dirtyPathsByPath,
  };
}

function evaluatePlannerRootSurfaceEvidence(input: {
  dirtyPathsByPath: Map<string, { changeKind: string; statusCode: string }>;
  path: string;
  plannerRootAvailable: boolean;
  repoRoot: string;
}): TerminalLaneLandingSurfaceEvidence["plannerRoot"] {
  if (!input.plannerRootAvailable) {
    return {
      status: UNAVAILABLE_EVIDENCE,
      reason: "planner root git status unavailable",
    };
  }

  const dirtyPath = input.dirtyPathsByPath.get(input.path);
  if (!dirtyPath) {
    return {
      status: "clean",
      reason: "path not reported dirty in planner root checkout",
    };
  }

  if (dirtyPath.changeKind === "deleted") {
    return {
      status: "deleted",
      changeKind: dirtyPath.changeKind,
      reason: `planner root reports deleted (${dirtyPath.statusCode})`,
    };
  }

  return {
    status: "dirty",
    changeKind: dirtyPath.changeKind,
    reason: `planner root reports ${dirtyPath.changeKind} (${dirtyPath.statusCode})`,
  };
}

function evaluateMainSurfaceEvidence(input: {
  mainRef: string;
  mainRefAvailable: boolean;
  path: string;
  repoRoot: string;
  runCommand: RunCommand;
}): TerminalLaneLandingSurfaceEvidence["main"] {
  if (!input.mainRefAvailable) {
    return {
      status: UNAVAILABLE_EVIDENCE,
      mainRef: input.mainRef,
      reason: `main ref "${input.mainRef}" is not available`,
    };
  }

  const present = pathExistsOnGitRef(
    input.repoRoot,
    input.mainRef,
    input.path,
    input.runCommand,
  );
  return {
    status: present ? "present" : "absent",
    mainRef: input.mainRef,
    reason: present
      ? `path present on ${input.mainRef}`
      : `path absent on ${input.mainRef}`,
  };
}

function compareCandidateLandingSurfaces(input: {
  candidate: TerminalLaneLandingCandidate;
  expectedLandingSurfacesByLane?: Record<string, TerminalLaneLandingSurface[]>;
  mainRef: string;
  mainRefAvailable: boolean;
  plannerRootDirtyPaths: Map<
    string,
    { changeKind: string; statusCode: string }
  >;
  plannerRootAvailable: boolean;
  repoRoot: string;
  runCommand: RunCommand;
}): TerminalLaneLandingSurfaceComparison {
  const resolved = resolveExpectedLandingSurfaces({
    candidate: input.candidate,
    expectedLandingSurfacesByLane: input.expectedLandingSurfacesByLane,
    mainRef: input.mainRef,
    repoRoot: input.repoRoot,
    runCommand: input.runCommand,
  });

  const surfaces = resolved.surfaces.map((surface) => ({
    surface,
    main: evaluateMainSurfaceEvidence({
      mainRef: input.mainRef,
      mainRefAvailable: input.mainRefAvailable,
      path: surface.path,
      repoRoot: input.repoRoot,
      runCommand: input.runCommand,
    }),
    plannerRoot: evaluatePlannerRootSurfaceEvidence({
      dirtyPathsByPath: input.plannerRootDirtyPaths,
      path: surface.path,
      plannerRootAvailable: input.plannerRootAvailable,
      repoRoot: input.repoRoot,
    }),
  }));

  return {
    laneName: input.candidate.laneName,
    mainRef: input.mainRef,
    surfaceSource: resolved.source,
    surfaces,
    issues: resolved.issues,
  };
}

export function compareTerminalLaneLandingSurfaces(
  options: CompareTerminalLaneLandingSurfacesOptions,
): TerminalLaneLandingSurfaceComparisonReport {
  if (options.surfaceComparisonReport) {
    return options.surfaceComparisonReport;
  }

  const repoRoot = resolve(options.repoRoot);
  const runCommand = options.runCommand ?? defaultRunCommand;
  const mainRef =
    options.mainRef ?? resolveDefaultMainRef(repoRoot, runCommand);
  const mainRefAvailable = gitRefExists(repoRoot, mainRef, runCommand);
  const plannerRootSnapshot = readPlannerRootDirtyPathIndex(
    repoRoot,
    options.plannerRootGitStatusText,
    runCommand,
  );

  const comparisons = options.candidates.map((candidate) =>
    compareCandidateLandingSurfaces({
      candidate,
      expectedLandingSurfacesByLane: options.expectedLandingSurfacesByLane,
      mainRef,
      mainRefAvailable,
      plannerRootAvailable: plannerRootSnapshot.available,
      plannerRootDirtyPaths: plannerRootSnapshot.dirtyPathsByPath,
      repoRoot,
      runCommand,
    }),
  );

  return {
    generatedAtUtc: new Date().toISOString(),
    repoRoot,
    mainRef,
    comparisonCount: comparisons.length,
    comparisons: comparisons.sort((left, right) =>
      left.laneName.localeCompare(right.laneName),
    ),
  };
}

export function formatTerminalLaneLandingSurfaceEvidence(
  evidence: TerminalLaneLandingSurfaceEvidence,
): string {
  return `${evidence.surface.kind} path=${evidence.surface.path} main=${evidence.main.status} planner-root=${evidence.plannerRoot.status}`;
}

export function formatTerminalLaneLandingSurfaceComparison(
  comparison: TerminalLaneLandingSurfaceComparison,
): string {
  const lines = [
    `lane=${comparison.laneName} main-ref=${comparison.mainRef} surface-source=${comparison.surfaceSource}`,
  ];

  if (comparison.issues.length > 0) {
    lines.push(`  issues: ${comparison.issues.join("; ")}`);
  }

  if (comparison.surfaces.length === 0) {
    lines.push("  surfaces: none");
    return lines.join("\n");
  }

  lines.push("  surfaces:");
  for (const surfaceEvidence of comparison.surfaces) {
    lines.push(
      `    - ${formatTerminalLaneLandingSurfaceEvidence(surfaceEvidence)}`,
    );
  }

  return lines.join("\n");
}

export type TerminalLaneLandingStatus =
  | "landed"
  | "remote-only"
  | "partial"
  | "reconciliation-required";

export interface TerminalLaneLandingSurfaceEvidenceSummary {
  totalSurfaces: number;
  mainPresent: number;
  mainAbsent: number;
  mainUnavailable: number;
  plannerRootClean: number;
  plannerRootDrift: number;
  plannerRootUnavailable: number;
}

export interface TerminalLaneLandingClassification {
  laneName: string;
  status: TerminalLaneLandingStatus;
  reasons: string[];
  surfaceEvidence: TerminalLaneLandingSurfaceEvidenceSummary;
  citedSurfaces: TerminalLaneLandingSurfaceEvidence[];
}

export interface TerminalLaneLandingClassificationReport {
  generatedAtUtc: string;
  repoRoot: string;
  mainRef: string;
  classificationCount: number;
  classifications: TerminalLaneLandingClassification[];
}

export interface ClassifyTerminalLaneLandingStatusesOptions {
  candidates?: TerminalLaneLandingCandidate[];
  classificationReport?: TerminalLaneLandingClassificationReport;
  comparisonReport: TerminalLaneLandingSurfaceComparisonReport;
}

function summarizeSurfaceEvidence(
  surfaces: TerminalLaneLandingSurfaceEvidence[],
): TerminalLaneLandingSurfaceEvidenceSummary {
  const summary: TerminalLaneLandingSurfaceEvidenceSummary = {
    totalSurfaces: surfaces.length,
    mainPresent: 0,
    mainAbsent: 0,
    mainUnavailable: 0,
    plannerRootClean: 0,
    plannerRootDrift: 0,
    plannerRootUnavailable: 0,
  };

  for (const surface of surfaces) {
    switch (surface.main.status) {
      case "present":
        summary.mainPresent += 1;
        break;
      case "absent":
        summary.mainAbsent += 1;
        break;
      case UNAVAILABLE_EVIDENCE:
        summary.mainUnavailable += 1;
        break;
    }

    switch (surface.plannerRoot.status) {
      case "clean":
        summary.plannerRootClean += 1;
        break;
      case "dirty":
      case "deleted":
        summary.plannerRootDrift += 1;
        break;
      case UNAVAILABLE_EVIDENCE:
        summary.plannerRootUnavailable += 1;
        break;
    }
  }

  return summary;
}

function formatSurfaceCitation(
  evidence: TerminalLaneLandingSurfaceEvidence,
): string {
  return `${evidence.surface.kind} ${evidence.surface.path} (main=${evidence.main.status}, planner-root=${evidence.plannerRoot.status})`;
}

function isTerminalCompleteCandidate(
  candidate: TerminalLaneLandingCandidate | undefined,
): boolean {
  if (!candidate) {
    return false;
  }

  if (candidate.source === "queue-terminal-complete") {
    return true;
  }

  if (candidate.terminalState.status !== "present") {
    return false;
  }

  const rawState = candidate.terminalState.rawState.toLowerCase();
  return rawState.includes("complete");
}

export function classifyTerminalLaneLandingStatus(input: {
  candidate?: TerminalLaneLandingCandidate;
  comparison: TerminalLaneLandingSurfaceComparison;
}): TerminalLaneLandingClassification {
  const { comparison, candidate } = input;
  const surfaces = comparison.surfaces;
  const surfaceEvidence = summarizeSurfaceEvidence(surfaces);
  const terminalComplete = isTerminalCompleteCandidate(candidate);
  const citedSurfaces: TerminalLaneLandingSurfaceEvidence[] = [];
  const reasons: string[] = [];

  const citeSurface = (evidence: TerminalLaneLandingSurfaceEvidence): void => {
    citedSurfaces.push(evidence);
  };

  if (
    comparison.surfaceSource === UNAVAILABLE_EVIDENCE ||
    surfaces.length === 0
  ) {
    const issueSummary =
      comparison.issues.join("; ") ||
      "expected landing surfaces are unavailable";
    if (terminalComplete) {
      reasons.push(
        `terminal-complete lane lacks verifiable landing surfaces: ${issueSummary}`,
      );
    } else {
      reasons.push(`landing surface evidence is incomplete: ${issueSummary}`);
    }
    return {
      laneName: comparison.laneName,
      status: terminalComplete ? "reconciliation-required" : "partial",
      reasons,
      surfaceEvidence,
      citedSurfaces,
    };
  }

  if (surfaceEvidence.mainUnavailable > 0) {
    for (const surface of surfaces) {
      if (surface.main.status === UNAVAILABLE_EVIDENCE) {
        citeSurface(surface);
      }
    }
    reasons.push(
      `main-branch landing evidence is unavailable for ${surfaceEvidence.mainUnavailable}/${surfaceEvidence.totalSurfaces} expected surfaces`,
    );
    return {
      laneName: comparison.laneName,
      status: "partial",
      reasons,
      surfaceEvidence,
      citedSurfaces,
    };
  }

  const allMainPresent =
    surfaceEvidence.mainPresent === surfaceEvidence.totalSurfaces;
  const allMainAbsent =
    surfaceEvidence.mainAbsent === surfaceEvidence.totalSurfaces;
  const someMainAbsent = surfaceEvidence.mainAbsent > 0;
  const allPlannerRootClean =
    surfaceEvidence.plannerRootClean === surfaceEvidence.totalSurfaces;
  const plannerRootDrift = surfaces.filter(
    (surface) =>
      surface.plannerRoot.status === "dirty" ||
      surface.plannerRoot.status === "deleted",
  );

  if (allMainPresent && allPlannerRootClean) {
    if (terminalComplete) {
      reasons.push(
        `terminal-complete lane and all ${surfaceEvidence.totalSurfaces} expected landing surfaces are present on ${comparison.mainRef} with clean planner-root checkout`,
      );
      return {
        laneName: comparison.laneName,
        status: "landed",
        reasons,
        surfaceEvidence,
        citedSurfaces: [...surfaces],
      };
    }

    reasons.push(
      `all ${surfaceEvidence.totalSurfaces} expected landing surfaces are present on ${comparison.mainRef}, but terminal-complete queue evidence is unavailable`,
    );
    return {
      laneName: comparison.laneName,
      status: "partial",
      reasons,
      surfaceEvidence,
      citedSurfaces: [...surfaces],
    };
  }

  if (allMainPresent && plannerRootDrift.length > 0) {
    for (const surface of plannerRootDrift) {
      citeSurface(surface);
    }
    reasons.push(
      `${comparison.mainRef} contains all expected landing surfaces, but planner-root checkout does not reflect them cleanly`,
    );
    return {
      laneName: comparison.laneName,
      status: "remote-only",
      reasons,
      surfaceEvidence,
      citedSurfaces,
    };
  }

  if (allMainPresent && surfaceEvidence.plannerRootUnavailable > 0) {
    for (const surface of surfaces) {
      if (surface.plannerRoot.status === UNAVAILABLE_EVIDENCE) {
        citeSurface(surface);
      }
    }
    reasons.push(
      `all expected landing surfaces are present on ${comparison.mainRef}, but planner-root checkout evidence is incomplete`,
    );
    return {
      laneName: comparison.laneName,
      status: "partial",
      reasons,
      surfaceEvidence,
      citedSurfaces,
    };
  }

  if (someMainAbsent) {
    for (const surface of surfaces) {
      if (surface.main.status === "absent") {
        citeSurface(surface);
      }
    }

    if (terminalComplete) {
      reasons.push(
        `terminal-complete lane conflicts with missing main-branch landing surfaces (${surfaceEvidence.mainAbsent}/${surfaceEvidence.totalSurfaces} absent on ${comparison.mainRef})`,
      );
      return {
        laneName: comparison.laneName,
        status: "reconciliation-required",
        reasons,
        surfaceEvidence,
        citedSurfaces,
      };
    }

    reasons.push(
      `only ${surfaceEvidence.mainPresent}/${surfaceEvidence.totalSurfaces} expected landing surfaces are present on ${comparison.mainRef}`,
    );
    return {
      laneName: comparison.laneName,
      status: "partial",
      reasons,
      surfaceEvidence,
      citedSurfaces,
    };
  }

  if (allMainAbsent) {
    for (const surface of surfaces) {
      citeSurface(surface);
    }

    if (terminalComplete) {
      reasons.push(
        `terminal-complete lane has no expected landing surfaces present on ${comparison.mainRef}`,
      );
      return {
        laneName: comparison.laneName,
        status: "reconciliation-required",
        reasons,
        surfaceEvidence,
        citedSurfaces,
      };
    }

    reasons.push(
      `none of the ${surfaceEvidence.totalSurfaces} expected landing surfaces are present on ${comparison.mainRef}`,
    );
    return {
      laneName: comparison.laneName,
      status: "partial",
      reasons,
      surfaceEvidence,
      citedSurfaces,
    };
  }

  reasons.push(
    "landing surface evidence does not match landed, remote-only, partial, or reconciliation-required patterns",
  );
  return {
    laneName: comparison.laneName,
    status: "partial",
    reasons,
    surfaceEvidence,
    citedSurfaces: [...surfaces],
  };
}

export function classifyTerminalLaneLandingStatuses(
  options: ClassifyTerminalLaneLandingStatusesOptions,
): TerminalLaneLandingClassificationReport {
  if (options.classificationReport) {
    return options.classificationReport;
  }

  const candidatesByLane = new Map(
    (options.candidates ?? []).map((candidate) => [
      candidate.laneName,
      candidate,
    ]),
  );

  const classifications = options.comparisonReport.comparisons.map(
    (comparison) =>
      classifyTerminalLaneLandingStatus({
        comparison,
        candidate: candidatesByLane.get(comparison.laneName),
      }),
  );

  return {
    generatedAtUtc: new Date().toISOString(),
    repoRoot: options.comparisonReport.repoRoot,
    mainRef: options.comparisonReport.mainRef,
    classificationCount: classifications.length,
    classifications: classifications.sort((left, right) =>
      left.laneName.localeCompare(right.laneName),
    ),
  };
}

export function formatTerminalLaneLandingClassification(
  classification: TerminalLaneLandingClassification,
): string {
  const evidenceSummary = [
    `surfaces=${classification.surfaceEvidence.totalSurfaces}`,
    `main-present=${classification.surfaceEvidence.mainPresent}`,
    `main-absent=${classification.surfaceEvidence.mainAbsent}`,
    `planner-root-drift=${classification.surfaceEvidence.plannerRootDrift}`,
  ].join(" ");

  const lines = [
    `lane=${classification.laneName} status=${classification.status} ${evidenceSummary}`,
    `  reasons: ${classification.reasons.join("; ")}`,
  ];

  if (classification.citedSurfaces.length > 0) {
    lines.push("  cited-surfaces:");
    for (const surface of classification.citedSurfaces) {
      lines.push(`    - ${formatSurfaceCitation(surface)}`);
    }
  }

  return lines.join("\n");
}

export function formatTerminalLaneLandingClassificationReport(
  report: TerminalLaneLandingClassificationReport,
): string {
  const lines = [
    "Terminal Lane Main-Branch Landing Audit — landing status classification",
    `Generated: ${report.generatedAtUtc}`,
    `Repo root: ${report.repoRoot}`,
    `Main ref: ${report.mainRef}`,
    `Classifications: ${report.classificationCount}`,
  ];

  if (report.classifications.length === 0) {
    lines.push("No landing-status classifications were produced.");
    return lines.join("\n");
  }

  lines.push("Classifications:");
  for (const classification of report.classifications) {
    lines.push(formatTerminalLaneLandingClassification(classification));
  }

  return lines.join("\n");
}

export function formatTerminalLaneLandingSurfaceComparisonReport(
  report: TerminalLaneLandingSurfaceComparisonReport,
): string {
  const lines = [
    "Terminal Lane Main-Branch Landing Audit — surface comparison",
    `Generated: ${report.generatedAtUtc}`,
    `Repo root: ${report.repoRoot}`,
    `Main ref: ${report.mainRef}`,
    `Comparisons: ${report.comparisonCount}`,
  ];

  if (report.comparisons.length === 0) {
    lines.push("No landing-surface comparisons were produced.");
    return lines.join("\n");
  }

  lines.push("Comparisons:");
  for (const comparison of report.comparisons) {
    lines.push(formatTerminalLaneLandingSurfaceComparison(comparison));
  }

  return lines.join("\n");
}
