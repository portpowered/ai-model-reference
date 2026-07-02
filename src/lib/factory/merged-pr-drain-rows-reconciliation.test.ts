import { describe, expect, test } from "bun:test";
import {
  buildMergedPrDrainRowCompleteHandoff,
  buildMergedPrDrainRowConsumeHandoff,
  buildMergedPrDrainRowNoOpHandoff,
  buildMergedPrDrainRowsClassificationReport,
  buildMergedPrDrainRowsCompleteReport,
  buildMergedPrDrainRowsConsumeReport,
  buildMergedPrDrainRowsNoOpReport,
  buildMergedPrDrainRowQueueTransitionEvidence,
  buildMergedPrDrainRowsFinalVerificationReport,
  buildMergedPrDrainRowsReconciliationOutput,
  classifyMergedPrDrainRowOutcome,
  collectMergedPrDrainRowsContentSafetyEvidence,
  collectMergedPrDrainRowsEvidence,
  executeMergedPrDrainRowCompleteHandoff,
  executeMergedPrDrainRowConsumeHandoff,
  formatMergedPrDrainRowsClassificationReport,
  formatMergedPrDrainRowsCompleteReport,
  formatMergedPrDrainRowsConsumeReport,
  formatMergedPrDrainRowsEvidenceReport,
  formatMergedPrDrainRowsFinalVerificationReport,
  formatMergedPrDrainRowsNoOpReport,
  formatMergedPrDrainRowsReconciliationReport,
  MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME,
  MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE,
  MERGED_PR_DRAIN_ROW_CONSUME_OPERATION_NAME,
  MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID,
  serializeMergedPrDrainRowsClassificationReport,
  serializeMergedPrDrainRowsCompleteReport,
  serializeMergedPrDrainRowsConsumeReport,
  serializeMergedPrDrainRowsEvidenceReport,
  serializeMergedPrDrainRowsFinalVerificationReport,
  serializeMergedPrDrainRowsNoOpReport,
} from "@/lib/factory/merged-pr-drain-rows-reconciliation";

const SESSION_ID = MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;

function buildFixtureWorkList(): string {
  return JSON.stringify({
    results: [
      {
        name: "ltx-23-pr281-drain",
        workId: "batch-pr281-ltx-drain",
        workTypeName: "idea",
        state: { name: "init", type: "INITIAL" },
        traceId: "trace-pr281-batch",
      },
      {
        name: "ltx-23",
        workId: "work-task-17",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-ltx-23",
      },
      {
        name: "ltx-23",
        workId: "work-review-80",
        workTypeName: "review",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-ltx-23",
      },
      {
        name: "mamba-pr282-drain",
        workId: "batch-mamba-drain",
        workTypeName: "idea",
        state: { name: "init", type: "INITIAL" },
        traceId: "trace-mamba-batch",
      },
      {
        name: "MAMBA",
        workId: "work-task-44",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-mamba",
      },
      {
        name: "glossary-decomposition-pr284-conflict-refresh",
        workId: "batch-glossary-drain",
        workTypeName: "idea",
        state: { name: "init", type: "INITIAL" },
        traceId: "trace-glossary-batch",
      },
      {
        name: "glossary-decomposition",
        workId: "work-task-8",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-glossary",
      },
      {
        name: "bpe-page",
        workId: "work-task-68",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-bpe",
      },
    ],
  });
}

