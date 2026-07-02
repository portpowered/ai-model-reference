import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import type { LaneDiscoveryReport } from "./active-pr-mergeability-watchdog";
import {
  discoverMergedLaneEvidence,
  type PlannerMergedLaneEvidence,
} from "./planner-merged-lane-evidence";
import {
  buildPlannerRootCheckoutReconciliationReport,
  type PlannerRootCheckoutReconciliationReport,
  type RootCheckoutDirtyPathReport,
} from "./planner-root-checkout-reconciliation";
import {
  discoverPlannerWorktreeDriftSnapshot,
  type PlannerWorktreeDirtyPath,
  type PlannerWorktreeDriftSnapshot,
} from "./planner-worktree-drift-watchdog";

export const PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_HEADER =
  "Planner Root Reconciliation Drift Handoff";

export const PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_REPORTED_AT_UTC =
  "2026-07-02T04:01:00.000Z";

export const PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS = [
  "docs/internal/processes/factory-linkage-relevant-files.md",
  "scripts/report-planner-root-checkout-reconciliation.ts",
  "src/lib/factory/planner-root-checkout-reconciliation.test.ts",
  "src/lib/factory/planner-root-checkout-reconciliation.ts",
  "src/tests/discovery/planner-root-checkout-reconciliation.test.ts",
  "src/tests/fixtures/planner-root-checkout-reconciliation/manual-inspection-shared-edits-dirty-status.txt",
  "src/tests/fixtures/planner-root-checkout-reconciliation/table-registry-drift-dirty-status.txt",
  "src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
] as const;

export type PlannerRootReconciliationDriftHandoffTargetPath =
  (typeof PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS)[number];

export type DriftHandoffEvidenceSourceKind =
  | "git-status-scoped"
  | "root-checkout-reconciliation"
  | "worktree-drift"
  | "active-pr-linkage"
  | "merged-lane-metadata";

export type DriftHandoffEvidenceAvailability = "available" | "unavailable";

export interface DriftHandoffTargetPathGitStatus {
  observedStatus: "clean" | "dirty";
  path: PlannerRootReconciliationDriftHandoffTargetPath;
  statusLine: string | null;
}

export interface DriftHandoffEvidenceSourceRecord {
  availability: DriftHandoffEvidenceAvailability;
  command?: string;
  excerpt?: string;
  kind: DriftHandoffEvidenceSourceKind;
  matchingTargetPaths: PlannerRootReconciliationDriftHandoffTargetPath[];
  unavailableReason?: string;
}

export interface PlannerRootReconciliationDriftHandoffReport {
  evidenceCapturedAtUtc: string;
  evidenceSources: DriftHandoffEvidenceSourceRecord[];
  reportedDriftAtUtc: string;
  repoRoot: string;
  targetPathGitStatus: DriftHandoffTargetPathGitStatus[];
}

export interface DiscoverPlannerRootReconciliationDriftHandoffOptions {
  evidenceCapturedAtUtc?: string;
  generatedAtUtc?: string;
  laneDiscoveryReport?: LaneDiscoveryReport;
  mergedLaneEvidence?: PlannerMergedLaneEvidence[];
  remoteBaseRef?: string;
  repoRoot?: string;
  reportedDriftAtUtc?: string;
  runGit?: RunGit;
  runGitStatus?: RunGitStatus;
  sessionListJsonText?: string;
  skipActivePrLinkage?: boolean;
  skipMergedLaneMetadata?: boolean;
  skipRootCheckoutReconciliation?: boolean;
  skipWorktreeDrift?: boolean;
  statusOutput?: string;
  workListJsonText?: string;
  worktreesDir?: string;
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

const SCOPED_GIT_STATUS_COMMAND = "git status --short --branch --";

function extractStatusPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  const renameSplit = trimmed.split(" -> ");
  return renameSplit[renameSplit.length - 1] ?? trimmed;
}

