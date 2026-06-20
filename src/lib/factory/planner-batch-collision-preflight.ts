import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  ConflictHotspotCollectionError,
  type ConflictHotspotSnapshot,
  type ConflictHotspotSurfaceCategory,
  classifyConflictHotspotSurfaceCategory,
  collectConflictHotspotSnapshot,
  formatConflictHotspotSurfaceCategory,
} from "./conflict-hotspot-report";
import {
  discoverQueueWorktreePrLinkageLedger,
  type QueueWorktreePrLinkageLane,
  type QueueWorktreePrLinkageLedger,
} from "./queue-worktree-pr-linkage-ledger";

export const PLANNER_BATCH_COLLISION_PREFLIGHT_HEADER =
  "Planner Batch Collision Preflight";

const UNUSABLE_SURFACE_HINTS = new Set([".", "./", "/", "*", "**"]);

export interface PlannerBatchCollisionCandidateInput {
  name: string;
  expectedSurfaceHints: string[];
}

export interface PlannerBatchCollisionHotspotSurfaceOverlap {
  category: ConflictHotspotSurfaceCategory;
  categoryLabel: string;
  distinctPaths: number;
  matchedHints: string[];
  representativePaths: string[];
  surface: string;
  touches: number;
}

export interface PlannerBatchCollisionHotspotPathOverlap {
  matchedHints: string[];
  path: string;
  touches: number;
}

export interface PlannerBatchCollisionCandidateReport
  extends PlannerBatchCollisionCandidateInput {
  activeLaneEvidenceSummary: string[];
  activeLaneOverlaps: PlannerBatchCollisionOwnedLaneOverlap[];
  activeOwnershipGaps: string[];
  collisionRisk: PlannerBatchCollisionRisk;
  hotspotEvidenceSummary: string[];
  hotspotPathOverlaps: PlannerBatchCollisionHotspotPathOverlap[];
  hotspotSurfaceOverlaps: PlannerBatchCollisionHotspotSurfaceOverlap[];
  recommendation: PlannerBatchCollisionRecommendation;
  recommendationEvidenceSummary: string;
}

export type PlannerBatchCollisionRisk = "low" | "medium" | "high";
export type PlannerBatchCollisionRecommendation =
  | "dispatch now"
  | "hold"
  | "split the batch";

export interface PlannerBatchCollisionOwnedLaneOverlap {
  branchName?: string;
  category: ConflictHotspotSurfaceCategory;
  categoryLabel: string;
  laneName: string;
  linkageStatus: QueueWorktreePrLinkageLane["linkageStatus"];
  matchedHints: string[];
  ownedPathCount: number;
  ownedPaths: string[];
  ownedSurface: string;
  worktreePath?: string;
}

export interface PlannerBatchCollisionPreflightSnapshot {
  activeLaneEvidence: {
    activeLaneCount: number;
    generatedAtUtc: string;
    linkedWithGapsLaneCount: number;
  };
  generatedAtUtc: string;
  candidates: PlannerBatchCollisionCandidateReport[];
  hotspotEvidence: {
    generatedAtUtc: string;
    recentCommitLimit: number;
    repoRoot: string;
    topPathCount: number;
  };
}

export interface CollectPlannerBatchCollisionPreflightOptions {
  baseBranchName?: string;
  generatedAtUtc?: string;
  hotspotSnapshot?: ConflictHotspotSnapshot;
  linkageLedger?: QueueWorktreePrLinkageLedger;
  plannerSession?: string;
  repoRoot?: string;
  sessionListJsonText?: string;
  workListJsonText?: string;
  worktreesDir?: string;
}

export class PlannerBatchCollisionPreflightInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerBatchCollisionPreflightInputError";
  }
}

export class PlannerBatchCollisionPreflightCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerBatchCollisionPreflightCollectionError";
  }
}

function splitOnce(value: string, delimiter: string): [string, string] | null {
  const index = value.indexOf(delimiter);
  if (index < 0) {
    return null;
  }

  return [value.slice(0, index), value.slice(index + delimiter.length)];
}

function normalizeSurfaceHint(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function normalizeRepoPath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/");
}

