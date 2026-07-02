import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { formatMergedLaneEvidenceSummary } from "./planner-merged-lane-evidence";
import {
  buildPlannerRootCheckoutReconciliationReport,
  formatPlannerRootCheckoutReconciliationReport,
  PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
  type PlannerRootCheckoutReconciliationReport,
  type RootCheckoutDirtyPathReport,
} from "./planner-root-checkout-reconciliation";
import {
  formatPlannerWorktreeDriftReport,
  type PlannerWorktreeDirtyPath,
  type PlannerWorktreeDriftOwnershipKind,
  type PlannerWorktreeDriftSnapshot,
} from "./planner-worktree-drift-watchdog";

export const PLANNER_TERMINAL_AUDIT_ROOT_STAGED_DELETION_HANDOFF_HEADER =
  "Terminal Audit Root Staged Deletion Handoff";

export const PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH =
  "docs/internal/processes/factory-linkage-relevant-files.md";

export const PLANNER_TERMINAL_AUDIT_EVIDENCE_COMMANDS = [
  "git status --short --branch",
  "git diff --cached --stat",
  "bun ./scripts/report-planner-root-checkout-reconciliation.ts",
  "bun ./scripts/report-planner-worktree-drift-watchdog.ts",
] as const;

export const PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT =
  "No dirty root paths were modified, reverted, staged, overwritten, or regenerated as part of this handoff.";

export const PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS = [
  "scripts/report-terminal-lane-main-branch-landing-audit.ts",
  "src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts",
  "src/lib/factory/terminal-lane-main-branch-landing-audit.ts",
] as const;

export type PlannerTerminalAuditRemotePresentDeletedPath =
  (typeof PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS)[number];

export const PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_GROUP_CLASSIFICATION =
  "remote-present-local-deletion-drift";

export const PLANNER_TERMINAL_AUDIT_EXPLICITLY_OWNED_DELETION_GROUP_CLASSIFICATION =
  "explicitly-owned";

export const PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_NEXT_SAFE_ACTION =
  "Human operator inspect and assign explicit ownership outside this handoff lane; do not restore, stage, unstage, checkout, or delete these paths from this implementation.";

export type TerminalAuditRemotePresentDeletionGroupClassification =
  | typeof PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_GROUP_CLASSIFICATION
  | typeof PLANNER_TERMINAL_AUDIT_EXPLICITLY_OWNED_DELETION_GROUP_CLASSIFICATION;

export interface TerminalAuditRemotePresentDeletionEvidence {
  comparisonTarget: string;
  evidence: string;
  explicitOwnerLaneName?: string;
  originMainPresenceCommand: string;
  path: PlannerTerminalAuditRemotePresentDeletedPath;
  remoteMainPresent: boolean;
  statusCode: string;
}

export interface TerminalAuditRemotePresentDeletionGroup {
  classification: TerminalAuditRemotePresentDeletionGroupClassification;
  comparisonTarget: string;
  deletions: TerminalAuditRemotePresentDeletionEvidence[];
  nextSafeAction: string;
}

export interface TerminalAuditReconciliationEvidenceSummary {
  manualInspectionPathCount: number;
  remotePresentDeletionCount: number;
  totalDirtyPathCount: number;
}

export interface TerminalAuditWatchdogPathEvidence {
  laneName?: string;
  mergeEvidenceSummary?: string;
  ownershipKind: PlannerWorktreeDriftOwnershipKind;
  ownershipReason: string;
  path: string;
}

export interface PlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport {
  evidenceCommands: readonly string[];
  factoryLinkageWatchdogEvidence?: TerminalAuditWatchdogPathEvidence;
  generatedAtUtc: string;
  gitDiffCachedStat: string;
  gitStatusShortBranch: string;
  preservationStatement: string;
  reconciliation: TerminalAuditReconciliationEvidenceSummary;
  reconciliationReportFormatted: string;
  remoteBaseRef: string;
  repoRoot: string;
  terminalAuditRemotePresentDeletions: TerminalAuditRemotePresentDeletionGroup;
  watchdogPathEvidence: TerminalAuditWatchdogPathEvidence[];
  watchdogReportFormatted: string;
}