export function parseScopedGitStatusForTargetPaths(
  statusOutput: string,
  targetPaths: readonly PlannerRootReconciliationDriftHandoffTargetPath[] = PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS,
): DriftHandoffTargetPathGitStatus[] {
  const statusByPath = new Map<string, string>();

  for (const line of statusOutput.split("\n")) {
    if (!line.trim() || line.startsWith("##")) {
      continue;
    }

    const statusCode = line.slice(0, 2);
    const path = extractStatusPath(line.slice(3));
    statusByPath.set(path, `${statusCode} ${path}`.trim());
  }

  return targetPaths.map((path) => {
    const statusLine = statusByPath.get(path) ?? null;
    return {
      observedStatus: statusLine ? "dirty" : "clean",
      path,
      statusLine,
    };
  });
}

export function runScopedGitStatusForTargetPaths(
  repoRoot: string,
  runGit: RunGit = defaultRunGit,
  targetPaths: readonly PlannerRootReconciliationDriftHandoffTargetPath[] = PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS,
): string {
  const result = runGit(repoRoot, [
    "status",
    "--short",
    "--branch",
    "--",
    ...targetPaths,
  ]);

  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `${SCOPED_GIT_STATUS_COMMAND} <target-paths> failed for ${repoRoot}.${details ? `\n${details}` : ""}`,
    );
  }

  return result.stdout;
}

function collectReconciliationPathReports(
  report: PlannerRootCheckoutReconciliationReport,
): RootCheckoutDirtyPathReport[] {
  return [
    ...report.remotePresentDeletions,
    ...report.manualInspectionPaths,
  ].sort((left, right) => left.path.localeCompare(right.path));
}

function filterMatchingTargetPaths<T extends { path: string }>(
  records: T[],
  targetPathSet: ReadonlySet<string>,
): T[] {
  return records.filter((record) => targetPathSet.has(record.path));
}

function formatReconciliationPathExcerpt(
  pathReport: RootCheckoutDirtyPathReport,
): string {
  return [
    `path=${pathReport.path}`,
    `status=${pathReport.statusCode}`,
    `change=${pathReport.changeKind}`,
    `classification=${pathReport.classification}`,
    `evidence=${pathReport.evidence}`,
  ].join(" ");
}

function formatWorktreeDriftPathExcerpt(
  dirtyPath: PlannerWorktreeDirtyPath,
): string {
  const owner = dirtyPath.ownership.laneName
    ? `${dirtyPath.ownership.kind}:${dirtyPath.ownership.laneName}`
    : dirtyPath.ownership.kind;
  return [
    `path=${dirtyPath.path}`,
    `status=${dirtyPath.statusCode}`,
    `change=${dirtyPath.changeKind}`,
    `owner=${owner}`,
    `ownership-reason=${dirtyPath.ownership.reason}`,
  ].join(" ");
}

function buildGitStatusScopedEvidenceSource(
  scopedGitStatusOutput: string,
  targetPathGitStatus: DriftHandoffTargetPathGitStatus[],
): DriftHandoffEvidenceSourceRecord {
  const matchingTargetPaths = targetPathGitStatus
    .filter((entry) => entry.observedStatus === "dirty")
    .map((entry) => entry.path);

  return {
    availability: "available",
    command: SCOPED_GIT_STATUS_COMMAND,
    excerpt: scopedGitStatusOutput.trim() || "(no scoped dirty lines)",
    kind: "git-status-scoped",
    matchingTargetPaths,
  };
}

function buildRootCheckoutReconciliationEvidenceSource(
  report: PlannerRootCheckoutReconciliationReport,
  targetPathSet: ReadonlySet<PlannerRootReconciliationDriftHandoffTargetPath>,
): DriftHandoffEvidenceSourceRecord {
  const matchingReports = filterMatchingTargetPaths(
    collectReconciliationPathReports(report),
    targetPathSet,
  );

  return {
    availability: "available",
    command: "report:planner-root-checkout-reconciliation",
    excerpt:
      matchingReports.length > 0
        ? matchingReports.map(formatReconciliationPathExcerpt).join("\n")
        : "none-of-eight-target-paths-in-reconciliation-dirty-set",
    kind: "root-checkout-reconciliation",
    matchingTargetPaths: matchingReports.map(
      (pathReport) =>
        pathReport.path as PlannerRootReconciliationDriftHandoffTargetPath,
    ),
  };
}

