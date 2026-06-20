import { describe, expect, test } from "bun:test";
import {
  discoverPlannerConcurrencyFloorReport,
  formatPlannerConcurrencyFloorReport,
  serializePlannerConcurrencyFloorReport,
} from "@/lib/factory/planner-concurrency-floor-report";

describe("discoverPlannerConcurrencyFloorReport", () => {
  test("counts only live active queue lanes and compares them against the configured floor", () => {
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 3,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [],
      tempStateFiles: [],
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active-1",
            name: "alpha",
            sessionId: "session-alpha",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "task-active-2",
            name: "beta",
            sessionId: "session-beta",
            state: { name: "running", type: "PROCESSING" },
          },
          {
            workId: "idea-ready",
            name: "ready-idea",
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "task-failed",
            name: "failed-lane",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    expect(report.usefulActiveLaneCount).toBe(2);
    expect(report.floorStatus).toBe("below-target");
    expect(report.lanesNeededToReachFloor).toBe(1);
    expect(report.usefulActiveLanes).toEqual([
      {
        rawState: "in-review",
        sessionId: "session-alpha",
        workItemName: "alpha",
      },
      {
        rawState: "running",
        sessionId: "session-beta",
        workItemName: "beta",
      },
    ]);
  });

  test("keeps stale cron failures and superseded historical loopbacks out of the useful active lane count", () => {
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 1,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [],
      plannerRootDirtyPathsAvailable: true,
      taskFiles: [],
      tempStateFiles: [],
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "active-lane",
            sessionId: "session-active",
            state: { name: "in-progress", type: "PROCESSING" },
          },
          {
            workId: "loopback-old",
            name: "loopback-refill",
            traceId: "trace-loopback",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "loopback-new",
            name: "loopback-refill",
            traceId: "trace-loopback",
            workTypeName: "thoughts",
            state: { name: "in-review", type: "PROCESSING" },
            sessionId: "session-loopback",
          },
          {
            workId: "cron-1",
            name: "cron:though-retrigger",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "cron-2",
            name: "cron:though-retrigger",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    expect(report.usefulActiveLaneCount).toBe(2);
    expect(report.floorStatus).toBe("above-target");
    expect(report.ignoredStaleNoise.map((item) => item.workItemName)).toEqual([
      "cron:though-retrigger",
      "loopback-refill",
    ]);
    expect(
      report.ignoredStaleNoise.find(
        (item) => item.workItemName === "cron:though-retrigger",
      ),
    ).toMatchObject({
      occurrenceCount: 2,
    });
  });

  test("formats human-readable and machine-readable output from the same floor comparison", () => {
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 2,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~default",
      taskFiles: [],
      tempStateFiles: [],
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "alpha",
            sessionId: "session-alpha",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "task-failed",
            name: "historic-failure",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    const reportText = formatPlannerConcurrencyFloorReport(report);
    const jsonReport = JSON.parse(
      serializePlannerConcurrencyFloorReport(report),
    ) as {
      usefulActiveLaneCount: number;
      concurrencyFloor: number;
      floorStatus: string;
      lanesNeededToReachFloor: number;
      ignoredStaleNoise: Array<{ workItemName: string }>;
    };

    expect(reportText).toContain("Planner concurrency-floor summary");
    expect(reportText).toContain(
      "summary useful-active=1 floor=2 status=below-target refill-needed=1 advisory-only=true",
    );
    expect(reportText).toContain("Useful Active Lanes (1)");
    expect(reportText).toContain(
      "- work-item=alpha raw-state=in-review session=session-alpha",
    );
    expect(reportText).toContain("Ignored Stale Noise (0)");
    expect(reportText).toContain("Planner-Owned Backlog Candidates (0)");
    expect(reportText).toContain("Refill Candidates (0)");
    expect(jsonReport).toMatchObject({
      usefulActiveLaneCount: 1,
      concurrencyFloor: 2,
      floorStatus: "below-target",
      lanesNeededToReachFloor: 1,
    });
    expect(jsonReport.ignoredStaleNoise).toEqual([]);
  });

  test("derives planner-owned refill candidates from tasks and marks explicit holds from docs/temp state", () => {
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 3,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [
        {
          path: "tasks/ideas-to-review/content/alpha-refill.md",
          text: [
            "# Alpha Refill",
            "",
            "- Scope `src/features/docs/search` for follow-up work.",
          ].join("\n"),
        },
        {
          path: "tasks/ideas-to-review/content/beta-held.md",
          text: "# Beta Held\n- Touches `src/lib/content/registry-runtime.ts`\n",
        },
        {
          path: "tasks/ideas-to-review/content/active-lane.md",
          text: "# Active Lane\n",
        },
      ],
      tempStateFiles: [
        {
          path: "checklist.md",
          text: [
            "# Planner Checklist",
            "",
            "## Holds",
            "- beta-held blocked by dependency on shared registry cleanup",
          ].join("\n"),
        },
      ],
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "active-lane",
            sessionId: "session-active",
            state: { name: "in-review", type: "PROCESSING" },
          },
        ],
      }),
    });

    expect(report.plannerOwnedBacklogCandidates).toEqual([
      {
        activeLaneName: "active-lane",
        evidenceQuality: "grounded",
        eligibleForRefill: false,
        holdReasons: [],
        overlappingDirtyPaths: [],
        overlappingDirtySurfaces: [],
        recommendationReasons: [
          "An active lane already owns alias active-lane.",
        ],
        refillRecommendation: "hold",
        status: "already-active",
        taskId: "ideas-to-review/content/active-lane",
        taskPath: "tasks/ideas-to-review/content/active-lane.md",
        taskPathHints: [],
        title: "Active Lane",
      },
      {
        evidenceQuality: "grounded",
        eligibleForRefill: true,
        holdReasons: [],
        overlappingDirtyPaths: [],
        overlappingDirtySurfaces: [],
        recommendationReasons: [
          "No active alias conflict was found, and 1 repo-local path hint(s) avoid current planner dirty surfaces.",
        ],
        refillRecommendation: "prefer",
        status: "ready",
        taskId: "ideas-to-review/content/alpha-refill",
        taskPath: "tasks/ideas-to-review/content/alpha-refill.md",
        taskPathHints: ["src/features/docs/search"],
        title: "Alpha Refill",
      },
      {
        evidenceQuality: "grounded",
        eligibleForRefill: false,
        holdReasons: [
          "checklist.md: - beta-held blocked by dependency on shared registry cleanup",
        ],
        overlappingDirtyPaths: [],
        overlappingDirtySurfaces: [],
        recommendationReasons: [
          "Explicit hold evidence exists in planner temp-state notes.",
        ],
        refillRecommendation: "hold",
        status: "held",
        taskId: "ideas-to-review/content/beta-held",
        taskPath: "tasks/ideas-to-review/content/beta-held.md",
        taskPathHints: ["src/lib/content/registry-runtime.ts"],
        title: "Beta Held",
      },
    ]);
    expect(report.refillCandidates).toEqual([
      {
        evidenceQuality: "grounded",
        eligibleForRefill: true,
        holdReasons: [],
        overlappingDirtyPaths: [],
        overlappingDirtySurfaces: [],
        recommendationReasons: [
          "No active alias conflict was found, and 1 repo-local path hint(s) avoid current planner dirty surfaces.",
        ],
        refillRecommendation: "prefer",
        status: "ready",
        taskId: "ideas-to-review/content/alpha-refill",
        taskPath: "tasks/ideas-to-review/content/alpha-refill.md",
        taskPathHints: ["src/features/docs/search"],
        title: "Alpha Refill",
      },
    ]);
  });

  test("ranks refill recommendations using dirty-surface overlap and evidence completeness", () => {
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 4,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [
        {
          path: "src/lib/factory/planner-concurrency-floor-report.ts",
          surface: "src/lib/factory",
        },
      ],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [
        {
          path: "tasks/ideas-to-review/content/alpha-safe.md",
          text: [
            "# Alpha Safe",
            "",
            "- Scope `src/features/docs/search` only.",
          ].join("\n"),
        },
        {
          path: "tasks/ideas-to-review/content/beta-overlap.md",
          text: [
            "# Beta Overlap",
            "",
            "- Touches `src/lib/factory/planner-concurrency-floor-report.ts`.",
          ].join("\n"),
        },
        {
          path: "tasks/ideas-to-review/content/gamma-unclear.md",
          text: "# Gamma Unclear\n",
        },
      ],
      tempStateFiles: [],
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "active-lane",
            sessionId: "session-active",
            state: { name: "in-review", type: "PROCESSING" },
          },
        ],
      }),
    });

    expect(
      report.refillCandidates.map((candidate) => ({
        evidenceQuality: candidate.evidenceQuality,
        recommendation: candidate.refillRecommendation,
        reasons: candidate.recommendationReasons,
        taskId: candidate.taskId,
      })),
    ).toEqual([
      {
        evidenceQuality: "grounded",
        recommendation: "prefer",
        reasons: [
          "No active alias conflict was found, and 1 repo-local path hint(s) avoid current planner dirty surfaces.",
        ],
        taskId: "ideas-to-review/content/alpha-safe",
      },
      {
        evidenceQuality: "missing",
        recommendation: "uncertain",
        reasons: [
          "Task file does not name repo-local paths, so collision evidence is incomplete.",
        ],
        taskId: "ideas-to-review/content/gamma-unclear",
      },
      {
        evidenceQuality: "partial",
        recommendation: "hold",
        reasons: [
          "Task hints overlap current planner dirty path(s): src/lib/factory/planner-concurrency-floor-report.ts.",
        ],
        taskId: "ideas-to-review/content/beta-overlap",
      },
    ]);
  });
});