export interface DiscoverPlannerTerminalAuditRootStagedDeletionHandoffOptions {
  evidenceCommands?: readonly string[];
  generatedAtUtc?: string;
  gitDiffCachedStat?: string;
  preservationStatement?: string;
  reconciliationReport?: PlannerRootCheckoutReconciliationReport;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitDiffCachedStat?: RunGitDiffCachedStat;
  runGitStatusShortBranch?: RunGitStatusShortBranch;
  statusOutput?: string;
  watchdogReportFormatted?: string;
  watchdogSnapshot?: PlannerWorktreeDriftSnapshot;
}

type RunGit = (repoRoot: string, args: readonly string[]) => GitCommandResult;
type RunGitStatusShortBranch = (cwd: string) => string;
type RunGitDiffCachedStat = (cwd: string) => string;

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

function defaultRunGitStatusShortBranch(cwd: string): string {
  const result = defaultRunGit(cwd, ["status", "--short", "--branch"]);
  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `git status --short --branch failed for ${cwd}.${details ? `\n${details}` : ""}`,
    );
  }
  return result.stdout;
}

function defaultRunGitDiffCachedStat(cwd: string): string {
  const result = defaultRunGit(cwd, ["diff", "--cached", "--stat"]);
  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `git diff --cached --stat failed for ${cwd}.${details ? `\n${details}` : ""}`,
    );
  }
  return result.stdout;
}

function extractPorcelainStatusOutput(statusShortBranchOutput: string): string {
  return statusShortBranchOutput
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("## "))
    .join("\n");
}

function summarizeReconciliationEvidence(
  report: PlannerRootCheckoutReconciliationReport,
): TerminalAuditReconciliationEvidenceSummary {
  return {
    manualInspectionPathCount: report.manualInspectionPaths.length,
    remotePresentDeletionCount: report.remotePresentDeletions.length,
    totalDirtyPathCount: report.totalDirtyPathCount,
  };
}

function mapWatchdogPathEvidence(
  dirtyPath: PlannerWorktreeDirtyPath,
): TerminalAuditWatchdogPathEvidence {
  return {
    laneName: dirtyPath.ownership.laneName,
    mergeEvidenceSummary: dirtyPath.ownership.mergeEvidence
      ? formatMergedLaneEvidenceSummary(dirtyPath.ownership.mergeEvidence)
      : undefined,
    ownershipKind: dirtyPath.ownership.kind,
    ownershipReason: dirtyPath.ownership.reason,
    path: dirtyPath.path,
  };
}

function extractFactoryLinkageEvidenceFromWatchdogReport(
  watchdogReportFormatted: string,
): TerminalAuditWatchdogPathEvidence | undefined {
  const pathLine = watchdogReportFormatted
    .split("\n")
    .find(
      (line) =>
        line.includes(`path=${PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH}`) &&
        line.includes("owner=already-merged-owned"),
    );
  if (!pathLine) {
    return undefined;
  }

  const laneMatch = pathLine.match(/owner=already-merged-owned:([^\s]+)/);
  const mergeEvidenceMatch = pathLine.match(/merge-evidence=([^\s]+)/);
  const ownershipReasonMatch = pathLine.match(/ownership-reason=(.+)$/);

  return {
    laneName: laneMatch?.[1],
    mergeEvidenceSummary: mergeEvidenceMatch?.[1],
    ownershipKind: "already-merged-owned",
    ownershipReason:
      ownershipReasonMatch?.[1]?.trim() ??
      "Already-merged-owned classification recorded in watchdog report fixture.",
    path: PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
  };
}

