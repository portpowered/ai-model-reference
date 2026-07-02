import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  type PlannerWorktreeDriftChangeKind,
  type PlannerWorktreeDriftSnapshot,
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

export const PLANNER_ROOT_DRIFT_PAGE_REFILL_HOLD =
  "Hold page refills until remaining ownerless root drift is cleared or explicitly owned.";

export const PLANNER_ROOT_DRIFT_ACTIVE_DEPENDENCY =
  "tokenizer-mismatch-root-drift-reconciliation";

export const PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS = [
  "package.json",
  "scripts/report-planner-root-checkout-reconciliation.ts",
  "src/tests/ci/content-pr-doctor.test.ts",
] as const;

export const PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS = [
  "docs/internal/processes/derived-page-validation-relevant-files.md",
  "docs/internal/processes/factory-linkage-relevant-files.md",
  "src/lib/factory/planner-root-checkout-reconciliation.test.ts",
  "src/lib/factory/planner-root-checkout-reconciliation.ts",
  "src/tests/discovery/planner-root-checkout-reconciliation.test.ts",
  "src/tests/fixtures/planner-root-checkout-reconciliation/mixed-dirty-status.txt",
] as const;

export const PLANNER_ROOT_DRIFT_SUPPLIED_DIRTY_PATHS = [
  ...PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS,
  ...PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS,
] as const;

export type RootDriftSuppliedOwnership =
  | "supplied-still-ownerless"
  | "supplied-batch-054-owned";

export type RootDriftEffectiveOwnershipClass =
  | "supplied-still-ownerless"
  | "supplied-batch-054-owned"
  | "requires-operator-verification";

export type RootDriftOperatorNextAction =
  | "inspect-and-preserve-ownerless"
  | "recheck-batch-054-terminal-evidence"
  | "avoid-cleanup-until-ownership-explicit";

export interface RootDriftPathOwnershipClassification {
  changeKind: PlannerWorktreeDriftChangeKind;
  discrepancyNote?: string;
  effectiveClass: RootDriftEffectiveOwnershipClass;
  operatorNextAction: RootDriftOperatorNextAction;
  path: string;
  statusCode: string;
  suppliedOwnership: RootDriftSuppliedOwnership;
  watchdogReportsOwnerless: boolean;
}

export interface RootDriftOwnershipClassGuidance {
  description: string;
  operatorNextAction: RootDriftOperatorNextAction;
  ownershipClass: RootDriftEffectiveOwnershipClass;
  paths: readonly string[];
}

export interface PlannerRootDriftOwnershipClassificationReport {
  activeDependency: string;
  classGuidance: RootDriftOwnershipClassGuidance[];
  evidenceDiscrepancyPresent: boolean;
  pathClassifications: RootDriftPathOwnershipClassification[];
  watchdogOwnerlessPaths: readonly string[];
}

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
  ownershipClassification: PlannerRootDriftOwnershipClassificationReport;
  pageRefillHoldGuidance: string;
  preservationStatement: string;
  repoRoot: string;
}

