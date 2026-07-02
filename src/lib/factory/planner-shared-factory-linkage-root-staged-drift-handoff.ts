import type { PlannerWorktreeDriftChangeKind } from "./planner-worktree-drift-watchdog";
import { pathExistsOnGitRef } from "./planner-root-checkout-reconciliation";

export const SHARED_FACTORY_LINKAGE_ROOT_STAGED_DRIFT_HANDOFF_HEADER =
  "Shared Factory Linkage Root Staged Drift Handoff";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_TIMESTAMP =
  "2026-07-01T22:08-0700";

export const SHARED_FACTORY_LINKAGE_FACTORY_SESSION_ID =
  "0fdc5077-95ed-4396-a183-06e5b16555ca";

export const SHARED_FACTORY_LINKAGE_ROOT_HEAD_SHA =
  "3cd6734934e55e52d8a595ed93421609f9e142c1";

export const SHARED_FACTORY_LINKAGE_READ_ONLY_POLICY =
  "This lane is read-only and must not mutate, clean, revert, restore, checkout, stage, unstage, delete, overwrite, or normalize the staged dirty set.";

export const SHARED_FACTORY_LINKAGE_LATENT_DIFFUSION_RECONCILIATION_LANE =
  "latent-diffusion-root-deletion-reconciliation";

export const SHARED_FACTORY_LINKAGE_REMOTE_BASE_REF = "origin/main";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_CHECKOUT_DRIFT =
  "ownerless-root-checkout-drift";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_PRESENT_ON_ORIGIN_MAIN =
  "present-on-origin-main";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_NO_ACTIVE_OR_MERGED_LANE_CLAIM =
  "no-active-or-merged-lane-claim";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_DIRTY_PATH =
  "ownerless-root-dirty-path";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_ROOT_UNMATCHED = "root-unmatched";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_NON_DELETION_DIRTY_PATH =
  "non-deletion-dirty-path";

export const SHARED_FACTORY_LINKAGE_EVIDENCE_MANUAL_INSPECTION_REQUIRED =
  "manual-inspection-required";

export const SHARED_FACTORY_LINKAGE_REMOTE_PRESENT_DELETION_PATHS = [
  "docs/internal/processes/tokens-per-second-stale-pr-follow-up-relevant-files.md",
  "src/lib/factory/planner-batch-collision-preflight.test.ts",
] as const;

export type SharedFactoryLinkagePathDisposition =
  | "active-lane-owned"
  | "represented-by-PR"
  | "safe-operator-handoff"
  | "unresolved-hold";

export interface SharedFactoryLinkagePathClassification {
  changeKind: PlannerWorktreeDriftChangeKind;
  disposition: SharedFactoryLinkagePathDisposition;
  evidence: string[];
  path: string;
  statusCode: string;
}

export interface SharedFactoryLinkageOwnershipClassificationReport {
  generatedAtUtc: string;
  pathClassifications: SharedFactoryLinkagePathClassification[];
  remoteBaseRef: string;
  snapshot: SharedFactoryLinkageStagedDriftEvidenceSnapshot;
}

export interface ClassifySharedFactoryLinkageStagedPathsOptions {
  remotePresentDeletionPaths?: readonly string[];
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: (
    repoRoot: string,
    args: readonly string[],
  ) => {
    status: number | null;
    stdout: string;
    stderr: string;
  };
  stagedPathEvidence: SharedFactoryLinkageStagedPathEvidence[];
  verifyRemotePresentDeletions?: boolean;
}

export interface BuildSharedFactoryLinkageOwnershipClassificationReportOptions
  extends BuildSharedFactoryLinkageStagedDriftEvidenceSnapshotOptions {
  classifyOptions?: Omit<
    ClassifySharedFactoryLinkageStagedPathsOptions,
    "stagedPathEvidence"
  >;
  generatedAtUtc?: string;
}

export const SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS = [
  "docs/internal/processes/factory-linkage-relevant-files.md",
  "docs/internal/processes/tokens-per-second-stale-pr-follow-up-relevant-files.md",
  "src/lib/factory/active-pr-mergeability-watchdog.test.ts",
  "src/lib/factory/active-pr-mergeability-watchdog.ts",
  "src/lib/factory/planner-batch-collision-preflight.test.ts",
  "src/lib/factory/planner-worktree-drift-watchdog.test.ts",
  "src/lib/factory/queue-worktree-pr-linkage-ledger.test.ts",
  "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
  "src/tests/discovery/linkage-classifier-report-compatibility.test.ts",
  "src/tests/discovery/planner-live-queue-snapshot-alignment.test.ts",
  "src/tests/discovery/queue-worktree-pr-linkage-ledger.test.ts",
  "src/tests/discovery/tokens-per-second-stale-pr-follow-up-compatibility.test.ts",
] as const;

