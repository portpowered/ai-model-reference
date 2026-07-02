import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
  formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
  isPlannerTerminalAuditForbiddenPageContentPath,
  isPlannerTerminalAuditReadOnlyGitArgs,
  PLANNER_TERMINAL_AUDIT_ACTIVE_PR_CONTEXT_DECISION_SUPPORT,
  PLANNER_TERMINAL_AUDIT_ALREADY_MERGED_NEXT_SAFE_ACTION,
  PLANNER_TERMINAL_AUDIT_DIRTY_ROOT_PATHS,
  PLANNER_TERMINAL_AUDIT_DRIFT_REMAINS_OPERATOR_HOLD_STATEMENT,
  PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
  PLANNER_TERMINAL_AUDIT_FORBIDDEN_PAGE_CONTENT_PATH_PREFIXES,
  PLANNER_TERMINAL_AUDIT_IMPLEMENTATION_BRANCH_DIRTY_ROOT_TOUCH_ALLOWLIST,
  PLANNER_TERMINAL_AUDIT_IMPLEMENTATION_LANE_SCOPE_STATEMENT,
  PLANNER_TERMINAL_AUDIT_META_PLANNER_OPERATOR_HANDOFF_STATEMENT,
  PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT,
  PLANNER_TERMINAL_AUDIT_OPERATOR_HOLD_DELETION_NEXT_SAFE_ACTION,
  PLANNER_TERMINAL_AUDIT_OWNERLESS_DIRTY_PATH_PRESERVATION_STATEMENT,
  PLANNER_TERMINAL_AUDIT_OWNERLESS_MODIFIED_NEXT_SAFE_ACTION,
  PLANNER_TERMINAL_AUDIT_PAGE_REFILL_HOLD_BELOW_FLOOR_STATEMENT,
  PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS,
  PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_GROUP_CLASSIFICATION,
  PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_NEXT_SAFE_ACTION,
} from "@/lib/factory/planner-terminal-audit-root-staged-deletion-handoff";
import type { PlannerWorktreeDriftSnapshot } from "@/lib/factory/planner-worktree-drift-watchdog";

const fixtureDir = resolve(
  import.meta.dir,
  "../../tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff",
);
const sixPathStatusFixture = readFileSync(
  resolve(fixtureDir, "six-dirty-paths-status.txt"),
  "utf8",
);
const sixPathCachedDiffFixture = readFileSync(
  resolve(fixtureDir, "six-dirty-paths-cached-diff-stat.txt"),
  "utf8",
);

const REMOTE_PRESENT_DELETED_PATHS = new Set([
  "scripts/report-terminal-lane-main-branch-landing-audit.ts",
  "src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts",
  "src/lib/factory/terminal-lane-main-branch-landing-audit.ts",
]);

