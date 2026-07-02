import { describe, expect, test } from "bun:test";
import {
  buildPlannerWorktreeDriftSnapshot,
  formatPlannerWorktreeDriftReport,
  PLANNER_OWNERLESS_ROOT_DRIFT_NEXT_SAFE_ACTION,
  PLANNER_OWNERLESS_ROOT_DRIFT_PRESERVE_POLICY,
  PLANNER_OWNERLESS_ROOT_DRIFT_TARGET_SESSION_ID,
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
        prBackedLaneCount: 1,
        actionableLinkageGapLaneCount: 1,
        queueOnlyControlNoiseLaneCount: 0,
        staleCleanPrMismatchLaneCount: 0,
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
      mergedLaneCount: 0,
      mergedLanes: [],
      risks: [
        {
          category: "shared-helper",
          evidenceSummary:
            "Ownerless root dirty path src/lib/factory/watchdog.ts (no active or merged lane claims it).",
          kind: "ownerless-root-dirty-paths",
          laneNames: [],
          nextAction: "investigate-and-preserve",
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
                "Ownerless root dirty path: no active or merged lane currently matches this dirty path or shared surface.",
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
      "active-lanes=1 merged-lanes=0 evaluated-worktrees=1 risk-cases=1 root-dirty-shared-paths=1 worktree-dirty-shared-paths=2 total-dirty-shared-paths=3",
    );
    expect(report).toContain("- risks");
    expect(report).toContain(
      "risk=ownerless-root-dirty-paths path=src/lib/factory/watchdog.ts surface=src/lib/factory lanes=none next-action=investigate-and-preserve evidence=Ownerless root dirty path src/lib/factory/watchdog.ts (no active or merged lane claims it).",
    );
    expect(report).toContain("- recovery-guidance");
    expect(report).toContain(
      `condition=ownerless-root-dirty-paths count=1 target-session=${PLANNER_OWNERLESS_ROOT_DRIFT_TARGET_SESSION_ID}`,
    );
    expect(report).toContain(
      `preserve-policy=${PLANNER_OWNERLESS_ROOT_DRIFT_PRESERVE_POLICY}`,
    );
    expect(report).toContain(
      `next-safe-action=${PLANNER_OWNERLESS_ROOT_DRIFT_NEXT_SAFE_ACTION}`,
    );
    expect(report).toContain("ownerless-paths=src/lib/factory/watchdog.ts");
    expect(report).toContain("- location=root repo=/repo dirty-shared-paths=1");
    expect(report).toContain(
      "path=src/lib/factory/watchdog.ts status= M change=modified surface=src/lib/factory category=shared-helper owner=root-owned ownership-reason=Ownerless root dirty path: no active or merged lane currently matches this dirty path or shared surface.",
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
        prBackedLaneCount: 2,
        actionableLinkageGapLaneCount: 0,
        queueOnlyControlNoiseLaneCount: 0,
        staleCleanPrMismatchLaneCount: 0,
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
        prBackedLaneCount: 1,
        actionableLinkageGapLaneCount: 0,
        queueOnlyControlNoiseLaneCount: 0,
        staleCleanPrMismatchLaneCount: 0,
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
        "Ownerless root dirty path: no active or merged lane currently matches this dirty path or shared surface.",
    });
    expect(snapshot.risks).toEqual([
      {
        category: "shared-helper",
        evidenceSummary:
          "Ownerless root dirty path package.json (no active or merged lane claims it).",
        kind: "ownerless-root-dirty-paths",
        laneNames: [],
        nextAction: "investigate-and-preserve",
        path: "package.json",
        surface: "package.json",
      },
    ]);
    expect(snapshot.worktrees[0]?.nextAction).toBe("wait");
  });

  test("classifies root drift tied to already-merged page lanes with reviewer-visible merge evidence", () => {
    const snapshot = buildPlannerWorktreeDriftSnapshot(
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        laneCount: 1,
        activeLaneCount: 1,
        failedLaneCount: 0,
        linkedLaneCount: 1,
        linkedWithGapsLaneCount: 0,
        prBackedLaneCount: 1,
        actionableLinkageGapLaneCount: 0,
        queueOnlyControlNoiseLaneCount: 0,
        staleCleanPrMismatchLaneCount: 0,
        issues: [],
        lanes: [
          {
            laneName: "tokens-per-second-serving-metric-page",
            queueState: "active",
            rawQueueState: "active",
            linkageStatus: "linked",
            worktreePath:
              ".claude/worktrees/tokens-per-second-serving-metric-page",
            branchName: "tokens-per-second-serving-metric-page",
            pullRequest: { number: 201 },
            pullRequestLookup: { status: "resolved" },
            missingLinkageReasons: [],
          },
        ],
      },
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        mergedLaneEvidence: [
          {
            laneName: "cross-attention-module-page",
            branchName: "cross-attention-module-page",
            worktreePath: "/repo/.claude/worktrees/cross-attention-module-page",
            mergeEvidence: {
              pullRequestNumber: 182,
              mergeCommitSha: "f2343089abc1234567890abcdef1234567890abcd",
              terminalState: "complete/terminal",
              sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
            },
          },
        ],
        repoRoot: "/repo",
        runGitStatus: (cwd) => {
          if (cwd === "/repo") {
            return [
              "D  src/content/modules/cross-attention.mdx",
              " M src/lib/content/cross-attention.test.ts",
              " M package.json",
            ].join("\n");
          }
          if (
            cwd ===
            "/repo/.claude/worktrees/tokens-per-second-serving-metric-page"
          ) {
            return " M docs/planner/active-lane.md";
          }
          if (cwd === "/repo/.claude/worktrees/cross-attention-module-page") {
            return [
              "D  src/content/modules/cross-attention.mdx",
              " M src/lib/content/cross-attention.test.ts",
            ].join("\n");
          }
          throw new Error(`unexpected cwd ${cwd}`);
        },
      },
    );

    expect(snapshot.mergedLaneCount).toBe(1);
    expect(snapshot.mergedLanes[0]?.laneName).toBe(
      "cross-attention-module-page",
    );

    const crossAttentionPage = snapshot.root.dirtyPaths.find(
      (dirtyPath) =>
        dirtyPath.path === "src/content/modules/cross-attention.mdx",
    );
    const crossAttentionTest = snapshot.root.dirtyPaths.find(
      (dirtyPath) =>
        dirtyPath.path === "src/lib/content/cross-attention.test.ts",
    );
    const packageJson = snapshot.root.dirtyPaths.find(
      (dirtyPath) => dirtyPath.path === "package.json",
    );

    expect(crossAttentionPage?.ownership).toEqual({
      branchName: "cross-attention-module-page",
      kind: "already-merged-owned",
      laneName: "cross-attention-module-page",
      mergeEvidence: {
        pullRequestNumber: 182,
        mergeCommitSha: "f2343089abc1234567890abcdef1234567890abcd",
        terminalState: "complete/terminal",
        sessionId: "0fdc5077-95ed-4396-a183-06e5b16555ca",
      },
      reasonCode: "already-merged-lane-match",
      reason:
        "Root drift matches already-merged lane cross-attention-module-page (PR #182, merge f234308, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).",
      worktreePath: ".claude/worktrees/cross-attention-module-page",
    });
    expect(crossAttentionTest?.ownership.kind).toBe("already-merged-owned");
    expect(packageJson?.ownership).toEqual({
      kind: "root-owned",
      reasonCode: "root-unmatched",
      reason:
        "Ownerless root dirty path: no active or merged lane currently matches this dirty path or shared surface.",
    });
    expect(snapshot.risks).toEqual([
      {
        category: "authored-content",
        evidenceSummary:
          "Root dirty path src/content/modules/cross-attention.mdx is already-merged root drift from lane cross-attention-module-page (PR #182, merge f234308, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).",
        kind: "already-merged-root-drift",
        laneNames: ["cross-attention-module-page"],
        nextAction: "investigate",
        path: "src/content/modules/cross-attention.mdx",
        surface: "src/content/modules",
      },
      {
        category: "shared-test",
        evidenceSummary:
          "Root dirty path src/lib/content/cross-attention.test.ts is already-merged root drift from lane cross-attention-module-page (PR #182, merge f234308, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca).",
        kind: "already-merged-root-drift",
        laneNames: ["cross-attention-module-page"],
        nextAction: "investigate",
        path: "src/lib/content/cross-attention.test.ts",
        surface: "src/lib/content",
      },
      {
        category: "shared-helper",
        evidenceSummary:
          "Ownerless root dirty path package.json (no active or merged lane claims it).",
        kind: "ownerless-root-dirty-paths",
        laneNames: [],
        nextAction: "investigate-and-preserve",
        path: "package.json",
        surface: "package.json",
      },
    ]);

    const report = formatPlannerWorktreeDriftReport(snapshot);
    expect(report).toContain("merged-lanes=1");
    expect(report).toContain("- merged-lanes");
    expect(report).toContain(
      "lane=cross-attention-module-page branch=cross-attention-module-page merge-evidence=PR #182, merge f234308, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca",
    );
    expect(report).toContain(
      "owner=already-merged-owned:cross-attention-module-page merge-evidence=PR #182, merge f234308, complete/terminal, session 0fdc5077-95ed-4396-a183-06e5b16555ca",
    );
    expect(report).toContain(
      "risk=already-merged-root-drift path=src/content/modules/cross-attention.mdx",
    );
    expect(report).not.toContain(
      "risk=ownerless-root-dirty-paths path=src/content/modules/cross-attention.mdx",
    );
    expect(report).toContain("- recovery-guidance");
    expect(report).toContain(
      `condition=ownerless-root-dirty-paths count=1 target-session=${PLANNER_OWNERLESS_ROOT_DRIFT_TARGET_SESSION_ID}`,
    );
    expect(report).toContain(
      `preserve-policy=${PLANNER_OWNERLESS_ROOT_DRIFT_PRESERVE_POLICY}`,
    );
    expect(report).toContain(
      `next-safe-action=${PLANNER_OWNERLESS_ROOT_DRIFT_NEXT_SAFE_ACTION}`,
    );
    expect(report).toContain("ownerless-paths=package.json");
    expect(report).toContain(
      "risk=ownerless-root-dirty-paths path=package.json",
    );
  });

  test("reports ownerless root dirty paths with preserve guidance when multiple unmatched paths remain staged", () => {
    const snapshot = buildPlannerWorktreeDriftSnapshot(
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        laneCount: 1,
        activeLaneCount: 1,
        failedLaneCount: 0,
        linkedLaneCount: 1,
        linkedWithGapsLaneCount: 0,
        prBackedLaneCount: 1,
        actionableLinkageGapLaneCount: 0,
        queueOnlyControlNoiseLaneCount: 0,
        staleCleanPrMismatchLaneCount: 0,
        issues: [],
        lanes: [
          {
            laneName: "tokens-per-second-serving-metric-page",
            queueState: "active",
            rawQueueState: "active",
            linkageStatus: "linked",
            worktreePath:
              ".claude/worktrees/tokens-per-second-serving-metric-page",
            branchName: "tokens-per-second-serving-metric-page",
            pullRequest: { number: 201 },
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
            return [
              " M src/components/docs/DocsFoldedSummary.tsx",
              " M src/lib/content/registry-graph.test.ts",
              " M package.json",
            ].join("\n");
          }
          if (
            cwd ===
            "/repo/.claude/worktrees/tokens-per-second-serving-metric-page"
          ) {
            return " M docs/planner/active-lane.md";
          }
          throw new Error(`unexpected cwd ${cwd}`);
        },
      },
    );

    const ownerlessRisks = snapshot.risks.filter(
      (risk) => risk.kind === "ownerless-root-dirty-paths",
    );
    expect(ownerlessRisks).toHaveLength(3);
    expect(ownerlessRisks.map((risk) => risk.nextAction)).toEqual([
      "investigate-and-preserve",
      "investigate-and-preserve",
      "investigate-and-preserve",
    ]);

    const report = formatPlannerWorktreeDriftReport(snapshot);
    expect(report).toContain("- recovery-guidance");
    expect(report).toContain(
      `condition=ownerless-root-dirty-paths count=3 target-session=${PLANNER_OWNERLESS_ROOT_DRIFT_TARGET_SESSION_ID}`,
    );
    expect(report).toContain(
      `preserve-policy=${PLANNER_OWNERLESS_ROOT_DRIFT_PRESERVE_POLICY}`,
    );
    expect(report).toContain(
      `next-safe-action=${PLANNER_OWNERLESS_ROOT_DRIFT_NEXT_SAFE_ACTION}`,
    );
    expect(report).toContain(
      "ownerless-paths=package.json, src/components/docs/DocsFoldedSummary.tsx, src/lib/content/registry-graph.test.ts",
    );
  });
});
