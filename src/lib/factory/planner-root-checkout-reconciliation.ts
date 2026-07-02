import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  type PlannerWorktreeDriftChangeKind,
  parsePlannerRelevantDirtyPaths,
} from "./planner-worktree-drift-watchdog";

export const PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER =
  "Planner Root Checkout Reconciliation";

export const PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT =
  "present-on-origin-main";

export const PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_ABSENT =
  "absent-on-origin-main";

export type RootCheckoutComparisonTarget = "HEAD" | "origin/main";

export type RootCheckoutDriftClassification =
  | "ownerless-root-checkout-drift"
  | "manual-inspection";

export interface RootCheckoutDirtyPathReport {
  changeKind: PlannerWorktreeDriftChangeKind;
  classification: RootCheckoutDriftClassification;
  comparisonTarget: RootCheckoutComparisonTarget;
  evidence: string;
  headPresent: boolean;
  path: string;
  remoteMainPresent: boolean;
  statusCode: string;
}

export interface PlannerRootCheckoutReconciliationReport {
  generatedAtUtc: string;
  manualInspectionPaths: RootCheckoutDirtyPathReport[];
  remoteBaseRef: string;
  remotePresentDeletions: RootCheckoutDirtyPathReport[];
  repoRoot: string;
  totalDirtyPathCount: number;
}

export interface DiscoverPlannerRootCheckoutReconciliationOptions {
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

function gitRefExists(repoRoot: string, ref: string, runGit: RunGit): boolean {
  return runGit(repoRoot, ["rev-parse", "--verify", ref]).status === 0;
}

export function detectDefaultRemoteBaseRef(
  repoRoot: string,
  runGit: RunGit = defaultRunGit,
): string {
  const remoteHead = runGit(repoRoot, [
    "symbolic-ref",
    "refs/remotes/origin/HEAD",
  ]);
  if (remoteHead.status === 0 && remoteHead.stdout.trim().length > 0) {
    return remoteHead.stdout.trim().replace("refs/remotes/", "");
  }

  for (const candidate of ["origin/main", "main", "origin/master", "master"]) {
    if (gitRefExists(repoRoot, candidate, runGit)) {
      return candidate;
    }
  }

  throw new Error(
    "Unable to determine a remote comparison base. Pass remoteBaseRef explicitly.",
  );
}

export function pathExistsOnGitRef(
  repoRoot: string,
  ref: string,
  path: string,
  runGit: RunGit = defaultRunGit,
): boolean {
  return runGit(repoRoot, ["cat-file", "-e", `${ref}:${path}`]).status === 0;
}

function classifyDeletedDirtyPath(
  dirtyPath: {
    changeKind: PlannerWorktreeDriftChangeKind;
    path: string;
    statusCode: string;
  },
  headPresent: boolean,
  remoteMainPresent: boolean,
): RootCheckoutDirtyPathReport {
  if (remoteMainPresent) {
    return {
      changeKind: dirtyPath.changeKind,
      classification: "ownerless-root-checkout-drift",
      comparisonTarget: "origin/main",
      evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
      headPresent,
      path: dirtyPath.path,
      remoteMainPresent,
      statusCode: dirtyPath.statusCode,
    };
  }

  return {
    changeKind: dirtyPath.changeKind,
    classification: "manual-inspection",
    comparisonTarget: "origin/main",
    evidence: PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_ABSENT,
    headPresent,
    path: dirtyPath.path,
    remoteMainPresent,
    statusCode: dirtyPath.statusCode,
  };
}

function classifyNonDeletionDirtyPath(dirtyPath: {
  changeKind: PlannerWorktreeDriftChangeKind;
  path: string;
  statusCode: string;
}): RootCheckoutDirtyPathReport {
  return {
    changeKind: dirtyPath.changeKind,
    classification: "manual-inspection",
    comparisonTarget: "HEAD",
    evidence: "non-deletion-dirty-path",
    headPresent: true,
    path: dirtyPath.path,
    remoteMainPresent: false,
    statusCode: dirtyPath.statusCode,
  };
}

export function classifyRootCheckoutDirtyPaths(
  dirtyPaths: Array<{
    changeKind: PlannerWorktreeDriftChangeKind;
    path: string;
    statusCode: string;
  }>,
  options: {
    remoteBaseRef: string;
    repoRoot: string;
    runGit?: RunGit;
  },
): {
  manualInspectionPaths: RootCheckoutDirtyPathReport[];
  remotePresentDeletions: RootCheckoutDirtyPathReport[];
} {
  const runGit = options.runGit ?? defaultRunGit;
  const remotePresentDeletions: RootCheckoutDirtyPathReport[] = [];
  const manualInspectionPaths: RootCheckoutDirtyPathReport[] = [];

  for (const dirtyPath of dirtyPaths) {
    if (dirtyPath.changeKind === "deleted") {
      const headPresent = pathExistsOnGitRef(
        options.repoRoot,
        "HEAD",
        dirtyPath.path,
        runGit,
      );
      const remoteMainPresent = pathExistsOnGitRef(
        options.repoRoot,
        options.remoteBaseRef,
        dirtyPath.path,
        runGit,
      );
      const classified = classifyDeletedDirtyPath(
        dirtyPath,
        headPresent,
        remoteMainPresent,
      );

      if (classified.classification === "ownerless-root-checkout-drift") {
        remotePresentDeletions.push(classified);
      } else {
        manualInspectionPaths.push(classified);
      }
      continue;
    }

    manualInspectionPaths.push(classifyNonDeletionDirtyPath(dirtyPath));
  }

  remotePresentDeletions.sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  manualInspectionPaths.sort((left, right) =>
    left.path.localeCompare(right.path),
  );

  return {
    manualInspectionPaths,
    remotePresentDeletions,
  };
}

export function buildPlannerRootCheckoutReconciliationReport(
  options: DiscoverPlannerRootCheckoutReconciliationOptions,
): PlannerRootCheckoutReconciliationReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(repoRoot, runGit);
  const statusOutput = options.statusOutput ?? runGitStatus(repoRoot);
  const dirtyPaths = parsePlannerRelevantDirtyPaths(statusOutput, "root");
  const classified = classifyRootCheckoutDirtyPaths(dirtyPaths, {
    remoteBaseRef,
    repoRoot,
    runGit,
  });

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    manualInspectionPaths: classified.manualInspectionPaths,
    remoteBaseRef,
    remotePresentDeletions: classified.remotePresentDeletions,
    repoRoot,
    totalDirtyPathCount: dirtyPaths.length,
  };
}

