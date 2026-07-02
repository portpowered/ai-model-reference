import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import {
  type ConflictHotspotSurfaceCategory,
  classifyConflictHotspotSurfaceCategory,
} from "./conflict-hotspot-report";
import {
  discoverMergedLaneEvidence,
  formatMergedLaneEvidenceSummary,
  type PlannerMergedLaneEvidence,
  type PlannerMergedLaneMergeEvidence,
} from "./planner-merged-lane-evidence";
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
  | "already-merged-owned"
  | "unowned";
export type PlannerWorktreeDriftOwnershipReasonCode =
  | "not-attributed-yet"
  | "direct-worktree-match"
  | "shared-surface-match"
  | "ambiguous-shared-surface"
  | "linkage-gaps-unresolved"
  | "root-unmatched"
  | "already-merged-lane-match"
  | "already-merged-surface-match";
export type PlannerWorktreeDriftNextAction =
  | "wait"
  | "investigate"
  | "investigate-and-preserve"
  | "open-follow-up-throughput-prd";
export type PlannerWorktreeDriftRiskKind =
  | "multi-lane-hotspot-collision"
  | "ownerless-root-dirty-paths"
  | "ambiguous-shared-surface-ownership"
  | "already-merged-root-drift";

export const PLANNER_OWNERLESS_ROOT_DRIFT_PRESERVE_POLICY =
  "Do not revert or overwrite root dirty paths as part of drift repair.";

export const PLANNER_OWNERLESS_ROOT_DRIFT_NEXT_SAFE_ACTION =
  "Investigate and preserve the root dirty paths until ownership is resolved.";

export const PLANNER_OWNERLESS_ROOT_DRIFT_TARGET_SESSION_ID =
  "0fdc5077-95ed-4396-a183-06e5b16555ca";

export interface PlannerWorktreeDriftOwnership {
  branchName?: string;
  kind: PlannerWorktreeDriftOwnershipKind;
  laneName?: string;
  linkageStatus?: QueueWorktreePrLinkageLane["linkageStatus"];
  mergeEvidence?: PlannerMergedLaneMergeEvidence;
  reasonCode: PlannerWorktreeDriftOwnershipReasonCode;
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
  nextAction: PlannerWorktreeDriftNextAction;
  worktreePath: string;
}

export interface PlannerWorktreeDriftRisk {
  category?: ConflictHotspotSurfaceCategory;
  evidenceSummary: string;
  kind: PlannerWorktreeDriftRiskKind;
  laneNames: string[];
  nextAction: PlannerWorktreeDriftNextAction;
  path?: string;
  surface?: string;
}

export interface PlannerWorktreeDriftSnapshot {
  activeLaneCount: number;
  evaluatedWorktreeCount: number;
  generatedAtUtc: string;
  issues: string[];
  mergedLaneCount: number;
  mergedLanes: PlannerMergedLaneEvidence[];
  risks: PlannerWorktreeDriftRisk[];
  root: PlannerWorktreeDriftRootSnapshot;
  totalDirtyPathCount: number;
  worktrees: PlannerWorktreeDriftLaneSnapshot[];
}

