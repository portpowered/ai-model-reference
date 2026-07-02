import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  type PlannerWorktreeDriftChangeKind,
  parsePlannerRelevantDirtyPaths,
} from "./planner-worktree-drift-watchdog";

export const PLANNER_ROOT_DRIFT_OPERATOR_HANDOFF_HEADER =
  "Ownerless Root Drift Operator Handoff";

export const PLANNER_ROOT_DRIFT_EVIDENCE_COMMANDS = [
  "git status --short --branch",
  "git rev-parse --short HEAD",
  "git rev-parse --short origin/main",
  "git rev-list --left-right --count HEAD...origin/main",
  "bun ./scripts/report-planner-worktree-drift-watchdog.ts",
  "bun ./scripts/report-queue-worktree-pr-linkage-ledger.ts --refresh-metadata",
  "bun ./scripts/active-pr-mergeability-watchdog.ts",
  "bun ./scripts/report-planner-queue-health.ts",
  "bun ./scripts/report-planner-concurrency-floor.ts",
] as const;

export const PLANNER_ROOT_DRIFT_NO_MUTATION_STATEMENT =
  "No dirty root paths were modified, reverted, staged, overwritten, or regenerated as part of this handoff.";

export const PLANNER_ROOT_DRIFT_SUPPLIED_DIRTY_PATHS = [
  "package.json",
  "scripts/report-planner-root-checkout-reconciliation.ts",
  "src/tests/ci/content-pr-doctor.test.ts",
  "docs/internal/processes/derived-page-validation-relevant-files.md",
  "docs/internal/processes/factory-linkage-relevant-files.md",
  "src/lib/factory/planner-root-checkout-reconciliation.test.ts",
  "src/lib/factory/planner-root-checkout-reconciliation.ts",
  "src/tests/discovery/planner-root-checkout-reconciliation.test.ts",
  "src/tests/fixtures/planner-root-checkout-reconciliation/mixed-dirty-status.txt",
] as const;

export interface RootDriftDirtyPathEvidence {
  changeKind: PlannerWorktreeDriftChangeKind;
  path: string;
  statusCode: string;
}

export interface RootDriftHeadRelationship {
  aheadCount: number;
  aligned: boolean;
  behindCount: number;
  branchStatusLine?: string;
  headShort: string;
  originMainShort: string;
}

export interface PlannerRootDriftHandoffEvidenceReport {
  dirtyPaths: RootDriftDirtyPathEvidence[];
  evidenceCommands: readonly string[];
  generatedAtUtc: string;
  headRelationship: RootDriftHeadRelationship;
  preservationStatement: string;
  repoRoot: string;
}

export interface DiscoverPlannerRootDriftHandoffEvidenceOptions {
  branchStatusLine?: string;
  evidenceCommands?: readonly string[];
  generatedAtUtc?: string;
  headRelationship?: RootDriftHeadRelationship;
  preservationStatement?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitStatusShortBranch?: RunGitStatusShortBranch;
  statusOutput?: string;
}

type RunGit = (repoRoot: string, args: readonly string[]) => GitCommandResult;
type RunGitStatusShortBranch = (cwd: string) => string;

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

function extractBranchStatusLine(
  statusShortBranchOutput: string,
): string | undefined {
  const firstLine = statusShortBranchOutput
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("## "));
  return firstLine;
}

function extractPorcelainStatusOutput(statusShortBranchOutput: string): string {
  return statusShortBranchOutput
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("## "))
    .join("\n");
}

function discoverHeadRelationship(
  repoRoot: string,
  runGit: RunGit,
  branchStatusLine?: string,
): RootDriftHeadRelationship {
  const headResult = runGit(repoRoot, ["rev-parse", "--short", "HEAD"]);
  if (headResult.status !== 0) {
    throw new Error(
      `git rev-parse --short HEAD failed for ${repoRoot}.\n${headResult.stderr.trim()}`,
    );
  }

  const originMainResult = runGit(repoRoot, [
    "rev-parse",
    "--short",
    "origin/main",
  ]);
  if (originMainResult.status !== 0) {
    throw new Error(
      `git rev-parse --short origin/main failed for ${repoRoot}.\n${originMainResult.stderr.trim()}`,
    );
  }

  const revListResult = runGit(repoRoot, [
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...origin/main",
  ]);
  if (revListResult.status !== 0) {
    throw new Error(
      `git rev-list --left-right --count HEAD...origin/main failed for ${repoRoot}.\n${revListResult.stderr.trim()}`,
    );
  }

  const [aheadText, behindText] = revListResult.stdout.trim().split(/\s+/);
  const aheadCount = Number.parseInt(aheadText ?? "0", 10);
  const behindCount = Number.parseInt(behindText ?? "0", 10);
  const headShort = headResult.stdout.trim();
  const originMainShort = originMainResult.stdout.trim();

  return {
    aheadCount,
    aligned:
      headShort === originMainShort && aheadCount === 0 && behindCount === 0,
    behindCount,
    branchStatusLine,
    headShort,
    originMainShort,
  };
}