function parseSurfaceHints(
  value: string,
  candidateName: string,
): PlannerBatchCollisionCandidateInput["expectedSurfaceHints"] {
  const hints = [...new Set(value.split(",").map(normalizeSurfaceHint))].filter(
    Boolean,
  );

  if (hints.length === 0) {
    throw new PlannerBatchCollisionPreflightInputError(
      `Candidate "${candidateName}" must include at least one expected surface hint.`,
    );
  }

  const unusableHint = hints.find((hint) => UNUSABLE_SURFACE_HINTS.has(hint));
  if (unusableHint) {
    throw new PlannerBatchCollisionPreflightInputError(
      `Candidate "${candidateName}" includes unusable surface hint "${unusableHint}". Provide concrete repo-local paths or prefixes instead of a broad repo scan placeholder.`,
    );
  }

  return hints;
}

export function parsePlannerBatchCollisionCandidateInput(
  value: string,
): PlannerBatchCollisionCandidateInput {
  const splitCandidate = splitOnce(value.trim(), "=");
  if (!splitCandidate) {
    throw new PlannerBatchCollisionPreflightInputError(
      `Invalid candidate "${value}". Use --candidate "name=path/or/prefix,second/hint".`,
    );
  }

  const [rawName, rawSurfaceHints] = splitCandidate;
  const name = rawName.trim();

  if (!name) {
    throw new PlannerBatchCollisionPreflightInputError(
      `Invalid candidate "${value}". Candidate name cannot be empty.`,
    );
  }

  return {
    name,
    expectedSurfaceHints: parseSurfaceHints(rawSurfaceHints, name),
  };
}

function pathMatchesHint(target: string, hint: string): boolean {
  return (
    target === hint ||
    target.startsWith(`${hint}/`) ||
    hint.startsWith(`${target}/`)
  );
}

function deriveOwnedSurfaceLabel(path: string): string {
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

function runYouJsonCommand(
  repoRoot: string,
  args: string[],
): { ok: boolean; stdout: string } {
  const proc = spawnSync("you", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  return {
    ok: proc.status === 0 && proc.stdout.trim().length > 0,
    stdout: proc.stdout,
  };
}

function readLiveQueueJson(
  repoRoot: string,
  args: string[],
  label: string,
): string {
  const attempts = [
    [...args, "--json"],
    [...args, "--format", "json"],
  ];

  for (const attempt of attempts) {
    const result = runYouJsonCommand(repoRoot, attempt);
    if (result.ok) {
      return result.stdout;
    }
  }

  throw new PlannerBatchCollisionPreflightCollectionError(
    `Unable to read ${label} for the planner batch collision preflight from \`you ${args.join(" ")}\` with JSON output.`,
  );
}

function collectHotspotSnapshot(
  options: CollectPlannerBatchCollisionPreflightOptions,
): ConflictHotspotSnapshot {
  if (options.hotspotSnapshot) {
    return options.hotspotSnapshot;
  }

  if (!options.repoRoot) {
    throw new PlannerBatchCollisionPreflightCollectionError(
      "Hotspot evidence was not available for the planner batch collision preflight. Provide repoRoot or a precomputed hotspot snapshot.",
    );
  }

  try {
    return collectConflictHotspotSnapshot(resolve(options.repoRoot));
  } catch (error) {
    if (error instanceof ConflictHotspotCollectionError) {
      throw new PlannerBatchCollisionPreflightCollectionError(
        `Unable to collect hotspot evidence for the planner batch collision preflight. ${error.message}`,
      );
    }

    throw error;
  }
}

function collectLinkageLedger(
  options: CollectPlannerBatchCollisionPreflightOptions,
  repoRoot: string | undefined,
): QueueWorktreePrLinkageLedger | null {
  if (options.linkageLedger) {
    return options.linkageLedger;
  }

  if (!repoRoot) {
    return null;
  }

  const plannerSession = options.plannerSession ?? "~default";

  return discoverQueueWorktreePrLinkageLedger({
    repoRoot,
    sessionListJsonText:
      options.sessionListJsonText ??
      readLiveQueueJson(repoRoot, ["session", "list"], "session list"),
    workListJsonText:
      options.workListJsonText ??
      readLiveQueueJson(
        repoRoot,
        ["work", "list", "--session", plannerSession],
        "work list",
      ),
    worktreesDir:
      options.worktreesDir ?? resolve(repoRoot, ".claude", "worktrees"),
  });
}

function collectOwnedPathsFromWorktree(
  worktreePath: string,
  baseBranchName: string,
): string[] {
  const mergeBase = spawnSync("git", ["merge-base", baseBranchName, "HEAD"], {
    cwd: worktreePath,
    encoding: "utf8",
    env: process.env,
  });

  if (mergeBase.status !== 0 || !mergeBase.stdout.trim()) {
    throw new PlannerBatchCollisionPreflightCollectionError(
      `Unable to compute a merge-base against ${baseBranchName} for active lane worktree ${worktreePath}.`,
    );
  }

  const committedDiff = spawnSync(
    "git",
    ["diff", "--name-only", mergeBase.stdout.trim(), "HEAD"],
    {
      cwd: worktreePath,
      encoding: "utf8",
      env: process.env,
    },
  );

  if (committedDiff.status !== 0) {
    throw new PlannerBatchCollisionPreflightCollectionError(
      `Unable to read owned paths from active lane worktree ${worktreePath}.`,
    );
  }

  const dirtyTrackedDiff = spawnSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: worktreePath,
    encoding: "utf8",
    env: process.env,
  });

  if (dirtyTrackedDiff.status !== 0) {
    throw new PlannerBatchCollisionPreflightCollectionError(
      `Unable to read dirty tracked owned paths from active lane worktree ${worktreePath}.`,
    );
  }

  return [
    ...new Set(
      [committedDiff.stdout, dirtyTrackedDiff.stdout]
        .flatMap((stdout) => stdout.split("\n"))
        .map(normalizeRepoPath),
    ),
  ].filter(Boolean);
}

