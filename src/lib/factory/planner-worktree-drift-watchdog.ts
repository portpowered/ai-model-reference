import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import {
  type ConflictHotspotSurfaceCategory,
  classifyConflictHotspotSurfaceCategory,
} from "./conflict-hotspot-report";
import {
  discoverQueueWorktreePrLinkageLedger,
  type QueueWorktreePrLinkageLane,
  type QueueWorktreePrLinkageLedger,
} from "./queue-worktree-pr-linkage-ledger";

export const PLANNER_WORKTREE_DRIFT_WATCHDOG_HEADER =
  "Planner Worktree Drift Watchdog";

export type PlannerWorktreeDriftLocation = "root" | "worktree";
export type PlannerWorktreeDriftChangeKind =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "type-changed"
  | "unknown";
export type PlannerWorktreeDriftOwnershipKind =
  | "root-owned"
  | "worktree-owned"
  | "unowned";

export interface PlannerWorktreeDriftOwnership {
  branchName?: string;
  kind: PlannerWorktreeDriftOwnershipKind;
  laneName?: string;
  linkageStatus?: QueueWorktreePrLinkageLane["linkageStatus"];
  reason: string;
  worktreePath?: string;
}

export interface PlannerWorktreeDirtyPath {
  category: ConflictHotspotSurfaceCategory;
  changeKind: PlannerWorktreeDriftChangeKind;
  location: PlannerWorktreeDriftLocation;
  ownership: PlannerWorktreeDriftOwnership;
  path: string;
  statusCode: string;
  surface: string;
}

export interface PlannerWorktreeDriftRootSnapshot {
  dirtyPathCount: number;
  dirtyPaths: PlannerWorktreeDirtyPath[];
  repoRoot: string;
}

export interface PlannerWorktreeDriftLaneSnapshot {
  branchName?: string;
  dirtyPathCount: number;
  dirtyPaths: PlannerWorktreeDirtyPath[];
  laneName: string;
  linkageStatus: QueueWorktreePrLinkageLane["linkageStatus"];
  worktreePath: string;
}

export interface PlannerWorktreeDriftSnapshot {
  activeLaneCount: number;
  evaluatedWorktreeCount: number;
  generatedAtUtc: string;
  issues: string[];
  root: PlannerWorktreeDriftRootSnapshot;
  totalDirtyPathCount: number;
  worktrees: PlannerWorktreeDriftLaneSnapshot[];
}

export interface DiscoverPlannerWorktreeDriftOptions {
  generatedAtUtc?: string;
  linkageLedger?: QueueWorktreePrLinkageLedger;
  repoRoot?: string;
  sessionListJsonText?: string;
  workListJsonText?: string;
  worktreesDir?: string;
}

type RunGitStatus = (cwd: string) => string;

interface PlannerWorktreeOwnershipCandidate {
  branchName?: string;
  dirtyPaths: PlannerWorktreeDirtyPath[];
  laneName: string;
  linkageStatus: QueueWorktreePrLinkageLane["linkageStatus"];
  worktreePath: string;
}

const NON_PLANNER_SURFACE_PATHS = new Set([
  "prd.json",
  "prd.md",
  "progress.txt",
]);

function defaultRunGitStatus(cwd: string): string {
  const result = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd,
      encoding: "utf8",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const details = [
      `git status --porcelain=v1 --untracked-files=all failed for ${cwd}.`,
    ];
    if (typeof result.status === "number") {
      details.push(`exit status: ${result.status}`);
    }
    if (stderr) {
      details.push(`stderr:\n${stderr}`);
    }
    if (stdout) {
      details.push(`stdout:\n${stdout}`);
    }
    throw new Error(details.join("\n"));
  }

  return result.stdout ?? "";
}

function normalizeRepoPath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function deriveSurfaceLabel(path: string): string {
  const normalizedPath = normalizeRepoPath(path);
  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return normalizedPath;
  }

  if (segments[0] === "src" || segments[0] === "factory") {
    return segments.slice(0, Math.min(3, segments.length)).join("/");
  }

  if (segments[0] === "docs") {
    return segments.length >= 3 ? segments.slice(0, 2).join("/") : "docs";
  }

  return segments.slice(0, Math.min(2, segments.length)).join("/");
}