export interface DiscoverPlannerWorktreeDriftOptions {
  baseBranchName?: string;
  generatedAtUtc?: string;
  linkageLedger?: QueueWorktreePrLinkageLedger;
  mergedLaneEvidence?: PlannerMergedLaneEvidence[];
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

interface PlannerMergedLaneOwnershipCandidate {
  branchName?: string;
  dirtyPaths: PlannerWorktreeDirtyPath[];
  laneName: string;
  mergeEvidence: PlannerMergedLaneMergeEvidence;
  worktreePath?: string;
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
        reasonCode: "not-attributed-yet",
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
    nextAction: "wait",
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
    reasonCode: "direct-worktree-match",
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

function buildMergedLaneOwnershipCandidates(
  mergedLanes: PlannerMergedLaneEvidence[],
  runGitStatus: RunGitStatus,
): PlannerMergedLaneOwnershipCandidate[] {
  return mergedLanes.map((lane) => ({
    branchName: lane.branchName,
    dirtyPaths: lane.worktreePath
      ? parsePlannerRelevantDirtyPaths(
          runGitStatus(lane.worktreePath),
          "worktree",
        )
      : [],
    laneName: lane.laneName,
    mergeEvidence: lane.mergeEvidence,
    worktreePath: lane.worktreePath,
  }));
}

function collectMatchingMergedLaneCandidates(
  dirtyPath: PlannerWorktreeDirtyPath,
  candidates: PlannerMergedLaneOwnershipCandidate[],
): PlannerMergedLaneOwnershipCandidate[] {
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

function buildAlreadyMergedOwnership(
  dirtyPath: PlannerWorktreeDirtyPath,
  match: PlannerMergedLaneOwnershipCandidate,
  repoRoot: string,
): PlannerWorktreeDriftOwnership {
  const directPathMatch = match.dirtyPaths.some(
    (candidatePath) => candidatePath.path === dirtyPath.path,
  );
  const evidenceSummary = formatMergedLaneEvidenceSummary(match.mergeEvidence);

  return {
    branchName: match.branchName,
    kind: "already-merged-owned",
    laneName: match.laneName,
    mergeEvidence: match.mergeEvidence,
    reasonCode: directPathMatch
      ? "already-merged-lane-match"
      : "already-merged-surface-match",
    reason: directPathMatch
      ? `Root drift matches already-merged lane ${match.laneName} (${evidenceSummary}).`
      : `Root drift matches shared surface ${dirtyPath.surface} from already-merged lane ${match.laneName} (${evidenceSummary}).`,
    worktreePath: match.worktreePath
      ? formatWorktreePath(repoRoot, match.worktreePath)
      : undefined,
  };
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
  mergedCandidates: PlannerMergedLaneOwnershipCandidate[],
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
      reasonCode: match?.dirtyPaths.some(
        (candidatePath) => candidatePath.path === dirtyPath.path,
      )
        ? "direct-worktree-match"
        : "shared-surface-match",
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
      reasonCode: "ambiguous-shared-surface",
      reason: `Ownership is ambiguous across active lanes ${matchingCandidates.map((candidate) => candidate.laneName).join(", ")} on shared surface ${dirtyPath.surface}.`,
    };
  }

  const matchingMergedCandidates = collectMatchingMergedLaneCandidates(
    dirtyPath,
    mergedCandidates,
  );
  if (matchingMergedCandidates.length === 1) {
    const [match] = matchingMergedCandidates;
    if (match) {
      return buildAlreadyMergedOwnership(dirtyPath, match, repoRoot);
    }
  }
  if (matchingMergedCandidates.length > 1) {
    return {
      kind: "unowned",
      reasonCode: "ambiguous-shared-surface",
      reason: `Ownership is ambiguous across already-merged lanes ${matchingMergedCandidates.map((candidate) => candidate.laneName).join(", ")} on shared surface ${dirtyPath.surface}.`,
    };
  }

  if (linkageIssues.length > 0) {
    return {
      kind: "unowned",
      reasonCode: "linkage-gaps-unresolved",
      reason:
        "Ownerless root dirty path: no active lane matches this drift and linkage gaps leave ownership unresolved.",
    };
  }

