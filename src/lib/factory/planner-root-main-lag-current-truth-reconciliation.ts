import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { classifyBranchDrift } from "./active-pr-mergeability-watchdog";
import { detectDefaultRemoteBaseRef } from "./planner-root-checkout-reconciliation";
import { parsePlannerRelevantDirtyPaths } from "./planner-worktree-drift-watchdog";

export const ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER =
  "Root Main Lag and Current Truth Reconciliation";

export const ROOT_MAIN_LAG_STALE_OBSERVATION_UTC = "2026-07-02T19:01Z";

export const ROOT_MAIN_LAG_STALE_COMMIT_COUNT = 17;

export const ROOT_MAIN_LAG_WORK_ITEM_NAME =
  "root-main-lag-and-current-truth-reconciliation";

export const ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS = [
  "docs/internal/processes/root-main-lag-current-truth-reconciliation-relevant-files.md",
] as const;

export type RootWorktreeCleanliness = "clean" | "dirty";

export type RootRemoteRelationship =
  | "aligned"
  | "ahead"
  | "behind"
  | "diverged"
  | "unknown";

export interface RootCommitIdentity {
  sha: string;
  shortSha: string;
}

export interface RootMainLagGitTruthEvidence {
  commitsAheadOfRemote: number;
  commitsBehindRemote: number;
  currentBranch: string | null;
  dirtyPathCount: number;
  headCommit: RootCommitIdentity;
  remoteBaseRef: string;
  remoteMainCommit: RootCommitIdentity;
  remoteRelationship: RootRemoteRelationship;
  repoRoot: string;
  worktreeCleanliness: RootWorktreeCleanliness;
}

export type RootMainLagNoteAlignment =
  | "stale-root-lag-reference"
  | "already-resolved-condition"
  | "conflicting-current-condition";

export type RootMainLagEvidenceSourceKind = "queue-record" | "planner-report";

export interface RootMainLagPlannerNoteRecord {
  alignment: RootMainLagNoteAlignment;
  excerpt: string;
  operationalNote: string;
  sourceKind: RootMainLagEvidenceSourceKind;
  sourceLabel: string;
}

export interface RootMainLagQueuePlannerComparison {
  noteRecords: RootMainLagPlannerNoteRecord[];
  operationalSummary: string;
  plannerReportCount: number;
  queueStateAvailability: "available" | "unavailable";
  queueStateUnavailableReason?: string;
}

export interface RootMainLagCurrentTruthHandoff {
  generatedAtUtc: string;
  gitTruth: RootMainLagGitTruthEvidence;
  queuePlannerComparison: RootMainLagQueuePlannerComparison;
}

export interface RootMainLagPlannerReportInput {
  path: string;
  text: string;
}

export interface CaptureRootMainLagGitTruthOptions {
  generatedAtUtc?: string;
  plannerReports?: readonly RootMainLagPlannerReportInput[];
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitStatus?: RunGitStatus;
  statusOutput?: string;
  workListJsonText?: string;
}

type RunGit = (repoRoot: string, args: readonly string[]) => GitCommandResult;
type RunGitStatus = (cwd: string) => string;