function classifyChangeKind(
  statusCode: string,
): PlannerWorktreeDriftChangeKind {
  if (statusCode === "??") {
    return "untracked";
  }

  const significantCode = [...statusCode].find(
    (character) => character !== " ",
  );
  switch (significantCode) {
    case "M":
      return "modified";
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "T":
      return "type-changed";
    default:
      return "unknown";
  }
}

function extractStatusPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  const renameSplit = trimmed.split(" -> ");
  return normalizeRepoPath(renameSplit[renameSplit.length - 1] ?? trimmed);
}

function isPlannerRelevantPath(path: string): boolean {
  if (!path || NON_PLANNER_SURFACE_PATHS.has(path)) {
    return false;
  }

  return !path.startsWith(".claude/");
}

export function parsePlannerRelevantDirtyPaths(
  statusOutput: string,
  location: PlannerWorktreeDriftLocation,
): PlannerWorktreeDirtyPath[] {
  const dirtyPaths: PlannerWorktreeDirtyPath[] = [];

  for (const line of statusOutput.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const statusCode = line.slice(0, 2);
    const rawPath = line.slice(3);
    const path = extractStatusPath(rawPath);
    if (!isPlannerRelevantPath(path)) {
      continue;
    }

    dirtyPaths.push({
      category: classifyConflictHotspotSurfaceCategory(path),
      changeKind: classifyChangeKind(statusCode),
      location,
      ownership: {
        kind: "unowned",
        reason: "Ownership has not been attributed yet.",
      },
      path,
      statusCode,
      surface: deriveSurfaceLabel(path),
    });
  }

  return dirtyPaths.sort((left, right) => left.path.localeCompare(right.path));
}

function resolveLedger(
  options: DiscoverPlannerWorktreeDriftOptions,
): QueueWorktreePrLinkageLedger {
  if (options.linkageLedger) {
    return options.linkageLedger;
  }

  if (
    !options.workListJsonText ||
    !options.sessionListJsonText ||
    !options.worktreesDir
  ) {
    throw new Error(
      "Planner worktree drift watchdog requires a linkage ledger or queue/worktree discovery inputs.",
    );
  }

  return discoverQueueWorktreePrLinkageLedger({
    repoRoot: options.repoRoot,
    sessionListJsonText: options.sessionListJsonText,
    workListJsonText: options.workListJsonText,
    worktreesDir: options.worktreesDir,
  });
}

function collectRootSnapshot(
  repoRoot: string,
  runGitStatus: RunGitStatus,
): PlannerWorktreeDriftRootSnapshot {
  const dirtyPaths = parsePlannerRelevantDirtyPaths(
    runGitStatus(repoRoot),
    "root",
  );

  return {
    dirtyPathCount: dirtyPaths.length,
    dirtyPaths,
    repoRoot,
  };
}

function collectWorktreeSnapshot(
  repoRoot: string,
  lane: QueueWorktreePrLinkageLane,
  runGitStatus: RunGitStatus,
): PlannerWorktreeDriftLaneSnapshot | null {
  if (lane.queueState !== "active" || !lane.worktreePath) {
    return null;
  }

  const resolvedWorktreePath = resolve(repoRoot, lane.worktreePath);
  const dirtyPaths = parsePlannerRelevantDirtyPaths(
    runGitStatus(resolvedWorktreePath),
    "worktree",
  );

  return {
    branchName: lane.branchName,
    dirtyPathCount: dirtyPaths.length,
    dirtyPaths,
    laneName: lane.laneName,
    linkageStatus: lane.linkageStatus,
    worktreePath: resolvedWorktreePath,
  };
}

function buildWorktreeOwnedReason(
  lane: Pick<
    PlannerWorktreeDriftLaneSnapshot,
    "laneName" | "branchName" | "linkageStatus" | "worktreePath"
  >,
  repoRoot: string,
): PlannerWorktreeDriftOwnership {
  return {
    branchName: lane.branchName,
    kind: "worktree-owned",
    laneName: lane.laneName,
    linkageStatus: lane.linkageStatus,
    reason: `Dirty path was observed directly in active lane ${lane.laneName}.`,
    worktreePath: formatWorktreePath(repoRoot, lane.worktreePath),
  };
}