  return {
    kind: "root-owned",
    reasonCode: "root-unmatched",
    reason:
      "Ownerless root dirty path: no active or merged lane currently matches this dirty path or shared surface.",
  };
}

function collectSharedSurfaceLaneMap(
  worktrees: PlannerWorktreeDriftLaneSnapshot[],
): Map<
  string,
  { category: ConflictHotspotSurfaceCategory; laneNames: Set<string> }
> {
  const surfaces = new Map<
    string,
    { category: ConflictHotspotSurfaceCategory; laneNames: Set<string> }
  >();

  for (const worktree of worktrees) {
    for (const dirtyPath of worktree.dirtyPaths) {
      const existing = surfaces.get(dirtyPath.surface);
      if (existing) {
        existing.laneNames.add(worktree.laneName);
        continue;
      }
      surfaces.set(dirtyPath.surface, {
        category: dirtyPath.category,
        laneNames: new Set([worktree.laneName]),
      });
    }
  }

  return surfaces;
}

function buildDriftRisks(
  snapshot: PlannerWorktreeDriftSnapshot,
): PlannerWorktreeDriftRisk[] {
  const risks: PlannerWorktreeDriftRisk[] = [];
  const sharedSurfaceLaneMap = collectSharedSurfaceLaneMap(snapshot.worktrees);

  for (const [surface, details] of sharedSurfaceLaneMap.entries()) {
    const laneNames = [...details.laneNames].sort((left, right) =>
      left.localeCompare(right),
    );
    if (laneNames.length < 2) {
      continue;
    }
    risks.push({
      category: details.category,
      evidenceSummary: `Multiple active lanes currently have dirty paths on shared surface ${surface}: ${laneNames.join(", ")}.`,
      kind: "multi-lane-hotspot-collision",
      laneNames,
      nextAction: "open-follow-up-throughput-prd",
      surface,
    });
  }

  for (const dirtyPath of snapshot.root.dirtyPaths) {
    if (dirtyPath.ownership.reasonCode === "ambiguous-shared-surface") {
      const laneNames = [
        ...(sharedSurfaceLaneMap.get(dirtyPath.surface)?.laneNames ?? []),
      ].sort((left, right) => left.localeCompare(right));
      risks.push({
        category: dirtyPath.category,
        evidenceSummary: `Root dirty path ${dirtyPath.path} overlaps shared surface ${dirtyPath.surface} across active lanes ${laneNames.join(", ")}.`,
        kind: "ambiguous-shared-surface-ownership",
        laneNames,
        nextAction: "investigate",
        path: dirtyPath.path,
        surface: dirtyPath.surface,
      });
      continue;
    }

    if (
      dirtyPath.ownership.reasonCode === "root-unmatched" ||
      dirtyPath.ownership.reasonCode === "linkage-gaps-unresolved"
    ) {
      const ownerlessReason =
        dirtyPath.ownership.reasonCode === "linkage-gaps-unresolved"
          ? "linkage gaps leave ownership unresolved"
          : "no active or merged lane claims it";
      risks.push({
        category: dirtyPath.category,
        evidenceSummary: `Ownerless root dirty path ${dirtyPath.path} (${ownerlessReason}).`,
        kind: "ownerless-root-dirty-paths",
        laneNames: [],
        nextAction: "investigate-and-preserve",
        path: dirtyPath.path,
        surface: dirtyPath.surface,
      });
      continue;
    }

    if (
      dirtyPath.ownership.kind === "already-merged-owned" &&
      dirtyPath.ownership.laneName
    ) {
      const evidenceSummary = dirtyPath.ownership.mergeEvidence
        ? formatMergedLaneEvidenceSummary(dirtyPath.ownership.mergeEvidence)
        : dirtyPath.ownership.laneName;
      risks.push({
        category: dirtyPath.category,
        evidenceSummary: `Root dirty path ${dirtyPath.path} is already-merged root drift from lane ${dirtyPath.ownership.laneName} (${evidenceSummary}).`,
        kind: "already-merged-root-drift",
        laneNames: [dirtyPath.ownership.laneName],
        nextAction: "investigate",
        path: dirtyPath.path,
        surface: dirtyPath.surface,
      });
    }
  }

  return risks.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return (left.path ?? left.surface ?? "").localeCompare(
      right.path ?? right.surface ?? "",
    );
  });
}

function recommendWorktreeNextAction(
  worktree: PlannerWorktreeDriftLaneSnapshot,
  risks: PlannerWorktreeDriftRisk[],
): PlannerWorktreeDriftNextAction {
  if (
    risks.some(
      (risk) =>
        risk.kind === "multi-lane-hotspot-collision" &&
        risk.laneNames.includes(worktree.laneName),
    )
  ) {
    return "investigate";
  }

  return "wait";
}