function collectActiveLaneOwnership(
  linkageLedger: QueueWorktreePrLinkageLedger | null,
  repoRoot: string | undefined,
  baseBranchName: string,
): {
  activeLaneCount: number;
  generatedAtUtc: string;
  gaps: string[];
  lanes: Array<{
    branchName?: string;
    laneName: string;
    linkageStatus: QueueWorktreePrLinkageLane["linkageStatus"];
    ownedPaths: string[];
    worktreePath?: string;
  }>;
  linkedWithGapsLaneCount: number;
} {
  if (!linkageLedger) {
    return {
      activeLaneCount: 0,
      generatedAtUtc: new Date().toISOString(),
      gaps: [
        "Active-lane ownership was not collected because queue/worktree linkage data was unavailable.",
      ],
      lanes: [],
      linkedWithGapsLaneCount: 0,
    };
  }

  const activeLanes = linkageLedger.lanes.filter(
    (lane) => lane.queueState === "active",
  );
  const gaps = [...linkageLedger.issues];
  const lanes: Array<{
    branchName?: string;
    laneName: string;
    linkageStatus: QueueWorktreePrLinkageLane["linkageStatus"];
    ownedPaths: string[];
    worktreePath?: string;
  }> = [];

  for (const lane of activeLanes) {
    if (lane.missingLinkageReasons.length > 0) {
      gaps.push(
        `Lane ${lane.laneName} has linkage gaps: ${lane.missingLinkageReasons.join("; ")}`,
      );
    }

    if (!repoRoot) {
      gaps.push(
        `Lane ${lane.laneName} ownership could not be collected because repoRoot was unavailable.`,
      );
      continue;
    }

    if (!lane.worktreePath) {
      gaps.push(
        `Lane ${lane.laneName} ownership could not be collected because no worktree path was linked.`,
      );
      continue;
    }

    const resolvedWorktreePath = resolve(repoRoot, lane.worktreePath);

    try {
      lanes.push({
        branchName: lane.branchName,
        laneName: lane.laneName,
        linkageStatus: lane.linkageStatus,
        ownedPaths: collectOwnedPathsFromWorktree(
          resolvedWorktreePath,
          baseBranchName,
        ),
        worktreePath: lane.worktreePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      gaps.push(
        `Lane ${lane.laneName} ownership collection failed: ${message}`,
      );
    }
  }

  return {
    activeLaneCount: activeLanes.length,
    generatedAtUtc: linkageLedger.generatedAtUtc,
    gaps,
    lanes,
    linkedWithGapsLaneCount: activeLanes.filter(
      (lane) => lane.linkageStatus === "linked-with-gaps",
    ).length,
  };
}

function collectHotspotSurfaceOverlaps(
  candidate: PlannerBatchCollisionCandidateInput,
  hotspotSnapshot: ConflictHotspotSnapshot,
): PlannerBatchCollisionHotspotSurfaceOverlap[] {
  return hotspotSnapshot.rankedSurfaces.flatMap((surface) => {
    const matchedHints = candidate.expectedSurfaceHints.filter((hint) => {
      if (pathMatchesHint(surface.surface, hint)) {
        return true;
      }

      return surface.representativePaths.some((path) =>
        pathMatchesHint(path, hint),
      );
    });

    if (matchedHints.length === 0) {
      return [];
    }

    return [
      {
        category: surface.category,
        categoryLabel: formatConflictHotspotSurfaceCategory(surface.category),
        distinctPaths: surface.distinctPaths,
        matchedHints,
        representativePaths: [...surface.representativePaths],
        surface: surface.surface,
        touches: surface.touches,
      },
    ];
  });
}

function collectHotspotPathOverlaps(
  candidate: PlannerBatchCollisionCandidateInput,
  hotspotSnapshot: ConflictHotspotSnapshot,
): PlannerBatchCollisionHotspotPathOverlap[] {
  return hotspotSnapshot.topPaths.flatMap((pathTouch) => {
    const matchedHints = candidate.expectedSurfaceHints.filter((hint) =>
      pathMatchesHint(pathTouch.path, hint),
    );

    if (matchedHints.length === 0) {
      return [];
    }

    return [
      {
        matchedHints,
        path: pathTouch.path,
        touches: pathTouch.touches,
      },
    ];
  });
}

function buildHotspotEvidenceSummary(
  candidate: PlannerBatchCollisionCandidateInput,
  hotspotSurfaceOverlaps: PlannerBatchCollisionHotspotSurfaceOverlap[],
  hotspotPathOverlaps: PlannerBatchCollisionHotspotPathOverlap[],
): string[] {
  if (hotspotSurfaceOverlaps.length === 0) {
    return [
      `No ranked hotspot overlap found for ${candidate.name} in the recent planner hotspot sample.`,
    ];
  }

  const sharedOverlap = hotspotSurfaceOverlaps.find(
    (surface) => surface.category !== "authored-content",
  );
  const topSurface = sharedOverlap ?? hotspotSurfaceOverlaps[0];
  const lines = [
    `Matched hotspot surface ${topSurface.surface} [${topSurface.categoryLabel}] at ${topSurface.touches} touches across ${topSurface.distinctPaths} paths.`,
  ];

  if (sharedOverlap) {
    lines.push(
      `Shared-surface overlap is explicit via hints ${sharedOverlap.matchedHints.join(", ")}.`,
    );
  } else {
    lines.push(
      "Overlap is limited to authored-content surfaces in the current hotspot sample.",
    );
  }

  if (hotspotPathOverlaps.length > 0) {
    const directPaths = hotspotPathOverlaps
      .slice(0, 2)
      .map(
        (pathOverlap) => `${pathOverlap.path} (${pathOverlap.touches} touches)`,
      )
      .join(", ");
    lines.push(`Direct touched-path matches: ${directPaths}.`);
  }

  return lines;
}

function collectActiveLaneOverlaps(
  candidate: PlannerBatchCollisionCandidateInput,
  activeLaneOwnership: ReturnType<typeof collectActiveLaneOwnership>,
): PlannerBatchCollisionOwnedLaneOverlap[] {
  const grouped = new Map<string, PlannerBatchCollisionOwnedLaneOverlap>();

  for (const lane of activeLaneOwnership.lanes) {
    const matchedPaths = lane.ownedPaths.filter((path) =>
      candidate.expectedSurfaceHints.some((hint) =>
        pathMatchesHint(path, hint),
      ),
    );

    if (matchedPaths.length === 0) {
      continue;
    }

    for (const path of matchedPaths) {
      const ownedSurface = deriveOwnedSurfaceLabel(path);
      const category = classifyConflictHotspotSurfaceCategory(path);
      const key = `${lane.laneName}:${ownedSurface}:${category}`;
      const matchedHints = candidate.expectedSurfaceHints.filter(
        (hint) =>
          pathMatchesHint(path, hint) || pathMatchesHint(ownedSurface, hint),
      );
      const existing = grouped.get(key);

      if (existing) {
        existing.ownedPathCount += 1;
        existing.ownedPaths = [...new Set([...existing.ownedPaths, path])];
        existing.matchedHints = [
          ...new Set([...existing.matchedHints, ...matchedHints]),
        ];
        continue;
      }

      grouped.set(key, {
        branchName: lane.branchName,
        category,
        categoryLabel: formatConflictHotspotSurfaceCategory(category),
        laneName: lane.laneName,
        linkageStatus: lane.linkageStatus,
        matchedHints,
        ownedPathCount: 1,
        ownedPaths: [path],
        ownedSurface,
        worktreePath: lane.worktreePath,
      });
    }
  }

  return [...grouped.values()].sort((left, right) => {
    if (right.ownedPathCount !== left.ownedPathCount) {
      return right.ownedPathCount - left.ownedPathCount;
    }
    return left.laneName.localeCompare(right.laneName);
  });
}

function classifyCandidateCollisionRisk(
  hotspotSurfaceOverlaps: PlannerBatchCollisionHotspotSurfaceOverlap[],
  activeLaneOverlaps: PlannerBatchCollisionOwnedLaneOverlap[],
): PlannerBatchCollisionRisk {
  const hasSharedHotspot = hotspotSurfaceOverlaps.some(
    (surface) => surface.category !== "authored-content",
  );
  const hasAnyActiveOwnership = activeLaneOverlaps.length > 0;
  const hasSharedActiveOwnership = activeLaneOverlaps.some(
    (overlap) => overlap.category !== "authored-content",
  );

  if (hasSharedActiveOwnership) {
    return "high";
  }

  if (hasAnyActiveOwnership) {
    return hasSharedHotspot ? "high" : "medium";
  }

  if (hasSharedHotspot) {
    return "medium";
  }

  return "low";
}

function collectRiskyHints(
  candidate: PlannerBatchCollisionCandidateInput,
  hotspotSurfaceOverlaps: PlannerBatchCollisionHotspotSurfaceOverlap[],
  hotspotPathOverlaps: PlannerBatchCollisionHotspotPathOverlap[],
  activeLaneOverlaps: PlannerBatchCollisionOwnedLaneOverlap[],
): string[] {
  const riskyHints = new Set<string>();

  for (const overlap of hotspotSurfaceOverlaps) {
    if (overlap.category === "authored-content") {
      continue;
    }

    for (const hint of overlap.matchedHints) {
      riskyHints.add(hint);
    }
  }

  for (const overlap of hotspotPathOverlaps) {
    for (const hint of overlap.matchedHints) {
      riskyHints.add(hint);
    }
  }

  for (const overlap of activeLaneOverlaps) {
    for (const hint of overlap.matchedHints) {
      riskyHints.add(hint);
    }
  }

  return candidate.expectedSurfaceHints.filter((hint) => riskyHints.has(hint));
}

function choosePlannerBatchCollisionRecommendation(
  candidate: PlannerBatchCollisionCandidateInput,
  collisionRisk: PlannerBatchCollisionRisk,
  hotspotSurfaceOverlaps: PlannerBatchCollisionHotspotSurfaceOverlap[],
  hotspotPathOverlaps: PlannerBatchCollisionHotspotPathOverlap[],
  activeLaneOverlaps: PlannerBatchCollisionOwnedLaneOverlap[],
): {
  recommendation: PlannerBatchCollisionRecommendation;
  recommendationEvidenceSummary: string;
} {
  const riskyHints = collectRiskyHints(
    candidate,
    hotspotSurfaceOverlaps,
    hotspotPathOverlaps,
    activeLaneOverlaps,
  );
  const safeHints = candidate.expectedSurfaceHints.filter(
    (hint) => !riskyHints.includes(hint),
  );
  const sharedActiveOverlap = activeLaneOverlaps.find(
    (overlap) => overlap.category !== "authored-content",
  );

  if (collisionRisk === "low") {
    return {
      recommendation: "dispatch now",
      recommendationEvidenceSummary:
        "No shared hotspot or active-lane overlap was confirmed for the submitted surfaces.",
    };
  }

  if (
    sharedActiveOverlap &&
    riskyHints.length === candidate.expectedSurfaceHints.length
  ) {
    return {
      recommendation: "hold",
      recommendationEvidenceSummary: `Every submitted surface overlaps active lane ${sharedActiveOverlap.laneName} or hot shared paths, so dispatch would collide immediately.`,
    };
  }

  if (safeHints.length > 0) {
    return {
      recommendation: "split the batch",
      recommendationEvidenceSummary: `Risk is concentrated in ${riskyHints.join(", ")}, while ${safeHints.join(", ")} remains lower-risk and can be dispatched separately.`,
    };
  }

  const topSharedHotspot = hotspotSurfaceOverlaps.find(
    (overlap) => overlap.category !== "authored-content",
  );

  if (topSharedHotspot) {
    return {
      recommendation: "split the batch",
      recommendationEvidenceSummary: `The current candidate is aimed at hot shared surface ${topSharedHotspot.surface}, so it should be narrowed before dispatch.`,
    };
  }

  return {
    recommendation: "hold",
    recommendationEvidenceSummary:
      "Current ownership evidence is incomplete or fully overlapping, so hold until the overlapping lane clears or the candidate is re-scoped.",
  };
}

function buildActiveLaneEvidenceSummary(
  candidate: PlannerBatchCollisionCandidateInput,
  activeLaneOverlaps: PlannerBatchCollisionOwnedLaneOverlap[],
  activeOwnershipGaps: string[],
  collisionRisk: PlannerBatchCollisionRisk,
): string[] {
  const lines: string[] = [];

  if (activeLaneOverlaps.length === 0) {
    lines.push(
      `No active-lane ownership overlap was confirmed for ${candidate.name}.`,
    );
  } else {
    const topOverlap = activeLaneOverlaps[0];
    lines.push(
      `Active lane ${topOverlap.laneName} currently owns ${topOverlap.ownedSurface} [${topOverlap.categoryLabel}] through ${topOverlap.ownedPathCount} matching paths.`,
    );

    if (collisionRisk !== "low") {
      lines.push(
        `Active ownership raises the current collision risk to ${collisionRisk}.`,
      );
    }
  }

  if (activeOwnershipGaps.length > 0) {
    lines.push(`Ownership coverage gaps: ${activeOwnershipGaps.join(" | ")}`);
  }

  return lines;
}

export function collectPlannerBatchCollisionPreflightSnapshot(
  candidateArgs: readonly string[],
  options: CollectPlannerBatchCollisionPreflightOptions = {},
): PlannerBatchCollisionPreflightSnapshot {
  if (candidateArgs.length === 0) {
    throw new PlannerBatchCollisionPreflightInputError(
      'Missing candidate input. Provide one or more --candidate "name=path/or/prefix,second/hint" values.',
    );
  }

  const candidates = candidateArgs.map(
    parsePlannerBatchCollisionCandidateInput,
  );
  const repoRoot = options.repoRoot ? resolve(options.repoRoot) : undefined;
  const hotspotSnapshot = collectHotspotSnapshot(options);
  const activeLaneOwnership = collectActiveLaneOwnership(
    collectLinkageLedger(options, repoRoot),
    repoRoot,
    options.baseBranchName ?? "main",
  );

  return {
    activeLaneEvidence: {
      activeLaneCount: activeLaneOwnership.activeLaneCount,
      generatedAtUtc: activeLaneOwnership.generatedAtUtc,
      linkedWithGapsLaneCount: activeLaneOwnership.linkedWithGapsLaneCount,
    },
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    candidates: candidates.map((candidate) => {
      const hotspotSurfaceOverlaps = collectHotspotSurfaceOverlaps(
        candidate,
        hotspotSnapshot,
      );
      const hotspotPathOverlaps = collectHotspotPathOverlaps(
        candidate,
        hotspotSnapshot,
      );
      const activeLaneOverlaps = collectActiveLaneOverlaps(
        candidate,
        activeLaneOwnership,
      );
      const collisionRisk = classifyCandidateCollisionRisk(
        hotspotSurfaceOverlaps,
        activeLaneOverlaps,
      );
      const { recommendation, recommendationEvidenceSummary } =
        choosePlannerBatchCollisionRecommendation(
          candidate,
          collisionRisk,
          hotspotSurfaceOverlaps,
          hotspotPathOverlaps,
          activeLaneOverlaps,
        );

      return {
        ...candidate,
        activeLaneEvidenceSummary: buildActiveLaneEvidenceSummary(
          candidate,
          activeLaneOverlaps,
          activeLaneOwnership.gaps,
          collisionRisk,
        ),
        activeLaneOverlaps,
        activeOwnershipGaps: [...activeLaneOwnership.gaps],
        collisionRisk,
        hotspotEvidenceSummary: buildHotspotEvidenceSummary(
          candidate,
          hotspotSurfaceOverlaps,
          hotspotPathOverlaps,
        ),
        hotspotPathOverlaps,
        hotspotSurfaceOverlaps,
        recommendation,
        recommendationEvidenceSummary,
      };
    }),
    hotspotEvidence: {
      generatedAtUtc: hotspotSnapshot.generatedAtUtc,
      recentCommitLimit: hotspotSnapshot.recentCommitLimit,
      repoRoot: hotspotSnapshot.repoRoot,
      topPathCount: hotspotSnapshot.topPaths.length,
    },
  };
}

export function formatPlannerBatchCollisionPreflightSnapshot(
  snapshot: PlannerBatchCollisionPreflightSnapshot,
): string {
  const lines = [
    PLANNER_BATCH_COLLISION_PREFLIGHT_HEADER,
    `Generated: ${snapshot.generatedAtUtc}`,
    `Candidates: ${snapshot.candidates.length}`,
    `Hotspot sample: last ${snapshot.hotspotEvidence.recentCommitLimit} commits from ${snapshot.hotspotEvidence.repoRoot}`,
    `Active lanes: ${snapshot.activeLaneEvidence.activeLaneCount} linked-with-gaps=${snapshot.activeLaneEvidence.linkedWithGapsLaneCount}`,
    "",
    "Candidate batches",
  ];

  for (const candidate of snapshot.candidates) {
    lines.push(
      `- candidate=${candidate.name} expected-surfaces=${candidate.expectedSurfaceHints.join(", ")} hint-count=${candidate.expectedSurfaceHints.length}`,
    );
    lines.push(`  collision-risk=${candidate.collisionRisk}`);
    lines.push(`  recommendation=${candidate.recommendation}`);
    lines.push(
      `  recommendation-evidence=${candidate.recommendationEvidenceSummary}`,
    );
    for (const hotspotSummary of candidate.hotspotEvidenceSummary) {
      lines.push(`  hotspot-evidence=${hotspotSummary}`);
    }
    for (const activeLaneSummary of candidate.activeLaneEvidenceSummary) {
      lines.push(`  active-lane-evidence=${activeLaneSummary}`);
    }
    if (candidate.hotspotSurfaceOverlaps.length === 0) {
      lines.push("  hotspot-overlap=none");
    } else {
      for (const overlap of candidate.hotspotSurfaceOverlaps) {
        lines.push(
          `  hotspot-overlap=${overlap.surface} [${overlap.categoryLabel}] touches=${overlap.touches} matched-hints=${overlap.matchedHints.join(", ")} examples=${overlap.representativePaths.join(", ")}`,
        );
      }
    }

    if (candidate.activeLaneOverlaps.length === 0) {
      lines.push("  active-lane-overlap=none");
      continue;
    }

    for (const overlap of candidate.activeLaneOverlaps) {
      lines.push(
        `  active-lane-overlap=${overlap.laneName} surface=${overlap.ownedSurface} [${overlap.categoryLabel}] matched-hints=${overlap.matchedHints.join(", ")} owned-paths=${overlap.ownedPaths.join(", ")}`,
      );
    }
  }

  return lines.join("\n");
}