export interface DiscoverPlannerRootDriftHandoffEvidenceOptions {
  branchStatusLine?: string;
  evidenceCommands?: readonly string[];
  generatedAtUtc?: string;
  headRelationship?: RootDriftHeadRelationship;
  pageRefillHoldGuidance?: string;
  preservationStatement?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitStatusShortBranch?: RunGitStatusShortBranch;
  statusOutput?: string;
  watchdogOwnerlessPaths?: readonly string[];
  watchdogSnapshot?: PlannerWorktreeDriftSnapshot;
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

function resolveSuppliedOwnership(path: string): RootDriftSuppliedOwnership {
  if (
    (
      PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS as readonly string[]
    ).includes(path)
  ) {
    return "supplied-still-ownerless";
  }
  if (
    (
      PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS as readonly string[]
    ).includes(path)
  ) {
    return "supplied-batch-054-owned";
  }
  throw new Error(
    `Unexpected dirty root path outside supplied nine-path inventory: ${path}`,
  );
}

export function collectWatchdogOwnerlessRootPaths(
  snapshot: PlannerWorktreeDriftSnapshot,
): string[] {
  return snapshot.root.dirtyPaths
    .filter((dirtyPath) =>
      snapshot.risks.some(
        (risk) =>
          risk.kind === "ownerless-root-dirty-paths" &&
          risk.path === dirtyPath.path,
      ),
    )
    .map((dirtyPath) => dirtyPath.path)
    .sort((left, right) => left.localeCompare(right));
}

function classifyRootDriftPathOwnership(
  dirtyPath: RootDriftDirtyPathEvidence,
  watchdogOwnerlessPathSet: ReadonlySet<string>,
): RootDriftPathOwnershipClassification {
  const suppliedOwnership = resolveSuppliedOwnership(dirtyPath.path);
  const watchdogReportsOwnerless = watchdogOwnerlessPathSet.has(dirtyPath.path);

  if (suppliedOwnership === "supplied-still-ownerless") {
    return {
      changeKind: dirtyPath.changeKind,
      effectiveClass: "supplied-still-ownerless",
      operatorNextAction: "inspect-and-preserve-ownerless",
      path: dirtyPath.path,
      statusCode: dirtyPath.statusCode,
      suppliedOwnership,
      watchdogReportsOwnerless,
    };
  }

  if (watchdogReportsOwnerless) {
    return {
      changeKind: dirtyPath.changeKind,
      discrepancyNote:
        "Current watchdog output still reports this supplied batch-054-owned path as ownerless; require operator verification before treating it as safe.",
      effectiveClass: "requires-operator-verification",
      operatorNextAction: "avoid-cleanup-until-ownership-explicit",
      path: dirtyPath.path,
      statusCode: dirtyPath.statusCode,
      suppliedOwnership,
      watchdogReportsOwnerless,
    };
  }

  return {
    changeKind: dirtyPath.changeKind,
    effectiveClass: "supplied-batch-054-owned",
    operatorNextAction: "recheck-batch-054-terminal-evidence",
    path: dirtyPath.path,
    statusCode: dirtyPath.statusCode,
    suppliedOwnership,
    watchdogReportsOwnerless,
  };
}

function buildOwnershipClassGuidance(
  pathClassifications: readonly RootDriftPathOwnershipClassification[],
): RootDriftOwnershipClassGuidance[] {
  const guidanceByClass = new Map<
    RootDriftEffectiveOwnershipClass,
    RootDriftOwnershipClassGuidance
  >([
    [
      "supplied-still-ownerless",
      {
        description:
          "Supplied still-ownerless root drift paths with no active or merged lane claim.",
        operatorNextAction: "inspect-and-preserve-ownerless",
        ownershipClass: "supplied-still-ownerless",
        paths: [],
      },
    ],
    [
      "supplied-batch-054-owned",
      {
        description:
          "Supplied already-merged-owned paths attributed to tokenizer-mismatch-root-drift-reconciliation when watchdog agrees.",
        operatorNextAction: "recheck-batch-054-terminal-evidence",
        ownershipClass: "supplied-batch-054-owned",
        paths: [],
      },
    ],
    [
      "requires-operator-verification",
      {
        description:
          "Supplied batch-054-owned paths that current watchdog output still reports as ownerless.",
        operatorNextAction: "avoid-cleanup-until-ownership-explicit",
        ownershipClass: "requires-operator-verification",
        paths: [],
      },
    ],
  ]);

  for (const classification of pathClassifications) {
    const guidance = guidanceByClass.get(classification.effectiveClass);
    if (!guidance) {
      continue;
    }
    guidance.paths = [...guidance.paths, classification.path];
  }

  return [...guidanceByClass.values()].filter(
    (guidance) => guidance.paths.length > 0,
  );
}

export function buildPlannerRootDriftOwnershipClassificationReport(options: {
  dirtyPaths: readonly RootDriftDirtyPathEvidence[];
  watchdogOwnerlessPaths?: readonly string[];
  watchdogSnapshot?: PlannerWorktreeDriftSnapshot;
}): PlannerRootDriftOwnershipClassificationReport {
  const watchdogOwnerlessPaths =
    options.watchdogOwnerlessPaths ??
    (options.watchdogSnapshot
      ? collectWatchdogOwnerlessRootPaths(options.watchdogSnapshot)
      : options.dirtyPaths.map((dirtyPath) => dirtyPath.path));
  const watchdogOwnerlessPathSet = new Set(watchdogOwnerlessPaths);
  const pathClassifications = options.dirtyPaths.map((dirtyPath) =>
    classifyRootDriftPathOwnership(dirtyPath, watchdogOwnerlessPathSet),
  );

  return {
    activeDependency: PLANNER_ROOT_DRIFT_ACTIVE_DEPENDENCY,
    classGuidance: buildOwnershipClassGuidance(pathClassifications),
    evidenceDiscrepancyPresent: pathClassifications.some(
      (classification) =>
        classification.effectiveClass === "requires-operator-verification",
    ),
    pathClassifications,
    watchdogOwnerlessPaths,
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
    ownershipClassification: buildPlannerRootDriftOwnershipClassificationReport(
      {
        dirtyPaths,
        watchdogOwnerlessPaths: options.watchdogOwnerlessPaths,
        watchdogSnapshot: options.watchdogSnapshot,
      },
    ),
    pageRefillHoldGuidance:
      options.pageRefillHoldGuidance ?? PLANNER_ROOT_DRIFT_PAGE_REFILL_HOLD,
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

function formatOwnershipClassificationHuman(
  ownershipClassification: PlannerRootDriftOwnershipClassificationReport,
): string[] {
  const lines = [
    "- ownership-classification",
    `  active-dependency=${ownershipClassification.activeDependency}`,
    `  evidence-discrepancy-present=${ownershipClassification.evidenceDiscrepancyPresent}`,
    `  watchdog-ownerless-paths=${ownershipClassification.watchdogOwnerlessPaths.join(", ")}`,
    "- supplied-still-ownerless-paths",
    ...PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS.map(
      (path) => `  path=${path}`,
    ),
    "- supplied-batch-054-owned-paths",
    ...PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS.map(
      (path) =>
        `  path=${path} dependency=${ownershipClassification.activeDependency}`,
    ),
    "- path-classifications",
    ...ownershipClassification.pathClassifications.map(
      (classification) =>
        `  path=${classification.path} supplied=${classification.suppliedOwnership} effective=${classification.effectiveClass} watchdog-ownerless=${classification.watchdogReportsOwnerless} next-action=${classification.operatorNextAction}${classification.discrepancyNote ? ` note=${classification.discrepancyNote}` : ""}`,
    ),
    "- class-operator-next-actions",
    ...ownershipClassification.classGuidance.map(
      (guidance) =>
        `  class=${guidance.ownershipClass} next-action=${guidance.operatorNextAction} paths=${guidance.paths.join(", ")}`,
    ),
  ];

  return lines;
}

function formatOwnershipClassificationMarkdown(
  ownershipClassification: PlannerRootDriftOwnershipClassificationReport,
): string[] {
  const lines = [
    "## Ownership Classification",
    "",
    `Active dependency: \`${ownershipClassification.activeDependency}\``,
    "",
    "Supplied still-ownerless paths:",
    "",
    ...PLANNER_ROOT_DRIFT_SUPPLIED_STILL_OWNERLESS_PATHS.map(
      (path) => `- \`${path}\``,
    ),
    "",
    `Supplied batch-054-owned paths (dependency \`${ownershipClassification.activeDependency}\`):`,
    "",
    ...PLANNER_ROOT_DRIFT_SUPPLIED_BATCH_054_OWNED_PATHS.map(
      (path) => `- \`${path}\``,
    ),
    "",
    "Current watchdog ownerless paths:",
    "",
    ...ownershipClassification.watchdogOwnerlessPaths.map(
      (path) => `- \`${path}\``,
    ),
    "",
    `Evidence discrepancy present: \`${ownershipClassification.evidenceDiscrepancyPresent}\``,
    "",
    "### Per-Path Classification",
    "",
    "| Path | Supplied Ownership | Effective Class | Watchdog Ownerless | Operator Next Action |",
    "| --- | --- | --- | --- | --- |",
    ...ownershipClassification.pathClassifications.map(
      (classification) =>
        `| \`${classification.path}\` | \`${classification.suppliedOwnership}\` | \`${classification.effectiveClass}\` | \`${classification.watchdogReportsOwnerless}\` | \`${classification.operatorNextAction}\` |`,
    ),
    "",
    "### Class Operator Next Actions",
    "",
    ...ownershipClassification.classGuidance.flatMap((guidance) => [
      `- **${guidance.ownershipClass}** — \`${guidance.operatorNextAction}\``,
      `  - ${guidance.description}`,
      `  - Paths: ${guidance.paths.map((path) => `\`${path}\``).join(", ")}`,
    ]),
    "",
  ];

  const discrepancyNotes = ownershipClassification.pathClassifications.filter(
    (classification) => classification.discrepancyNote,
  );
  if (discrepancyNotes.length > 0) {
    lines.push(
      "### Operator Verification Required",
      "",
      ...discrepancyNotes.flatMap((classification) => [
        `- \`${classification.path}\`: ${classification.discrepancyNote}`,
      ]),
      "",
    );
  }

  return lines;
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
    ...formatOwnershipClassificationHuman(report.ownershipClassification),
    "- evidence-commands",
    ...report.evidenceCommands.map((command) => `  ${command}`),
    `- preservation-statement=${report.preservationStatement}`,
    `- page-refill-hold=${report.pageRefillHoldGuidance}`,
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
    ...formatOwnershipClassificationMarkdown(report.ownershipClassification),
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
    "## Meta-Planner Page Refill Hold",
    "",
    report.pageRefillHoldGuidance,
    "",
  );

  return lines.join("\n");
}

export function serializePlannerRootDriftHandoffEvidenceReport(
  report: PlannerRootDriftHandoffEvidenceReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