function collectWatchdogPathEvidence(
  snapshot: PlannerWorktreeDriftSnapshot,
): TerminalAuditWatchdogPathEvidence[] {
  return snapshot.root.dirtyPaths
    .map((dirtyPath) => mapWatchdogPathEvidence(dirtyPath))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function isPlannerTerminalAuditRemotePresentDeletedPath(
  path: string,
): path is PlannerTerminalAuditRemotePresentDeletedPath {
  return PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS.includes(
    path as PlannerTerminalAuditRemotePresentDeletedPath,
  );
}

function formatOriginMainPresenceCommand(
  remoteBaseRef: string,
  path: string,
): string {
  return `git cat-file -e ${remoteBaseRef}:${path}`;
}

function hasExplicitDeletionOwnership(
  pathEvidence: TerminalAuditWatchdogPathEvidence | undefined,
): pathEvidence is TerminalAuditWatchdogPathEvidence & { laneName: string } {
  return (
    pathEvidence !== undefined &&
    pathEvidence.ownershipKind !== "unowned" &&
    Boolean(pathEvidence.laneName)
  );
}

function buildTerminalAuditDeletionEvidenceFromReconciliation(
  path: PlannerTerminalAuditRemotePresentDeletedPath,
  remoteBaseRef: string,
  pathReport: RootCheckoutDirtyPathReport | undefined,
  watchdogPathEvidence: TerminalAuditWatchdogPathEvidence | undefined,
): TerminalAuditRemotePresentDeletionEvidence {
  const explicitOwner = hasExplicitDeletionOwnership(watchdogPathEvidence)
    ? watchdogPathEvidence.laneName
    : undefined;

  return {
    comparisonTarget: pathReport?.comparisonTarget ?? remoteBaseRef,
    evidence:
      pathReport?.evidence ?? PLANNER_ROOT_CHECKOUT_REMOTE_EVIDENCE_PRESENT,
    explicitOwnerLaneName: explicitOwner,
    originMainPresenceCommand: formatOriginMainPresenceCommand(
      remoteBaseRef,
      path,
    ),
    path,
    remoteMainPresent: pathReport?.remoteMainPresent ?? true,
    statusCode: pathReport?.statusCode ?? "D ",
  };
}

export function buildTerminalAuditRemotePresentDeletionGroup(input: {
  reconciliationReport: PlannerRootCheckoutReconciliationReport;
  remoteBaseRef: string;
  watchdogPathEvidence?: TerminalAuditWatchdogPathEvidence[];
}): TerminalAuditRemotePresentDeletionGroup {
  const remotePresentDeletionsByPath = new Map(
    input.reconciliationReport.remotePresentDeletions.map((pathReport) => [
      pathReport.path,
      pathReport,
    ]),
  );
  const watchdogPathEvidenceByPath = new Map(
    (input.watchdogPathEvidence ?? []).map((pathEvidence) => [
      pathEvidence.path,
      pathEvidence,
    ]),
  );
  const deletions = PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS.map(
    (path) =>
      buildTerminalAuditDeletionEvidenceFromReconciliation(
        path,
        input.remoteBaseRef,
        remotePresentDeletionsByPath.get(path),
        watchdogPathEvidenceByPath.get(path),
      ),
  );
  const allExplicitlyOwned = deletions.every((deletion) =>
    Boolean(deletion.explicitOwnerLaneName),
  );

  return {
    classification: allExplicitlyOwned
      ? PLANNER_TERMINAL_AUDIT_EXPLICITLY_OWNED_DELETION_GROUP_CLASSIFICATION
      : PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_GROUP_CLASSIFICATION,
    comparisonTarget: input.remoteBaseRef,
    deletions,
    nextSafeAction:
      PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_NEXT_SAFE_ACTION,
  };
}

function formatTerminalAuditRemotePresentDeletionEvidenceLine(
  deletion: TerminalAuditRemotePresentDeletionEvidence,
): string {
  const fields = [
    `path=${deletion.path}`,
    `status=${deletion.statusCode}`,
    `comparison-target=${deletion.comparisonTarget}`,
    `evidence=${deletion.evidence}`,
    `origin-main-presence-command=${deletion.originMainPresenceCommand}`,
  ];

  if (deletion.explicitOwnerLaneName) {
    fields.push(`explicit-owner=${deletion.explicitOwnerLaneName}`);
  }

  return fields.join(" ");
}

export function buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
  options: DiscoverPlannerTerminalAuditRootStagedDeletionHandoffOptions = {},
): PlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGitStatusShortBranch =
    options.runGitStatusShortBranch ?? defaultRunGitStatusShortBranch;
  const runGitDiffCachedStat =
    options.runGitDiffCachedStat ?? defaultRunGitDiffCachedStat;
  const gitStatusShortBranch =
    options.statusOutput ?? runGitStatusShortBranch(repoRoot);
  const porcelainStatus = extractPorcelainStatusOutput(gitStatusShortBranch);
  const reconciliationReport =
    options.reconciliationReport ??
    buildPlannerRootCheckoutReconciliationReport({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef: options.remoteBaseRef,
      repoRoot,
      runGit: options.runGit,
      statusOutput: porcelainStatus,
    });
  const watchdogSnapshot = options.watchdogSnapshot;
  const watchdogReportFormatted =
    options.watchdogReportFormatted ??
    (watchdogSnapshot
      ? formatPlannerWorktreeDriftReport(watchdogSnapshot)
      : "");
  const watchdogPathEvidence = watchdogSnapshot
    ? collectWatchdogPathEvidence(watchdogSnapshot)
    : [];
  const factoryLinkageWatchdogEvidence =
    watchdogPathEvidence.find(
      (pathEvidence) =>
        pathEvidence.path === PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
    ) ??
    (watchdogReportFormatted
      ? extractFactoryLinkageEvidenceFromWatchdogReport(watchdogReportFormatted)
      : undefined);
  const remoteBaseRef =
    options.remoteBaseRef ?? reconciliationReport.remoteBaseRef;
  const terminalAuditRemotePresentDeletions =
    buildTerminalAuditRemotePresentDeletionGroup({
      reconciliationReport,
      remoteBaseRef,
      watchdogPathEvidence,
    });

  return {
    evidenceCommands:
      options.evidenceCommands ?? PLANNER_TERMINAL_AUDIT_EVIDENCE_COMMANDS,
    factoryLinkageWatchdogEvidence,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    gitDiffCachedStat:
      options.gitDiffCachedStat ?? runGitDiffCachedStat(repoRoot),
    gitStatusShortBranch,
    preservationStatement:
      options.preservationStatement ??
      PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT,
    reconciliation: summarizeReconciliationEvidence(reconciliationReport),
    reconciliationReportFormatted:
      formatPlannerRootCheckoutReconciliationReport(reconciliationReport),
    remoteBaseRef,
    repoRoot,
    terminalAuditRemotePresentDeletions,
    watchdogPathEvidence,
    watchdogReportFormatted,
  };
}

