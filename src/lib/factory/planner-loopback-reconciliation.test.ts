import { describe, expect, test } from "bun:test";
import {
  discoverPlannerLoopbackReconciliationReport,
  formatPlannerLoopbackReconciliationReport,
  serializePlannerLoopbackReconciliationReport,
} from "@/lib/factory/planner-loopback-reconciliation";

describe("discoverPlannerLoopbackReconciliationReport", () => {
  test("reports loopback dependency evidence as complete, active, failed, or missing-from-queue", () => {
    const report = discoverPlannerLoopbackReconciliationReport({
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      sourceSession: "~default",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-complete",
            name: "done-lane",
            traceId: "trace-done",
            workTypeName: "task",
            state: { name: "complete", type: "TERMINAL" },
          },
          {
            workId: "task-active",
            name: "review-lane",
            traceId: "trace-active",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "task-failed",
            name: "failed-lane",
            traceId: "trace-failed",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "loopback-1",
            name: "loopback-ready",
            traceId: "trace-loopback-ready",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-complete",
                targetWorkName: "done-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "loopback-2",
            name: "loopback-blocked",
            traceId: "trace-loopback-blocked",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "review-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "loopback-3",
            name: "loopback-failed-dependency",
            traceId: "trace-loopback-failed",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-failed",
                targetWorkName: "failed-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "loopback-4",
            name: "loopback-missing-dependency",
            traceId: "trace-loopback-missing",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-missing",
                targetWorkName: "missing-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "thoughts-without-deps",
            name: "plain-thought",
            traceId: "trace-plain-thought",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
          },
        ],
      }),
    });

    expect(report.summary).toEqual({
      loopbackCount: 4,
      dependencyCount: 4,
      staleNoiseLoopbacks: 1,
      blockedLoopbacks: 2,
      repairableLoopbacks: 1,
      completeDependencies: 1,
      activeDependencies: 1,
      failedDependencies: 1,
      missingFromQueueDependencies: 1,
      unknownDependencies: 0,
    });
    expect(report.loopbacks.map((loopback) => loopback.workItemName)).toEqual([
      "loopback-blocked",
      "loopback-failed-dependency",
      "loopback-missing-dependency",
      "loopback-ready",
    ]);
    expect(report.loopbacks[0]).toMatchObject({
      workId: "loopback-2",
      stateName: "init",
      stateType: "INITIAL",
      classification: "blocked",
      reasons: [
        "waiting on unfinished dependencies: review-lane (in-review/processing)",
      ],
      dependencies: [
        {
          targetWorkId: "task-active",
          targetWorkName: "review-lane",
          requiredState: "complete",
          status: "active",
          resolvedWorkId: "task-active",
          resolvedStateName: "in-review",
          resolvedStateType: "PROCESSING",
        },
      ],
    });
    expect(report.loopbacks[1]?.dependencies).toEqual([
      expect.objectContaining({
        targetWorkId: "task-failed",
        targetWorkName: "failed-lane",
        status: "failed",
        resolvedWorkId: "task-failed",
        resolvedStateName: "failed",
        resolvedStateType: "TERMINAL",
      }),
    ]);
    expect(report.loopbacks[1]).toMatchObject({
      classification: "blocked",
      reasons: [
        "waiting on unfinished dependencies: failed-lane (failed/terminal)",
      ],
    });
    expect(report.loopbacks[2]?.dependencies).toEqual([
      expect.objectContaining({
        targetWorkId: "task-missing",
        targetWorkName: "missing-lane",
        status: "missing-from-queue",
        resolvedWorkId: undefined,
        resolvedStateName: undefined,
        resolvedStateType: undefined,
      }),
    ]);
    expect(report.loopbacks[2]).toMatchObject({
      classification: "repairable",
      reasons: [
        "dependency evidence is inconsistent because required targets are missing from the queue: missing-lane (missing-from-queue)",
      ],
    });
    expect(report.loopbacks[3]?.dependencies).toEqual([
      expect.objectContaining({
        targetWorkId: "task-complete",
        targetWorkName: "done-lane",
        status: "complete",
        resolvedWorkId: "task-complete",
        resolvedStateName: "complete",
        resolvedStateType: "TERMINAL",
      }),
    ]);
    expect(report.loopbacks[3]).toMatchObject({
      classification: "stale-noise",
      reasons: [
        "all DEPENDS_ON targets already satisfy the loopback: done-lane (complete/terminal)",
      ],
    });
  });

  test("formats text and JSON output from the same loopback evidence", () => {
    const report = discoverPlannerLoopbackReconciliationReport({
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      sourceSession: "~planner",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "review-lane",
            traceId: "trace-active",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "loopback-1",
            name: "loopback-blocked",
            traceId: "trace-loopback",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "review-lane",
                requiredState: "complete",
              },
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-missing",
                targetWorkName: "missing-lane",
                requiredState: "complete",
              },
            ],
          },
        ],
      }),
    });

    const reportText = formatPlannerLoopbackReconciliationReport(report);
    expect(reportText).toContain("Planner loopback reconciliation");
    expect(reportText).toContain(
      "totals loopbacks=1 stale-noise=0 blocked=0 repairable=1 dependencies=2 complete=0 active=1 failed=0 missing-from-queue=1 unknown=0",
    );
    expect(reportText).toContain("stale-noise (0)");
    expect(reportText).toContain("blocked (0)");
    expect(reportText).toContain("repairable (1)");
    expect(reportText).toContain("work-item=loopback-blocked");
    expect(reportText).toContain("classification=repairable");
    expect(reportText).toContain(
      "reason=dependency evidence is inconsistent because required targets are missing from the queue: missing-lane (missing-from-queue)",
    );
    expect(reportText).toContain("depends-on=review-lane status=active");
    expect(reportText).toContain(
      "depends-on=missing-lane status=missing-from-queue",
    );

    const parsedReport = JSON.parse(
      serializePlannerLoopbackReconciliationReport(report),
    ) as typeof report;
    expect(parsedReport).toEqual(report);
  });

  test("groups text output by classification with summary counts", () => {
    const report = discoverPlannerLoopbackReconciliationReport({
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      sourceSession: "~planner",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-complete",
            name: "done-lane",
            workTypeName: "task",
            state: { name: "complete", type: "TERMINAL" },
          },
          {
            workId: "task-active",
            name: "review-lane",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "loopback-stale",
            name: "loopback-ready",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-complete",
                targetWorkName: "done-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "loopback-blocked",
            name: "loopback-waiting",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "review-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "loopback-repairable",
            name: "loopback-missing",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-missing",
                targetWorkName: "missing-lane",
                requiredState: "complete",
              },
            ],
          },
        ],
      }),
    });

    expect(formatPlannerLoopbackReconciliationReport(report)).toEqual(
      [
        "Planner loopback reconciliation",
        "generated-at=2026-06-21T00:00:00.000Z session=~planner",
        "totals loopbacks=3 stale-noise=1 blocked=1 repairable=1 dependencies=3 complete=1 active=1 failed=0 missing-from-queue=1 unknown=0",
        "",
        "stale-noise (1)",
        "- work-item=loopback-ready state=failed/terminal classification=stale-noise type=thoughts work-id=loopback-stale reason=all DEPENDS_ON targets already satisfy the loopback: done-lane (complete/terminal) dependencies=depends-on=done-lane status=complete required-state=complete declared-target-work-id=task-complete resolved-work-id=task-complete resolved-type=task resolved-state=complete/terminal",
        "",
        "blocked (1)",
        "- work-item=loopback-waiting state=init/initial classification=blocked type=thoughts work-id=loopback-blocked reason=waiting on unfinished dependencies: review-lane (in-review/processing) dependencies=depends-on=review-lane status=active required-state=complete declared-target-work-id=task-active resolved-work-id=task-active resolved-type=task resolved-state=in-review/processing",
        "",
        "repairable (1)",
        "- work-item=loopback-missing state=failed/terminal classification=repairable type=thoughts work-id=loopback-repairable reason=dependency evidence is inconsistent because required targets are missing from the queue: missing-lane (missing-from-queue) dependencies=depends-on=missing-lane status=missing-from-queue required-state=complete declared-target-work-id=task-missing",
      ].join("\n"),
    );
  });

  test("classifies missing or unknown dependency evidence as repairable before live blockers", () => {
    const report = discoverPlannerLoopbackReconciliationReport({
      generatedAtUtc: "2026-06-21T00:00:00.000Z",
      sourceSession: "~planner",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-weird",
            name: "weird-state",
            traceId: "trace-weird",
            workTypeName: "task",
            state: { name: "mystery", type: "UNKNOWN" },
          },
          {
            workId: "task-active",
            name: "still-running",
            traceId: "trace-active",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "loopback-1",
            name: "loopback-repairable",
            traceId: "trace-loopback",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "still-running",
                requiredState: "complete",
              },
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-weird",
                targetWorkName: "weird-state",
                requiredState: "complete",
              },
            ],
          },
        ],
      }),
    });

    expect(report.summary).toMatchObject({
      blockedLoopbacks: 0,
      repairableLoopbacks: 1,
      unknownDependencies: 1,
      activeDependencies: 1,
    });
    expect(report.loopbacks[0]).toMatchObject({
      classification: "repairable",
      reasons: [
        "dependency evidence could not be classified from the queue snapshot: weird-state (mystery/unknown)",
      ],
    });
  });
});
