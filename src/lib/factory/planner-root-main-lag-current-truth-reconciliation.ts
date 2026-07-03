import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

export const ROOT_MAIN_LAG_RECONCILIATION_PRESERVE_POLICY =
  "Do not revert, reset, restore, clean, or discard dirty root work; defer fast-forward sync when the checkout is dirty.";

export const ROOT_MAIN_LAG_RECONCILIATION_SCOPE_LIMIT =
  "Handoff output is limited to root git truth capture, queue/planner-report comparison, and the smallest safe sync or planner-report note update; do not edit content page bundles.";

export const ROOT_MAIN_LAG_RECONCILIATION_VERIFICATION_COMMAND =
  "bun run report:planner-root-main-lag-current-truth-reconciliation -- --repo-root <root> --apply --planner-report docs/internal/processes/root-main-lag-current-truth-reconciliation-relevant-files.md";

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

export type RootMainLagReconciliationOutcomeKind =
  | "root-sync-handoff"
  | "stale-state-note-update"
  | "explicit-no-update";

export type RootMainLagReconciliationApplyStatus =
  | "not-requested"
  | "applied"
  | "skipped"
  | "failed";

export interface RootMainLagReconciliationOutcome {
  applyDetail?: string;
  applyStatus: RootMainLagReconciliationApplyStatus;
  kind: RootMainLagReconciliationOutcomeKind;
  noUpdateReason?: string;
  operationalSummary: string;
  rootSyncAfterHead?: RootCommitIdentity;
  rootSyncBeforeHead?: RootCommitIdentity;
  staleNotesCorrected: string[];
  staleNotesRetired: string[];
  updatedPlannerReportPath?: string;
}

export interface RootMainLagReconciliationScopeBoundaries {
  preservePolicy: string;
  scopeLimit: string;
}

export interface RootMainLagReconciliationVerificationEvidence {
  dirtyStatePreventedUpdate?: string;
  plannerArtifact: string;
  postOutcomeRelationship: RootRemoteRelationship;
  postOutcomeWorktree: RootWorktreeCleanliness;
  userWorkReverted: false;
  verificationCommand: string;
}

export interface RootMainLagCurrentTruthHandoff {
  generatedAtUtc: string;
  gitTruth: RootMainLagGitTruthEvidence;
  outcome?: RootMainLagReconciliationOutcome;
  queuePlannerComparison: RootMainLagQueuePlannerComparison;
  scopeBoundaries?: RootMainLagReconciliationScopeBoundaries;
  verificationEvidence?: RootMainLagReconciliationVerificationEvidence;
}

export interface RootMainLagPlannerReportInput {
  path: string;
  text: string;
}

export const ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER =
  "<!-- ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION:START -->";

export const ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER =
  "<!-- ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION:END -->";