export function discoverPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
  options: DiscoverPlannerTerminalAuditRootStagedDeletionHandoffOptions = {},
): PlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport {
  return buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
    options,
  );
}

export function formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
  report: PlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
): string {
  const lines = [
    PLANNER_TERMINAL_AUDIT_ROOT_STAGED_DELETION_HANDOFF_HEADER,
    `generated-at-utc=${report.generatedAtUtc}`,
    `repo=${report.repoRoot}`,
    "- git-status-short-branch",
    ...report.gitStatusShortBranch
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => `  ${line}`),
    "- git-diff-cached-stat",
    ...(report.gitDiffCachedStat.trim()
      ? report.gitDiffCachedStat
          .split("\n")
          .filter((line) => line.length > 0)
          .map((line) => `  ${line}`)
      : ["  (empty)"]),
    "- root-checkout-reconciliation-summary",
    `  root-dirty-paths=${report.reconciliation.totalDirtyPathCount}`,
    `  remote-present-deletions=${report.reconciliation.remotePresentDeletionCount}`,
    `  manual-inspection=${report.reconciliation.manualInspectionPathCount}`,
    "- root-checkout-reconciliation-report",
    ...report.reconciliationReportFormatted
      .split("\n")
      .map((line) => `  ${line}`),
  ];

  if (report.watchdogReportFormatted) {
    lines.push(
      "- worktree-drift-watchdog-report",
      ...report.watchdogReportFormatted.split("\n").map((line) => `  ${line}`),
    );
  }

  const terminalAuditDeletions = report.terminalAuditRemotePresentDeletions;
  lines.push(
    "- terminal-audit-remote-present-deletions",
    `  classification=${terminalAuditDeletions.classification}`,
    `  comparison-target=${terminalAuditDeletions.comparisonTarget}`,
    `  next-safe-action=${terminalAuditDeletions.nextSafeAction}`,
    ...terminalAuditDeletions.deletions.map(
      (deletion) =>
        `  - ${formatTerminalAuditRemotePresentDeletionEvidenceLine(deletion)}`,
    ),
  );

  if (report.factoryLinkageWatchdogEvidence) {
    const factoryLinkage = report.factoryLinkageWatchdogEvidence;
    lines.push(
      "- factory-linkage-watchdog-evidence",
      `  path=${factoryLinkage.path}`,
      `  ownership-kind=${factoryLinkage.ownershipKind}`,
      factoryLinkage.laneName
        ? `  lane-name=${factoryLinkage.laneName}`
        : "  lane-name=(none)",
      factoryLinkage.mergeEvidenceSummary
        ? `  merge-evidence=${factoryLinkage.mergeEvidenceSummary}`
        : "  merge-evidence=(none)",
      `  ownership-reason=${factoryLinkage.ownershipReason}`,
    );
  }

  lines.push(
    "- evidence-commands",
    ...report.evidenceCommands.map((command) => `  ${command}`),
    `- preservation-statement=${report.preservationStatement}`,
  );

  return lines.join("\n");
}