function buildWorktreeDriftEvidenceSource(
  snapshot: PlannerWorktreeDriftSnapshot,
  targetPathSet: ReadonlySet<PlannerRootReconciliationDriftHandoffTargetPath>,
): DriftHandoffEvidenceSourceRecord {
  const matchingRootPaths = filterMatchingTargetPaths(
    snapshot.root.dirtyPaths,
    targetPathSet,
  );

  return {
    availability: "available",
    command: "report:planner-worktree-drift-watchdog",
    excerpt:
      matchingRootPaths.length > 0
        ? matchingRootPaths.map(formatWorktreeDriftPathExcerpt).join("\n")
        : "none-of-eight-target-paths-in-root-drift-set",
    kind: "worktree-drift",
    matchingTargetPaths: matchingRootPaths.map(
      (dirtyPath) =>
        dirtyPath.path as PlannerRootReconciliationDriftHandoffTargetPath,
    ),
  };
}

function buildActivePrLinkageEvidenceSource(
  laneReport: LaneDiscoveryReport,
  targetPathSet: ReadonlySet<PlannerRootReconciliationDriftHandoffTargetPath>,
): DriftHandoffEvidenceSourceRecord {
  const activePrBackedLanes = laneReport.lanes.filter(
    (lane) => lane.queueState === "active" && lane.status === "pr-backed",
  );
  const matchingLanes = activePrBackedLanes.filter((lane) =>
    [...targetPathSet].some((targetPath) =>
      lane.workItemName.includes(
        targetPath
          .split("/")
          .pop()
          ?.replace(/\.[^.]+$/, "") ?? targetPath,
      ),
    ),
  );

  const excerptLines = [
    `active-pr-backed-lanes=${activePrBackedLanes.length}`,
    ...activePrBackedLanes.map(
      (lane) =>
        `lane=${lane.workItemName} branch=${lane.branchName ?? "?"} pr=${lane.prNumber ?? "?"} mergeability=${lane.mergeabilityClass ?? "?"} risk=${lane.queueMismatchRisk ?? "?"}`,
    ),
  ];

  if (matchingLanes.length > 0) {
    excerptLines.push(
      ...matchingLanes.map(
        (lane) =>
          `name-match lane=${lane.workItemName} branch=${lane.branchName ?? "?"}`,
      ),
    );
  }

  return {
    availability: "available",
    command: "watch:active-pr-mergeability",
    excerpt: excerptLines.join("\n"),
    kind: "active-pr-linkage",
    matchingTargetPaths: [],
  };
}

function buildMergedLaneMetadataEvidenceSource(
  mergedLaneEvidence: PlannerMergedLaneEvidence[],
  targetPathSet: ReadonlySet<PlannerRootReconciliationDriftHandoffTargetPath>,
): DriftHandoffEvidenceSourceRecord {
  const matchingLanes = mergedLaneEvidence.filter((lane) =>
    [...targetPathSet].some((targetPath) =>
      lane.laneName.includes(
        targetPath
          .split("/")
          .pop()
          ?.replace(/\.[^.]+$/, "") ?? targetPath,
      ),
    ),
  );

  const excerptLines = [
    `merged-lanes=${mergedLaneEvidence.length}`,
    ...mergedLaneEvidence.map(
      (lane) =>
        `lane=${lane.laneName} branch=${lane.branchName ?? "?"} pr=${lane.mergeEvidence.pullRequestNumber ?? "?"} merge=${lane.mergeEvidence.mergeCommitSha ?? "?"}`,
    ),
  ];

  if (matchingLanes.length > 0) {
    excerptLines.push(
      ...matchingLanes.map((lane) => `name-match lane=${lane.laneName}`),
    );
  }

  return {
    availability: "available",
    command: "discoverMergedLaneEvidence",
    excerpt: excerptLines.join("\n"),
    kind: "merged-lane-metadata",
    matchingTargetPaths: [],
  };
}