describe("collectMergedPrDrainRowsEvidence", () => {
  test("captures queue, PR, worktree, and merged-vs-queue truth for all four rows", () => {
    const report = collectMergedPrDrainRowsEvidence({
      generatedAtUtc: "2026-07-02T18:00:00.000Z",
      repoRoot: process.cwd(),
      remoteBaseRef: "origin/main",
      sourceSession: SESSION_ID,
      workListJsonText: buildFixtureWorkList(),
      worktreesDir: "/tmp/missing-worktrees",
      lookupPullRequestByNumber: (pullRequestNumber) => ({
        pullRequest: {
          number: pullRequestNumber,
          state: "MERGED",
          mergedAt: "2026-07-02T17:00:00Z",
          mergeCommitSha: `merge-${pullRequestNumber}`,
          headRefName: `branch-${pullRequestNumber}`,
          baseRefName: "main",
          url: `https://example.com/pull/${pullRequestNumber}`,
          title: `PR ${pullRequestNumber}`,
        },
      }),
      runCommand: (binary, args) => {
        if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "merge-base") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "rev-parse") {
          return {
            ok: true,
            stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (binary === "git" && args[0] === "status") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
      },
    });

    expect(report.sourceSession).toBe(SESSION_ID);
    expect(report.rows).toHaveLength(4);

    const ltxRow = report.rows.find((row) => row.definition.workItemName === "ltx-23");
    expect(ltxRow?.pullRequestTruth.state).toBe("MERGED");
    expect(ltxRow?.mergedVsQueueTruth.contentLaneQueueTruth).toBe(
      "content-lane-terminal-complete",
    );
    expect(ltxRow?.mergedVsQueueTruth.drainRowQueueTruth).toBe("drain-row-initial");
    expect(ltxRow?.mergedVsQueueTruth.mergedPullRequestTruth).toBe(
      "merged-into-origin-main",
    );
    expect(ltxRow?.mergedVsQueueTruth.distinctionNote).toContain(
      "queue-completion-truth-is-not-inferred-from-pr-status-alone",
    );

    const bpeRow = report.rows.find((row) => row.definition.workItemName === "bpe-page");
    expect(bpeRow?.mergedVsQueueTruth.drainRowQueueTruth).toBe("no-drain-row");
    expect(bpeRow?.mergedVsQueueTruth.contentLaneQueueTruth).toBe(
      "content-lane-terminal-complete",
    );
  });

  test("formats and serializes observable evidence fields", () => {
    const report = collectMergedPrDrainRowsEvidence({
      generatedAtUtc: "2026-07-02T18:00:00.000Z",
      repoRoot: process.cwd(),
      remoteBaseRef: "origin/main",
      sourceSession: SESSION_ID,
      workListJsonText: buildFixtureWorkList(),
      worktreesDir: "/tmp/missing-worktrees",
      lookupPullRequestByNumber: (pullRequestNumber) => ({
        pullRequest: {
          number: pullRequestNumber,
          state: "MERGED",
          mergedAt: "2026-07-02T17:00:00Z",
          mergeCommitSha: `merge-${pullRequestNumber}`,
          headRefName: `branch-${pullRequestNumber}`,
        },
      }),
      runCommand: (binary, args) => {
        if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "merge-base") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "rev-parse") {
          return {
            ok: true,
            stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (binary === "git" && args[0] === "status") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
      },
    });

    const formatted = formatMergedPrDrainRowsEvidenceReport(report);
    expect(formatted).toContain("Merged PR Drain Rows Reconciliation");
    expect(formatted).toContain(`session=${SESSION_ID}`);
    expect(formatted).toContain("work-item=ltx-23 pr=#281");
    expect(formatted).toContain("merged-vs-queue-truth");

    const serialized = JSON.parse(
      serializeMergedPrDrainRowsEvidenceReport(report),
    ) as {
      rows: Array<{ definition: { workItemName: string } }>;
    };
    expect(serialized.rows.map((row) => row.definition.workItemName)).toEqual([
      "ltx-23",
      "MAMBA",
      "glossary-decomposition",
      "bpe-page",
    ]);
  });
});

function buildClassificationFixtureReport() {
  return collectMergedPrDrainRowsEvidence({
    generatedAtUtc: "2026-07-02T18:00:00.000Z",
    repoRoot: process.cwd(),
    remoteBaseRef: "origin/main",
    sourceSession: SESSION_ID,
    workListJsonText: buildFixtureWorkList(),
    worktreesDir: "/tmp/missing-worktrees",
    lookupPullRequestByNumber: (pullRequestNumber) => ({
      pullRequest: {
        number: pullRequestNumber,
        state: "MERGED",
        mergedAt: "2026-07-02T17:00:00Z",
        mergeCommitSha: `merge-${pullRequestNumber}`,
        headRefName: `branch-${pullRequestNumber}`,
      },
    }),
    runCommand: (binary, args) => {
      if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
        return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
      }
      if (binary === "git" && args[0] === "merge-base") {
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      }
      if (binary === "git" && args[0] === "rev-parse") {
        return {
          ok: true,
          stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
          stderr: "",
          exitCode: 0,
        };
      }
      if (binary === "git" && args[0] === "status") {
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      }
      return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
    },
  });
}

