import { describe, expect, test } from "bun:test";
import {
  buildPlannerRootReconciliationDriftHandoffReport,
  formatPlannerRootReconciliationDriftHandoffReport,
  PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_HEADER,
  PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_REPORTED_AT_UTC,
  PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS,
  parseScopedGitStatusForTargetPaths,
} from "./planner-root-reconciliation-drift-handoff";

describe("planner root reconciliation drift handoff", () => {
  test("parses scoped git status for all eight target paths", () => {
    const scopedStatus = [
      "## main...origin/main",
      " M docs/internal/processes/factory-linkage-relevant-files.md",
      " M scripts/report-planner-root-checkout-reconciliation.ts",
      " M src/lib/factory/planner-root-checkout-reconciliation.ts",
    ].join("\n");

    const parsed = parseScopedGitStatusForTargetPaths(scopedStatus);

    expect(parsed).toHaveLength(
      PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS.length,
    );
    expect(parsed.map((entry) => entry.path)).toEqual([
      ...PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_TARGET_PATHS,
    ]);
    expect(
      parsed.filter((entry) => entry.observedStatus === "dirty"),
    ).toHaveLength(3);
    expect(
      parsed.find(
        (entry) =>
          entry.path ===
          "src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
      )?.observedStatus,
    ).toBe("clean");
  });

  test("records reported drift timestamp and unavailable evidence sources without inputs", () => {
    const report = buildPlannerRootReconciliationDriftHandoffReport({
      evidenceCapturedAtUtc: "2026-07-02T05:00:00.000Z",
      repoRoot: "/repo",
      runGit: (_repoRoot, args) => {
        if (args[0] === "status" && args.includes("--branch")) {
          return {
            status: 0,
            stdout: [
              "## main...origin/main",
              " M src/lib/factory/planner-root-checkout-reconciliation.ts",
            ].join("\n"),
            stderr: "",
          };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
      runGitStatus: () =>
        " M src/lib/factory/planner-root-checkout-reconciliation.ts\n",
      skipActivePrLinkage: true,
      skipMergedLaneMetadata: true,
      skipWorktreeDrift: true,
    });

    expect(report.reportedDriftAtUtc).toBe(
      PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_REPORTED_AT_UTC,
    );
    expect(report.evidenceCapturedAtUtc).toBe("2026-07-02T05:00:00.000Z");
    expect(report.targetPathGitStatus).toHaveLength(8);

    const unavailableSources = report.evidenceSources.filter(
      (source) => source.availability === "unavailable",
    );
    expect(unavailableSources.map((source) => source.kind)).toEqual([
      "worktree-drift",
      "active-pr-linkage",
      "merged-lane-metadata",
    ]);

    const formatted = formatPlannerRootReconciliationDriftHandoffReport(report);
    expect(formatted).toContain(
      PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_HEADER,
    );
    expect(formatted).toContain(
      `reported-drift-at-utc=${PLANNER_ROOT_RECONCILIATION_DRIFT_HANDOFF_REPORTED_AT_UTC}`,
    );
    expect(formatted).toContain(
      "path=src/lib/factory/planner-root-checkout-reconciliation.ts observed=dirty",
    );
    expect(formatted).toContain(
      "source=worktree-drift availability=unavailable",
    );
    expect(formatted).toContain("unavailable-reason=skipped-by-request");
  });

  test("marks worktree drift unavailable when discovery inputs are missing", () => {
    const report = buildPlannerRootReconciliationDriftHandoffReport({
      repoRoot: "/repo",
      runGit: (_repoRoot, args) => {
        if (args[0] === "status" && args.includes("--branch")) {
          return { status: 0, stdout: "## main...origin/main\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
      runGitStatus: () => "",
      skipActivePrLinkage: true,
      skipMergedLaneMetadata: true,
    });

    const worktreeSource = report.evidenceSources.find(
      (source) => source.kind === "worktree-drift",
    );
    expect(worktreeSource?.availability).toBe("unavailable");
    expect(worktreeSource?.unavailableReason).toBe(
      "missing queue/worktree discovery inputs",
    );
  });
});
