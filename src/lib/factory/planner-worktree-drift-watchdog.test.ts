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
        ownership: {
          kind: "unowned",
          reasonCode: "not-attributed-yet",
          reason: "Ownership has not been attributed yet.",
        },
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
      risks: [
        {
          category: "shared-helper",
          evidenceSummary:
            "Root dirty path src/lib/factory/watchdog.ts has no obvious active owner.",
          kind: "root-drift-without-obvious-owner",
          laneNames: [],
          nextAction: "investigate",
          path: "src/lib/factory/watchdog.ts",
          surface: "src/lib/factory",
        },
      ],
      root: {
        dirtyPathCount: 1,
        dirtyPaths: [
          {
            category: "shared-helper",
            changeKind: "modified",
            location: "root",
            ownership: {
              kind: "root-owned",
              reasonCode: "root-unmatched",
              reason:
                "No active lane currently matches this dirty path or shared surface, so the drift remains rooted in the planner checkout.",
            },
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
              ownership: {
                branchName: "alpha",
                kind: "worktree-owned",
                laneName: "alpha",
                linkageStatus: "linked",
                reasonCode: "direct-worktree-match",
                reason:
                  "Dirty path was observed directly in active lane alpha.",
                worktreePath: ".claude/worktrees/alpha",
              },
              path: "docs/planner/notes.md",
              statusCode: " M",
              surface: "docs/planner",
            },
            {
              category: "shared-test",
              changeKind: "added",
              location: "worktree",
              ownership: {
                branchName: "alpha",
                kind: "worktree-owned",
                laneName: "alpha",
                linkageStatus: "linked",
                reasonCode: "direct-worktree-match",
                reason:
                  "Dirty path was observed directly in active lane alpha.",
                worktreePath: ".claude/worktrees/alpha",
              },
              path: "src/tests/ci/planner-watchdog.test.ts",
              statusCode: "A ",
              surface: "src/tests/ci",
            },
          ],
          laneName: "alpha",
          linkageStatus: "linked",
          nextAction: "wait",
          worktreePath: "/repo/.claude/worktrees/alpha",
        },
      ],
    });

    const report = formatPlannerWorktreeDriftReport(snapshot);
    expect(report).toContain("Planner Worktree Drift Watchdog");
    expect(report).toContain(
      "active-lanes=1 evaluated-worktrees=1 risk-cases=1 root-dirty-shared-paths=1 worktree-dirty-shared-paths=2 total-dirty-shared-paths=3",
    );
    expect(report).toContain("- risks");
    expect(report).toContain(
      "risk=root-drift-without-obvious-owner path=src/lib/factory/watchdog.ts surface=src/lib/factory lanes=none next-action=investigate evidence=Root dirty path src/lib/factory/watchdog.ts has no obvious active owner.",
    );
    expect(report).toContain("- location=root repo=/repo dirty-shared-paths=1");
    expect(report).toContain(
      "path=src/lib/factory/watchdog.ts status= M change=modified surface=src/lib/factory category=shared-helper owner=root-owned ownership-reason=No active lane currently matches this dirty path or shared surface, so the drift remains rooted in the planner checkout.",
    );
    expect(report).toContain(
      "- location=worktree lane=alpha branch=alpha linkage=linked worktree=.claude/worktrees/alpha dirty-shared-paths=2 next-action=wait",
    );
    expect(report).toContain(
      "path=src/tests/ci/planner-watchdog.test.ts status=A  change=added surface=src/tests/ci category=shared-test owner=worktree-owned:alpha ownership-reason=Dirty path was observed directly in active lane alpha.",
    );

    expect(JSON.parse(serializePlannerWorktreeDriftSnapshot(snapshot))).toEqual(
      snapshot,
    );
  });

  test("keeps ambiguous root drift visible as unowned when multiple active lanes touch the same shared surface", () => {
    const snapshot = buildPlannerWorktreeDriftSnapshot(
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        laneCount: 2,
        activeLaneCount: 2,
        failedLaneCount: 0,
        linkedLaneCount: 2,
        linkedWithGapsLaneCount: 0,
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
            queueState: "active",
            rawQueueState: "active",
            linkageStatus: "linked",
            worktreePath: ".claude/worktrees/beta",
            branchName: "beta",
            pullRequest: { number: 43 },
            pullRequestLookup: { status: "resolved" },
            missingLinkageReasons: [],
          },
        ],
      },
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        repoRoot: "/repo",
        runGitStatus: (cwd) => {
          if (cwd === "/repo") {
            return " M src/lib/factory/root-only.ts";
          }
          if (cwd === "/repo/.claude/worktrees/alpha") {
            return " M src/lib/factory/alpha.ts";
          }
          if (cwd === "/repo/.claude/worktrees/beta") {
            return " M src/lib/factory/beta.ts";
          }
          throw new Error(`unexpected cwd ${cwd}`);
        },
      },
    );

    expect(snapshot.root.dirtyPaths[0]?.ownership).toEqual({
      kind: "unowned",
      reasonCode: "ambiguous-shared-surface",
      reason:
        "Ownership is ambiguous across active lanes alpha, beta on shared surface src/lib/factory.",
    });
    expect(snapshot.risks).toEqual([
      {
        category: "shared-helper",
        evidenceSummary:
          "Root dirty path src/lib/factory/root-only.ts overlaps shared surface src/lib/factory across active lanes alpha, beta.",
        kind: "ambiguous-shared-surface-ownership",
        laneNames: ["alpha", "beta"],
        nextAction: "investigate",
        path: "src/lib/factory/root-only.ts",
        surface: "src/lib/factory",
      },
      {
        category: "shared-helper",
        evidenceSummary:
          "Multiple active lanes currently have dirty paths on shared surface src/lib/factory: alpha, beta.",
        kind: "multi-lane-hotspot-collision",
        laneNames: ["alpha", "beta"],
        nextAction: "open-follow-up-throughput-prd",
        surface: "src/lib/factory",
      },
    ]);
    expect(snapshot.worktrees.map((worktree) => worktree.nextAction)).toEqual([
      "investigate",
      "investigate",
    ]);

    const report = formatPlannerWorktreeDriftReport(snapshot);
    expect(report).toContain(
      "risk=ambiguous-shared-surface-ownership path=src/lib/factory/root-only.ts surface=src/lib/factory lanes=alpha,beta next-action=investigate evidence=Root dirty path src/lib/factory/root-only.ts overlaps shared surface src/lib/factory across active lanes alpha, beta.",
    );
    expect(report).toContain(
      "risk=multi-lane-hotspot-collision path=- surface=src/lib/factory lanes=alpha,beta next-action=open-follow-up-throughput-prd evidence=Multiple active lanes currently have dirty paths on shared surface src/lib/factory: alpha, beta.",
    );
    expect(report).toContain(
      "path=src/lib/factory/root-only.ts status= M change=modified surface=src/lib/factory category=shared-helper owner=unowned ownership-reason=Ownership is ambiguous across active lanes alpha, beta on shared surface src/lib/factory.",
    );
    expect(report).toContain(
      "- location=worktree lane=alpha branch=alpha linkage=linked worktree=.claude/worktrees/alpha dirty-shared-paths=1 next-action=investigate",
    );
    expect(report).toContain(
      "- location=worktree lane=beta branch=beta linkage=linked worktree=.claude/worktrees/beta dirty-shared-paths=1 next-action=investigate",
    );

    expect(JSON.parse(serializePlannerWorktreeDriftSnapshot(snapshot))).toEqual(
      snapshot,
    );
  });

  test("reports unmatched root drift as root-owned when no active lane evidence claims it", () => {
    const snapshot = buildPlannerWorktreeDriftSnapshot(
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        laneCount: 1,
        activeLaneCount: 1,
        failedLaneCount: 0,
        linkedLaneCount: 1,
        linkedWithGapsLaneCount: 0,
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
        ],
      },
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        repoRoot: "/repo",
        runGitStatus: (cwd) => {
          if (cwd === "/repo") {
            return " M package.json";
          }
          if (cwd === "/repo/.claude/worktrees/alpha") {
            return " M docs/planner/notes.md";
          }
          throw new Error(`unexpected cwd ${cwd}`);
        },
      },
    );

    expect(snapshot.root.dirtyPaths[0]?.ownership).toEqual({
      kind: "root-owned",
      reasonCode: "root-unmatched",
      reason:
        "No active lane currently matches this dirty path or shared surface, so the drift remains rooted in the planner checkout.",
    });
    expect(snapshot.risks).toEqual([
      {
        category: "shared-helper",
        evidenceSummary:
          "Root dirty path package.json has no obvious active owner.",
        kind: "root-drift-without-obvious-owner",
        laneNames: [],
        nextAction: "investigate",
        path: "package.json",
        surface: "package.json",
      },
    ]);
    expect(snapshot.worktrees[0]?.nextAction).toBe("wait");
  });
});