export const SHARED_FACTORY_LINKAGE_SUPPLIED_STAGED_STATUS = [
  "M  docs/internal/processes/factory-linkage-relevant-files.md",
  "D  docs/internal/processes/tokens-per-second-stale-pr-follow-up-relevant-files.md",
  "M  src/lib/factory/active-pr-mergeability-watchdog.test.ts",
  "M  src/lib/factory/active-pr-mergeability-watchdog.ts",
  "D  src/lib/factory/planner-batch-collision-preflight.test.ts",
  "M  src/lib/factory/planner-worktree-drift-watchdog.test.ts",
  "M  src/lib/factory/queue-worktree-pr-linkage-ledger.test.ts",
  "M  src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
  "M  src/tests/discovery/linkage-classifier-report-compatibility.test.ts",
  "M  src/tests/discovery/planner-live-queue-snapshot-alignment.test.ts",
  "M  src/tests/discovery/queue-worktree-pr-linkage-ledger.test.ts",
  "M  src/tests/discovery/tokens-per-second-stale-pr-follow-up-compatibility.test.ts",
].join("\n");

export type SharedFactoryLinkageStagedPathEvidence = {
  changeKind: PlannerWorktreeDriftChangeKind;
  path: string;
  statusCode: string;
};

export interface SharedFactoryLinkageStagedDriftEvidenceSnapshot {
  customerSuppliedPaths: readonly string[];
  evidenceTimestamp: string;
  generatedAtUtc: string;
  hasUnstagedDiff: boolean;
  readOnlyPolicy: string;
  rootHeadSha: string;
  sessionId: string;
  stagedDirtyPathCount: number;
  stagedPathEvidence: SharedFactoryLinkageStagedPathEvidence[];
}

export interface BuildSharedFactoryLinkageStagedDriftEvidenceSnapshotOptions {
  generatedAtUtc?: string;
  statusOutput?: string;
}

function classifyStagedChangeKind(
  statusCode: string,
): PlannerWorktreeDriftChangeKind {
  const indexStatus = statusCode[0] ?? " ";
  const worktreeStatus = statusCode[1] ?? " ";

  if (indexStatus === "?" && worktreeStatus === "?") {
    return "untracked";
  }

  if (indexStatus === "D" || worktreeStatus === "D") {
    return "deleted";
  }

  if (indexStatus === "A" || worktreeStatus === "A") {
    return "added";
  }

  if (indexStatus === "R" || worktreeStatus === "R") {
    return "renamed";
  }

  if (indexStatus === "C" || worktreeStatus === "C") {
    return "copied";
  }

  if (indexStatus === "T" || worktreeStatus === "T") {
    return "type-changed";
  }

  if (indexStatus === "M" || worktreeStatus === "M") {
    return "modified";
  }

  return "unknown";
}

function extractStatusPath(rawPath: string): string {
  const renameArrowIndex = rawPath.indexOf(" -> ");
  if (renameArrowIndex >= 0) {
    return rawPath.slice(renameArrowIndex + 4).trim();
  }

  return rawPath.trim();
}

function isContentPagePath(path: string): boolean {
  return path.startsWith("src/content/docs/");
}

function isBatch061PageLanePath(path: string): boolean {
  return /batch-061|batch061/i.test(path);
}

export function assertCustomerSuppliedPathsInScope(
  paths: readonly string[],
): void {
  for (const path of paths) {
    if (isContentPagePath(path)) {
      throw new Error(
        `Customer-supplied path ${path} is a content-page path and is out of scope for this lane.`,
      );
    }

    if (isBatch061PageLanePath(path)) {
      throw new Error(
        `Customer-supplied path ${path} is an active batch 061 page-lane path and is out of scope for this lane.`,
      );
    }
  }
}

export function parseSharedFactoryLinkageSuppliedStagedStatus(
  statusOutput: string,
): {
  hasUnstagedDiff: boolean;
  stagedPathEvidence: SharedFactoryLinkageStagedPathEvidence[];
} {
  const allowedPaths = new Set<string>(
    SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
  );
  const stagedPathEvidence: SharedFactoryLinkageStagedPathEvidence[] = [];
  let hasUnstagedDiff = false;

  for (const line of statusOutput.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const statusCode = line.slice(0, 2);
    const path = extractStatusPath(line.slice(3));

    if (!allowedPaths.has(path)) {
      continue;
    }

    const worktreeStatus = statusCode[1] ?? " ";
    if (worktreeStatus !== " " && statusCode !== "??") {
      hasUnstagedDiff = true;
    }

    stagedPathEvidence.push({
      changeKind: classifyStagedChangeKind(statusCode),
      path,
      statusCode,
    });
  }

  return {
    hasUnstagedDiff,
    stagedPathEvidence: stagedPathEvidence.sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  };
}

