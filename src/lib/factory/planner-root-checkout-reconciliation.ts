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

export const PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE =
  "Review each manual-inspection path for ownership; do not revert, stage, or auto-clean these paths.";

export const PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID =
  "0fdc5077-95ed-4396-a183-06e5b16555ca";

export const PLANNER_ROOT_CHECKOUT_PAGE_REFILL_HOLD =
  "Hold new page refills until the root checkout is clean or dirty-path ownership is explicit.";

export const PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE =
  "Operator-reviewed root cleanup outside this doctor command; do not auto-revert, checkout, restore, stage, or overwrite.";

export const PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE =
  "Inspect each path for explicit ownership before cleanup; do not revert, stage, or overwrite user or planner work.";

export const PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY =
  "tokenizer-mismatch-remote-present-deletions";

export const PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_STALE_DRIFT_GUIDANCE =
  "Stale root checkout drift: content exists on origin/main; do not treat as missing content or request a page refill.";

export const PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY =
  "manual-inspection-shared-edits";

export const PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_GUIDANCE =
  "Modified shared paths require explicit ownership before cleanup; do not revert, stage, or overwrite user or planner work.";

export const PLANNER_ROOT_CHECKOUT_GENERATED_TABLE_REGISTRY_DRIFT_SECTION =
  "generated-table-registry-drift";

export const PLANNER_ROOT_CHECKOUT_TABLE_REGISTRY_DRIFT_GUIDANCE =
  "Run table-registry validation or regeneration proof before any cleanup decision; do not auto-revert, restore, or overwrite generated or runtime registry paths.";

export type RootCheckoutComparisonTarget = "HEAD" | "origin/main";

export type RootCheckoutDriftClassification =
  | "ownerless-root-checkout-drift"
  | "manual-inspection";

export type RootCheckoutRemotePresentDeletionFamily =
  | typeof PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY
  | "other-remote-present-deletions";

export type RootCheckoutManualInspectionFamily =
  | typeof PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY
  | "other-manual-inspection";

export type RootCheckoutTableRegistryDriftFamily =
  | "generated-artifact"
  | "table-registry-associated-runtime";

export interface RootCheckoutDirtyPathReport {
  changeKind: PlannerWorktreeDriftChangeKind;
  classification: RootCheckoutDriftClassification;
  comparisonTarget: RootCheckoutComparisonTarget;
  evidence: string;
  headPresent: boolean;
  path: string;
  remoteMainPresent: boolean;
  manualInspectionFamily?: RootCheckoutManualInspectionFamily;
  remotePresentDeletionFamily?: RootCheckoutRemotePresentDeletionFamily;
  tableRegistryDriftFamily?: RootCheckoutTableRegistryDriftFamily;
  statusCode: string;
}

export interface PlannerRootCheckoutOperatorNextActions {
  manualInspectionCount: number;
  manualInspectionOwnershipGuidance?: string;
  pageRefillHold: boolean;
  remotePresentDeletionCleanupGuidance?: string;
  remotePresentDeletionCount: number;
  targetSessionId: string;
}