export function buildPlannerRootDriftHandoffEvidenceReport(
  options: DiscoverPlannerRootDriftHandoffEvidenceOptions = {},
): PlannerRootDriftHandoffEvidenceReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatusShortBranch =
    options.runGitStatusShortBranch ?? defaultRunGitStatusShortBranch;
  const statusShortBranchOutput =
    options.statusOutput ?? runGitStatusShortBranch(repoRoot);
  const porcelainStatus = extractPorcelainStatusOutput(statusShortBranchOutput);
  const dirtyPaths = parsePlannerRelevantDirtyPaths(
    porcelainStatus,
    "root",
  ).map((dirtyPath) => ({
    changeKind: dirtyPath.changeKind,
    path: dirtyPath.path,
    statusCode: dirtyPath.statusCode,
  }));

  return {
    dirtyPaths,
    evidenceCommands:
      options.evidenceCommands ?? PLANNER_ROOT_DRIFT_EVIDENCE_COMMANDS,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    headRelationship:
      options.headRelationship ??
      discoverHeadRelationship(
        repoRoot,
        runGit,
        options.branchStatusLine ??
          extractBranchStatusLine(statusShortBranchOutput),
      ),
    preservationStatement:
      options.preservationStatement ?? PLANNER_ROOT_DRIFT_NO_MUTATION_STATEMENT,
    repoRoot,
  };
}

export function discoverPlannerRootDriftHandoffEvidenceReport(
  options: DiscoverPlannerRootDriftHandoffEvidenceOptions = {},
): PlannerRootDriftHandoffEvidenceReport {
  return buildPlannerRootDriftHandoffEvidenceReport(options);
}

export function formatPlannerRootDriftHandoffEvidenceReport(
  report: PlannerRootDriftHandoffEvidenceReport,
): string {
  const lines = [
    PLANNER_ROOT_DRIFT_OPERATOR_HANDOFF_HEADER,
    `generated-at-utc=${report.generatedAtUtc}`,
    `repo=${report.repoRoot}`,
    "- head-relationship",
    `  head=${report.headRelationship.headShort}`,
    `  origin-main=${report.headRelationship.originMainShort}`,
    `  ahead=${report.headRelationship.aheadCount} behind=${report.headRelationship.behindCount}`,
    `  aligned=${report.headRelationship.aligned}`,
  ];

  if (report.headRelationship.branchStatusLine) {
    lines.push(`  branch-status=${report.headRelationship.branchStatusLine}`);
  }

  lines.push(
    `- dirty-root-paths count=${report.dirtyPaths.length}`,
    ...report.dirtyPaths.map(
      (dirtyPath) =>
        `  path=${dirtyPath.path} status=${dirtyPath.statusCode} change=${dirtyPath.changeKind}`,
    ),
    "- evidence-commands",
    ...report.evidenceCommands.map((command) => `  ${command}`),
    `- preservation-statement=${report.preservationStatement}`,
  );

  return lines.join("\n");
}

export function formatPlannerRootDriftHandoffEvidenceMarkdown(
  report: PlannerRootDriftHandoffEvidenceReport,
): string {
  const lines = [
    "# Ownerless Root Drift Operator Handoff Evidence",
    "",
    `Generated at (UTC): ${report.generatedAtUtc}`,
    "",
    "## Head Relationship",
    "",
    `- \`HEAD\`: \`${report.headRelationship.headShort}\``,
    `- \`origin/main\`: \`${report.headRelationship.originMainShort}\``,
    `- Ahead/behind counts: \`${report.headRelationship.aheadCount}\` ahead, \`${report.headRelationship.behindCount}\` behind`,
    `- Aligned: \`${report.headRelationship.aligned}\``,
  ];

  if (report.headRelationship.branchStatusLine) {
    lines.push(
      `- Branch status line: \`${report.headRelationship.branchStatusLine}\``,
    );
  }

  lines.push(
    "",
    "## Dirty Root Paths",
    "",
    "Paths observed from `git status --short --branch` porcelain output:",
    "",
    "| Path | Status | Change |",
    "| --- | --- | --- |",
    ...report.dirtyPaths.map(
      (dirtyPath) =>
        `| \`${dirtyPath.path}\` | \`${dirtyPath.statusCode}\` | \`${dirtyPath.changeKind}\` |`,
    ),
    "",
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

export function serializePlannerRootDriftHandoffEvidenceReport(
  report: PlannerRootDriftHandoffEvidenceReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