export function buildSharedFactoryLinkageStagedDriftEvidenceSnapshot(
  options: BuildSharedFactoryLinkageStagedDriftEvidenceSnapshotOptions = {},
): SharedFactoryLinkageStagedDriftEvidenceSnapshot {
  assertCustomerSuppliedPathsInScope(
    SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
  );

  const statusOutput =
    options.statusOutput ?? SHARED_FACTORY_LINKAGE_SUPPLIED_STAGED_STATUS;
  const parsedStatus =
    parseSharedFactoryLinkageSuppliedStagedStatus(statusOutput);

  if (
    parsedStatus.stagedPathEvidence.length !==
    SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS.length
  ) {
    throw new Error(
      `Expected ${SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS.length} customer-supplied staged paths, found ${parsedStatus.stagedPathEvidence.length}.`,
    );
  }

  const customerPaths = new Set<string>(
    SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
  );
  for (const entry of parsedStatus.stagedPathEvidence) {
    if (!customerPaths.has(entry.path)) {
      throw new Error(
        `Staged status includes unexpected path ${entry.path} outside the customer-supplied dirty set.`,
      );
    }
  }

  return {
    customerSuppliedPaths: SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS,
    evidenceTimestamp: SHARED_FACTORY_LINKAGE_EVIDENCE_TIMESTAMP,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    hasUnstagedDiff: parsedStatus.hasUnstagedDiff,
    readOnlyPolicy: SHARED_FACTORY_LINKAGE_READ_ONLY_POLICY,
    rootHeadSha: SHARED_FACTORY_LINKAGE_ROOT_HEAD_SHA,
    sessionId: SHARED_FACTORY_LINKAGE_FACTORY_SESSION_ID,
    stagedDirtyPathCount:
      SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS.length,
    stagedPathEvidence: parsedStatus.stagedPathEvidence,
  };
}

function isSharedFactoryLinkageRemotePresentDeletionPath(
  path: string,
  remotePresentDeletionPaths: ReadonlySet<string>,
): boolean {
  return remotePresentDeletionPaths.has(path);
}

function buildRemotePresentDeletionEvidence(
  path: string,
  remoteBaseRef: string,
  options: ClassifySharedFactoryLinkageStagedPathsOptions,
): string[] {
  const evidence = [
    SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_CHECKOUT_DRIFT,
    SHARED_FACTORY_LINKAGE_EVIDENCE_PRESENT_ON_ORIGIN_MAIN,
    SHARED_FACTORY_LINKAGE_EVIDENCE_NO_ACTIVE_OR_MERGED_LANE_CLAIM,
  ];

  if (
    options.verifyRemotePresentDeletions &&
    options.repoRoot &&
    options.runGit
  ) {
    const remotePresent = pathExistsOnGitRef(
      options.repoRoot,
      remoteBaseRef,
      path,
      options.runGit,
    );
    evidence.push(
      remotePresent
        ? `verified-present-on-${remoteBaseRef}=true`
        : `verified-present-on-${remoteBaseRef}=false`,
    );
  }

  return evidence;
}

function buildModifiedPathClassificationEvidence(): string[] {
  return [
    SHARED_FACTORY_LINKAGE_EVIDENCE_OWNERLESS_ROOT_DIRTY_PATH,
    SHARED_FACTORY_LINKAGE_EVIDENCE_ROOT_UNMATCHED,
    SHARED_FACTORY_LINKAGE_EVIDENCE_NON_DELETION_DIRTY_PATH,
    SHARED_FACTORY_LINKAGE_EVIDENCE_NO_ACTIVE_OR_MERGED_LANE_CLAIM,
    SHARED_FACTORY_LINKAGE_EVIDENCE_MANUAL_INSPECTION_REQUIRED,
  ];
}

export function classifySharedFactoryLinkageStagedPaths(
  options: ClassifySharedFactoryLinkageStagedPathsOptions,
): SharedFactoryLinkagePathClassification[] {
  const remoteBaseRef =
    options.remoteBaseRef ?? SHARED_FACTORY_LINKAGE_REMOTE_BASE_REF;
  const remotePresentDeletionPaths = new Set(
    options.remotePresentDeletionPaths ??
      SHARED_FACTORY_LINKAGE_REMOTE_PRESENT_DELETION_PATHS,
  );

  return options.stagedPathEvidence.map((entry) => {
    if (
      entry.changeKind === "deleted" &&
      isSharedFactoryLinkageRemotePresentDeletionPath(
        entry.path,
        remotePresentDeletionPaths,
      )
    ) {
      return {
        changeKind: entry.changeKind,
        disposition: "safe-operator-handoff",
        evidence: buildRemotePresentDeletionEvidence(
          entry.path,
          remoteBaseRef,
          options,
        ),
        path: entry.path,
        statusCode: entry.statusCode,
      };
    }

    return {
      changeKind: entry.changeKind,
      disposition: "unresolved-hold",
      evidence: buildModifiedPathClassificationEvidence(),
      path: entry.path,
      statusCode: entry.statusCode,
    };
  });
}