interface GitCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function defaultRunGit(
  repoRoot: string,
  args: readonly string[],
): GitCommandResult {
  const result = spawnSync("git", [...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function defaultRunGitStatus(cwd: string): string {
  const result = defaultRunGit(cwd, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);

  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `git status --porcelain=v1 --untracked-files=all failed for ${cwd}.${details ? `\n${details}` : ""}`,
    );
  }

  return result.stdout;
}

function resolveGitRef(repoRoot: string, ref: string, runGit: RunGit): string {
  const result = runGit(repoRoot, ["rev-parse", ref]);
  if (result.status !== 0 || result.stdout.trim().length === 0) {
    throw new Error(`Unable to resolve ${ref} at ${repoRoot}`);
  }
  return result.stdout.trim();
}

function resolveCurrentBranch(repoRoot: string, runGit: RunGit): string | null {
  const result = runGit(repoRoot, ["symbolic-ref", "--short", "HEAD"]);
  if (result.status !== 0 || result.stdout.trim().length === 0) {
    return null;
  }
  return result.stdout.trim();
}

export function mapBranchDriftToRootRemoteRelationship(
  driftStatus: ReturnType<typeof classifyBranchDrift>["status"],
): RootRemoteRelationship {
  switch (driftStatus) {
    case "up-to-date":
      return "aligned";
    case "ahead":
      return "ahead";
    case "behind":
      return "behind";
    case "diverged":
      return "diverged";
    default:
      return "unknown";
  }
}

export function classifyRootRemoteRelationship(
  repoRoot: string,
  remoteBaseRef: string,
  runGit: RunGit = defaultRunGit,
): Pick<
  RootMainLagGitTruthEvidence,
  "commitsAheadOfRemote" | "commitsBehindRemote" | "remoteRelationship"
> {
  const drift = classifyBranchDrift(
    "HEAD",
    (command, args, cwd) => {
      if (command !== "git") {
        return {
          ok: false,
          stdout: "",
          stderr: "unsupported command",
          exitCode: 1,
        };
      }
      const result = runGit(cwd ?? repoRoot, args);
      return {
        ok: result.status === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.status,
      };
    },
    remoteBaseRef,
    repoRoot,
  );

  return {
    commitsAheadOfRemote: drift.commitsAheadOfMain ?? 0,
    commitsBehindRemote: drift.commitsBehindMain ?? 0,
    remoteRelationship: mapBranchDriftToRootRemoteRelationship(drift.status),
  };
}

export function captureRootMainLagGitTruth(
  options: CaptureRootMainLagGitTruthOptions = {},
): RootMainLagGitTruthEvidence {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(repoRoot, runGit);
  const statusOutput = options.statusOutput ?? runGitStatus(repoRoot);
  const dirtyPaths = parsePlannerRelevantDirtyPaths(statusOutput, "root");
  const headSha = resolveGitRef(repoRoot, "HEAD", runGit);
  const remoteMainSha = resolveGitRef(repoRoot, remoteBaseRef, runGit);
  const relationship = classifyRootRemoteRelationship(
    repoRoot,
    remoteBaseRef,
    runGit,
  );

  return {
    ...relationship,
    currentBranch: resolveCurrentBranch(repoRoot, runGit),
    dirtyPathCount: dirtyPaths.length,
    headCommit: {
      sha: headSha,
      shortSha: headSha.slice(0, 7),
    },
    remoteBaseRef,
    remoteMainCommit: {
      sha: remoteMainSha,
      shortSha: remoteMainSha.slice(0, 7),
    },
    repoRoot,
    worktreeCleanliness: dirtyPaths.length === 0 ? "clean" : "dirty",
  };
}

function readStringField(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function extractQueueItemArray(payload: unknown): Record<string, unknown>[] {
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

function parseQueueItemsJson(
  workListJsonText: string,
): Record<string, unknown>[] {
  const parsed = JSON.parse(workListJsonText) as unknown;
  return extractQueueItemArray(parsed);
}

function readQueueWorkItemName(record: Record<string, unknown>): string {
  return (
    readStringField(record, ["name", "workItemName", "title", "id"]) ??
    "unknown-work-item"
  );
}

function normalizeComparableText(text: string): string {
  return text.trim().toLowerCase();
}

export function textContainsRootMainLagStaleMarker(text: string): boolean {
  const normalized = normalizeComparableText(text);
  if (
    normalized.includes(
      normalizeComparableText(ROOT_MAIN_LAG_STALE_OBSERVATION_UTC),
    )
  ) {
    return true;
  }

  const mentionsStaleCommitCount =
    normalized.includes(`${ROOT_MAIN_LAG_STALE_COMMIT_COUNT} commit`) ||
    normalized.includes(`${ROOT_MAIN_LAG_STALE_COMMIT_COUNT} commits`);
  const mentionsMainLag =
    normalized.includes("origin/main") ||
    normalized.includes("origin main") ||
    normalized.includes("root checkout") ||
    normalized.includes("root-main-lag");

  return (
    mentionsStaleCommitCount &&
    (normalized.includes("behind") || mentionsMainLag)
  );
}

export function textClaimsCurrentRootMainLag(text: string): boolean {
  if (!textContainsRootMainLagStaleMarker(text)) {
    return false;
  }

  const normalized = normalizeComparableText(text);
  const presentTenseClaim =
    /\b(is|are|remains|still|currently|now)\b.*\b(behind|lag)\b/.test(
      normalized,
    ) || /\broot checkout is\b.*\b(behind|lag)\b/.test(normalized);
  if (presentTenseClaim) {
    return true;
  }

  const historicalFraming =
    /\b(was|were|had been)\b.*\b(behind|lag)\b/.test(normalized) ||
    normalized.includes("stale observation") ||
    normalized.includes("do not treat the stale row") ||
    normalized.includes("reported lag") ||
    normalized.includes(
      normalizeComparableText(ROOT_MAIN_LAG_STALE_OBSERVATION_UTC),
    );

  if (historicalFraming) {
    return false;
  }

  return true;
}

export function textClaimsRootMainLagResolved(text: string): boolean {
  const normalized = normalizeComparableText(text);
  return (
    /\b(no longer applies|already aligned|lag resolved|lag no longer|stale .* no longer)\b/.test(
      normalized,
    ) ||
    /\b(clean and aligned|aligned with `origin\/main`|aligned with origin\/main)\b/.test(
      normalized,
    )
  );
}

export function classifyRootMainLagNoteAlignment(
  gitTruth: RootMainLagGitTruthEvidence,
  text: string,
): RootMainLagNoteAlignment {
  const claimsCurrentStaleLag = textClaimsCurrentRootMainLag(text);
  const claimsResolved = textClaimsRootMainLagResolved(text);
  const lagResolvedOnGit =
    gitTruth.remoteRelationship === "aligned" &&
    gitTruth.worktreeCleanliness === "clean";

  if (claimsResolved && lagResolvedOnGit) {
    return "already-resolved-condition";
  }

  if (claimsCurrentStaleLag && lagResolvedOnGit) {
    return "stale-root-lag-reference";
  }

  if (claimsCurrentStaleLag && gitTruth.remoteRelationship === "behind") {
    if (gitTruth.commitsBehindRemote === ROOT_MAIN_LAG_STALE_COMMIT_COUNT) {
      return "already-resolved-condition";
    }
    return "conflicting-current-condition";
  }

  if (
    claimsCurrentStaleLag &&
    gitTruth.remoteRelationship !== "behind" &&
    !lagResolvedOnGit
  ) {
    return "conflicting-current-condition";
  }

  if (textContainsRootMainLagStaleMarker(text) && lagResolvedOnGit) {
    return "already-resolved-condition";
  }

  if (lagResolvedOnGit) {
    return "already-resolved-condition";
  }

  if (
    gitTruth.remoteRelationship === "behind" &&
    gitTruth.commitsBehindRemote !== ROOT_MAIN_LAG_STALE_COMMIT_COUNT &&
    textContainsRootMainLagStaleMarker(text)
  ) {
    return "conflicting-current-condition";
  }

  return "already-resolved-condition";
}

function excerptMatchingLine(
  text: string,
  matcher: (line: string) => boolean,
): string {
  for (const line of text.split("\n")) {
    if (matcher(line)) {
      return line.trim().slice(0, 160);
    }
  }
  return text.trim().slice(0, 160);
}

function buildOperationalNote(
  alignment: RootMainLagNoteAlignment,
  sourceLabel: string,
  gitTruth: RootMainLagGitTruthEvidence,
): string {
  switch (alignment) {
    case "stale-root-lag-reference":
      return `${sourceLabel} still describes the ${ROOT_MAIN_LAG_STALE_COMMIT_COUNT}-commit root lag as current, but live git shows root ${gitTruth.worktreeCleanliness} and ${gitTruth.remoteRelationship} with ${gitTruth.remoteBaseRef}.`;
    case "conflicting-current-condition":
      return `${sourceLabel} describes a root lag state that does not match live git (${gitTruth.worktreeCleanliness}, ${gitTruth.remoteRelationship}, behind=${gitTruth.commitsBehindRemote}).`;
    case "already-resolved-condition":
      return `${sourceLabel} matches live git or only documents the stale ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} observation as historical context.`;
  }
}

export function inspectRootMainLagPlannerReport(
  gitTruth: RootMainLagGitTruthEvidence,
  report: RootMainLagPlannerReportInput,
): RootMainLagPlannerNoteRecord | null {
  const relevant =
    textContainsRootMainLagStaleMarker(report.text) ||
    normalizeComparableText(report.path).includes(
      normalizeComparableText(ROOT_MAIN_LAG_WORK_ITEM_NAME),
    );
  if (!relevant) {
    return null;
  }

  const alignment = classifyRootMainLagNoteAlignment(gitTruth, report.text);
  return {
    alignment,
    excerpt: excerptMatchingLine(
      report.text,
      textContainsRootMainLagStaleMarker,
    ),
    operationalNote: buildOperationalNote(alignment, report.path, gitTruth),
    sourceKind: "planner-report",
    sourceLabel: report.path,
  };
}

function collectQueueRecordText(record: Record<string, unknown>): string {
  const chunks: string[] = [];

  function walk(value: unknown): void {
    if (typeof value === "string") {
      chunks.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (isRecord(value)) {
      for (const nestedValue of Object.values(value)) {
        walk(nestedValue);
      }
    }
  }

  walk(record);
  return chunks.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function inspectRootMainLagQueueRecords(
  gitTruth: RootMainLagGitTruthEvidence,
  workListJsonText: string,
): RootMainLagPlannerNoteRecord[] {
  const items = parseQueueItemsJson(workListJsonText);
  const noteRecords: RootMainLagPlannerNoteRecord[] = [];

  for (const item of items) {
    const combinedText = collectQueueRecordText(item);
    const workItemName = readQueueWorkItemName(item);
    const relevant =
      normalizeComparableText(workItemName).includes(
        normalizeComparableText(ROOT_MAIN_LAG_WORK_ITEM_NAME),
      ) || textContainsRootMainLagStaleMarker(combinedText);
    if (!relevant) {
      continue;
    }

    const alignment = classifyRootMainLagNoteAlignment(gitTruth, combinedText);
    noteRecords.push({
      alignment,
      excerpt: excerptMatchingLine(
        combinedText,
        textContainsRootMainLagStaleMarker,
      ),
      operationalNote: buildOperationalNote(
        alignment,
        `queue:${workItemName}`,
        gitTruth,
      ),
      sourceKind: "queue-record",
      sourceLabel: workItemName,
    });
  }

  return noteRecords;
}

export function compareQueueStateAndPlannerReportsAgainstGitTruth(
  gitTruth: RootMainLagGitTruthEvidence,
  options: {
    plannerReports?: readonly RootMainLagPlannerReportInput[];
    workListJsonText?: string;
  } = {},
): RootMainLagQueuePlannerComparison {
  const noteRecords: RootMainLagPlannerNoteRecord[] = [];
  const queueStateAvailability: RootMainLagQueuePlannerComparison["queueStateAvailability"] =
    options.workListJsonText ? "available" : "unavailable";
  const queueStateUnavailableReason = options.workListJsonText
    ? undefined
    : "Queue state was not supplied; pass --work-list-json to compare live queue records.";

  if (options.workListJsonText) {
    noteRecords.push(
      ...inspectRootMainLagQueueRecords(gitTruth, options.workListJsonText),
    );
  }

  const plannerReports = options.plannerReports ?? [];
  for (const report of plannerReports) {
    const inspected = inspectRootMainLagPlannerReport(gitTruth, report);
    if (inspected) {
      noteRecords.push(inspected);
    }
  }

  return {
    noteRecords,
    operationalSummary: summarizeRootMainLagQueuePlannerComparison(
      gitTruth,
      noteRecords,
      queueStateAvailability,
    ),
    plannerReportCount: plannerReports.length,
    queueStateAvailability,
    queueStateUnavailableReason,
  };
}

export function summarizeRootMainLagQueuePlannerComparison(
  gitTruth: RootMainLagGitTruthEvidence,
  noteRecords: readonly RootMainLagPlannerNoteRecord[],
  queueStateAvailability: RootMainLagQueuePlannerComparison["queueStateAvailability"],
): string {
  const staleReferences = noteRecords.filter(
    (record) => record.alignment === "stale-root-lag-reference",
  );
  const conflictingReferences = noteRecords.filter(
    (record) => record.alignment === "conflicting-current-condition",
  );

  if (staleReferences.length > 0) {
    const labels = staleReferences
      .map((record) => record.sourceLabel)
      .join(", ");
    return `Planner-facing notes in ${labels} still treat the ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} root lag as current even though live git shows root ${gitTruth.worktreeCleanliness} and ${gitTruth.remoteRelationship} with ${gitTruth.remoteBaseRef}.`;
  }

  if (conflictingReferences.length > 0) {
    const labels = conflictingReferences
      .map((record) => record.sourceLabel)
      .join(", ");
    return `Planner-facing notes in ${labels} describe a root lag state that conflicts with live git (${gitTruth.worktreeCleanliness}, ${gitTruth.remoteRelationship}, behind=${gitTruth.commitsBehindRemote}).`;
  }

  if (noteRecords.length === 0 && queueStateAvailability === "unavailable") {
    return `No queue state was supplied for comparison; inspect default planner reports only. Live git shows root ${gitTruth.worktreeCleanliness} and ${gitTruth.remoteRelationship} with ${gitTruth.remoteBaseRef}, so the stale ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} lag should be treated as historical unless queue records say otherwise.`;
  }

  if (noteRecords.length === 0) {
    return `Queue state and inspected planner reports contain no current stale root-lag claims. Live git shows root ${gitTruth.worktreeCleanliness} and ${gitTruth.remoteRelationship} with ${gitTruth.remoteBaseRef}.`;
  }

  return `Inspected planner notes match live git or only preserve the stale ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} observation as historical context while root is ${gitTruth.worktreeCleanliness} and ${gitTruth.remoteRelationship} with ${gitTruth.remoteBaseRef}.`;
}

export function buildRootMainLagCurrentTruthHandoff(
  options: CaptureRootMainLagGitTruthOptions = {},
): RootMainLagCurrentTruthHandoff {
  const gitTruth = captureRootMainLagGitTruth(options);
  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    gitTruth,
    queuePlannerComparison: compareQueueStateAndPlannerReportsAgainstGitTruth(
      gitTruth,
      {
        plannerReports: options.plannerReports,
        workListJsonText: options.workListJsonText,
      },
    ),
  };
}

export function formatRootMainLagGitTruthEvidence(
  evidence: RootMainLagGitTruthEvidence,
): string[] {
  const branchLabel = evidence.currentBranch ?? "detached-head";
  const relationshipSummary =
    evidence.remoteRelationship === "aligned"
      ? "aligned"
      : `${evidence.remoteRelationship}(ahead=${evidence.commitsAheadOfRemote},behind=${evidence.commitsBehindRemote})`;

  return [
    "- root-git-truth",
    `  - location=root repo=${evidence.repoRoot}`,
    `  - branch=${branchLabel}`,
    `  - worktree=${evidence.worktreeCleanliness} dirty-paths=${evidence.dirtyPathCount}`,
    `  - head=${evidence.headCommit.sha} short=${evidence.headCommit.shortSha}`,
    `  - remote-base-ref=${evidence.remoteBaseRef} sha=${evidence.remoteMainCommit.sha} short=${evidence.remoteMainCommit.shortSha}`,
    `  - relationship=${relationshipSummary}`,
  ];
}

export function formatRootMainLagQueuePlannerComparison(
  comparison: RootMainLagQueuePlannerComparison,
): string[] {
  const lines = [
    "- queue-planner-comparison",
    `  - queue-state=${comparison.queueStateAvailability}`,
  ];

  if (comparison.queueStateUnavailableReason) {
    lines.push(
      `  - queue-state-unavailable-reason=${comparison.queueStateUnavailableReason}`,
    );
  }

  lines.push(`  - planner-report-count=${comparison.plannerReportCount}`);
  lines.push(`  - operational-summary=${comparison.operationalSummary}`);

  for (const record of comparison.noteRecords) {
    lines.push(
      `  - note source=${record.sourceKind}:${record.sourceLabel} alignment=${record.alignment}`,
    );
    if (record.excerpt.length > 0) {
      lines.push(`    excerpt=${record.excerpt}`);
    }
    lines.push(`    note=${record.operationalNote}`);
  }

  return lines;
}

export function formatRootMainLagCurrentTruthHandoff(
  handoff: RootMainLagCurrentTruthHandoff,
): string {
  const lines = [
    ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER,
    `generated-at-utc=${handoff.generatedAtUtc}`,
    ...formatRootMainLagGitTruthEvidence(handoff.gitTruth),
    ...formatRootMainLagQueuePlannerComparison(handoff.queuePlannerComparison),
  ];

  return lines.join("\n");
}

export function serializeRootMainLagCurrentTruthHandoff(
  handoff: RootMainLagCurrentTruthHandoff,
): string {
  return JSON.stringify(handoff, null, 2);
}
