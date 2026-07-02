import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { classifyBranchDrift } from "./active-pr-mergeability-watchdog";
import { detectDefaultRemoteBaseRef } from "./planner-root-checkout-reconciliation";
import { parsePlannerRelevantDirtyPaths } from "./planner-worktree-drift-watchdog";

export const ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER =
  "Root Main Lag and Current Truth Reconciliation";

export const ROOT_MAIN_LAG_STALE_OBSERVATION_UTC = "2026-07-02T19:01Z";

export const ROOT_MAIN_LAG_STALE_COMMIT_COUNT = 17;

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

export interface RootMainLagCurrentTruthHandoff {
  generatedAtUtc: string;
  gitTruth: RootMainLagGitTruthEvidence;
}

export interface CaptureRootMainLagGitTruthOptions {
  generatedAtUtc?: string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitStatus?: RunGitStatus;
  statusOutput?: string;
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

export function buildRootMainLagCurrentTruthHandoff(
  options: CaptureRootMainLagGitTruthOptions = {},
): RootMainLagCurrentTruthHandoff {
  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    gitTruth: captureRootMainLagGitTruth(options),
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

export function formatRootMainLagCurrentTruthHandoff(
  handoff: RootMainLagCurrentTruthHandoff,
): string {
  const lines = [
    ROOT_MAIN_LAG_CURRENT_TRUTH_RECONCILIATION_HEADER,
    `generated-at-utc=${handoff.generatedAtUtc}`,
    ...formatRootMainLagGitTruthEvidence(handoff.gitTruth),
  ];

  return lines.join("\n");
}

export function serializeRootMainLagCurrentTruthHandoff(
  handoff: RootMainLagCurrentTruthHandoff,
): string {
  return JSON.stringify(handoff, null, 2);
}