export function buildSharedFactoryLinkageOwnershipClassificationReport(
  options: BuildSharedFactoryLinkageOwnershipClassificationReportOptions = {},
): SharedFactoryLinkageOwnershipClassificationReport {
  const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot(options);
  const generatedAtUtc = options.generatedAtUtc ?? snapshot.generatedAtUtc;
  const pathClassifications = classifySharedFactoryLinkageStagedPaths({
    ...options.classifyOptions,
    stagedPathEvidence: snapshot.stagedPathEvidence,
  });

  if (
    pathClassifications.length !==
    SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS.length
  ) {
    throw new Error(
      `Expected ${SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS.length} path classifications, found ${pathClassifications.length}.`,
    );
  }

  return {
    generatedAtUtc,
    pathClassifications,
    remoteBaseRef:
      options.classifyOptions?.remoteBaseRef ??
      SHARED_FACTORY_LINKAGE_REMOTE_BASE_REF,
    snapshot,
  };
}

function formatPathClassificationLine(
  classification: SharedFactoryLinkagePathClassification,
): string {
  return `    - path=${classification.path} disposition=${classification.disposition} change=${classification.changeKind} status=${classification.statusCode.trim()} evidence=${classification.evidence.join(";")}`;
}

export function formatSharedFactoryLinkagePathClassifications(
  pathClassifications: SharedFactoryLinkagePathClassification[],
): string {
  const lines = [
    `- path-classifications count=${pathClassifications.length}`,
  ];

  if (pathClassifications.length === 0) {
    lines.push("    - none");
  } else {
    for (const classification of pathClassifications) {
      lines.push(formatPathClassificationLine(classification));
    }
  }

  return lines.join("\n");
}

export function formatSharedFactoryLinkageOwnershipClassificationReport(
  report: SharedFactoryLinkageOwnershipClassificationReport,
): string {
  return [
    formatSharedFactoryLinkageStagedDriftEvidenceSnapshot(report.snapshot),
    formatSharedFactoryLinkagePathClassifications(report.pathClassifications),
    `- remote-base-ref ${report.remoteBaseRef}`,
    "- classification-note: deleted paths present on origin/main are ownerless root checkout drift; modified paths without lane ownership remain unresolved holds requiring manual inspection.",
  ].join("\n");
}

function formatStagedPathEvidenceLine(
  entry: SharedFactoryLinkageStagedPathEvidence,
): string {
  return `    - path=${entry.path} status=${entry.statusCode.trim()} change=${entry.changeKind}`;
}

export function formatSharedFactoryLinkageStagedDriftEvidenceSnapshot(
  snapshot: SharedFactoryLinkageStagedDriftEvidenceSnapshot,
): string {
  const lines = [
    SHARED_FACTORY_LINKAGE_ROOT_STAGED_DRIFT_HANDOFF_HEADER,
    `- evidence-timestamp=${snapshot.evidenceTimestamp} session=${snapshot.sessionId} root-head=${snapshot.rootHeadSha}`,
    `- root-status staged-dirty-paths=${snapshot.stagedDirtyPathCount} unstaged-diff=${snapshot.hasUnstagedDiff}`,
    `- read-only-policy ${snapshot.readOnlyPolicy}`,
    `- customer-supplied-paths count=${snapshot.customerSuppliedPaths.length}`,
  ];

  for (const path of snapshot.customerSuppliedPaths) {
    lines.push(`    - path=${path}`);
  }

  lines.push(
    `- supplied-staged-status count=${snapshot.stagedPathEvidence.length}`,
  );

  if (snapshot.stagedPathEvidence.length === 0) {
    lines.push("    - none");
  } else {
    for (const entry of snapshot.stagedPathEvidence) {
      lines.push(formatStagedPathEvidenceLine(entry));
    }
  }

  lines.push(
    "- scope: customer-supplied paths exclude content-page paths and active batch 061 page-lane paths.",
  );

  return lines.join("\n");
}

export function serializeSharedFactoryLinkageStagedDriftEvidenceSnapshot(
  snapshot: SharedFactoryLinkageStagedDriftEvidenceSnapshot,
): string {
  return JSON.stringify(snapshot, null, 2);
}