function attributeDirtyPathOwnership(
  snapshot: PlannerWorktreeDriftSnapshot,
  runGitStatus: RunGitStatus,
): PlannerWorktreeDriftSnapshot {
  const ownershipCandidates = buildOwnershipCandidates(snapshot.worktrees);
  const mergedOwnershipCandidates = buildMergedLaneOwnershipCandidates(
    snapshot.mergedLanes,
    runGitStatus,
  );

  const rootDirtyPaths = snapshot.root.dirtyPaths.map((dirtyPath) => ({
    ...dirtyPath,
    ownership: attributeRootDirtyPathOwnership(
      dirtyPath,
      ownershipCandidates,
      mergedOwnershipCandidates,
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
  const attributedSnapshot = {
    ...snapshot,
    root: {
      ...snapshot.root,
      dirtyPaths: rootDirtyPaths,
    },
    worktrees,
  };
  const risks = buildDriftRisks(attributedSnapshot);

  return {
    ...attributedSnapshot,
    risks,
    worktrees: worktrees.map((worktree) => ({
      ...worktree,
      nextAction: recommendWorktreeNextAction(worktree, risks),
    })),
  };
}

export function buildPlannerWorktreeDriftSnapshot(
  ledger: QueueWorktreePrLinkageLedger,
  options: {
    baseBranchName?: string;
    generatedAtUtc?: string;
    mergedLaneEvidence?: PlannerMergedLaneEvidence[];
    repoRoot: string;
    runGitStatus?: RunGitStatus;
    sessionListJsonText?: string;
    workListJsonText?: string;
    worktreesDir?: string;
  },
): PlannerWorktreeDriftSnapshot {
  const repoRoot = resolve(options.repoRoot);
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const root = collectRootSnapshot(repoRoot, runGitStatus);
  const worktrees = ledger.lanes
    .map((lane) => collectWorktreeSnapshot(repoRoot, lane, runGitStatus))
    .filter((lane): lane is PlannerWorktreeDriftLaneSnapshot => lane !== null);
  const mergedLanes = discoverMergedLaneEvidence({
    activeLaneNames: ledger.lanes
      .filter((lane) => lane.queueState === "active")
      .map((lane) => lane.laneName),
    baseBranchName: options.baseBranchName,
    mergedLaneEvidence: options.mergedLaneEvidence,
    repoRoot,
    sessionListJsonText: options.sessionListJsonText,
    workListJsonText: options.workListJsonText,
    worktreesDir: options.worktreesDir,
  });
  const totalDirtyPathCount =
    root.dirtyPathCount +
    worktrees.reduce((total, lane) => total + lane.dirtyPathCount, 0);

  return attributeDirtyPathOwnership(
    {
      activeLaneCount: ledger.activeLaneCount,
      evaluatedWorktreeCount: worktrees.length,
      generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
      issues: [...ledger.issues],
      mergedLaneCount: mergedLanes.length,
      mergedLanes,
      risks: [],
      root,
      totalDirtyPathCount,
      worktrees: worktrees.map((worktree) => ({
        ...worktree,
        nextAction: "wait",
      })),
    },
    runGitStatus,
  );
}

export function discoverPlannerWorktreeDriftSnapshot(
  options: DiscoverPlannerWorktreeDriftOptions,
): PlannerWorktreeDriftSnapshot {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const ledger = resolveLedger(options);

  return buildPlannerWorktreeDriftSnapshot(ledger, {
    baseBranchName: options.baseBranchName,
    generatedAtUtc: options.generatedAtUtc,
    mergedLaneEvidence: options.mergedLaneEvidence,
    repoRoot,
    sessionListJsonText: options.sessionListJsonText,
    workListJsonText: options.workListJsonText,
    worktreesDir: options.worktreesDir,
  });
}

function formatDirtyPath(path: PlannerWorktreeDirtyPath): string {
  const owner = path.ownership.laneName
    ? `${path.ownership.kind}:${path.ownership.laneName}`
    : path.ownership.kind;
  const mergeEvidence = path.ownership.mergeEvidence
    ? ` merge-evidence=${formatMergedLaneEvidenceSummary(path.ownership.mergeEvidence)}`
    : "";
  return `path=${path.path} status=${path.statusCode} change=${path.changeKind} surface=${path.surface} category=${path.category} owner=${owner}${mergeEvidence} ownership-reason=${path.ownership.reason}`;
}

function formatWorktreePath(repoRoot: string, worktreePath: string): string {
  const relativePath = relative(repoRoot, worktreePath);
  return relativePath && !relativePath.startsWith("..")
    ? relativePath
    : worktreePath;
}

function collectOwnerlessRootDirtyPaths(
  snapshot: PlannerWorktreeDriftSnapshot,
): PlannerWorktreeDirtyPath[] {
  const ownerlessPaths = snapshot.root.dirtyPaths.filter((dirtyPath) =>
    snapshot.risks.some(
      (risk) =>
        risk.kind === "ownerless-root-dirty-paths" &&
        risk.path === dirtyPath.path,
    ),
  );

  return ownerlessPaths.sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

function formatOwnerlessRootDriftRecoveryGuidance(
  ownerlessPaths: PlannerWorktreeDirtyPath[],
): string[] {
  if (ownerlessPaths.length === 0) {
    return [];
  }

  const pathList = ownerlessPaths.map((dirtyPath) => dirtyPath.path).join(", ");
  return [
    "- recovery-guidance",
    `  - condition=ownerless-root-dirty-paths count=${ownerlessPaths.length} target-session=${PLANNER_OWNERLESS_ROOT_DRIFT_TARGET_SESSION_ID}`,
    `  - preserve-policy=${PLANNER_OWNERLESS_ROOT_DRIFT_PRESERVE_POLICY}`,
    `  - next-safe-action=${PLANNER_OWNERLESS_ROOT_DRIFT_NEXT_SAFE_ACTION}`,
    `  - ownerless-paths=${pathList}`,
  ];
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
    `active-lanes=${snapshot.activeLaneCount} merged-lanes=${snapshot.mergedLaneCount} evaluated-worktrees=${snapshot.evaluatedWorktreeCount} risk-cases=${snapshot.risks.length} root-dirty-shared-paths=${rootDirtyCount} worktree-dirty-shared-paths=${worktreeDirtyCount} total-dirty-shared-paths=${snapshot.totalDirtyPathCount}`,
  ];

  if (snapshot.issues.length > 0) {
    lines.push("");
    for (const issue of snapshot.issues) {
      lines.push(`issue=${issue}`);
    }
  }

  lines.push("");
  if (snapshot.risks.length > 0) {
    lines.push("- risks");
    for (const risk of snapshot.risks) {
      const laneList =
        risk.laneNames.length > 0 ? risk.laneNames.join(",") : "none";
      lines.push(
        `  - risk=${risk.kind} path=${risk.path ?? "-"} surface=${risk.surface ?? "-"} lanes=${laneList} next-action=${risk.nextAction} evidence=${risk.evidenceSummary}`,
      );
    }
    lines.push("");
  }

  const ownerlessRecoveryGuidance = formatOwnerlessRootDriftRecoveryGuidance(
    collectOwnerlessRootDirtyPaths(snapshot),
  );
  if (ownerlessRecoveryGuidance.length > 0) {
    lines.push(...ownerlessRecoveryGuidance, "");
  }

  lines.push(
    `- location=root repo=${snapshot.root.repoRoot} dirty-shared-paths=${snapshot.root.dirtyPathCount}`,
  );
  for (const dirtyPath of snapshot.root.dirtyPaths) {
    lines.push(`  - ${formatDirtyPath(dirtyPath)}`);
  }

  if (snapshot.mergedLanes.length > 0) {
    lines.push("- merged-lanes");
    for (const mergedLane of snapshot.mergedLanes) {
      lines.push(
        `  - lane=${mergedLane.laneName} branch=${mergedLane.branchName ?? "?"} merge-evidence=${formatMergedLaneEvidenceSummary(mergedLane.mergeEvidence)} worktree=${mergedLane.worktreePath ? formatWorktreePath(snapshot.root.repoRoot, mergedLane.worktreePath) : "-"}`,
      );
    }
    lines.push("");
  }

  if (snapshot.worktrees.length === 0) {
    lines.push("- No active worktrees were linked for drift inspection.");
    return lines.join("\n");
  }

  for (const worktree of snapshot.worktrees) {
    lines.push(
      `- location=worktree lane=${worktree.laneName} branch=${worktree.branchName ?? "?"} linkage=${worktree.linkageStatus} worktree=${formatWorktreePath(snapshot.root.repoRoot, worktree.worktreePath)} dirty-shared-paths=${worktree.dirtyPathCount} next-action=${worktree.nextAction}`,
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
