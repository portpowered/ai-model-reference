import { resolve } from "node:path";
import {
  ConflictHotspotCollectionError,
  type ConflictHotspotSnapshot,
  type ConflictHotspotSurfaceCategory,
  collectConflictHotspotSnapshot,
  formatConflictHotspotSurfaceCategory,
} from "./conflict-hotspot-report";

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
  hotspotEvidenceSummary: string[];
  hotspotPathOverlaps: PlannerBatchCollisionHotspotPathOverlap[];
  hotspotSurfaceOverlaps: PlannerBatchCollisionHotspotSurfaceOverlap[];
}

export interface PlannerBatchCollisionPreflightSnapshot {
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
  generatedAtUtc?: string;
  hotspotSnapshot?: ConflictHotspotSnapshot;
  repoRoot?: string;
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
  const hotspotSnapshot = collectHotspotSnapshot(options);

  return {
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

      return {
        ...candidate,
        hotspotEvidenceSummary: buildHotspotEvidenceSummary(
          candidate,
          hotspotSurfaceOverlaps,
          hotspotPathOverlaps,
        ),
        hotspotPathOverlaps,
        hotspotSurfaceOverlaps,
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
    "",
    "Candidate batches",
  ];

  for (const candidate of snapshot.candidates) {
    lines.push(
      `- candidate=${candidate.name} expected-surfaces=${candidate.expectedSurfaceHints.join(", ")} hint-count=${candidate.expectedSurfaceHints.length}`,
    );
    for (const hotspotSummary of candidate.hotspotEvidenceSummary) {
      lines.push(`  hotspot-evidence=${hotspotSummary}`);
    }
    if (candidate.hotspotSurfaceOverlaps.length === 0) {
      lines.push("  hotspot-overlap=none");
      continue;
    }

    for (const overlap of candidate.hotspotSurfaceOverlaps) {
      lines.push(
        `  hotspot-overlap=${overlap.surface} [${overlap.categoryLabel}] touches=${overlap.touches} matched-hints=${overlap.matchedHints.join(", ")} examples=${overlap.representativePaths.join(", ")}`,
      );
    }
  }

  return lines.join("\n");
}