export function formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceMarkdown(
  report: PlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
): string {
  const lines = [
    "# Terminal Audit Root Staged Deletion Handoff Evidence",
    "",
    `Generated at (UTC): ${report.generatedAtUtc}`,
    "",
    "## Git Status (`git status --short --branch`)",
    "",
    "```",
    report.gitStatusShortBranch.trimEnd(),
    "```",
    "",
    "## Cached Diff Stat (`git diff --cached --stat`)",
    "",
    "```",
    report.gitDiffCachedStat.trim() || "(empty)",
    "```",
    "",
    "## Root Checkout Reconciliation Summary",
    "",
    `- Root dirty paths: \`${report.reconciliation.totalDirtyPathCount}\``,
    `- Remote-present deletions: \`${report.reconciliation.remotePresentDeletionCount}\``,
    `- Manual-inspection paths: \`${report.reconciliation.manualInspectionPathCount}\``,
    "",
    "## Root Checkout Reconciliation Report",
    "",
    "```",
    report.reconciliationReportFormatted.trimEnd(),
    "```",
    "",
    "## Terminal Audit Remote-Present Deletions",
    "",
    `- Group classification: \`${report.terminalAuditRemotePresentDeletions.classification}\``,
    `- Comparison target: \`${report.terminalAuditRemotePresentDeletions.comparisonTarget}\``,
    `- Next safe action: ${report.terminalAuditRemotePresentDeletions.nextSafeAction}`,
    "",
    "| Path | Status | Origin/Main Evidence | Presence Command | Explicit Owner |",
    "| --- | --- | --- | --- | --- |",
    ...report.terminalAuditRemotePresentDeletions.deletions.map(
      (deletion) =>
        `| \`${deletion.path}\` | \`${deletion.statusCode.trim()}\` | \`${deletion.evidence}\` | \`${deletion.originMainPresenceCommand}\` | \`${deletion.explicitOwnerLaneName ?? "(none)"}\` |`,
    ),
    "",
  ];

  if (report.watchdogReportFormatted) {
    lines.push(
      "## Worktree Drift Watchdog Report",
      "",
      "```",
      report.watchdogReportFormatted.trimEnd(),
      "```",
      "",
    );
  }

  if (report.factoryLinkageWatchdogEvidence) {
    const factoryLinkage = report.factoryLinkageWatchdogEvidence;
    lines.push(
      "## Factory Linkage Watchdog Evidence",
      "",
      `Path: \`${factoryLinkage.path}\``,
      "",
      `- Ownership kind: \`${factoryLinkage.ownershipKind}\``,
      `- Lane name: \`${factoryLinkage.laneName ?? "(none)"}\``,
      `- Merge evidence: \`${factoryLinkage.mergeEvidenceSummary ?? "(none)"}\``,
      `- Ownership reason: ${factoryLinkage.ownershipReason}`,
      "",
    );
  }

  if (report.watchdogPathEvidence.length > 0) {
    lines.push(
      "## Watchdog Path Ownership",
      "",
      "| Path | Ownership Kind | Lane | Merge Evidence |",
      "| --- | --- | --- | --- |",
      ...report.watchdogPathEvidence.map(
        (pathEvidence) =>
          `| \`${pathEvidence.path}\` | \`${pathEvidence.ownershipKind}\` | \`${pathEvidence.laneName ?? "(none)"}\` | \`${pathEvidence.mergeEvidenceSummary ?? "(none)"}\` |`,
      ),
      "",
    );
  }

  lines.push(
    "## Read-Only Evidence Commands",
    "",
    "Run these commands to re-gather evidence without mutating dirty root paths:",
    "",
    ...report.evidenceCommands.map((command) => `- \`${command}\``),
    "",
    "## Preservation Statement",
    "",
    report.preservationStatement,
    "",
  );

  return lines.join("\n");
}

export function serializePlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
  report: PlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