describe("classifyMergedPrDrainRowOutcome", () => {
  test("classifies merged rows with stale init drain rows as consume", () => {
    const report = buildClassificationFixtureReport();
    const consumeRows = ["ltx-23", "MAMBA", "glossary-decomposition"];

    for (const workItemName of consumeRows) {
      const row = report.rows.find(
        (candidate) => candidate.definition.workItemName === workItemName,
      );
      expect(row).toBeDefined();
      const classification = classifyMergedPrDrainRowOutcome(row as NonNullable<typeof row>);
      expect(classification.outcome).toBe("consume");
      expect(classification.observedPrState).toContain("MERGED");
      expect(classification.observedQueueState).toContain("drain-row=drain-row-initial");
      expect(classification.evidenceSentence).toContain("terminal-complete");
    }
  });

  test("classifies rows without drain rows and terminal content lanes as no-op", () => {
    const report = buildClassificationFixtureReport();
    const bpeRow = report.rows.find(
      (row) => row.definition.workItemName === "bpe-page",
    );
    expect(bpeRow).toBeDefined();

    const classification = classifyMergedPrDrainRowOutcome(bpeRow as NonNullable<typeof bpeRow>);
    expect(classification.outcome).toBe("no-op");
    expect(classification.noOpReason).toBe("already-settled");
    expect(classification.observedQueueState).toContain("drain-row=no-drain-row");
  });

  test("classifies open PR truth as no-op with pr-not-merged reason", () => {
    const report = buildClassificationFixtureReport();
    const ltxRow = report.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.pullRequestTruth.state = "OPEN";
    ltxRow.pullRequestTruth.availability = "open";
    ltxRow.mergedVsQueueTruth.mergedPullRequestTruth = "not-merged";

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    expect(classification.outcome).toBe("no-op");
    expect(classification.noOpReason).toBe("pr-not-merged");
  });

  test("classifies non-terminal drain rows with finished lanes as complete", () => {
    const report = buildClassificationFixtureReport();
    const ltxRow = report.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.mergedVsQueueTruth.drainRowQueueTruth = "non-terminal";
    ltxRow.drainRowTokens = [
      {
        availability: "present",
        workItemName: "ltx-23-pr281-drain",
        workTypeName: "idea",
        stateName: "in-review",
        stateType: "PROCESSING",
      },
    ];

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    expect(classification.outcome).toBe("complete");
    expect(classification.evidenceSentence).toContain("terminal completion transition");
  });

  test("builds and formats a classification report for all four rows", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);

    expect(classificationReport.rows).toHaveLength(4);
    expect(
      classificationReport.rows.map((row) => ({
        workItemName: row.row.definition.workItemName,
        outcome: row.outcome,
      })),
    ).toEqual([
      { workItemName: "ltx-23", outcome: "consume" },
      { workItemName: "MAMBA", outcome: "consume" },
      { workItemName: "glossary-decomposition", outcome: "consume" },
      { workItemName: "bpe-page", outcome: "no-op" },
    ]);

    const formatted = formatMergedPrDrainRowsClassificationReport(classificationReport);
    expect(formatted).toContain("Merged PR Drain Rows Reconciliation — Classification");
    expect(formatted).toContain("work-item=ltx-23 pr=#281 outcome=consume");
    expect(formatted).toContain("work-item=bpe-page pr=#286 outcome=no-op");

    const serialized = JSON.parse(
      serializeMergedPrDrainRowsClassificationReport(classificationReport),
    ) as {
      rows: Array<{ outcome: string }>;
    };
    expect(serialized.rows.map((row) => row.outcome)).toEqual([
      "consume",
      "consume",
      "consume",
      "no-op",
    ]);
  });
});