function buildOwnershipCandidates(
  worktrees: PlannerWorktreeDriftLaneSnapshot[],
): PlannerWorktreeOwnershipCandidate[] {
  return worktrees.map((worktree) => ({
    branchName: worktree.branchName,
    dirtyPaths: worktree.dirtyPaths,
    laneName: worktree.laneName,
    linkageStatus: worktree.linkageStatus,
    worktreePath: worktree.worktreePath,
  }));
}

function collectMatchingOwnershipCandidates(
  dirtyPath: PlannerWorktreeDirtyPath,
  candidates: PlannerWorktreeOwnershipCandidate[],
): PlannerWorktreeOwnershipCandidate[] {
  const pathMatches = candidates.filter((candidate) =>
    candidate.dirtyPaths.some(
      (candidatePath) => candidatePath.path === dirtyPath.path,
    ),
  );

  if (pathMatches.length > 0) {
    return pathMatches;
  }

  return candidates.filter((candidate) =>
    candidate.dirtyPaths.some(
      (candidatePath) => candidatePath.surface === dirtyPath.surface,
    ),
  );
}

function attributeRootDirtyPathOwnership(
  dirtyPath: PlannerWorktreeDirtyPath,
  candidates: PlannerWorktreeOwnershipCandidate[],
  linkageIssues: string[],
  repoRoot: string,
): PlannerWorktreeDriftOwnership {
  const matchingCandidates = collectMatchingOwnershipCandidates(
    dirtyPath,
    candidates,
  );

  if (matchingCandidates.length === 1) {
    const [match] = matchingCandidates;
    return {
      branchName: match?.branchName,
      kind: "worktree-owned",
      laneName: match?.laneName,
      linkageStatus: match?.linkageStatus,
      reason: match?.dirtyPaths.some(
        (candidatePath) => candidatePath.path === dirtyPath.path,
      )
        ? `Root drift matches dirty path ownership already visible in active lane ${match?.laneName}.`
        : `Root drift matches shared surface ${dirtyPath.surface} already dirty in active lane ${match?.laneName}.`,
      worktreePath: match
        ? formatWorktreePath(repoRoot, match.worktreePath)
        : undefined,
    };
  }

  if (matchingCandidates.length > 1) {
    return {
      kind: "unowned",
      reason: `Ownership is ambiguous across active lanes ${matchingCandidates.map((candidate) => candidate.laneName).join(", ")} on shared surface ${dirtyPath.surface}.`,
    };
  }

  if (linkageIssues.length > 0) {
    return {
      kind: "unowned",
      reason:
        "No active lane currently matches this root drift, and linkage gaps leave ownership unresolved.",
    };
  }

  return {
    kind: "root-owned",
    reason:
      "No active lane currently matches this dirty path or shared surface, so the drift remains rooted in the planner checkout.",
  };
}

function attributeDirtyPathOwnership(
  snapshot: PlannerWorktreeDriftSnapshot,
): PlannerWorktreeDriftSnapshot {
  const ownershipCandidates = buildOwnershipCandidates(snapshot.worktrees);

  const rootDirtyPaths = snapshot.root.dirtyPaths.map((dirtyPath) => ({
    ...dirtyPath,
    ownership: attributeRootDirtyPathOwnership(
      dirtyPath,
      ownershipCandidates,
      snapshot.issues,
      snapshot.root.repoRoot,
    ),
  }));

  const worktrees = snapshot.worktrees.map((worktree) => ({
    ...worktree,
    dirtyPaths: worktree.dirtyPaths.map((dirtyPath) => ({
      ...dirtyPath,
      ownership: buildWorktreeOwnedReason(worktree, snapshot.root.repoRoot),
    })),
  }));

  return {
    ...snapshot,
    root: {
      ...snapshot.root,
      dirtyPaths: rootDirtyPaths,
    },
    worktrees,
  };
}