function unavailableEvidenceSource(
  kind: DriftHandoffEvidenceSourceKind,
  command: string,
  unavailableReason: string,
): DriftHandoffEvidenceSourceRecord {
  return {
    availability: "unavailable",
    command,
    kind,
    matchingTargetPaths: [],
    unavailableReason,
  };
}

export function buildPlannerRootReconciliationDriftHandoffReport(
  options: DiscoverPlannerRootReconciliationDriftHandoffOptions,
): PlannerRootReconciliationDriftHandoffReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const targetPathSet = new Set(
    PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS,
  );
  const evidenceSources: DriftHandoffEvidenceSourceRecord[] = [];

  const scopedGitStatusOutput = runScopedGitStatusForTargetPaths(
    repoRoot,
    runGit,
  );
  const targetPathGitStatus = parseScopedGitStatusForTargetPaths(
    scopedGitStatusOutput,
  );
  evidenceSources.push(
    buildGitStatusScopedEvidenceSource(
      scopedGitStatusOutput,
      targetPathGitStatus,
    ),
  );

  if (options.skipRootCheckoutReconciliation) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "root-checkout-reconciliation",
        "report:planner-root-checkout-reconciliation",
        "skipped-by-request",
      ),
    );
  } else {
    try {
      const reconciliationReport = buildPlannerRootCheckoutReconciliationReport(
        {
          generatedAtUtc:
            options.generatedAtUtc ?? options.evidenceCapturedAtUtc,
          laneDiscoveryReport: options.laneDiscoveryReport,
          remoteBaseRef: options.remoteBaseRef,
          repoRoot,
          runGit,
          runGitStatus,
          statusOutput: options.statusOutput,
        },
      );
      evidenceSources.push(
        buildRootCheckoutReconciliationEvidenceSource(
          reconciliationReport,
          targetPathSet,
        ),
      );
    } catch (error) {
      evidenceSources.push(
        unavailableEvidenceSource(
          "root-checkout-reconciliation",
          "report:planner-root-checkout-reconciliation",
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  if (options.skipWorktreeDrift) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "worktree-drift",
        "report:planner-worktree-drift-watchdog",
        "skipped-by-request",
      ),
    );
  } else if (
    !options.workListJsonText ||
    !options.sessionListJsonText ||
    !options.worktreesDir
  ) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "worktree-drift",
        "report:planner-worktree-drift-watchdog",
        "missing queue/worktree discovery inputs",
      ),
    );
  } else {
    try {
      const driftSnapshot = discoverPlannerWorktreeDriftSnapshot({
        baseBranchName: options.remoteBaseRef,
        generatedAtUtc: options.generatedAtUtc ?? options.evidenceCapturedAtUtc,
        mergedLaneEvidence: options.mergedLaneEvidence,
        repoRoot,
        sessionListJsonText: options.sessionListJsonText,
        workListJsonText: options.workListJsonText,
        worktreesDir: options.worktreesDir,
      });
      evidenceSources.push(
        buildWorktreeDriftEvidenceSource(driftSnapshot, targetPathSet),
      );
    } catch (error) {
      evidenceSources.push(
        unavailableEvidenceSource(
          "worktree-drift",
          "report:planner-worktree-drift-watchdog",
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  if (options.skipActivePrLinkage) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "active-pr-linkage",
        "watch:active-pr-mergeability",
        "skipped-by-request",
      ),
    );
  } else if (!options.laneDiscoveryReport) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "active-pr-linkage",
        "watch:active-pr-mergeability",
        "missing lane discovery report",
      ),
    );
  } else {
    evidenceSources.push(
      buildActivePrLinkageEvidenceSource(
        options.laneDiscoveryReport,
        targetPathSet,
      ),
    );
  }

  if (options.skipMergedLaneMetadata) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "merged-lane-metadata",
        "discoverMergedLaneEvidence",
        "skipped-by-request",
      ),
    );
  } else if (
    !options.workListJsonText ||
    !options.sessionListJsonText ||
    !options.worktreesDir
  ) {
    evidenceSources.push(
      unavailableEvidenceSource(
        "merged-lane-metadata",
        "discoverMergedLaneEvidence",
        "missing queue/worktree discovery inputs",
      ),
    );
  } else {
    try {
      const mergedLaneEvidence =
        options.mergedLaneEvidence ??
        discoverMergedLaneEvidence({
          repoRoot,
          sessionListJsonText: options.sessionListJsonText,
          workListJsonText: options.workListJsonText,
          worktreesDir: options.worktreesDir,
        });
      evidenceSources.push(
        buildMergedLaneMetadataEvidenceSource(
          mergedLaneEvidence,
          targetPathSet,
        ),
      );
    } catch (error) {
      evidenceSources.push(
        unavailableEvidenceSource(
          "merged-lane-metadata",
          "discoverMergedLaneEvidence",
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  return {
    evidenceCapturedAtUtc:
      options.evidenceCapturedAtUtc ?? new Date().toISOString(),
    evidenceSources,
    reportedDriftAtUtc:
      options.reportedDriftAtUtc ??
      PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_REPORTED_AT_UTC,
    repoRoot,
    targetPathGitStatus,
  };
}

export function discoverPlannerRootReconciliationDriftHandoffReport(
  options: DiscoverPlannerRootReconciliationDriftHandoffOptions = {},
): PlannerRootReconciliationDriftHandoffReport {
  return buildPlannerRootReconciliationDriftHandoffReport(options);
}

function formatTargetPathGitStatus(
  entry: DriftHandoffTargetPathGitStatus,
): string {
  return entry.statusLine
    ? `path=${entry.path} observed=${entry.observedStatus} status-line=${entry.statusLine}`
    : `path=${entry.path} observed=${entry.observedStatus}`;
}

function formatEvidenceSourceRecord(
  source: DriftHandoffEvidenceSourceRecord,
): string[] {
  const lines = [
    `- source=${source.kind} availability=${source.availability} command=${source.command ?? "?"}`,
  ];

  if (source.availability === "unavailable") {
    lines.push(`  unavailable-reason=${source.unavailableReason ?? "unknown"}`);
    return lines;
  }

  if (source.matchingTargetPaths.length > 0) {
    lines.push(
      `  matching-target-paths=${source.matchingTargetPaths.join(",")}`,
    );
  } else {
    lines.push("  matching-target-paths=none");
  }

  if (source.excerpt) {
    for (const excerptLine of source.excerpt.split("\n")) {
      lines.push(`  excerpt=${excerptLine}`);
    }
  }

  return lines;
}

export function formatPlannerRootReconciliationDriftHandoffReport(
  report: PlannerRootReconciliationDriftHandoffReport,
): string {
  const dirtyCount = report.targetPathGitStatus.filter(
    (entry) => entry.observedStatus === "dirty",
  ).length;

  const lines = [
    PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_HEADER,
    `reported-drift-at-utc=${report.reportedDriftAtUtc} evidence-captured-at-utc=${report.evidenceCapturedAtUtc}`,
    `- location=root repo=${report.repoRoot} target-path-count=${report.targetPathGitStatus.length} dirty-target-paths=${dirtyCount}`,
    "- scoped-git-status",
    ...report.targetPathGitStatus.map(
      (entry) => `  - ${formatTargetPathGitStatus(entry)}`,
    ),
    "- evidence-sources",
    ...report.evidenceSources.flatMap(formatEvidenceSourceRecord),
  ];

  return lines.join("\n");
}

export function serializePlannerRootReconciliationDriftHandoffReport(
  report: PlannerRootReconciliationDriftHandoffReport,
): string {
  return JSON.stringify(report, null, 2);
}