describe("buildMergedPrDrainRowConsumeHandoff", () => {
  test("builds consume handoffs for merged drain rows with manual move commands", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);
    const consumeReport = buildMergedPrDrainRowsConsumeReport(classificationReport);

    expect(consumeReport.rows).toHaveLength(3);
    expect(consumeReport.rows.map((row) => row.drainWorkItemName)).toEqual([
      "ltx-23-pr281-drain",
      "mamba-pr282-drain",
      "glossary-decomposition-pr284-conflict-refresh",
    ]);

    const ltxHandoff = consumeReport.rows[0];
    expect(ltxHandoff.consumeOperation).toBe(
      MERGED_PR_DRAIN_ROW_CONSUME_OPERATION_NAME,
    );
    expect(ltxHandoff.consumeCommand).toBe(
      `you work move batch-pr281-ltx-drain complete --session ${SESSION_ID}`,
    );
    expect(ltxHandoff.mergedIntoOriginMain).toBe(true);
    expect(ltxHandoff.noUnfinishedImplementationOrReview).toBe(true);
    expect(ltxHandoff.executionStatus).toBe("not-attempted");
    expect(ltxHandoff.evidenceSentence).toContain("merged into current origin/main");
  });

  test("marks already-terminal drain rows as already-complete without a pending move", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const ltxRow = evidenceReport.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;
    ltxRow.mergedVsQueueTruth.drainRowQueueTruth = "content-lane-terminal-complete";
    ltxRow.drainRowTokens = [
      {
        availability: "present",
        workItemName: "ltx-23-pr281-drain",
        workTypeName: "idea",
        stateName: "complete",
        stateType: "TERMINAL",
        workId: "batch-pr281-ltx-drain",
      },
    ];

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    expect(classification.outcome).toBe("no-op");

    const consumeHandoff = buildMergedPrDrainRowConsumeHandoff(classification);
    expect(consumeHandoff).toBeNull();
  });

  test("executes consume moves and records post-action terminal state", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);
    const consumeReport = buildMergedPrDrainRowsConsumeReport(classificationReport);
    const ltxHandoff = consumeReport.rows[0];

    const executed = executeMergedPrDrainRowConsumeHandoff(ltxHandoff, {
      runCommand: (binary, args) => {
        expect(binary).toBe("you");
        expect(args).toEqual([
          "work",
          "move",
          "batch-pr281-ltx-drain",
          "complete",
          "--session",
          SESSION_ID,
        ]);
        return {
          ok: true,
          stdout: JSON.stringify({
            workId: "batch-pr281-ltx-drain",
            previousState: "init",
            newState: "complete",
          }),
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(executed.executionStatus).toBe("executed");
    expect(executed.drainRowStateAfter).toBe("complete/terminal");
  });

  test("formats and serializes consume handoff reports", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);
    const consumeReport = buildMergedPrDrainRowsConsumeReport(classificationReport);

    const formatted = formatMergedPrDrainRowsConsumeReport(consumeReport);
    expect(formatted).toContain("Merged PR Drain Rows Reconciliation — Consume Handoff");
    expect(formatted).toContain("consume-operation=manual-drain-row-move-to-complete");
    expect(formatted).toContain("drain-row=ltx-23-pr281-drain");
    expect(formatted).toContain("execution-status=not-attempted");

    const serialized = JSON.parse(
      serializeMergedPrDrainRowsConsumeReport(consumeReport),
    ) as {
      rows: Array<{ drainWorkItemName: string }>;
    };
    expect(serialized.rows.map((row) => row.drainWorkItemName)).toEqual([
      "ltx-23-pr281-drain",
      "mamba-pr282-drain",
      "glossary-decomposition-pr284-conflict-refresh",
    ]);
  });
});