export interface CaptureRootMainLagGitTruthOptions {
  apply?: boolean;
  generatedAtUtc?: string;
  plannerReports?: readonly RootMainLagPlannerReportInput[];
  plannerReportPath?: string;
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

function commitIdentityFromSha(sha: string): RootCommitIdentity {
  return {
    sha,
    shortSha: sha.slice(0, 7),
  };
}

function collectStaleRootLagNoteLabels(
  comparison: RootMainLagQueuePlannerComparison,
): string[] {
  return comparison.noteRecords
    .filter((record) => record.alignment === "stale-root-lag-reference")
    .map((record) => record.sourceLabel);
}

function collectConflictingRootLagNoteLabels(
  comparison: RootMainLagQueuePlannerComparison,
): string[] {
  return comparison.noteRecords
    .filter((record) => record.alignment === "conflicting-current-condition")
    .map((record) => record.sourceLabel);
}

export function decideRootMainLagReconciliationOutcome(
  gitTruth: RootMainLagGitTruthEvidence,
  queuePlannerComparison: RootMainLagQueuePlannerComparison,
): Omit<
  RootMainLagReconciliationOutcome,
  "applyDetail" | "applyStatus" | "updatedPlannerReportPath"
> {
  const staleNotesCorrected = collectStaleRootLagNoteLabels(
    queuePlannerComparison,
  );
  const conflictingNotes = collectConflictingRootLagNoteLabels(
    queuePlannerComparison,
  );

  if (conflictingNotes.length > 0) {
    const labels = conflictingNotes.join(", ");
    return {
      kind: "explicit-no-update",
      noUpdateReason: `unresolved queue or planner-report conflict in ${labels}`,
      operationalSummary: `Do not sync the root while planner-facing notes in ${labels} conflict with live git (${gitTruth.worktreeCleanliness}, ${gitTruth.remoteRelationship}, behind=${gitTruth.commitsBehindRemote}).`,
      rootSyncAfterHead: undefined,
      rootSyncBeforeHead: undefined,
      staleNotesCorrected: [],
      staleNotesRetired: [],
    };
  }

  if (gitTruth.worktreeCleanliness === "dirty") {
    return {
      kind: "explicit-no-update",
      noUpdateReason: "dirty root worktree with local user or planner changes",
      operationalSummary: `Root sync is deferred because the checkout is dirty (${gitTruth.dirtyPathCount} planner-relevant paths). Preserve local work and reconcile ownership before any fast-forward.`,
      staleNotesCorrected: [],
      staleNotesRetired: [],
    };
  }

  if (gitTruth.remoteRelationship === "unknown") {
    return {
      kind: "explicit-no-update",
      noUpdateReason: "unable to classify root relationship to origin/main",
      operationalSummary:
        "Root sync is deferred because the live relationship to origin/main could not be classified safely.",
      staleNotesCorrected: [],
      staleNotesRetired: [],
    };
  }

  if (
    gitTruth.remoteRelationship === "diverged" ||
    gitTruth.remoteRelationship === "ahead"
  ) {
    return {
      kind: "explicit-no-update",
      noUpdateReason: `${gitTruth.remoteRelationship} history relative to ${gitTruth.remoteBaseRef}`,
      operationalSummary: `Root sync is deferred because HEAD is ${gitTruth.remoteRelationship} relative to ${gitTruth.remoteBaseRef} (ahead=${gitTruth.commitsAheadOfRemote}, behind=${gitTruth.commitsBehindRemote}).`,
      staleNotesCorrected: [],
      staleNotesRetired: [],
    };
  }

  if (
    gitTruth.remoteRelationship === "behind" &&
    gitTruth.worktreeCleanliness === "clean"
  ) {
    return {
      kind: "root-sync-handoff",
      operationalSummary: `Root is clean and ${gitTruth.commitsBehindRemote} commit(s) behind ${gitTruth.remoteBaseRef}; fast-forward sync is the smallest safe outcome.`,
      rootSyncBeforeHead: gitTruth.headCommit,
      staleNotesCorrected,
      staleNotesRetired: [],
    };
  }

  if (staleNotesCorrected.length > 0) {
    return {
      kind: "stale-state-note-update",
      operationalSummary: `Root already reflects current git truth, but planner-facing notes in ${staleNotesCorrected.join(", ")} still treat the ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} lag as current.`,
      staleNotesCorrected,
      staleNotesRetired: staleNotesCorrected,
    };
  }

  return {
    kind: "explicit-no-update",
    noUpdateReason: "root already reflects current truth",
    operationalSummary: `Root is ${gitTruth.worktreeCleanliness} and ${gitTruth.remoteRelationship} with ${gitTruth.remoteBaseRef}; no git update is needed. The stale ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} lag should be treated as historical context.`,
    staleNotesCorrected: [],
    staleNotesRetired: [
      `stale ${ROOT_MAIN_LAG_STALE_OBSERVATION_UTC} ${ROOT_MAIN_LAG_STALE_COMMIT_COUNT}-commit lag observation`,
    ],
  };
}

export function buildRootMainLagCurrentTruthResolutionSection(
  handoff: RootMainLagCurrentTruthHandoff,
  outcome: RootMainLagReconciliationOutcome,
): string {
  const plannerReportPath =
    outcome.updatedPlannerReportPath ??
    ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS[0];
  const lines = [
    "## Current truth resolution",
    "",
    ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Resolved at UTC | ${handoff.generatedAtUtc} |`,
    `| Outcome kind | ${outcome.kind} |`,
    `| Root HEAD | ${handoff.gitTruth.headCommit.shortSha} (${handoff.gitTruth.headCommit.sha}) |`,
    `| Remote base | ${handoff.gitTruth.remoteBaseRef} ${handoff.gitTruth.remoteMainCommit.shortSha} |`,
    `| Relationship | ${handoff.gitTruth.remoteRelationship} |`,
    `| Worktree | ${handoff.gitTruth.worktreeCleanliness} |`,
  ];

  if (outcome.rootSyncBeforeHead && outcome.rootSyncAfterHead) {
    lines.push(
      `| Root sync before | ${outcome.rootSyncBeforeHead.shortSha} (${outcome.rootSyncBeforeHead.sha}) |`,
    );
    lines.push(
      `| Root sync after | ${outcome.rootSyncAfterHead.shortSha} (${outcome.rootSyncAfterHead.sha}) |`,
    );
  }

  if (outcome.noUpdateReason) {
    lines.push(`| No-update reason | ${outcome.noUpdateReason} |`);
  }

  if (outcome.staleNotesRetired.length > 0) {
    lines.push(
      `| Stale notes retired | ${outcome.staleNotesRetired.join("; ")} |`,
    );
  }

  if (outcome.staleNotesCorrected.length > 0) {
    lines.push(
      `| Stale notes corrected | ${outcome.staleNotesCorrected.join("; ")} |`,
    );
  }

  lines.push("| User work reverted | no |");
  if (handoff.gitTruth.worktreeCleanliness === "dirty") {
    lines.push(
      `| Dirty state prevented update | ${handoff.gitTruth.dirtyPathCount} planner-relevant dirty path(s) in root checkout |`,
    );
  } else if (outcome.noUpdateReason?.includes("dirty")) {
    lines.push(`| Dirty state prevented update | ${outcome.noUpdateReason} |`);
  }

  lines.push(
    `| Post-outcome relationship | ${handoff.gitTruth.remoteRelationship} (${handoff.gitTruth.worktreeCleanliness} worktree) |`,
  );
  lines.push(`| Operational summary | ${outcome.operationalSummary} |`);
  lines.push(`| Planner artifact | \`${plannerReportPath}\` (this file) |`);
  lines.push(
    `| Verification command | \`${ROOT_MAIN_LAG_RECONCILIATION_VERIFICATION_COMMAND}\` |`,
  );
  lines.push("");
  lines.push(ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER);
  lines.push("");

  return lines.join("\n");
}

export function upsertRootMainLagCurrentTruthResolutionSection(
  existingText: string,
  section: string,
): string {
  const startIndex = existingText.indexOf(
    ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_START_MARKER,
  );
  const endIndex = existingText.indexOf(
    ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER,
  );

  if (startIndex >= 0 && endIndex > startIndex) {
    const sectionStart = existingText.lastIndexOf(
      "## Current truth resolution",
      startIndex,
    );
    const replaceStart = sectionStart >= 0 ? sectionStart : startIndex;
    const replaceEnd =
      endIndex + ROOT_MAIN_LAG_CURRENT_TRUTH_RESOLUTION_END_MARKER.length;
    const trailingNewline = existingText.slice(replaceEnd).startsWith("\n")
      ? 1
      : 0;
    return (
      existingText.slice(0, replaceStart) +
      section +
      existingText.slice(replaceEnd + trailingNewline)
    );
  }

  const boundariesIndex = existingText.indexOf("\n## Boundaries");
  if (boundariesIndex >= 0) {
    return (
      existingText.slice(0, boundariesIndex + 1) +
      section +
      existingText.slice(boundariesIndex + 1)
    );
  }

  return `${existingText.trimEnd()}\n\n${section}`;
}

function resolvePlannerReportAbsolutePath(
  repoRoot: string,
  plannerReportPath?: string,
): string {
  const selectedPath =
    plannerReportPath ?? ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS[0];
  return resolve(repoRoot, selectedPath);
}

function resolvePlannerReportHandoffPath(
  _repoRoot: string,
  plannerReportPath?: string,
): string {
  const selectedPath =
    plannerReportPath ?? ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS[0];
  if (selectedPath.startsWith("/")) {
    return selectedPath;
  }
  return selectedPath.replace(/^\.\//, "");
}

function fastForwardRootToRemoteMain(
  repoRoot: string,
  remoteBaseRef: string,
  runGit: RunGit,
): {
  afterHead: RootCommitIdentity;
  beforeHead: RootCommitIdentity;
} {
  const beforeSha = resolveGitRef(repoRoot, "HEAD", runGit);
  const remoteName = remoteBaseRef.includes("/")
    ? remoteBaseRef.split("/")[0]
    : "origin";
  runGit(repoRoot, ["fetch", remoteName]);

  const mergeResult = runGit(repoRoot, ["merge", "--ff-only", remoteBaseRef]);
  if (mergeResult.status !== 0) {
    throw new Error(
      `git merge --ff-only ${remoteBaseRef} failed: ${mergeResult.stderr.trim() || mergeResult.stdout.trim()}`,
    );
  }

  const afterSha = resolveGitRef(repoRoot, "HEAD", runGit);
  return {
    afterHead: commitIdentityFromSha(afterSha),
    beforeHead: commitIdentityFromSha(beforeSha),
  };
}

export function applyRootMainLagReconciliationOutcome(
  handoff: RootMainLagCurrentTruthHandoff,
  outcome: Omit<
    RootMainLagReconciliationOutcome,
    "applyDetail" | "applyStatus" | "updatedPlannerReportPath"
  >,
  options: {
    plannerReportPath?: string;
    runGit?: RunGit;
  } = {},
): RootMainLagReconciliationOutcome {
  const runGit = options.runGit ?? defaultRunGit;
  const plannerReportPath = resolvePlannerReportAbsolutePath(
    handoff.gitTruth.repoRoot,
    options.plannerReportPath,
  );
  const handoffPlannerReportPath = resolvePlannerReportHandoffPath(
    handoff.gitTruth.repoRoot,
    options.plannerReportPath,
  );

  if (outcome.kind === "root-sync-handoff") {
    try {
      const syncResult = fastForwardRootToRemoteMain(
        handoff.gitTruth.repoRoot,
        handoff.gitTruth.remoteBaseRef,
        runGit,
      );
      return {
        ...outcome,
        applyDetail: `Fast-forwarded root from ${syncResult.beforeHead.shortSha} to ${syncResult.afterHead.shortSha}.`,
        applyStatus: "applied",
        rootSyncAfterHead: syncResult.afterHead,
        rootSyncBeforeHead: syncResult.beforeHead,
        updatedPlannerReportPath: handoffPlannerReportPath,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown root sync failure";
      return {
        ...outcome,
        applyDetail: message,
        applyStatus: "failed",
        updatedPlannerReportPath: handoffPlannerReportPath,
      };
    }
  }

  if (outcome.kind === "stale-state-note-update") {
    if (!existsSync(plannerReportPath)) {
      return {
        ...outcome,
        applyDetail: `Planner report path missing at ${plannerReportPath}.`,
        applyStatus: "failed",
        updatedPlannerReportPath: handoffPlannerReportPath,
      };
    }

    const provisionalOutcome: RootMainLagReconciliationOutcome = {
      ...outcome,
      applyStatus: "applied",
      updatedPlannerReportPath: handoffPlannerReportPath,
    };
    const section = buildRootMainLagCurrentTruthResolutionSection(
      handoff,
      provisionalOutcome,
    );
    const existingText = readFileSync(plannerReportPath, "utf8");
    writeFileSync(
      plannerReportPath,
      upsertRootMainLagCurrentTruthResolutionSection(existingText, section),
      "utf8",
    );
    return {
      ...provisionalOutcome,
      applyDetail: `Updated stale-state note section in ${handoffPlannerReportPath}.`,
    };
  }

  const provisionalOutcome: RootMainLagReconciliationOutcome = {
    ...outcome,
    applyStatus: "skipped",
    updatedPlannerReportPath: handoffPlannerReportPath,
  };

  if (existsSync(plannerReportPath)) {
    const section = buildRootMainLagCurrentTruthResolutionSection(
      handoff,
      provisionalOutcome,
    );
    const existingText = readFileSync(plannerReportPath, "utf8");
    writeFileSync(
      plannerReportPath,
      upsertRootMainLagCurrentTruthResolutionSection(existingText, section),
      "utf8",
    );
    return {
      ...provisionalOutcome,
      applyDetail: `Recorded explicit no-update handoff in ${handoffPlannerReportPath}.`,
      applyStatus: "applied",
    };
  }

  return {
    ...provisionalOutcome,
    applyDetail:
      "Explicit no-update outcome recorded in handoff output only; planner report path was unavailable.",
  };
}

export function buildRootMainLagReconciliationScopeBoundaries(): RootMainLagReconciliationScopeBoundaries {
  return {
    preservePolicy: ROOT_MAIN_LAG_RECONCILIATION_PRESERVE_POLICY,
    scopeLimit: ROOT_MAIN_LAG_RECONCILIATION_SCOPE_LIMIT,
  };
}

export function buildRootMainLagReconciliationVerificationEvidence(
  handoff: RootMainLagCurrentTruthHandoff,
): RootMainLagReconciliationVerificationEvidence {
  const plannerArtifact =
    handoff.outcome?.updatedPlannerReportPath ??
    ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS[0];
  let dirtyStatePreventedUpdate: string | undefined;

  if (handoff.gitTruth.worktreeCleanliness === "dirty") {
    dirtyStatePreventedUpdate = `${handoff.gitTruth.dirtyPathCount} planner-relevant dirty path(s) in root checkout`;
  } else if (handoff.outcome?.noUpdateReason?.includes("dirty")) {
    dirtyStatePreventedUpdate = handoff.outcome.noUpdateReason;
  }

  return {
    dirtyStatePreventedUpdate,
    plannerArtifact,
    postOutcomeRelationship: handoff.gitTruth.remoteRelationship,
    postOutcomeWorktree: handoff.gitTruth.worktreeCleanliness,
    userWorkReverted: false,
    verificationCommand: ROOT_MAIN_LAG_RECONCILIATION_VERIFICATION_COMMAND,
  };
}

function attachRootMainLagHandoffBoundariesAndVerification(
  handoff: RootMainLagCurrentTruthHandoff,
): RootMainLagCurrentTruthHandoff {
  return {
    ...handoff,
    scopeBoundaries: buildRootMainLagReconciliationScopeBoundaries(),
    verificationEvidence:
      buildRootMainLagReconciliationVerificationEvidence(handoff),
  };
}

export function performRootMainLagReconciliation(
  options: CaptureRootMainLagGitTruthOptions = {},
): RootMainLagCurrentTruthHandoff {
  const handoff = buildRootMainLagCurrentTruthHandoff(options);
  const decidedOutcome = decideRootMainLagReconciliationOutcome(
    handoff.gitTruth,
    handoff.queuePlannerComparison,
  );

  if (!options.apply) {
    return attachRootMainLagHandoffBoundariesAndVerification({
      ...handoff,
      outcome: {
        ...decidedOutcome,
        applyStatus: "not-requested",
      },
    });
  }

  const appliedOutcome = applyRootMainLagReconciliationOutcome(
    handoff,
    decidedOutcome,
    {
      plannerReportPath: options.plannerReportPath,
      runGit: options.runGit,
    },
  );

  const refreshedGitTruth =
    appliedOutcome.kind === "root-sync-handoff" &&
    appliedOutcome.applyStatus === "applied"
      ? captureRootMainLagGitTruth(options)
      : handoff.gitTruth;

  return attachRootMainLagHandoffBoundariesAndVerification({
    ...handoff,
    gitTruth: refreshedGitTruth,
    outcome: appliedOutcome,
  });
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

export function formatRootMainLagScopeBoundaries(
  scopeBoundaries: RootMainLagReconciliationScopeBoundaries,
): string[] {
  return [
    "- scope-boundaries",
    `  - preserve-policy=${scopeBoundaries.preservePolicy}`,
    `  - scope-limit=${scopeBoundaries.scopeLimit}`,
  ];
}

export function formatRootMainLagVerificationEvidence(
  verificationEvidence: RootMainLagReconciliationVerificationEvidence,
): string[] {
  const lines = [
    "- verification-evidence",
    `  - user-work-reverted=${verificationEvidence.userWorkReverted}`,
    `  - post-outcome-relationship=${verificationEvidence.postOutcomeRelationship}`,
    `  - post-outcome-worktree=${verificationEvidence.postOutcomeWorktree}`,
    `  - planner-artifact=${verificationEvidence.plannerArtifact}`,
    `  - verification-command=${verificationEvidence.verificationCommand}`,
  ];

  if (verificationEvidence.dirtyStatePreventedUpdate) {
    lines.push(
      `  - dirty-state-prevented-update=${verificationEvidence.dirtyStatePreventedUpdate}`,
    );
  }

  return lines;
}

export function formatRootMainLagReconciliationOutcome(
  outcome: RootMainLagReconciliationOutcome,
): string[] {
  const lines = [
    "- reconciliation-outcome",
    `  - kind=${outcome.kind}`,
    `  - apply-status=${outcome.applyStatus}`,
    `  - operational-summary=${outcome.operationalSummary}`,
  ];

  if (outcome.noUpdateReason) {
    lines.push(`  - no-update-reason=${outcome.noUpdateReason}`);
  }

  if (outcome.rootSyncBeforeHead) {
    lines.push(
      `  - root-sync-before=${outcome.rootSyncBeforeHead.sha} short=${outcome.rootSyncBeforeHead.shortSha}`,
    );
  }

  if (outcome.rootSyncAfterHead) {
    lines.push(
      `  - root-sync-after=${outcome.rootSyncAfterHead.sha} short=${outcome.rootSyncAfterHead.shortSha}`,
    );
  }

  if (outcome.staleNotesRetired.length > 0) {
    lines.push(
      `  - stale-notes-retired=${outcome.staleNotesRetired.join("; ")}`,
    );
  }

  if (outcome.staleNotesCorrected.length > 0) {
    lines.push(
      `  - stale-notes-corrected=${outcome.staleNotesCorrected.join("; ")}`,
    );
  }

  if (outcome.updatedPlannerReportPath) {
    lines.push(`  - planner-artifact=${outcome.updatedPlannerReportPath}`);
  }

  if (outcome.applyDetail) {
    lines.push(`  - apply-detail=${outcome.applyDetail}`);
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

  if (handoff.scopeBoundaries) {
    lines.push(...formatRootMainLagScopeBoundaries(handoff.scopeBoundaries));
  }

  if (handoff.outcome) {
    lines.push(...formatRootMainLagReconciliationOutcome(handoff.outcome));
  }

  if (handoff.verificationEvidence) {
    lines.push(
      ...formatRootMainLagVerificationEvidence(handoff.verificationEvidence),
    );
  }

  return lines.join("\n");
}

export function serializeRootMainLagCurrentTruthHandoff(
  handoff: RootMainLagCurrentTruthHandoff,
): string {
  return JSON.stringify(handoff, null, 2);
}
