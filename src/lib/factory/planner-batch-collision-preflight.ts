export const PLANNER_BATCH_COLLISION_PREFLIGHT_HEADER =
  "Planner Batch Collision Preflight";

const UNUSABLE_SURFACE_HINTS = new Set([".", "./", "/", "*", "**"]);

export interface PlannerBatchCollisionCandidateInput {
  name: string;
  expectedSurfaceHints: string[];
}

export interface PlannerBatchCollisionPreflightSnapshot {
  generatedAtUtc: string;
  candidates: PlannerBatchCollisionCandidateInput[];
}

export class PlannerBatchCollisionPreflightInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerBatchCollisionPreflightInputError";
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
  return value.trim().replace(/\\/g, "/").replace(/\/+/g, "/");
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

export function collectPlannerBatchCollisionPreflightSnapshot(
  candidateArgs: readonly string[],
  generatedAtUtc = new Date().toISOString(),
): PlannerBatchCollisionPreflightSnapshot {
  if (candidateArgs.length === 0) {
    throw new PlannerBatchCollisionPreflightInputError(
      'Missing candidate input. Provide one or more --candidate "name=path/or/prefix,second/hint" values.',
    );
  }

  return {
    generatedAtUtc,
    candidates: candidateArgs.map(parsePlannerBatchCollisionCandidateInput),
  };
}

export function formatPlannerBatchCollisionPreflightSnapshot(
  snapshot: PlannerBatchCollisionPreflightSnapshot,
): string {
  const lines = [
    PLANNER_BATCH_COLLISION_PREFLIGHT_HEADER,
    `Generated: ${snapshot.generatedAtUtc}`,
    `Candidates: ${snapshot.candidates.length}`,
    "",
    "Candidate batches",
  ];

  for (const candidate of snapshot.candidates) {
    lines.push(
      `- candidate=${candidate.name} expected-surfaces=${candidate.expectedSurfaceHints.join(", ")} hint-count=${candidate.expectedSurfaceHints.length}`,
    );
  }

  return lines.join("\n");
}