describe("buildMergedPrDrainRowCompleteHandoff", () => {
  test("builds complete handoffs with source state, target state, and transition validity", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const ltxRow = evidenceReport.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.mergedVsQueueTruth.drainRowQueueTruth = "non-terminal";
    ltxRow.drainRowTokens = [
      {
        availability: "present",
        workItemName: "ltx-23-pr281-drain",
        workTypeName: "idea",
        stateName: "in-review",
        stateType: "PROCESSING",
        workId: "batch-pr281-ltx-drain",
      },
    ];
    ltxRow.worktreeMetadata = {
      availability: "present",
      branchName: "ltx-23",
      pullRequestNumber: 281,
      worktreePath: "/tmp/ltx-23",
    };

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    expect(classification.outcome).toBe("complete");

    const completeReport = buildMergedPrDrainRowsCompleteReport(
      buildMergedPrDrainRowsClassificationReport(evidenceReport),
    );
    expect(completeReport.rows).toHaveLength(1);

    const handoff = completeReport.rows[0];
    expect(handoff.completeOperation).toBe(
      MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME,
    );
    expect(handoff.sourceState).toBe("in-review/processing");
    expect(handoff.targetTerminalState).toBe(MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE);
    expect(handoff.completeCommand).toBe(
      `you work move batch-pr281-ltx-drain complete --session ${SESSION_ID}`,
    );
    expect(handoff.mergedIntoOriginMain).toBe(true);
    expect(handoff.implementationAndReviewFinished).toBe(true);
    expect(handoff.transitionValidityReason).toContain("merged into current origin/main");
    expect(handoff.evidenceSentence).toContain("in-review/processing -> complete/terminal");
    expect(handoff.executionStatus).toBe("not-attempted");
  });

  test("reclassifies complete rows with unfinished implementation as no-op", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const ltxRow = evidenceReport.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.mergedVsQueueTruth.drainRowQueueTruth = "non-terminal";
    ltxRow.drainRowTokens = [
      {
        availability: "present",
        workItemName: "ltx-23-pr281-drain",
        workTypeName: "idea",
        stateName: "in-review",
        stateType: "PROCESSING",
        workId: "batch-pr281-ltx-drain",
      },
    ];
    ltxRow.contentLaneTokens.push({
      availability: "present",
      workItemName: "ltx-23",
      workTypeName: "task",
      stateName: "in-progress",
      stateType: "PROCESSING",
    });

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    expect(classification.outcome).toBe("no-op");
    expect(classification.noOpReason).toBe("unfinished-implementation");

    const handoff = buildMergedPrDrainRowCompleteHandoff(classification);
    expect(handoff).toBeNull();
  });

  test("reclassifies complete handoff when blockers appear after classification", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const ltxRow = evidenceReport.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.mergedVsQueueTruth.drainRowQueueTruth = "non-terminal";
    ltxRow.drainRowTokens = [
      {
        availability: "present",
        workItemName: "ltx-23-pr281-drain",
        workTypeName: "idea",
        stateName: "in-review",
        stateType: "PROCESSING",
        workId: "batch-pr281-ltx-drain",
      },
    ];
    ltxRow.worktreeMetadata = {
      availability: "present",
      branchName: "ltx-23",
      pullRequestNumber: 281,
      worktreePath: "/tmp/ltx-23",
    };

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    classification.row.contentLaneTokens.push({
      availability: "present",
      workItemName: "ltx-23",
      workTypeName: "review",
      stateName: "in-progress",
      stateType: "PROCESSING",
    });

    const handoff = buildMergedPrDrainRowCompleteHandoff(classification);
    expect(handoff).not.toBeNull();
    expect(handoff?.executionStatus).toBe("reclassified-no-op");
    expect(handoff?.reclassifiedAsNoOp?.noOpReason).toBe("unfinished-review");
  });

  test("executes complete moves and records post-action terminal state", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const ltxRow = evidenceReport.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.mergedVsQueueTruth.drainRowQueueTruth = "non-terminal";
    ltxRow.drainRowTokens = [
      {
        availability: "present",
        workItemName: "ltx-23-pr281-drain",
        workTypeName: "idea",
        stateName: "in-review",
        stateType: "PROCESSING",
        workId: "batch-pr281-ltx-drain",
      },
    ];
    ltxRow.worktreeMetadata = {
      availability: "present",
      branchName: "ltx-23",
      pullRequestNumber: 281,
      worktreePath: "/tmp/ltx-23",
    };

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    const handoff = buildMergedPrDrainRowCompleteHandoff(classification);
    expect(handoff).not.toBeNull();

    const executed = executeMergedPrDrainRowCompleteHandoff(handoff as NonNullable<typeof handoff>, {
      runCommand: (binary, args) => {
        expect(binary).toBe("you");
        expect(args).toEqual([
          "work",
          "move",
          "batch-pr281-ltx-drain",
          "complete",
          "--session",
          SESSION_ID,
        ]);
        return {
          ok: true,
          stdout: JSON.stringify({
            workId: "batch-pr281-ltx-drain",
            previousState: "in-review",
            newState: "complete",
          }),
          stderr: "",
          exitCode: 0,
        };
      },
    });

    expect(executed.executionStatus).toBe("executed");
    expect(executed.drainRowStateAfter).toBe(MERGED_PR_DRAIN_ROW_COMPLETE_TARGET_STATE);
  });

  test("formats and serializes complete handoff reports with empty live rows", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const completeReport = buildMergedPrDrainRowsCompleteReport(
      buildMergedPrDrainRowsClassificationReport(evidenceReport),
    );

    expect(completeReport.rows).toHaveLength(0);

    const formatted = formatMergedPrDrainRowsCompleteReport(completeReport);
    expect(formatted).toContain("Merged PR Drain Rows Reconciliation — Complete Handoff");
    expect(formatted).toContain(
      `complete-operation=${MERGED_PR_DRAIN_ROW_COMPLETE_OPERATION_NAME}`,
    );
    expect(formatted).toContain("Complete rows");
    expect(formatted).toContain("- none");

    const serialized = JSON.parse(
      serializeMergedPrDrainRowsCompleteReport(completeReport),
    ) as {
      rows: unknown[];
    };
    expect(serialized.rows).toHaveLength(0);
  });
});