function createSixPathFixtureRunGit() {
  return (_repoRoot: string, args: readonly string[]) => {
    const objectSpec = args[2];
    if (args[0] === "cat-file" && typeof objectSpec === "string") {
      const [, path] = objectSpec.split(":");
      if (path && REMOTE_PRESENT_DELETED_PATHS.has(path)) {
        return { status: 0, stdout: "", stderr: "" };
      }
      return { status: 1, stdout: "", stderr: "missing" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };
}

function buildSixPathFixtureReportOptions(
  overrides: Partial<
    Parameters<
      typeof buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport
    >[0]
  > = {},
) {
  return {
    generatedAtUtc: "2026-07-01T12:00:00.000Z",
    gitDiffCachedStat: sixPathCachedDiffFixture,
    remoteBaseRef: "origin/main",
    repoRoot: "/repo",
    runGit: createSixPathFixtureRunGit(),
    statusOutput: `## main...origin/main\n${sixPathStatusFixture.trimEnd()}\n`,
    ...overrides,
  };
}

function buildFactoryLinkageAlreadyMergedWatchdogSnapshot(): PlannerWorktreeDriftSnapshot {
  return {
    activeLaneCount: 0,
    evaluatedWorktreeCount: 0,
    generatedAtUtc: "2026-07-01T12:00:00.000Z",
    issues: [],
    mergedLaneCount: 1,
    mergedLanes: [
      {
        branchName: "tokens-per-second-stale-pr-follow-up",
        laneName: "tokens-per-second-stale-pr-follow-up",
        mergeEvidence: {
          mergeCommitSha: "abc123def4567890abcdef1234567890abcdef12",
          pullRequestNumber: 251,
          sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
          terminalState: "complete/terminal",
        },
        worktreePath: ".claude/worktrees/tokens-per-second-stale-pr-follow-up",
      },
    ],
    risks: [],
    root: {
      dirtyPathCount: 1,
      dirtyPaths: [
        {
          category: "authored-content",
          changeKind: "modified",
          location: "root",
          ownership: {
            branchName: "tokens-per-second-stale-pr-follow-up",
            kind: "already-merged-owned",
            laneName: "tokens-per-second-stale-pr-follow-up",
            mergeEvidence: {
              mergeCommitSha: "abc123def4567890abcdef1234567890abcdef12",
              pullRequestNumber: 251,
              sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
              terminalState: "complete/terminal",
            },
            reason:
              "Root drift matches already-merged lane tokens-per-second-stale-pr-follow-up (PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).",
            reasonCode: "already-merged-lane-match",
            worktreePath:
              ".claude/worktrees/tokens-per-second-stale-pr-follow-up",
          },
          path: PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
          statusCode: "M ",
          surface: "docs/internal",
        },
      ],
      repoRoot: "/repo",
    },
    totalDirtyPathCount: 1,
    worktrees: [],
  };
}

describe("planner terminal audit root staged deletion handoff evidence", () => {
  test("records six-path git status and cached diff stat from fixtures", () => {
    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions(),
      );

    expect(report.gitStatusShortBranch).toContain(
      "M  docs/internal/processes/factory-linkage-relevant-files.md",
    );
    expect(report.gitStatusShortBranch).toContain("M  package.json");
    expect(report.gitStatusShortBranch).toContain(
      "D  scripts/report-terminal-lane-main-branch-landing-audit.ts",
    );
    expect(report.gitStatusShortBranch).toContain(
      "M  src/lib/factory/planner-merged-lane-evidence.ts",
    );
    expect(report.gitStatusShortBranch).toContain(
      "D  src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts",
    );
    expect(report.gitStatusShortBranch).toContain(
      "D  src/lib/factory/terminal-lane-main-branch-landing-audit.ts",
    );
    expect(report.gitDiffCachedStat).toContain(
      "scripts/report-terminal-lane-main-branch-landing-audit.ts",
    );
    expect(report.preservationStatement).toBe(
      PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT,
    );
  });

  test("records root checkout reconciliation counts for the six-path fixture", () => {
    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions({
          statusOutput: sixPathStatusFixture,
        }),
      );

    expect(report.reconciliation.totalDirtyPathCount).toBe(6);
    expect(report.reconciliation.remotePresentDeletionCount).toBe(3);
    expect(report.reconciliation.manualInspectionPathCount).toBe(3);
    expect(report.reconciliationReportFormatted).toContain(
      "root-dirty-paths=6",
    );
    expect(report.reconciliationReportFormatted).toContain(
      "remote-present-deletions=3",
    );
    expect(report.reconciliationReportFormatted).toContain(
      "manual-inspection=3",
    );
  });

  test("records factory-linkage watchdog evidence as already-merged-owned", () => {
    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions({
          statusOutput: sixPathStatusFixture,
          watchdogSnapshot: buildFactoryLinkageAlreadyMergedWatchdogSnapshot(),
        }),
      );

    expect(report.factoryLinkageWatchdogEvidence).toEqual({
      laneName: "tokens-per-second-stale-pr-follow-up",
      mergeEvidenceSummary:
        "PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca",
      ownershipKind: "already-merged-owned",
      ownershipReason:
        "Root drift matches already-merged lane tokens-per-second-stale-pr-follow-up (PR #251, merge abc123d, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).",
      path: PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
    });

    const formatted =
      formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(report);
    expect(formatted).toContain("- factory-linkage-watchdog-evidence");
    expect(formatted).toContain("ownership-kind=already-merged-owned");
    expect(formatted).toContain(
      "lane-name=tokens-per-second-stale-pr-follow-up",
    );
  });

  test("classifies terminal-audit remote-present deletions with origin/main evidence", () => {
    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions({
          statusOutput: sixPathStatusFixture,
        }),
      );

    expect(report.terminalAuditRemotePresentDeletions.classification).toBe(
      PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_GROUP_CLASSIFICATION,
    );
    expect(report.terminalAuditRemotePresentDeletions.comparisonTarget).toBe(
      "origin/main",
    );
    expect(report.terminalAuditRemotePresentDeletions.nextSafeAction).toBe(
      PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_NEXT_SAFE_ACTION,
    );
    expect(
      report.terminalAuditRemotePresentDeletions.deletions.map(
        (deletion) => deletion.path,
      ),
    ).toEqual([...PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS]);

    for (const deletion of report.terminalAuditRemotePresentDeletions
      .deletions) {
      expect(deletion.evidence).toBe("present-on-origin-main");
      expect(deletion.remoteMainPresent).toBe(true);
      expect(deletion.originMainPresenceCommand).toBe(
        `git cat-file -e origin/main:${deletion.path}`,
      );
      expect(deletion.explicitOwnerLaneName).toBeUndefined();
    }

    const formatted =
      formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(report);
    const terminalAuditSection = formatted.slice(
      formatted.indexOf("- terminal-audit-remote-present-deletions"),
      formatted.indexOf("- evidence-commands"),
    );
    expect(terminalAuditSection).toContain(
      "- terminal-audit-remote-present-deletions",
    );
    expect(terminalAuditSection).toContain(
      `classification=${PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_GROUP_CLASSIFICATION}`,
    );
    expect(terminalAuditSection).toContain(
      "path=scripts/report-terminal-lane-main-branch-landing-audit.ts",
    );
    expect(terminalAuditSection).toContain("evidence=present-on-origin-main");
    expect(terminalAuditSection).toContain(
      "origin-main-presence-command=git cat-file -e origin/main:scripts/report-terminal-lane-main-branch-landing-audit.ts",
    );
    expect(terminalAuditSection).toContain(
      `next-safe-action=${PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETION_NEXT_SAFE_ACTION}`,
    );
  });

  test("assigns owner state and next safe action for every dirty root path", () => {
    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions({
          statusOutput: sixPathStatusFixture,
          watchdogSnapshot: buildFactoryLinkageAlreadyMergedWatchdogSnapshot(),
        }),
      );

    expect(report.ownerlessDirtyPathPreservationStatement).toBe(
      PLANNER_TERMINAL_AUDIT_OWNERLESS_DIRTY_PATH_PRESERVATION_STATEMENT,
    );
    expect(
      report.dirtyRootPathClassifications.map((entry) => entry.path),
    ).toEqual([...PLANNER_TERMINAL_AUDIT_DIRTY_ROOT_PATHS]);
    expect(
      new Set(report.dirtyRootPathClassifications.map((entry) => entry.path))
        .size,
    ).toBe(6);

    const factoryLinkage = report.dirtyRootPathClassifications.find(
      (entry) => entry.path === PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
    );
    expect(factoryLinkage).toEqual({
      laneName: "tokens-per-second-stale-pr-follow-up",
      nextSafeAction: PLANNER_TERMINAL_AUDIT_ALREADY_MERGED_NEXT_SAFE_ACTION,
      ownerState: "already-merged-owned",
      path: PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
      statusCode: "M  ",
    });

    const ownerlessOrHoldPaths = new Set([
      "package.json",
      "src/lib/factory/planner-merged-lane-evidence.ts",
      ...PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS,
    ]);
    for (const classification of report.dirtyRootPathClassifications) {
      expect(classification.nextSafeAction.length).toBeGreaterThan(0);
      if (ownerlessOrHoldPaths.has(classification.path)) {
        expect(["ownerless", "operator-hold"]).toContain(
          classification.ownerState,
        );
      }
    }

    const packageJson = report.dirtyRootPathClassifications.find(
      (entry) => entry.path === "package.json",
    );
    expect(packageJson).toEqual({
      laneName: undefined,
      nextSafeAction:
        PLANNER_TERMINAL_AUDIT_OWNERLESS_MODIFIED_NEXT_SAFE_ACTION,
      ownerState: "ownerless",
      path: "package.json",
      statusCode: "M  ",
    });

    const plannerMergedLaneEvidence = report.dirtyRootPathClassifications.find(
      (entry) =>
        entry.path === "src/lib/factory/planner-merged-lane-evidence.ts",
    );
    expect(plannerMergedLaneEvidence).toEqual({
      laneName: undefined,
      nextSafeAction:
        PLANNER_TERMINAL_AUDIT_OWNERLESS_MODIFIED_NEXT_SAFE_ACTION,
      ownerState: "ownerless",
      path: "src/lib/factory/planner-merged-lane-evidence.ts",
      statusCode: "M  ",
    });

    for (const deletedPath of PLANNER_TERMINAL_AUDIT_REMOTE_PRESENT_DELETED_PATHS) {
      const deletion = report.dirtyRootPathClassifications.find(
        (entry) => entry.path === deletedPath,
      );
      expect(deletion).toEqual({
        laneName: undefined,
        nextSafeAction:
          PLANNER_TERMINAL_AUDIT_OPERATOR_HOLD_DELETION_NEXT_SAFE_ACTION,
        ownerState: "operator-hold",
        path: deletedPath,
        statusCode: "D  ",
      });
    }

    const formatted =
      formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(report);
    expect(formatted).toContain("- dirty-root-path-classifications");
    expect(formatted).toContain(
      `ownerless-preservation=${PLANNER_TERMINAL_AUDIT_OWNERLESS_DIRTY_PATH_PRESERVATION_STATEMENT}`,
    );
    expect(formatted).toContain(
      `path=${PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH} status=M   owner-state=already-merged-owned lane=tokens-per-second-stale-pr-follow-up`,
    );
    expect(formatted).toContain(
      "path=package.json status=M   owner-state=ownerless",
    );
    expect(formatted).toContain(
      "path=src/lib/factory/planner-merged-lane-evidence.ts status=M   owner-state=ownerless",
    );
    expect(formatted).toContain(
      "path=scripts/report-terminal-lane-main-branch-landing-audit.ts status=D   owner-state=operator-hold",
    );
  });

  test("emits planner refill and operator handoff decision for ownerless root drift", () => {
    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions({
          statusOutput: sixPathStatusFixture,
          watchdogSnapshot: buildFactoryLinkageAlreadyMergedWatchdogSnapshot(),
        }),
      );

    const decision = report.plannerRefillHandoffDecision;
    expect(decision.driftState).toBe(
      "terminal-audit-drift-remains-operator-hold",
    );
    expect(decision.driftStateStatement).toBe(
      PLANNER_TERMINAL_AUDIT_DRIFT_REMAINS_OPERATOR_HOLD_STATEMENT,
    );
    expect(decision.pageRefillsHeld).toBe(true);
    expect(decision.pageRefillHoldStatement).toBe(
      PLANNER_TERMINAL_AUDIT_PAGE_REFILL_HOLD_BELOW_FLOOR_STATEMENT,
    );
    expect(decision.metaPlannerLoopAction).toBe(
      "request-human-operator-cleanup-handoff",
    );
    expect(decision.metaPlannerLoopActionStatement).toBe(
      PLANNER_TERMINAL_AUDIT_META_PLANNER_OPERATOR_HANDOFF_STATEMENT,
    );
    expect(decision.activePrContext).toEqual([
      ...PLANNER_TERMINAL_AUDIT_ACTIVE_PR_CONTEXT_DECISION_SUPPORT,
    ]);

    const formatted =
      formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(report);
    expect(formatted).toContain("- planner-refill-handoff-decision");
    expect(formatted).toContain(
      "drift-state=terminal-audit-drift-remains-operator-hold",
    );
    expect(formatted).toContain(
      `page-refill-hold-statement=${PLANNER_TERMINAL_AUDIT_PAGE_REFILL_HOLD_BELOW_FLOOR_STATEMENT}`,
    );
    expect(formatted).toContain(
      "meta-planner-loop-action=request-human-operator-cleanup-handoff",
    );
    expect(formatted).toContain("- active-pr-context-decision-support");
    expect(formatted).toContain(
      "pr=#264 lane=latent-diffusion-paper-page state=mergeable/passing",
    );
    expect(formatted).toContain(
      "pr=#251 lane=tokens-per-second-serving-metric-page state=queue-stale with open follow-up already in progress",
    );
  });

  test("preserves non-destructive scope with read-only git evidence discovery", () => {
    const gitInvocations: string[][] = [];
    const trackingRunGit = (repoRoot: string, args: readonly string[]) => {
      gitInvocations.push([...args]);
      return createSixPathFixtureRunGit()(repoRoot, args);
    };

    const report =
      buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        buildSixPathFixtureReportOptions({
          runGit: trackingRunGit,
          statusOutput: sixPathStatusFixture,
          watchdogSnapshot: buildFactoryLinkageAlreadyMergedWatchdogSnapshot(),
        }),
      );

    expect(gitInvocations.length).toBeGreaterThan(0);
    for (const args of gitInvocations) {
      expect(isPlannerTerminalAuditReadOnlyGitArgs(args)).toBe(true);
    }

    expect(report.implementationLaneScope.readOnlyEvidenceDiscovery).toBe(true);
    expect(report.implementationLaneScope.scopeStatement).toBe(
      PLANNER_TERMINAL_AUDIT_IMPLEMENTATION_LANE_SCOPE_STATEMENT,
    );
    expect(report.preservationStatement).toBe(
      PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT,
    );
    expect(report.plannerRefillHandoffDecision.driftState).toBe(
      "terminal-audit-drift-remains-operator-hold",
    );
    expect(
      report.dirtyRootPathClassifications.map((entry) => entry.path),
    ).toEqual([...PLANNER_TERMINAL_AUDIT_DIRTY_ROOT_PATHS]);

    const formatted =
      formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(report);
    expect(formatted).toContain("- implementation-lane-scope");
    expect(formatted).toContain(
      `scope-statement=${PLANNER_TERMINAL_AUDIT_IMPLEMENTATION_LANE_SCOPE_STATEMENT}`,
    );
    expect(formatted).toContain(
      `preservation-statement=${PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT}`,
    );
  });

  test("implementation branch avoids forbidden page content and unallowlisted dirty root paths", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const diffResult = spawnSync(
      "git",
      ["diff", "--name-only", "origin/main...HEAD"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    expect(diffResult.status).toBe(0);

    const changedPaths = diffResult.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const allowlistedDirtyRootTouches = new Set<string>(
      PLANNER_TERMINAL_AUDIT_IMPLEMENTATION_BRANCH_DIRTY_ROOT_TOUCH_ALLOWLIST,
    );
    for (const dirtyPath of PLANNER_TERMINAL_AUDIT_DIRTY_ROOT_PATHS) {
      if (allowlistedDirtyRootTouches.has(dirtyPath)) {
        continue;
      }
      expect(changedPaths).not.toContain(dirtyPath);
    }

    for (const changedPath of changedPaths) {
      expect(isPlannerTerminalAuditForbiddenPageContentPath(changedPath)).toBe(
        false,
      );
      for (const prefix of PLANNER_TERMINAL_AUDIT_FORBIDDEN_PAGE_CONTENT_PATH_PREFIXES) {
        expect(changedPath.startsWith(prefix)).toBe(false);
      }
    }
  });
});
