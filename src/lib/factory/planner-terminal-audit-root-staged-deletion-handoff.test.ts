import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
  formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
  PLANNER_TERMINAL_AUDIT_FACTORY_LINKAGE_PATH,
  PLANNER_TERMINAL_AUDIT_NO_MUTATION_STATEMENT,
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
});
