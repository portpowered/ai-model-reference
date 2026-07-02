import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  discoverWorktreeLaneRecords,
  type RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import { isTerminalCompleteState } from "@/lib/factory/planner-merged-lane-evidence";
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
