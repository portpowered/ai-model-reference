import { describe, expect, test } from "bun:test";
import {
  discoverMergedLaneEvidence,
  formatMergedLaneEvidenceSummary,
  isBranchMergedIntoBase,
  parseTerminalCompleteWorkItems,
  resolveMergeCommitSha,
} from "@/lib/factory/planner-merged-lane-evidence";

describe("parseTerminalCompleteWorkItems", () => {
  test("keeps terminal complete work items from queue evidence", () => {
    expect(
      parseTerminalCompleteWorkItems(
        JSON.stringify({
          results: [
            {
              name: "cross-attention-module-page",
              sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
              workTypeName: "task",
              state: { name: "complete", type: "TERMINAL" },
            },
            {
              name: "tokens-per-second-serving-metric-page",
              state: { name: "in-review", type: "PROCESSING" },
            },
          ],
        }),
      ),
    ).toEqual([
      {
        workItemName: "cross-attention-module-page",
        rawState: "complete",
        sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
        workTypeName: "task",
      },
    ]);
  });
});

describe("discoverMergedLaneEvidence", () => {
  test("returns explicit merged lane evidence for classifier fixtures", () => {
    const evidence = discoverMergedLaneEvidence({
      repoRoot: "/repo",
      mergedLaneEvidence: [
        {
          laneName: "cross-attention-module-page",
          branchName: "cross-attention-module-page",
          mergeEvidence: {
            pullRequestNumber: 182,
            mergeCommitSha: "f2343089",
          },
        },
      ],
    });

    expect(evidence).toEqual([
      {
        laneName: "cross-attention-module-page",
        branchName: "cross-attention-module-page",
        mergeEvidence: {
          pullRequestNumber: 182,
          mergeCommitSha: "f2343089",
        },
      },
    ]);
  });
});

describe("formatMergedLaneEvidenceSummary", () => {
  test("includes reviewer-visible merge identifiers", () => {
    expect(
      formatMergedLaneEvidenceSummary({
        pullRequestNumber: 182,
        mergeCommitSha: "f2343089abc1234567890abcdef1234567890abcd",
        terminalState: "complete/terminal",
        sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
      }),
    ).toBe(
      "PR #182, merge f234308, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca",
    );
  });
});

describe("git merge helpers", () => {
  test("treats successful merge-base checks as merged branches", () => {
    expect(
      isBranchMergedIntoBase(
        "cross-attention-module-page",
        "main",
        "/repo",
        () => ({
          ok: true,
          exitCode: 0,
          stdout: "",
          stderr: "",
        }),
      ),
    ).toBe(true);
  });

  test("resolves merge commit sha from PR grep evidence", () => {
    expect(
      resolveMergeCommitSha({
        baseBranchName: "main",
        pullRequestNumber: 182,
        repoRoot: "/repo",
        runCommand: (_binary, args) => ({
          ok: true,
          exitCode: 0,
          stdout: args.includes("--grep=#182")
            ? "f2343089abc1234567890abcdef1234567890abcd\n"
            : "",
          stderr: "",
        }),
      }),
    ).toBe("f2343089abc1234567890abcdef1234567890abcd");
  });
});
