import { describe, expect, test } from "bun:test";
import {
  buildMergedPrDrainRowsClassificationReport,
  classifyMergedPrDrainRowOutcome,
  collectMergedPrDrainRowsEvidence,
  formatMergedPrDrainRowsClassificationReport,
  formatMergedPrDrainRowsEvidenceReport,
  MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID,
  serializeMergedPrDrainRowsClassificationReport,
  serializeMergedPrDrainRowsEvidenceReport,
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
