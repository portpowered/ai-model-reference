import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type CommandResult,
  discoverWorktreeLaneRecords,
  type RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";
import { readWorktreeLaneMetadata } from "@/lib/factory/worktree-lane-metadata";

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

export interface PlannerMergedLaneMergeEvidence {
  mergeCommitSha?: string;
  pullRequestNumber?: number;
  sessionId?: string;
  terminalState?: string;
}

export interface PlannerMergedLaneEvidence {
  branchName?: string;
  laneName: string;
  mergeEvidence: PlannerMergedLaneMergeEvidence;
  worktreePath?: string;
}

export interface TerminalCompleteWorkItem {
  rawState: string;
  sessionId?: string;
  workItemName: string;
  workTypeName?: string;
}

export interface DiscoverMergedLaneEvidenceOptions {
  activeLaneNames?: string[];
  baseBranchName?: string;
  mergedLaneEvidence?: PlannerMergedLaneEvidence[];
  repoRoot: string;
  runCommand?: RunCommand;
  sessionListJsonText?: string;
  workListJsonText?: string;
  worktreesDir?: string;
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
    "items",
    "works",
    "workItems",
    "data",
    "results",
    "rows",
    "sessions",
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
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
}

function isTerminalCompleteState(record: Record<string, unknown>): boolean {
  const stateRecord = isRecord(record.state) ? record.state : undefined;
  const stateName = readStringField(stateRecord ?? {}, [
    "name",
    "status",
    "type",
  ]);
  const stateType = readStringField(stateRecord ?? {}, ["type"])?.toUpperCase();
  const rawState = readStringField(record, ["state", "status", "queueState"]);

  if (
    stateType === "TERMINAL" &&
    stateName?.toLowerCase().includes("complete")
  ) {
    return true;
  }

  const candidates = [stateName, rawState].filter((value): value is string =>
    Boolean(value),
  );
  return candidates.some((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("complete/terminal") ||
      normalized === "complete" ||
      normalized === "done"
    );
  });
}

export function parseTerminalCompleteWorkItems(
  jsonText: string,
): TerminalCompleteWorkItem[] {
  const parsed = parseJsonText(jsonText, "work list payload");
  const items = extractCandidateItemArray(parsed);
  const records: TerminalCompleteWorkItem[] = [];

  for (const item of items) {
    if (!isTerminalCompleteState(item)) {
      continue;
    }

    const workItemName =
      readStringField(item, ["name", "workItemName", "title", "id"]) ||
      readNestedStringField(item, ["workItem", "item"], ["name", "id"]);
    if (!workItemName) {
      continue;
    }

    const stateRecord = isRecord(item.state) ? item.state : undefined;
    const rawState =
      readStringField(stateRecord ?? {}, ["name", "status", "type"]) ||
      readStringField(item, ["state", "status", "queueState"]) ||
      "complete/terminal";
    const sessionId =
      readStringField(item, ["sessionId", "runtimeSessionId"]) ||
      readNestedStringField(item, ["runtime", "session"], ["id", "sessionId"]);

    records.push({
      workItemName,
      rawState,
      sessionId,
      workTypeName:
        readStringField(item, ["workTypeName"]) ||
        readNestedStringField(item, ["workItem", "item"], ["workTypeName"]),
    });
  }

  return records;
}

export function isBranchMergedIntoBase(
  branchName: string,
  baseBranchName: string,
  repoRoot: string,
  runCommand: RunCommand = defaultRunCommand,
): boolean {
  const result = runCommand(
    "git",
    ["merge-base", "--is-ancestor", branchName, baseBranchName],
    repoRoot,
  );
  return result.ok && result.exitCode === 0;
}

function commandSucceeded(result: CommandResult): boolean {
  return result.ok && result.exitCode === 0;
}