function buildPostConsumeFixtureWorkList(): string {
  return JSON.stringify({
    results: [
      {
        name: "ltx-23-pr281-drain",
        workId: "batch-pr281-ltx-drain",
        workTypeName: "idea",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-pr281-batch",
      },
      {
        name: "ltx-23",
        workId: "work-task-17",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-ltx-23",
      },
      {
        name: "mamba-pr282-drain",
        workId: "batch-mamba-drain",
        workTypeName: "idea",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-mamba-batch",
      },
      {
        name: "MAMBA",
        workId: "work-task-44",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-mamba",
      },
      {
        name: "glossary-decomposition-pr284-conflict-refresh",
        workId: "batch-glossary-drain",
        workTypeName: "idea",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-glossary-batch",
      },
      {
        name: "glossary-decomposition",
        workId: "work-task-8",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-glossary",
      },
      {
        name: "bpe-page",
        workId: "work-task-68",
        workTypeName: "task",
        state: { name: "complete", type: "TERMINAL" },
        traceId: "trace-bpe",
      },
    ],
  });
}

function buildPostConsumeFixtureReport() {
  return collectMergedPrDrainRowsEvidence({
    generatedAtUtc: "2026-07-02T19:31:00.000Z",
    repoRoot: process.cwd(),
    remoteBaseRef: "origin/main",
    sourceSession: SESSION_ID,
    workListJsonText: buildPostConsumeFixtureWorkList(),
    worktreesDir: "/tmp/missing-worktrees",
    lookupPullRequestByNumber: (pullRequestNumber) => ({
      pullRequest: {
        number: pullRequestNumber,
        state: "MERGED",
        mergedAt: "2026-07-02T17:00:00Z",
        mergeCommitSha: `merge-${pullRequestNumber}`,
        headRefName: `branch-${pullRequestNumber}`,
      },
    }),
    runCommand: (binary, args) => {
      if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
        return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
      }
      if (binary === "git" && args[0] === "merge-base") {
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      }
      if (binary === "git" && args[0] === "rev-parse") {
        return {
          ok: true,
          stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
          stderr: "",
          exitCode: 0,
        };
      }
      if (binary === "git" && args[0] === "status") {
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      }
      return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
    },
  });
}

