import { describe, expect, test } from "bun:test";
import {
  discoverPlannerConcurrencyFloorReport,
  formatPlannerConcurrencyFloorReport,
  serializePlannerConcurrencyFloorReport,
} from "@/lib/factory/planner-concurrency-floor-report";

const SUMMARY_SUFFIX =
  " blocked-dependencies=0 held-backlog=0 advisory-uncertain=0 stale-backlog=0 page-refill-hold=false advisory-only=true";

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
    expect(report.contractVersion).toBe("planner-concurrency-floor/v1");
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

    expect(report.usefulActiveLaneCount).toBe(1);
    expect(report.floorStatus).toBe("at-target");
    expect(report.lanesNeededToReachFloor).toBe(0);
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

  test("counts factory task, review, and processing lanes that queue-health already classifies as active", () => {
    const workListJsonText = JSON.stringify({
      results: [
        {
          workId: "task-process",
          name: "alpha-page",
          sessionId: "session-alpha",
          workTypeName: "task",
          state: { name: "init", type: "INITIAL" },
        },
        {
          workId: "task-review",
          name: "beta-page",
          sessionId: "session-beta",
          workTypeName: "task",
          state: { name: "in-review", type: "PROCESSING" },
        },
        {
          workId: "review-token",
          name: "beta-page-review",
          sessionId: "session-beta-review",
          workTypeName: "review",
          state: { name: "init", type: "INITIAL" },
        },
        {
          workId: "task-complete",
          name: "gamma-page",
          sessionId: "session-gamma",
          workTypeName: "task",
          state: { name: "to-complete", type: "PROCESSING" },
        },
        {
          workId: "idea-backlog",
          name: "queued-idea",
          workTypeName: "idea",
          state: { name: "init", type: "INITIAL" },
        },
      ],
    });
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 5,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [],
      plannerRootDirtyPathsAvailable: true,
      taskFiles: [],
      tempStateFiles: [],
      workListJsonText,
    });

    expect(report.usefulActiveLaneCount).toBe(4);
    expect(report.usefulActiveLanes).toEqual([
      {
        rawState: "init",
        sessionId: "session-alpha",
        workItemName: "alpha-page",
      },
      {
        rawState: "in-review",
        sessionId: "session-beta",
        workItemName: "beta-page",
      },
      {
        rawState: "init",
        sessionId: "session-beta-review",
        workItemName: "beta-page-review",
      },
      {
        rawState: "to-complete",
        sessionId: "session-gamma",
        workItemName: "gamma-page",
      },
    ]);
  });

  test("aligns useful-active summary fields between human-readable and JSON output", () => {
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
      contractVersion: string;
      usefulActiveLaneCount: number;
      concurrencyFloor: number;
      floorStatus: string;
      lanesNeededToReachFloor: number;
      blockedDependencyLanes: unknown[];
      heldBacklogCandidates: unknown[];
      advisoryUncertainties: unknown[];
      ignoredStaleNoise: Array<{ workItemName: string }>;
    };

    expect(reportText).toContain("Planner concurrency-floor summary");
    expect(reportText).toContain(
      `summary useful-active=1 floor=2 status=below-target refill-needed=1${SUMMARY_SUFFIX}`,
    );
    expect(reportText).toContain("Blocked Dependency Lanes (0)");
    expect(reportText).toContain("Held Backlog Candidates (0)");
    expect(reportText).toContain("Advisory Uncertainties (0)");
    expect(reportText).toContain("Useful Active Lanes (1)");
    expect(reportText).toContain(
      "- work-item=alpha raw-state=in-review session=session-alpha",
    );
    expect(reportText).toContain("Ignored Stale Noise (0)");
    expect(reportText).toContain("Stale Backlog Candidates (0)");
    expect(reportText).toContain("Planner-Owned Backlog Candidates (0)");
    expect(reportText).toContain("Refill Candidates (0)");
    expect(jsonReport).toMatchObject({
      contractVersion: "planner-concurrency-floor/v1",
      usefulActiveLaneCount: 1,
      concurrencyFloor: 2,
      floorStatus: "below-target",
      lanesNeededToReachFloor: 1,
      blockedDependencyLanes: [],
      heldBacklogCandidates: [],
      advisoryUncertainties: [],
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
    ]);
    expect(
      report.plannerOwnedBacklogCandidates.find(
        (candidate) =>
          candidate.taskId === "ideas-to-review/content/beta-overlap",
      ),
    ).toMatchObject({
      refillRecommendation: "hold",
    });
  });

  test("separates blocked dependencies, held backlog, and advisory uncertainty from useful active work", () => {
    const workListJsonText = JSON.stringify({
      results: [
        {
          workId: "task-active",
          name: "active-task",
          sessionId: "session-active",
          workTypeName: "task",
          state: { name: "in-review", type: "PROCESSING" },
        },
        {
          workId: "loopback-blocked",
          name: "blocked-loopback",
          sessionId: "session-blocked",
          traceId: "trace-blocked",
          workTypeName: "thoughts",
          state: { name: "init", type: "INITIAL" },
          relations: [
            {
              type: "DEPENDS_ON",
              targetWorkId: "task-active",
              targetWorkName: "active-task",
              requiredState: "complete",
            },
          ],
        },
      ],
    });
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 4,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [
        {
          path: "src/lib/content/registry-runtime.ts",
          surface: "src/lib/content",
        },
      ],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [
        {
          path: "tasks/ideas-to-review/content/held-task.md",
          text: "# Held Task\n",
        },
        {
          path: "tasks/ideas-to-review/content/uncertain-task.md",
          text: "# Uncertain Task\n",
        },
        {
          path: "tasks/ideas-to-review/content/surface-overlap.md",
          text: [
            "# Surface Overlap",
            "",
            "- Touches `src/lib/content/registry-runtime.ts`.",
          ].join("\n"),
        },
      ],
      tempStateFiles: [
        {
          path: "checklist.md",
          text: [
            "# Planner Checklist",
            "",
            "## Holds",
            "- held-task blocked by dependency on registry cleanup",
          ].join("\n"),
        },
      ],
      workListJsonText,
    });
    const reportText = formatPlannerConcurrencyFloorReport(report);
    const jsonReport = JSON.parse(
      serializePlannerConcurrencyFloorReport(report),
    ) as {
      usefulActiveLaneCount: number;
      blockedDependencyLanes: Array<{
        workItemName: string;
        reasons: string[];
      }>;
      heldBacklogCandidates: Array<{
        status: string;
        taskId: string;
        holdReasons: string[];
      }>;
      advisoryUncertainties: Array<{
        taskId: string;
        uncertaintyReasons: string[];
      }>;
    };

    expect(report.usefulActiveLaneCount).toBe(1);
    expect(report.usefulActiveLanes).toEqual([
      {
        rawState: "in-review",
        sessionId: "session-active",
        workItemName: "active-task",
      },
    ]);
    expect(report.blockedDependencyLanes).toEqual([
      {
        dependencies: [
          {
            relationType: "DEPENDS_ON",
            requiredState: "complete",
            targetWorkId: "task-active",
            targetWorkName: "active-task",
          },
        ],
        reasons: ["waiting on active-task (in-review/processing)"],
        sessionId: "session-blocked",
        stateName: "init",
        stateType: "INITIAL",
        workId: "loopback-blocked",
        workItemName: "blocked-loopback",
        workTypeName: "thoughts",
      },
    ]);
    expect(report.heldBacklogCandidates).toEqual([
      {
        activeLaneName: undefined,
        holdReasons: [
          "checklist.md: - held-task blocked by dependency on registry cleanup",
        ],
        recommendationReasons: [
          "Explicit hold evidence exists in planner temp-state notes.",
        ],
        status: "held",
        taskId: "ideas-to-review/content/held-task",
        taskPath: "tasks/ideas-to-review/content/held-task.md",
        title: "Held Task",
      },
    ]);
    expect(report.advisoryUncertainties).toEqual([
      {
        evidenceQuality: "missing",
        overlappingDirtySurfaces: [],
        taskId: "ideas-to-review/content/uncertain-task",
        taskPath: "tasks/ideas-to-review/content/uncertain-task.md",
        taskPathHints: [],
        title: "Uncertain Task",
        uncertaintyReasons: [
          "Task file does not name repo-local paths, so collision evidence is incomplete.",
        ],
      },
    ]);
    expect(reportText).toContain(
      "summary useful-active=1 floor=4 status=below-target refill-needed=3 blocked-dependencies=1 held-backlog=1 advisory-uncertain=1 stale-backlog=0 page-refill-hold=false advisory-only=true",
    );
    expect(reportText).toContain("Blocked Dependency Lanes (1)");
    expect(reportText).toContain("work-item=blocked-loopback");
    expect(reportText).toContain(
      "reason=waiting on active-task (in-review/processing)",
    );
    expect(reportText).toContain("Held Backlog Candidates (1)");
    expect(reportText).toContain("task=ideas-to-review/content/held-task");
    expect(reportText).toContain("Advisory Uncertainties (1)");
    expect(reportText).toContain("task=ideas-to-review/content/uncertain-task");
    expect(jsonReport.usefulActiveLaneCount).toBe(1);
    expect(
      jsonReport.blockedDependencyLanes.map((lane) => lane.workItemName),
    ).toEqual(["blocked-loopback"]);
    expect(
      jsonReport.heldBacklogCandidates.map((candidate) => candidate.taskId),
    ).toEqual(["ideas-to-review/content/held-task"]);
    expect(
      jsonReport.advisoryUncertainties.map((uncertainty) => uncertainty.taskId),
    ).toEqual(["ideas-to-review/content/uncertain-task"]);
  });

  test("suppresses page-oriented refill candidates when root generated-artifact drift is present", () => {
    const workListJsonText = JSON.stringify({
      results: [
        {
          workId: "task-active",
          name: "active-lane",
          sessionId: "session-active",
          workTypeName: "task",
          state: { name: "in-review", type: "PROCESSING" },
        },
      ],
    });
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 3,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [
        {
          path: "src/lib/content/generated/table-registry.generated.ts",
          surface: "src/lib/content/generated",
        },
      ],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [
        {
          path: "tasks/ideas-to-review/content/page-refill.md",
          text: [
            "# Page Refill",
            "",
            "- Scope `src/content/docs/modules/example-page/page.mdx`.",
          ].join("\n"),
        },
        {
          path: "tasks/ideas-to-review/content/factory-refill.md",
          text: [
            "# Factory Refill",
            "",
            "- Scope `src/lib/factory/example-report.ts`.",
          ].join("\n"),
        },
      ],
      tempStateFiles: [],
      workListJsonText,
    });
    const reportText = formatPlannerConcurrencyFloorReport(report);
    const jsonReport = JSON.parse(
      serializePlannerConcurrencyFloorReport(report),
    ) as {
      refillCandidates: Array<{ taskId: string; refillRecommendation: string }>;
      rootGeneratedArtifactDriftHold: {
        pageRefillHold: boolean;
        blockingPaths: Array<{ path: string; surface: string }>;
        guidance?: string;
      };
      plannerOwnedBacklogCandidates: Array<{
        taskId: string;
        refillRecommendation: string;
        recommendationReasons: string[];
      }>;
    };

    expect(report.rootGeneratedArtifactDriftHold).toEqual({
      blockingPaths: [
        {
          path: "src/lib/content/generated/table-registry.generated.ts",
          surface: "src/lib/content/generated",
        },
      ],
      guidance:
        "Page refill is held because root generated-artifact drift is present; reconcile generated artifacts before adding page work.",
      holdReason:
        "Page refill is held because root generated-artifact drift is present; reconcile generated artifacts before adding page work.",
      pageRefillHold: true,
    });
    expect(
      report.refillCandidates.map((candidate) => candidate.taskId),
    ).toEqual(["ideas-to-review/content/factory-refill"]);
    expect(
      report.plannerOwnedBacklogCandidates.find(
        (candidate) =>
          candidate.taskId === "ideas-to-review/content/page-refill",
      ),
    ).toMatchObject({
      eligibleForRefill: false,
      refillRecommendation: "hold",
    });
    expect(reportText).toContain("page-refill-hold=true");
    expect(reportText).toContain("Root Generated-Artifact Drift Hold");
    expect(reportText).toContain(
      "guidance=Page refill is held because root generated-artifact drift is present; reconcile generated artifacts before adding page work.",
    );
    expect(reportText).toContain(
      "blocking-paths=src/lib/content/generated/table-registry.generated.ts",
    );
    expect(jsonReport.rootGeneratedArtifactDriftHold.pageRefillHold).toBe(true);
    expect(jsonReport.rootGeneratedArtifactDriftHold.blockingPaths).toEqual([
      {
        path: "src/lib/content/generated/table-registry.generated.ts",
        surface: "src/lib/content/generated",
      },
    ]);
    expect(
      jsonReport.plannerOwnedBacklogCandidates.find(
        (candidate) =>
          candidate.taskId === "ideas-to-review/content/page-refill",
      )?.refillRecommendation,
    ).toBe("hold");
    expect(
      jsonReport.refillCandidates.map((candidate) => candidate.taskId),
    ).toEqual(["ideas-to-review/content/factory-refill"]);
  });

  test("keeps stale backlog candidates visible but excludes them from preferred refill recommendations", () => {
    const terminalCompleteResults = Array.from({ length: 25 }, (_, index) => ({
      workId: `task-complete-${index}`,
      name: `stale-${index}`,
      workTypeName: "task",
      state: { name: "complete", type: "TERMINAL" },
    }));
    const workListJsonText = JSON.stringify({
      results: [
        {
          workId: "task-active",
          name: "active-lane",
          sessionId: "session-active",
          workTypeName: "task",
          state: { name: "in-review", type: "PROCESSING" },
        },
        ...terminalCompleteResults,
        {
          workId: "task-complete-page",
          name: "completed-page",
          workTypeName: "task",
          state: { name: "complete", type: "TERMINAL" },
        },
        {
          workId: "task-complete-module",
          name: "merged-module",
          workTypeName: "task",
          state: { name: "complete", type: "TERMINAL" },
        },
      ],
    });
    const staleTaskFiles = Array.from({ length: 25 }, (_, index) => ({
      path: `tasks/ideas-to-review/content/stale-${index}.md`,
      text: `# Stale ${index}\n`,
    }));
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 3,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [
        ...staleTaskFiles,
        {
          path: "tasks/ideas-to-review/content/completed-page.md",
          text: "# Completed Page\n",
        },
        {
          path: "tasks/ideas-to-review/content/merged-module.md",
          text: "# Merged Module\n",
        },
        {
          path: "tasks/ideas-to-review/content/fresh-refill.md",
          text: [
            "# Fresh Refill",
            "",
            "- Scope `src/features/docs/search`.",
          ].join("\n"),
        },
        {
          path: "tasks/ideas-to-review/content/explicit-stale.md",
          text: [
            "# Explicit Stale",
            "",
            "- stale backlog marker for superseded page idea",
          ].join("\n"),
        },
      ],
      tempStateFiles: [],
      workListJsonText,
    });
    const reportText = formatPlannerConcurrencyFloorReport(report);
    const jsonReport = JSON.parse(
      serializePlannerConcurrencyFloorReport(report),
    ) as {
      lanesNeededToReachFloor: number;
      staleBacklogCandidates: Array<{ taskId: string }>;
      refillCandidates: Array<{
        taskId: string;
        refillRecommendation: string;
      }>;
      plannerOwnedBacklogCandidates: Array<{
        status: string;
        taskId: string;
        refillRecommendation: string;
      }>;
    };

    expect(report.lanesNeededToReachFloor).toBe(2);
    expect(
      report.staleBacklogCandidates.map((candidate) => candidate.taskId).sort(),
    ).toEqual(
      [
        "ideas-to-review/content/completed-page",
        "ideas-to-review/content/explicit-stale",
        "ideas-to-review/content/merged-module",
        ...Array.from(
          { length: 25 },
          (_, index) => `ideas-to-review/content/stale-${index}`,
        ),
      ].sort(),
    );
    expect(
      report.refillCandidates.map((candidate) => candidate.taskId),
    ).toEqual(["ideas-to-review/content/fresh-refill"]);
    expect(
      report.plannerOwnedBacklogCandidates.filter(
        (candidate) => candidate.status === "stale",
      ),
    ).toHaveLength(28);
    expect(
      report.plannerOwnedBacklogCandidates.find(
        (candidate) =>
          candidate.taskId === "ideas-to-review/content/fresh-refill",
      ),
    ).toMatchObject({
      refillRecommendation: "prefer",
      status: "ready",
    });
    expect(reportText).toContain("stale-backlog=28");
    expect(reportText).toContain("Stale Backlog Candidates (28, showing 20)");
    expect(reportText).toContain(
      "... and 8 more stale backlog candidates grouped under",
    );
    expect(reportText).toContain("Planner-Owned Backlog Candidates (1)");
    expect(reportText).toContain("Refill Candidates (1)");
    expect(reportText).toContain(
      "task=ideas-to-review/content/fresh-refill title=Fresh Refill recommendation=prefer",
    );
    expect(jsonReport.lanesNeededToReachFloor).toBe(2);
    expect(jsonReport.staleBacklogCandidates).toHaveLength(28);
    expect(jsonReport.refillCandidates).toEqual([
      expect.objectContaining({
        refillRecommendation: "prefer",
        taskId: "ideas-to-review/content/fresh-refill",
      }),
    ]);
    expect(
      jsonReport.plannerOwnedBacklogCandidates.filter(
        (candidate) => candidate.status === "stale",
      ),
    ).toHaveLength(28);
  });
});