export function resolveMergeCommitSha(options: {
  baseBranchName: string;
  branchName?: string;
  pullRequestNumber?: number;
  repoRoot: string;
  runCommand?: RunCommand;
}): string | undefined {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const repoRoot = options.repoRoot;

  if (typeof options.pullRequestNumber === "number") {
    const prResult = runCommand(
      "git",
      [
        "log",
        options.baseBranchName,
        "-1",
        "--format=%H",
        `--grep=#${options.pullRequestNumber}`,
      ],
      repoRoot,
    );
    const prSha = prResult.stdout.trim();
    if (commandSucceeded(prResult) && prSha) {
      return prSha;
    }
  }

  if (options.branchName) {
    const ancestryResult = runCommand(
      "git",
      [
        "log",
        options.baseBranchName,
        "-1",
        "--format=%H",
        "--ancestry-path",
        `${options.branchName}..${options.baseBranchName}`,
      ],
      repoRoot,
    );
    const ancestrySha = ancestryResult.stdout.trim();
    if (commandSucceeded(ancestryResult) && ancestrySha) {
      return ancestrySha;
    }
  }

  return undefined;
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

function buildMergedLaneEvidence(input: {
  branchName?: string;
  laneName: string;
  mergeEvidence: PlannerMergedLaneMergeEvidence;
  worktreePath?: string;
}): PlannerMergedLaneEvidence {
  return {
    branchName: input.branchName,
    laneName: input.laneName,
    mergeEvidence: input.mergeEvidence,
    worktreePath: input.worktreePath,
  };
}

export function discoverMergedLaneEvidence(
  options: DiscoverMergedLaneEvidenceOptions,
): PlannerMergedLaneEvidence[] {
  if (options.mergedLaneEvidence) {
    return options.mergedLaneEvidence;
  }

  const repoRoot = resolve(options.repoRoot);
  const baseBranchName = options.baseBranchName ?? "main";
  const runCommand = options.runCommand ?? defaultRunCommand;
  const worktreesDir =
    options.worktreesDir ?? join(repoRoot, ".claude", "worktrees");
  const activeLaneNames = new Set(options.activeLaneNames ?? []);
  const discovered = new Map<string, PlannerMergedLaneEvidence>();

  const upsertEvidence = (evidence: PlannerMergedLaneEvidence): void => {
    const existing = discovered.get(evidence.laneName);
    if (!existing) {
      discovered.set(evidence.laneName, evidence);
      return;
    }

    discovered.set(evidence.laneName, {
      ...existing,
      ...evidence,
      mergeEvidence: {
        ...existing.mergeEvidence,
        ...evidence.mergeEvidence,
      },
    });
  };

  if (options.workListJsonText) {
    for (const item of parseTerminalCompleteWorkItems(
      options.workListJsonText,
    )) {
      const worktreePath = findWorktreePath(worktreesDir, item.workItemName);
      const metadata = worktreePath
        ? readWorktreeLaneMetadata(worktreePath)
        : null;
      const branchName = metadata?.branchName;
      const pullRequestNumber = metadata?.pullRequest?.number;
      const mergeCommitSha = resolveMergeCommitSha({
        baseBranchName,
        branchName,
        pullRequestNumber,
        repoRoot,
        runCommand,
      });

      upsertEvidence(
        buildMergedLaneEvidence({
          branchName,
          laneName: item.workItemName,
          mergeEvidence: {
            mergeCommitSha,
            pullRequestNumber,
            sessionId: item.sessionId,
            terminalState: item.rawState,
          },
          worktreePath,
        }),
      );
    }
  }

  if (existsSync(worktreesDir)) {
    const worktrees = discoverWorktreeLaneRecords(worktreesDir, runCommand);
    for (const worktree of worktrees) {
      if (activeLaneNames.has(worktree.workItemName)) {
        continue;
      }
      const branchName =
        worktree.branchName ?? worktree.gitBranchName ?? worktree.prdBranchName;
      if (!branchName || discovered.has(worktree.workItemName)) {
        continue;
      }
      if (
        !isBranchMergedIntoBase(
          branchName,
          baseBranchName,
          repoRoot,
          runCommand,
        )
      ) {
        continue;
      }

      const metadata = readWorktreeLaneMetadata(worktree.worktreePath);
      const pullRequestNumber = metadata?.pullRequest?.number;

      upsertEvidence(
        buildMergedLaneEvidence({
          branchName,
          laneName: worktree.workItemName,
          mergeEvidence: {
            mergeCommitSha: resolveMergeCommitSha({
              baseBranchName,
              branchName,
              pullRequestNumber,
              repoRoot,
              runCommand,
            }),
            pullRequestNumber,
            sessionId: metadata?.sessionId ?? undefined,
            terminalState: "merged-into-main",
          },
          worktreePath: worktree.worktreePath,
        }),
      );
    }
  }

  return [...discovered.values()].sort((left, right) =>
    left.laneName.localeCompare(right.laneName),
  );
}

export function formatMergedLaneEvidenceSummary(
  evidence: PlannerMergedLaneMergeEvidence,
): string {
  const parts: string[] = [];
  if (typeof evidence.pullRequestNumber === "number") {
    parts.push(`PR #${evidence.pullRequestNumber}`);
  }
  if (evidence.mergeCommitSha) {
    parts.push(`merge ${evidence.mergeCommitSha.slice(0, 7)}`);
  }
  if (evidence.terminalState) {
    parts.push(evidence.terminalState);
  }
  if (evidence.sessionId) {
    parts.push(`session ${evidence.sessionId}`);
  }
  return parts.join(", ");
}