describe("buildMergedPrDrainRowNoOpHandoff", () => {
  test("builds already-settled no-op handoff without queue mutation", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);
    const bpeClassification = classificationReport.rows.find(
      (row) => row.row.definition.workItemName === "bpe-page",
    );
    expect(bpeClassification).toBeDefined();

    const handoff = buildMergedPrDrainRowNoOpHandoff(
      bpeClassification as NonNullable<typeof bpeClassification>,
    );
    expect(handoff).not.toBeNull();
    expect(handoff?.noOpReason).toBe("already-settled");
    expect(handoff?.rowLeftUntouched).toBe(true);
    expect(handoff?.nextSafeOwnerAction).toBeUndefined();
    expect(handoff?.missingEvidence).toBeUndefined();
    expect(handoff?.evidenceSentence).toContain("No dedicated drain row");
  });

  test("builds already-terminal no-op handoff for post-consume drain rows", () => {
    const evidenceReport = buildPostConsumeFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);

    expect(classificationReport.rows.every((row) => row.outcome === "no-op")).toBe(
      true,
    );

    const ltxHandoff = buildMergedPrDrainRowNoOpHandoff(classificationReport.rows[0]);
    expect(ltxHandoff?.noOpReason).toBe("already-terminal");
    expect(ltxHandoff?.rowLeftUntouched).toBe(true);
    expect(ltxHandoff?.observedQueueState).toContain(
      "drain-row=content-lane-terminal-complete",
    );
  });

  test("states next safe owner action for unfinished implementation", () => {
    const report = buildClassificationFixtureReport();
    const ltxRow = report.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.contentLaneTokens = [
      {
        availability: "present",
        workItemName: "ltx-23",
        workTypeName: "task",
        stateName: "in-progress",
        stateType: "PROCESSING",
      },
    ];
    ltxRow.mergedVsQueueTruth.contentLaneQueueTruth = "non-terminal";

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    expect(classification.noOpReason).toBe("unfinished-implementation");

    const handoff = buildMergedPrDrainRowNoOpHandoff(classification);
    expect(handoff?.nextSafeOwnerAction).toContain("implementation tokens");
    expect(handoff?.missingEvidence).toBeUndefined();
    expect(handoff?.rowLeftUntouched).toBe(true);
  });

  test("states missing evidence for inaccessible PR truth", () => {
    const report = buildClassificationFixtureReport();
    const ltxRow = report.rows.find(
      (row) => row.definition.workItemName === "ltx-23",
    ) as NonNullable<ReturnType<typeof buildClassificationFixtureReport>["rows"][number]>;

    ltxRow.pullRequestTruth.availability = "unavailable";
    ltxRow.mergedVsQueueTruth.mergedPullRequestTruth = "unavailable";

    const classification = classifyMergedPrDrainRowOutcome(ltxRow);
    const handoff = buildMergedPrDrainRowNoOpHandoff(classification);
    expect(handoff?.noOpReason).toBe("inaccessible-pr-truth");
    expect(handoff?.missingEvidence).toContain("GitHub PR state");
    expect(handoff?.nextSafeOwnerAction).toBeUndefined();
  });

  test("builds and formats no-op report for post-consume live state", () => {
    const evidenceReport = buildPostConsumeFixtureReport();
    const noOpReport = buildMergedPrDrainRowsNoOpReport(
      buildMergedPrDrainRowsClassificationReport(evidenceReport),
    );

    expect(noOpReport.rows).toHaveLength(4);
    expect(noOpReport.rows.map((row) => row.noOpReason)).toEqual([
      "already-terminal",
      "already-terminal",
      "already-terminal",
      "already-settled",
    ]);

    const formatted = formatMergedPrDrainRowsNoOpReport(noOpReport);
    expect(formatted).toContain("Merged PR Drain Rows Reconciliation — No-Op Handoff");
    expect(formatted).toContain("work-item=ltx-23 pr=#281");
    expect(formatted).toContain("no-op-reason=already-terminal");
    expect(formatted).toContain("row-left-untouched=true");
    expect(formatted).toContain("work-item=bpe-page pr=#286");
    expect(formatted).toContain("no-op-reason=already-settled");

    const serialized = JSON.parse(
      serializeMergedPrDrainRowsNoOpReport(noOpReport),
    ) as { rows: Array<{ rowLeftUntouched: boolean }> };
    expect(serialized.rows.every((row) => row.rowLeftUntouched)).toBe(true);
  });

  test("includes no-op report in unified reconciliation output", () => {
    const evidenceReport = buildPostConsumeFixtureReport();
    const output = buildMergedPrDrainRowsReconciliationOutput(evidenceReport);

    expect(output.noOpReport.rows).toHaveLength(4);
    expect(output.consumeReport.rows).toHaveLength(0);
    expect(output.completeReport.rows).toHaveLength(0);

    const formatted = formatMergedPrDrainRowsReconciliationReport(evidenceReport, {
      consumeReport: output.consumeReport,
      completeReport: output.completeReport,
      noOpReport: output.noOpReport,
    });
    expect(formatted).toContain("No-Op Handoff");
    expect(formatted).toContain("no-op-reason=already-terminal");
  });
});