export function discoverPlannerRootCheckoutReconciliationReport(
  options: DiscoverPlannerRootCheckoutReconciliationOptions = {},
): PlannerRootCheckoutReconciliationReport {
  return buildPlannerRootCheckoutReconciliationReport(options);
}

function formatDirtyPathReport(
  pathReport: RootCheckoutDirtyPathReport,
): string {
  return [
    `path=${pathReport.path}`,
    `status=${pathReport.statusCode}`,
    `change=${pathReport.changeKind}`,
    `comparison-target=${pathReport.comparisonTarget}`,
    `evidence=${pathReport.evidence}`,
    `classification=${pathReport.classification}`,
  ].join(" ");
}

export function formatPlannerRootCheckoutReconciliationReport(
  report: PlannerRootCheckoutReconciliationReport,
): string {
  const lines = [
    PLANNER_ROOT_CHECKOUT_RECONCILIATION_HEADER,
    `remote-base-ref=${report.remoteBaseRef} root-dirty-paths=${report.totalDirtyPathCount} remote-present-deletions=${report.remotePresentDeletions.length} manual-inspection=${report.manualInspectionPaths.length}`,
    `- location=root repo=${report.repoRoot}`,
  ];

  lines.push(
    `- remote-present-ownerless-deletions count=${report.remotePresentDeletions.length} comparison-target=${report.remoteBaseRef}`,
  );
  if (report.remotePresentDeletions.length === 0) {
    lines.push("  - none");
  } else {
    for (const pathReport of report.remotePresentDeletions) {
      lines.push(`  - ${formatDirtyPathReport(pathReport)}`);
    }
  }

  lines.push(
    `- manual-inspection count=${report.manualInspectionPaths.length}`,
  );
  if (report.manualInspectionPaths.length === 0) {
    lines.push("  - none");
  } else {
    for (const pathReport of report.manualInspectionPaths) {
      lines.push(`  - ${formatDirtyPathReport(pathReport)}`);
    }
  }

  return lines.join("\n");
}

export function serializePlannerRootCheckoutReconciliationReport(
  report: PlannerRootCheckoutReconciliationReport,
): string {
  return JSON.stringify(report, null, 2);
}
