import { describe, expect, test } from "bun:test";
import {
  buildPlannerRootReconciliationDriftHandoffReport,
  classifyDriftHandoffTargetPath,
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

  test("classifies clean paths with no-action-needed", () => {
    const record = classifyDriftHandoffTargetPath({
      activeLaneMatches: [],
      evidenceSources: [],
      gitStatus: {
        observedStatus: "clean",
        path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
        statusLine: null,
      },
      mergedLaneMatches: [],
      path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
    });

    expect(record.classification).toBe("clean");
    expect(record.nextSafeAction).toBe("no-action-needed");
  });

  test("classifies worktree-owned dirty paths as existing-lane-owned", () => {
    const record = classifyDriftHandoffTargetPath({
      activeLaneMatches: [],
      evidenceSources: [
        {
          availability: "available",
          kind: "worktree-drift",
          matchingTargetPaths: [
            "src/lib/factory/planner-root-checkout-reconciliation.ts",
          ],
        },
      ],
      gitStatus: {
        observedStatus: "dirty",
        path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
        statusLine:
          " M src/lib/factory/planner-root-checkout-reconciliation.ts",
      },
      mergedLaneMatches: [],
      path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
      worktreeDriftPath: {
        category: "shared-helper",
        changeKind: "modified",
        location: "root",
        ownership: {
          branchName: "planner-root-checkout-reconciliation",
          kind: "worktree-owned",
          laneName: "planner-root-checkout-reconciliation",
          reasonCode: "direct-worktree-match",
          reason:
            "Root drift matches dirty path ownership already visible in active lane planner-root-checkout-reconciliation.",
        },
        path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
        statusCode: " M",
        surface: "planner-root-checkout-reconciliation",
      },
    });

    expect(record.classification).toBe("existing-lane-owned");
    expect(record.nextSafeAction).toBe("wait-for-owning-lane");
    expect(record.classificationEvidence.join("\n")).toContain(
      "worktree-drift owner=worktree-owned:planner-root-checkout-reconciliation",
    );
  });

  test("classifies ownerless reconciliation drift as operator-cleanup-needed", () => {
    const record = classifyDriftHandoffTargetPath({
      activeLaneMatches: [],
      evidenceSources: [
        {
          availability: "available",
          kind: "root-checkout-reconciliation",
          matchingTargetPaths: [
            "src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
          ],
        },
      ],
      gitStatus: {
        observedStatus: "dirty",
        path: "src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
        statusLine:
          " D src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
      },
      mergedLaneMatches: [],
      path: "src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
      reconciliationReport: {
        changeKind: "deleted",
        classification: "ownerless-root-checkout-drift",
        comparisonTarget: "origin/main",
        evidence: "present-on-origin-main",
        headPresent: false,
        path: "src/tests/fixtures/planner-root-checkout-reconciliation/tokenizer-mismatch-dirty-status.txt",
        remoteMainPresent: true,
        statusCode: " D",
      },
    });

    expect(record.classification).toBe("operator-cleanup-needed");
    expect(record.nextSafeAction).toBe("request-operator-cleanup");
  });

  test("marks ambiguous ownership as unresolved", () => {
    const record = classifyDriftHandoffTargetPath({
      activeLaneMatches: ["lane-a", "lane-b"],
      evidenceSources: [],
      gitStatus: {
        observedStatus: "dirty",
        path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
        statusLine:
          " M src/lib/factory/planner-root-checkout-reconciliation.ts",
      },
      mergedLaneMatches: [],
      path: "src/lib/factory/planner-root-checkout-reconciliation.ts",
    });

    expect(record.classification).toBe("unresolved");
    expect(record.nextSafeAction).toBe("operator-verification-needed");
  });

  test("emits path classifications in formatted report output", () => {
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

    expect(report.pathClassifications).toHaveLength(8);
    const dirtyClassification = report.pathClassifications.find(
      (record) =>
        record.path ===
        "src/lib/factory/planner-root-checkout-reconciliation.ts",
    );
    expect(dirtyClassification?.classification).toBe("unresolved");
    expect(dirtyClassification?.nextSafeAction).toBe("keep-refill-blocked");

    const formatted = formatPlannerRootReconciliationDriftHandoffReport(report);
    expect(formatted).toContain("- path-classifications");
    expect(formatted).toContain(
      "path=src/lib/factory/planner-root-checkout-reconciliation.ts classification=unresolved",
    );
  });
});