describe("buildMergedPrDrainRowsFinalVerificationReport", () => {
  test("records post-consume untouched rows and content safety for live state", () => {
    const evidenceReport = buildPostConsumeFixtureReport();
    const output = buildMergedPrDrainRowsReconciliationOutput(evidenceReport, {
      runCommand: (binary, args) => {
        if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "rev-parse") {
          return {
            ok: true,
            stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (binary === "git" && args[0] === "status") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
      },
    });

    const report = output.finalVerificationReport;
    expect(report.preExistingDirtyStateUntouched).toBe(true);
    expect(report.queueTransitionOccurred).toBe(false);
    expect(report.queueTransitions).toHaveLength(4);
    expect(
      report.queueTransitions.every(
        (transition) => transition.transitionKind === "left-untouched",
      ),
    ).toBe(true);
    expect(report.contentSafety.pageContentUntouched).toBe(true);
    expect(report.contentSafety.registryContentUntouched).toBe(true);
    expect(report.contentSafety.generatedContentUntouched).toBe(true);
    expect(report.contentSafety.unrelatedWorktreeFilesUntouched).toBe(true);
    expect(report.verificationCommands.length).toBeGreaterThan(0);

    const formatted = formatMergedPrDrainRowsFinalVerificationReport(report);
    expect(formatted).toContain("Merged PR Drain Rows Reconciliation — Final Verification");
    expect(formatted).toContain("pre-existing-dirty-state-untouched=true");
    expect(formatted).toContain("queue-transition-occurred=false");
    expect(formatted).toContain("transition=left-untouched");
    expect(formatted).toContain("untouched-reason=already-terminal");

    const serialized = JSON.parse(
      serializeMergedPrDrainRowsFinalVerificationReport(report),
    ) as { queueTransitions: Array<{ transitionKind: string }> };
    expect(serialized.queueTransitions.map((row) => row.transitionKind)).toEqual([
      "left-untouched",
      "left-untouched",
      "left-untouched",
      "left-untouched",
    ]);
  });

  test("records executed consume transitions with before and after row state", () => {
    const evidenceReport = buildClassificationFixtureReport();
    const classificationReport =
      buildMergedPrDrainRowsClassificationReport(evidenceReport);
    const consumeReport = buildMergedPrDrainRowsConsumeReport(classificationReport);
    const executedConsumeReport = {
      classificationReport,
      rows: consumeReport.rows.map((handoff, index) =>
        index === 0
          ? {
              ...handoff,
              drainRowStateAfter: "complete/terminal",
              executionStatus: "executed" as const,
            }
          : handoff,
      ),
    };
    const output = {
      evidenceReport,
      classificationReport,
      consumeReport: executedConsumeReport,
      completeReport: buildMergedPrDrainRowsCompleteReport(classificationReport),
      noOpReport: buildMergedPrDrainRowsNoOpReport(classificationReport),
    };

    const transitions = buildMergedPrDrainRowQueueTransitionEvidence(output);
    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toMatchObject({
      workItemName: "ltx-23",
      transitionKind: "consume-executed",
      rowStateBefore: "init/initial",
      rowStateAfter: "complete/terminal",
    });
    expect(transitions[1]).toMatchObject({
      workItemName: "bpe-page",
      transitionKind: "left-untouched",
      untouchedReason: "already-settled",
    });

    const report = buildMergedPrDrainRowsFinalVerificationReport(output, {
      generatedAtUtc: "2026-07-02T19:40:00.000Z",
      runCommand: (binary, args) => {
        if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "rev-parse") {
          return {
            ok: true,
            stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (binary === "git" && args[0] === "status") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
      },
    });
    expect(report.queueTransitionOccurred).toBe(true);
    expect(report.queueTransitions[0]?.transitionKind).toBe("consume-executed");
  });

  test("flags content dirty paths when protected surfaces change", () => {
    const safety = collectMergedPrDrainRowsContentSafetyEvidence({
      evidenceReport: {
        generatedAtUtc: "2026-07-02T19:40:00.000Z",
        sourceSession: SESSION_ID,
        rootCheckout: {
          remoteBaseRef: "origin/main",
          rootCheckoutDirtyPathCount: 1,
          rootRepoPath: "/tmp/root-repo",
        },
        rows: [],
      },
      repoRoot: "/tmp/root-repo",
      runCommand: (binary, args, cwd) => {
        if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "status" && cwd === "/tmp/root-repo") {
          return {
            ok: true,
            stdout: " M src/content/docs/modules/bpe.mdx\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (binary === "git" && args[0] === "rev-parse") {
          return {
            ok: true,
            stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
            stderr: "",
            exitCode: 0,
          };
        }
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(safety.pageContentUntouched).toBe(false);
    expect(safety.observedContentDirtyPaths).toContain(
      "src/content/docs/modules/bpe.mdx",
    );
    expect(safety.evidenceSentence).toContain("page content dirty paths observed");
  });

  test("includes final verification in unified reconciliation output", () => {
    const evidenceReport = buildPostConsumeFixtureReport();
    const output = buildMergedPrDrainRowsReconciliationOutput(evidenceReport, {
      runCommand: (binary, args) => {
        if (binary === "git" && args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { ok: true, stdout: ".git\n", stderr: "", exitCode: 0 };
        }
        if (binary === "git" && args[0] === "rev-parse") {
          return {
            ok: true,
            stdout: "209d1bd8ced0cced5fd99992fe50f23296d126e8\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (binary === "git" && args[0] === "status") {
          return { ok: true, stdout: "", stderr: "", exitCode: 0 };
        }
        return { ok: false, stdout: "", stderr: "unsupported", exitCode: 1 };
      },
    });

    expect(output.finalVerificationReport.queueTransitions).toHaveLength(4);

    const formatted = formatMergedPrDrainRowsReconciliationReport(evidenceReport, {
      consumeReport: output.consumeReport,
      completeReport: output.completeReport,
      finalVerificationReport: output.finalVerificationReport,
      noOpReport: output.noOpReport,
    });
    expect(formatted).toContain("Final Verification");
    expect(formatted).toContain("content-safety page-content-untouched=true");
  });
});