export interface PlannerRootCheckoutReconciliationReport {
  generatedAtUtc: string;
  manualInspectionPaths: RootCheckoutDirtyPathReport[];
  manualInspectionSharedEdits: RootCheckoutDirtyPathReport[];
  operatorNextActions: PlannerRootCheckoutOperatorNextActions | null;
  otherManualInspectionPaths: RootCheckoutDirtyPathReport[];
  remoteBaseRef: string;
  remotePresentDeletions: RootCheckoutDirtyPathReport[];
  repoRoot: string;
  tableRegistryAssociatedRuntimePaths: RootCheckoutDirtyPathReport[];
  tableRegistryDriftPaths: RootCheckoutDirtyPathReport[];
  tableRegistryGeneratedArtifacts: RootCheckoutDirtyPathReport[];
  tokenizerMismatchRemotePresentDeletions: RootCheckoutDirtyPathReport[];
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

export function isTokenizerMismatchRemotePresentDeletionPath(
  path: string,
): boolean {
  if (path.startsWith("src/content/docs/modules/tokenizer-mismatch/")) {
    return true;
  }

  if (
    path === "src/content/registry/modules/tokenizer-mismatch.json" ||
    path === "src/content/registry/tables/tokenizer-mismatch-comparison.json"
  ) {
    return true;
  }

  if (
    path.startsWith("src/content/registry/graphs/") &&
    path.includes("tokenizer-mismatch")
  ) {
    return true;
  }

  if (
    path.startsWith("src/content/registry/citations/") &&
    (path.includes("tokenizer-mismatch") ||
      path.endsWith("zero-shot-tokenizer-transfer.json"))
  ) {
    return true;
  }

  return (
    path === "src/lib/content/tokenizer-mismatch-registry.test.ts" ||
    path === "src/lib/content/tokenizer-mismatch-module-page.test.ts"
  );
}

export function annotateRemotePresentDeletionFamilies(
  remotePresentDeletions: RootCheckoutDirtyPathReport[],
): RootCheckoutDirtyPathReport[] {
  return remotePresentDeletions.map((pathReport) => ({
    ...pathReport,
    remotePresentDeletionFamily: isTokenizerMismatchRemotePresentDeletionPath(
      pathReport.path,
    )
      ? PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY
      : "other-remote-present-deletions",
  }));
}

export function partitionTokenizerMismatchRemotePresentDeletions(
  remotePresentDeletions: RootCheckoutDirtyPathReport[],
): {
  otherRemotePresentDeletions: RootCheckoutDirtyPathReport[];
  tokenizerMismatchRemotePresentDeletions: RootCheckoutDirtyPathReport[];
} {
  const annotated = annotateRemotePresentDeletionFamilies(
    remotePresentDeletions,
  );
  const tokenizerMismatchRemotePresentDeletions = annotated.filter(
    (pathReport) =>
      pathReport.remotePresentDeletionFamily ===
      PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY,
  );
  const otherRemotePresentDeletions = annotated.filter(
    (pathReport) =>
      pathReport.remotePresentDeletionFamily ===
      "other-remote-present-deletions",
  );

  return {
    otherRemotePresentDeletions,
    tokenizerMismatchRemotePresentDeletions,
  };
}

const MANUAL_INSPECTION_SHARED_EDIT_PATHS = new Set([
  "src/features/models/components/ModuleGraph.tsx",
  "src/lib/content/baseline-records.test.ts",
  "src/lib/content/citations.test.ts",
  "src/lib/content/graph-registry-runtime.test.ts",
  "src/lib/content/table-registry-runtime.test.ts",
  "src/lib/content/table-registry-runtime.ts",
  "src/lib/content/validate-registry.ts",
  "src/lib/source.test.ts",
]);

export function isManualInspectionSharedEditPath(path: string): boolean {
  return MANUAL_INSPECTION_SHARED_EDIT_PATHS.has(path);
}

export function annotateManualInspectionFamilies(
  manualInspectionPaths: RootCheckoutDirtyPathReport[],
): RootCheckoutDirtyPathReport[] {
  return manualInspectionPaths.map((pathReport) => ({
    ...pathReport,
    manualInspectionFamily: isManualInspectionSharedEditPath(pathReport.path)
      ? PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY
      : "other-manual-inspection",
  }));
}

const TABLE_REGISTRY_GENERATED_ARTIFACT_PATH =
  "src/lib/content/generated/table-registry.generated.ts";

const TABLE_REGISTRY_ASSOCIATED_RUNTIME_PATHS = new Set([
  "src/lib/content/table-registry-runtime.ts",
  "src/lib/content/validate-registry.ts",
]);

export function isTableRegistryGeneratedArtifactPath(path: string): boolean {
  return path === TABLE_REGISTRY_GENERATED_ARTIFACT_PATH;
}

export function isTableRegistryAssociatedRuntimePath(path: string): boolean {
  return TABLE_REGISTRY_ASSOCIATED_RUNTIME_PATHS.has(path);
}

export function isTableRegistryDriftPath(path: string): boolean {
  return (
    isTableRegistryGeneratedArtifactPath(path) ||
    isTableRegistryAssociatedRuntimePath(path)
  );
}

export function annotateTableRegistryDriftFamilies(
  dirtyPaths: RootCheckoutDirtyPathReport[],
): RootCheckoutDirtyPathReport[] {
  return dirtyPaths.map((pathReport) => {
    if (!isTableRegistryDriftPath(pathReport.path)) {
      return pathReport;
    }

    return {
      ...pathReport,
      tableRegistryDriftFamily: isTableRegistryGeneratedArtifactPath(
        pathReport.path,
      )
        ? "generated-artifact"
        : "table-registry-associated-runtime",
    };
  });
}

export function partitionTableRegistryDriftPaths(
  manualInspectionPaths: RootCheckoutDirtyPathReport[],
): {
  tableRegistryAssociatedRuntimePaths: RootCheckoutDirtyPathReport[];
  tableRegistryDriftPaths: RootCheckoutDirtyPathReport[];
  tableRegistryGeneratedArtifacts: RootCheckoutDirtyPathReport[];
} {
  const annotated = annotateTableRegistryDriftFamilies(manualInspectionPaths);
  const tableRegistryDriftPaths = annotated.filter((pathReport) =>
    isTableRegistryDriftPath(pathReport.path),
  );
  const tableRegistryGeneratedArtifacts = tableRegistryDriftPaths.filter(
    (pathReport) =>
      pathReport.tableRegistryDriftFamily === "generated-artifact",
  );
  const tableRegistryAssociatedRuntimePaths = tableRegistryDriftPaths.filter(
    (pathReport) =>
      pathReport.tableRegistryDriftFamily ===
      "table-registry-associated-runtime",
  );

  return {
    tableRegistryAssociatedRuntimePaths,
    tableRegistryDriftPaths,
    tableRegistryGeneratedArtifacts,
  };
}

export function partitionManualInspectionPaths(
  manualInspectionPaths: RootCheckoutDirtyPathReport[],
): {
  manualInspectionSharedEdits: RootCheckoutDirtyPathReport[];
  otherManualInspectionPaths: RootCheckoutDirtyPathReport[];
} {
  const annotated = annotateManualInspectionFamilies(manualInspectionPaths);
  const manualInspectionSharedEdits = annotated.filter(
    (pathReport) =>
      pathReport.manualInspectionFamily ===
      PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY,
  );
  const otherManualInspectionPaths = annotated.filter(
    (pathReport) =>
      pathReport.manualInspectionFamily === "other-manual-inspection",
  );

  return {
    manualInspectionSharedEdits,
    otherManualInspectionPaths,
  };
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

export function buildPlannerRootCheckoutOperatorNextActions(
  report: Pick<
    PlannerRootCheckoutReconciliationReport,
    "manualInspectionPaths" | "remotePresentDeletions" | "totalDirtyPathCount"
  >,
): PlannerRootCheckoutOperatorNextActions | null {
  if (report.totalDirtyPathCount === 0) {
    return null;
  }

  const remotePresentDeletionCount = report.remotePresentDeletions.length;
  const manualInspectionCount = report.manualInspectionPaths.length;

  return {
    manualInspectionCount,
    manualInspectionOwnershipGuidance:
      manualInspectionCount > 0
        ? PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_OWNERSHIP_GUIDANCE
        : undefined,
    pageRefillHold: true,
    remotePresentDeletionCleanupGuidance:
      remotePresentDeletionCount > 0
        ? PLANNER_ROOT_CHECKOUT_REMOTE_PRESENT_CLEANUP_GUIDANCE
        : undefined,
    remotePresentDeletionCount,
    targetSessionId: PLANNER_ROOT_CHECKOUT_TARGET_SESSION_ID,
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

  const remotePresentDeletions = annotateRemotePresentDeletionFamilies(
    classified.remotePresentDeletions,
  );
  const { tokenizerMismatchRemotePresentDeletions } =
    partitionTokenizerMismatchRemotePresentDeletions(remotePresentDeletions);
  const manualInspectionPaths = annotateManualInspectionFamilies(
    classified.manualInspectionPaths,
  );
  const {
    tableRegistryAssociatedRuntimePaths,
    tableRegistryDriftPaths,
    tableRegistryGeneratedArtifacts,
  } = partitionTableRegistryDriftPaths(manualInspectionPaths);
  const manualInspectionPathsWithRegistryDrift =
    annotateTableRegistryDriftFamilies(manualInspectionPaths);
  const { manualInspectionSharedEdits, otherManualInspectionPaths } =
    partitionManualInspectionPaths(manualInspectionPathsWithRegistryDrift);

  const reportWithoutNextActions = {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    manualInspectionPaths: manualInspectionPathsWithRegistryDrift,
    manualInspectionSharedEdits,
    otherManualInspectionPaths,
    remoteBaseRef,
    remotePresentDeletions,
    repoRoot,
    tableRegistryAssociatedRuntimePaths,
    tableRegistryDriftPaths,
    tableRegistryGeneratedArtifacts,
    tokenizerMismatchRemotePresentDeletions,
    totalDirtyPathCount: dirtyPaths.length,
  };

  return {
    ...reportWithoutNextActions,
    operatorNextActions: buildPlannerRootCheckoutOperatorNextActions(
      reportWithoutNextActions,
    ),
  };
}

export function discoverPlannerRootCheckoutReconciliationReport(
  options: DiscoverPlannerRootCheckoutReconciliationOptions = {},
): PlannerRootCheckoutReconciliationReport {
  return buildPlannerRootCheckoutReconciliationReport(options);
}

export function summarizeManualInspectionChangeKinds(
  manualInspectionPaths: RootCheckoutDirtyPathReport[],
): Array<{ changeKind: PlannerWorktreeDriftChangeKind; count: number }> {
  const counts = new Map<PlannerWorktreeDriftChangeKind, number>();

  for (const pathReport of manualInspectionPaths) {
    counts.set(
      pathReport.changeKind,
      (counts.get(pathReport.changeKind) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .map(([changeKind, count]) => ({ changeKind, count }))
    .sort((left, right) => left.changeKind.localeCompare(right.changeKind));
}

export function formatPlannerRootCheckoutOperatorNextActions(
  nextActions: PlannerRootCheckoutOperatorNextActions,
): string[] {
  const lines = [
    "- operator-next-actions",
    `  - page-refill-hold=${PLANNER_ROOT_CHECKOUT_PAGE_REFILL_HOLD} target-session=${nextActions.targetSessionId}`,
  ];

  if (nextActions.remotePresentDeletionCount > 0) {
    lines.push(
      `  - remote-present-deletions count=${nextActions.remotePresentDeletionCount} guidance=${nextActions.remotePresentDeletionCleanupGuidance}`,
    );
  }

  if (nextActions.manualInspectionCount > 0) {
    lines.push(
      `  - manual-inspection count=${nextActions.manualInspectionCount} guidance=${nextActions.manualInspectionOwnershipGuidance}`,
    );
  }

  return lines;
}

function formatDirtyPathReport(
  pathReport: RootCheckoutDirtyPathReport,
): string {
  const fields = [
    `path=${pathReport.path}`,
    `status=${pathReport.statusCode}`,
    `change=${pathReport.changeKind}`,
    `comparison-target=${pathReport.comparisonTarget}`,
    `evidence=${pathReport.evidence}`,
    `classification=${pathReport.classification}`,
  ];

  if (pathReport.remotePresentDeletionFamily) {
    fields.push(`drift-family=${pathReport.remotePresentDeletionFamily}`);
  }

  if (pathReport.manualInspectionFamily) {
    fields.push(`inspection-family=${pathReport.manualInspectionFamily}`);
  }

  if (pathReport.tableRegistryDriftFamily) {
    fields.push(`registry-drift-family=${pathReport.tableRegistryDriftFamily}`);
  }

  return fields.join(" ");
}

function formatRemotePresentDeletionFamilySection(
  family: RootCheckoutRemotePresentDeletionFamily,
  pathReports: RootCheckoutDirtyPathReport[],
  options: {
    comparisonTarget: string;
    guidance?: string;
  },
): string[] {
  const lines = [
    `  - ${family} count=${pathReports.length} comparison-target=${options.comparisonTarget}`,
  ];

  if (options.guidance) {
    lines.push(`    - guidance=${options.guidance}`);
  }

  if (pathReports.length === 0) {
    lines.push("    - none");
  } else {
    for (const pathReport of pathReports) {
      lines.push(`    - ${formatDirtyPathReport(pathReport)}`);
    }
  }

  return lines;
}

function formatTableRegistryDriftFamilySection(
  family: RootCheckoutTableRegistryDriftFamily,
  pathReports: RootCheckoutDirtyPathReport[],
): string[] {
  const lines = [`  - ${family} count=${pathReports.length}`];

  if (pathReports.length === 0) {
    lines.push("    - none");
  } else {
    for (const pathReport of pathReports) {
      lines.push(`    - ${formatDirtyPathReport(pathReport)}`);
    }
  }

  return lines;
}

function formatManualInspectionFamilySection(
  family: RootCheckoutManualInspectionFamily,
  pathReports: RootCheckoutDirtyPathReport[],
  options: {
    guidance?: string;
  },
): string[] {
  const lines = [`  - ${family} count=${pathReports.length}`];

  if (options.guidance) {
    lines.push(`    - guidance=${options.guidance}`);
  }

  if (pathReports.length === 0) {
    lines.push("    - none");
  } else {
    for (const pathReport of pathReports) {
      lines.push(`    - ${formatDirtyPathReport(pathReport)}`);
    }
  }

  return lines;
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
    const { otherRemotePresentDeletions } =
      partitionTokenizerMismatchRemotePresentDeletions(
        report.remotePresentDeletions,
      );
    lines.push(
      ...formatRemotePresentDeletionFamilySection(
        PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_REMOTE_PRESENT_FAMILY,
        report.tokenizerMismatchRemotePresentDeletions,
        {
          comparisonTarget: report.remoteBaseRef,
          guidance:
            PLANNER_ROOT_CHECKOUT_TOKENIZER_MISMATCH_STALE_DRIFT_GUIDANCE,
        },
      ),
    );
    lines.push(
      ...formatRemotePresentDeletionFamilySection(
        "other-remote-present-deletions",
        otherRemotePresentDeletions,
        {
          comparisonTarget: report.remoteBaseRef,
        },
      ),
    );
  }

  lines.push(
    `- manual-inspection count=${report.manualInspectionPaths.length}`,
  );
  if (report.manualInspectionPaths.length === 0) {
    lines.push("  - none");
  } else {
    lines.push(
      `  - guidance=${PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_GUIDANCE}`,
    );
    const changeKindCounts = summarizeManualInspectionChangeKinds(
      report.manualInspectionPaths,
    );
    lines.push(
      `  - change-kind-counts=${changeKindCounts
        .map(({ changeKind, count }) => `${changeKind}=${count}`)
        .join(" ")}`,
    );
    lines.push(
      ...formatManualInspectionFamilySection(
        PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_FAMILY,
        report.manualInspectionSharedEdits,
        {
          guidance:
            PLANNER_ROOT_CHECKOUT_MANUAL_INSPECTION_SHARED_EDITS_GUIDANCE,
        },
      ),
    );
    lines.push(
      ...formatManualInspectionFamilySection(
        "other-manual-inspection",
        report.otherManualInspectionPaths,
        {},
      ),
    );
  }

  lines.push(
    `- ${PLANNER_ROOT_CHECKOUT_GENERATED_TABLE_REGISTRY_DRIFT_SECTION} count=${report.tableRegistryDriftPaths.length}`,
  );
  if (report.tableRegistryDriftPaths.length === 0) {
    lines.push("  - none");
  } else {
    lines.push(
      `  - guidance=${PLANNER_ROOT_CHECKOUT_TABLE_REGISTRY_DRIFT_GUIDANCE}`,
    );
    lines.push(
      ...formatTableRegistryDriftFamilySection(
        "generated-artifact",
        report.tableRegistryGeneratedArtifacts,
      ),
    );
    lines.push(
      ...formatTableRegistryDriftFamilySection(
        "table-registry-associated-runtime",
        report.tableRegistryAssociatedRuntimePaths,
      ),
    );
  }

  if (report.operatorNextActions) {
    lines.push(
      ...formatPlannerRootCheckoutOperatorNextActions(
        report.operatorNextActions,
      ),
    );
  }

  return lines.join("\n");
}

export function serializePlannerRootCheckoutReconciliationReport(
  report: PlannerRootCheckoutReconciliationReport,
): string {
  return JSON.stringify(report, null, 2);
}