export function buildPlannerWorktreeDriftSnapshot(
  ledger: QueueWorktreePrLinkageLedger,
  options: {
    generatedAtUtc?: string;
    repoRoot: string;
    runGitStatus?: RunGitStatus;
  },
): PlannerWorktreeDriftSnapshot {
  const repoRoot = resolve(options.repoRoot);
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const root = collectRootSnapshot(repoRoot, runGitStatus);
  const worktrees = ledger.lanes
    .map((lane) => collectWorktreeSnapshot(repoRoot, lane, runGitStatus))
    .filter((lane): lane is PlannerWorktreeDriftLaneSnapshot => lane !== null);
  const totalDirtyPathCount =
    root.dirtyPathCount +
    worktrees.reduce((total, lane) => total + lane.dirtyPathCount, 0);

  return attributeDirtyPathOwnership({
    activeLaneCount: ledger.activeLaneCount,
    evaluatedWorktreeCount: worktrees.length,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    issues: [...ledger.issues],
    root,
    totalDirtyPathCount,
    worktrees,
  });
}

export function discoverPlannerWorktreeDriftSnapshot(
  options: DiscoverPlannerWorktreeDriftOptions,
): PlannerWorktreeDriftSnapshot {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const ledger = resolveLedger(options);

  return buildPlannerWorktreeDriftSnapshot(ledger, {
    generatedAtUtc: options.generatedAtUtc,
    repoRoot,
  });
}

function formatDirtyPath(path: PlannerWorktreeDirtyPath): string {
  const owner = path.ownership.laneName
    ? `${path.ownership.kind}:${path.ownership.laneName}`
    : path.ownership.kind;
  return `path=${path.path} status=${path.statusCode} change=${path.changeKind} surface=${path.surface} category=${path.category} owner=${owner} ownership-reason=${path.ownership.reason}`;
}

function formatWorktreePath(repoRoot: string, worktreePath: string): string {
  const relativePath = relative(repoRoot, worktreePath);
  return relativePath && !relativePath.startsWith("..")
    ? relativePath
    : worktreePath;
}

export function formatPlannerWorktreeDriftReport(
  snapshot: PlannerWorktreeDriftSnapshot,
): string {
  const rootDirtyCount = snapshot.root.dirtyPathCount;
  const worktreeDirtyCount = snapshot.worktrees.reduce(
    (total, worktree) => total + worktree.dirtyPathCount,
    0,
  );
  const lines = [
    PLANNER_WORKTREE_DRIFT_WATCHDOG_HEADER,
    `active-lanes=${snapshot.activeLaneCount} evaluated-worktrees=${snapshot.evaluatedWorktreeCount} root-dirty-shared-paths=${rootDirtyCount} worktree-dirty-shared-paths=${worktreeDirtyCount} total-dirty-shared-paths=${snapshot.totalDirtyPathCount}`,
  ];

  if (snapshot.issues.length > 0) {
    lines.push("");
    for (const issue of snapshot.issues) {
      lines.push(`issue=${issue}`);
    }
  }

  lines.push("");
  lines.push(
    `- location=root repo=${snapshot.root.repoRoot} dirty-shared-paths=${snapshot.root.dirtyPathCount}`,
  );
  for (const dirtyPath of snapshot.root.dirtyPaths) {
    lines.push(`  - ${formatDirtyPath(dirtyPath)}`);
  }

  if (snapshot.worktrees.length === 0) {
    lines.push("- No active worktrees were linked for drift inspection.");
    return lines.join("\n");
  }

  for (const worktree of snapshot.worktrees) {
    lines.push(
      `- location=worktree lane=${worktree.laneName} branch=${worktree.branchName ?? "?"} linkage=${worktree.linkageStatus} worktree=${formatWorktreePath(snapshot.root.repoRoot, worktree.worktreePath)} dirty-shared-paths=${worktree.dirtyPathCount}`,
    );
    for (const dirtyPath of worktree.dirtyPaths) {
      lines.push(`  - ${formatDirtyPath(dirtyPath)}`);
    }
  }

  return lines.join("\n");
}

export function serializePlannerWorktreeDriftSnapshot(
  snapshot: PlannerWorktreeDriftSnapshot,
): string {
  return JSON.stringify(snapshot, null, 2);
}
