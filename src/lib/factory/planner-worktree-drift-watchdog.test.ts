import { describe, expect, test } from "bun:test";
import {
  buildPlannerWorktreeDriftSnapshot,
  formatPlannerWorktreeDriftReport,
  parsePlannerRelevantDirtyPaths,
  serializePlannerWorktreeDriftSnapshot,
} from "@/lib/factory/planner-worktree-drift-watchdog";

describe("parsePlannerRelevantDirtyPaths", () => {
  test("keeps planner-relevant dirty paths and filters workflow bookkeeping", () => {
    expect(
      parsePlannerRelevantDirtyPaths(
        [
          " M src/lib/factory/watchdog.ts",
          "?? prd.json",
          "?? .claude/tmp.log",
        ].join("\n"),
        "root",
      ),
    ).toEqual([
      {
        category: "shared-helper",
        changeKind: "modified",
        location: "root",
        path: "src/lib/factory/watchdog.ts",
        statusCode: " M",
        surface: "src/lib/factory",
      },
    ]);
  });
});

describe("buildPlannerWorktreeDriftSnapshot", () => {
  test("reports current root and active-worktree drift in one planner-facing snapshot", () => {
    const snapshot = buildPlannerWorktreeDriftSnapshot(
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        laneCount: 2,
        activeLaneCount: 1,
        failedLaneCount: 1,
        linkedLaneCount: 1,
        linkedWithGapsLaneCount: 1,
        issues: [],
        lanes: [
          {
            laneName: "alpha",
            queueState: "active",
            rawQueueState: "active",
            linkageStatus: "linked",
            worktreePath: ".claude/worktrees/alpha",
            branchName: "alpha",
            pullRequest: { number: 42 },
            pullRequestLookup: { status: "resolved" },
            missingLinkageReasons: [],
          },
          {
            laneName: "beta",
            queueState: "failed",
            rawQueueState: "failed",
            linkageStatus: "linked-with-gaps",
            pullRequest: null,
            pullRequestLookup: { status: "missing" },
            missingLinkageReasons: ["no linked worktree"],
          },
        ],
      },
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        repoRoot: "/repo",
        runGitStatus: (cwd) => {
          if (cwd === "/repo") {
            return [" M src/lib/factory/watchdog.ts", "?? progress.txt"].join(
              "\n",
            );
          }
          if (cwd === "/repo/.claude/worktrees/alpha") {
            return [
              " M docs/planner/notes.md",
              "A  src/tests/ci/planner-watchdog.test.ts",
            ].join("\n");
          }
          throw new Error(`unexpected cwd ${cwd}`);
        },
      },
    );

    expect(snapshot).toEqual({
      activeLaneCount: 1,
      evaluatedWorktreeCount: 1,
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      issues: [],
      root: {
        dirtyPathCount: 1,
        dirtyPaths: [
          {
            category: "shared-helper",
            changeKind: "modified",
            location: "root",
            path: "src/lib/factory/watchdog.ts",
            statusCode: " M",
            surface: "src/lib/factory",
          },
        ],
        repoRoot: "/repo",
      },
      totalDirtyPathCount: 3,
      worktrees: [
        {
          branchName: "alpha",
          dirtyPathCount: 2,
          dirtyPaths: [
            {
              category: "authored-content",
              changeKind: "modified",
              location: "worktree",
              path: "docs/planner/notes.md",
              statusCode: " M",
              surface: "docs/planner",
            },
            {
              category: "shared-test",
              changeKind: "added",
              location: "worktree",
              path: "src/tests/ci/planner-watchdog.test.ts",
              statusCode: "A ",
              surface: "src/tests/ci",
            },
          ],
          laneName: "alpha",
          linkageStatus: "linked",
          worktreePath: "/repo/.claude/worktrees/alpha",
        },
      ],
    });

    const report = formatPlannerWorktreeDriftReport(snapshot);
    expect(report).toContain("Planner Worktree Drift Watchdog");
    expect(report).toContain(
      "active-lanes=1 evaluated-worktrees=1 root-dirty-shared-paths=1 worktree-dirty-shared-paths=2 total-dirty-shared-paths=3",
    );
    expect(report).toContain("- location=root repo=/repo dirty-shared-paths=1");
    expect(report).toContain(
      "- location=worktree lane=alpha branch=alpha linkage=linked worktree=.claude/worktrees/alpha dirty-shared-paths=2",
    );
    expect(report).toContain(
      "path=src/tests/ci/planner-watchdog.test.ts status=A  change=added surface=src/tests/ci category=shared-test",
    );

    expect(JSON.parse(serializePlannerWorktreeDriftSnapshot(snapshot))).toEqual(
      snapshot,
    );
  });
});