describe("planner concurrency-floor report contract", () => {
  test("exposes stable JSON contract fields with human/JSON parity for corrected classifications", () => {
    const workListJsonText = JSON.stringify({
      results: [
        {
          workId: "task-process",
          name: "alpha-page",
          sessionId: "session-alpha",
          workTypeName: "task",
          state: { name: "init", type: "INITIAL" },
        },
        {
          workId: "review-token",
          name: "beta-page-review",
          sessionId: "session-beta-review",
          workTypeName: "review",
          state: { name: "init", type: "INITIAL" },
        },
        {
          workId: "task-complete-page",
          name: "completed-page",
          workTypeName: "task",
          state: { name: "complete", type: "TERMINAL" },
        },
      ],
    });
    const report = discoverPlannerConcurrencyFloorReport({
      concurrencyFloor: 4,
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      plannerRootDirtyPaths: [
        {
          path: "src/lib/content/generated/table-registry.generated.ts",
          surface: "src/lib/content/generated",
        },
      ],
      plannerRootDirtyPathsAvailable: true,
      sourceSession: "~planner",
      taskFiles: [
        {
          path: "tasks/ideas-to-review/content/completed-page.md",
          text: "# Completed Page\n",
        },
        {
          path: "tasks/ideas-to-review/content/page-refill.md",
          text: [
            "# Page Refill",
            "",
            "- Scope `src/content/docs/modules/example-page/page.mdx`.",
          ].join("\n"),
        },
        {
          path: "tasks/ideas-to-review/content/factory-refill.md",
          text: [
            "# Factory Refill",
            "",
            "- Scope `src/lib/factory/example-report.ts`.",
          ].join("\n"),
        },
      ],
      tempStateFiles: [],
      workListJsonText,
    });
    const reportText = formatPlannerConcurrencyFloorReport(report);
    const jsonReport = JSON.parse(
      serializePlannerConcurrencyFloorReport(report),
    ) as Record<string, unknown>;

    expect(jsonReport).toMatchObject({
      advisoryOnly: true,
      contractVersion: "planner-concurrency-floor/v1",
      usefulActiveLaneCount: 2,
      floorStatus: "below-target",
      lanesNeededToReachFloor: 2,
    });
    expect(Object.keys(jsonReport).sort()).toEqual([
      "advisoryOnly",
      "advisoryUncertainties",
      "blockedDependencyLanes",
      "concurrencyFloor",
      "contractVersion",
      "floorStatus",
      "generatedAtUtc",
      "heldBacklogCandidates",
      "ignoredStaleNoise",
      "issues",
      "lanesNeededToReachFloor",
      "plannerOwnedBacklogCandidates",
      "refillCandidates",
      "rootGeneratedArtifactDriftHold",
      "sourceSession",
      "staleBacklogCandidates",
      "usefulActiveLaneCount",
      "usefulActiveLanes",
    ]);
    expect(reportText).toContain(
      "summary useful-active=2 floor=4 status=below-target refill-needed=2 blocked-dependencies=0 held-backlog=0 advisory-uncertain=0 stale-backlog=1 page-refill-hold=true advisory-only=true",
    );
    expect(
      (jsonReport.refillCandidates as Array<{ taskId: string }>).map(
        (candidate) => candidate.taskId,
      ),
    ).toEqual(["ideas-to-review/content/factory-refill"]);
    expect(
      (jsonReport.staleBacklogCandidates as Array<{ taskId: string }>).map(
        (candidate) => candidate.taskId,
      ),
    ).toEqual(["ideas-to-review/content/completed-page"]);
    expect(
      (
        jsonReport.plannerOwnedBacklogCandidates as Array<{
          taskId: string;
          refillRecommendation: string;
        }>
      ).find(
        (candidate) =>
          candidate.taskId === "ideas-to-review/content/page-refill",
      )?.refillRecommendation,
    ).toBe("hold");
    expect(
      jsonReport.rootGeneratedArtifactDriftHold as { pageRefillHold: boolean },
    ).toMatchObject({
      pageRefillHold: true,
    });
  });
});
