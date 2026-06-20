import { describe, expect, test } from "bun:test";
import {
  discoverPlannerQueueHealthReport,
  formatPlannerQueueHealthReport,
  type QueueHealthReport,
  serializePlannerQueueHealthReport,
} from "@/lib/factory/planner-queue-health";

describe("discoverPlannerQueueHealthReport", () => {
  test("classifies active, blocked, and repairable queue items from live-style payloads", () => {
    const report = discoverPlannerQueueHealthReport({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-1",
            name: "active-task",
            traceId: "trace-active",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "idea-1",
            name: "ready-idea",
            traceId: "trace-ready",
            tags: { _work_type: "idea" },
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "loopback-1",
            name: "blocked-loopback",
            traceId: "trace-loopback",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-1",
                targetWorkName: "active-task",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "task-2",
            name: "failed-task",
            traceId: "trace-failed",
            workTypeName: "task",
            state: { name: "failed", type: "TERMINAL" },
          },
          {
            workId: "done-1",
            name: "completed-task",
            traceId: "trace-done",
            workTypeName: "task",
            state: { name: "complete", type: "TERMINAL" },
          },
        ],
      }),
    });

    expect(report.activeWork.items.map((item) => item.workItemName)).toEqual([
      "active-task",
      "ready-idea",
    ]);
    expect(
      report.expectedBlockedItems.items.map((item) => item.workItemName),
    ).toEqual(["blocked-loopback"]);
    expect(
      report.repairableFailures.items.map((item) => item.workItemName),
    ).toEqual(["failed-task"]);
    expect(report.ignorableStaleNoise.items).toEqual([]);
    expect(report.expectedBlockedItems.items[0]?.reasons).toEqual([
      "waiting on active-task (in-review/processing)",
    ]);
  });

  test("formats a concise planner-facing sectioned summary", () => {
    const report = discoverPlannerQueueHealthReport({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      sourceSession: "~default",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-1",
            name: "alpha",
            traceId: "trace-alpha",
            workTypeName: "task",
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "task-2",
            name: "beta",
            traceId: "trace-beta",
            workTypeName: "task",
            state: { name: "failed", type: "TERMINAL" },
          },
        ],
      }),
    });

    const reportText = formatPlannerQueueHealthReport(report);

    expect(reportText).toContain("Planner queue-health summary");
    expect(reportText).toContain(
      "totals active=1 blocked=0 repairable=1 noise=0",
    );
    expect(reportText).toContain("Active Work (1)");
    expect(reportText).toContain(
      "- work-item=alpha state=init/initial type=task trace=trace-alpha work-id=task-1 reason=state init/initial",
    );
    expect(reportText).toContain("Expected Blocked Items (0)");
    expect(reportText).toContain("Repairable Failures (1)");
    expect(reportText).toContain("Ignorable Stale Noise (0)");
    expect(reportText).toContain("Repair Guidance (1)");
    expect(reportText).toContain(
      "command=you work move task-2 init --session ~default",
    );
  });

  test("demotes superseded failed duplicates and groups repeated cron failures as ignorable noise", () => {
    const report = discoverPlannerQueueHealthReport({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active-1",
            name: "shared-work-name",
            traceId: "trace-shared",
            workTypeName: "idea",
            state: { name: "to-complete", type: "PROCESSING" },
          },
          {
            workId: "task-failed-1",
            name: "shared-work-name",
            traceId: "trace-shared",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "cron-1",
            name: "cron:though-retrigger",
            traceId: "trace-cron-1",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "cron-2",
            name: "cron:though-retrigger",
            traceId: "trace-cron-2",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "task-failed-unique",
            name: "unique-failed-work",
            traceId: "trace-unique-failed",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    expect(
      report.repairableFailures.items.map((item) => item.workItemName),
    ).toEqual(["unique-failed-work"]);
    expect(
      report.ignorableStaleNoise.items.map((item) => item.workItemName),
    ).toEqual(["cron:though-retrigger", "shared-work-name"]);

    const staleDuplicate = report.ignorableStaleNoise.items.find(
      (item) => item.workItemName === "shared-work-name",
    );
    expect(staleDuplicate?.reasons).toEqual([
      "failed item is superseded by shared-work-name to-complete/processing type=idea work-id=task-active-1 trace=trace-shared",
    ]);

    const groupedCronNoise = report.ignorableStaleNoise.items.find(
      (item) => item.workItemName === "cron:though-retrigger",
    );
    expect(groupedCronNoise?.occurrenceCount).toBe(2);
    expect(groupedCronNoise?.relatedWorkIds).toEqual(["cron-1", "cron-2"]);
    expect(groupedCronNoise?.relatedTraceIds).toEqual([
      "trace-cron-1",
      "trace-cron-2",
    ]);
    expect(groupedCronNoise?.reasons).toEqual([
      "grouped 2 repeated failed cron thoughts items",
      "group-work-ids=cron-1,cron-2",
      "group-traces=trace-cron-1,trace-cron-2",
    ]);
  });

  test("emits repair guidance only for unique repairable failures", () => {
    const report = discoverPlannerQueueHealthReport({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      sourceSession: "~planner",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-repairable",
            name: "repair-me",
            traceId: "trace-repairable",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "task-active",
            name: "still-running",
            traceId: "trace-active",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "thoughts-blocked",
            name: "loopback",
            traceId: "trace-loopback",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "still-running",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "task-active-copy",
            name: "shadowed-failure",
            traceId: "trace-shadow-active",
            workTypeName: "task",
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "task-failed-copy",
            name: "shadowed-failure",
            traceId: "trace-shadow-failed",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    expect(report.repairRecommendations).toEqual([
      {
        workId: "task-repairable",
        workItemName: "repair-me",
        workTypeName: "task",
        currentStateName: "failed",
        currentStateType: "TERMINAL",
        suggestedStateName: "init",
        reason:
          "queue evidence shows repair-me is terminal failed; factory repair guidance only recommends manual moves for unique repairable failures; factory workflow docs use `init` as the safe re-entry state after the failure is understood",
        command: "you work move task-repairable init --session ~planner",
      },
    ]);

    const reportText = formatPlannerQueueHealthReport(report);
    expect(reportText).toContain("Repair Guidance (1)");
    expect(reportText).toContain(
      "command=you work move task-repairable init --session ~planner",
    );
    expect(reportText).not.toContain(
      "command=you work move task-failed-copy init --session ~planner",
    );
    expect(reportText).not.toContain(
      "command=you work move thoughts-blocked init --session ~planner",
    );
  });

  test("serializes the same classification decisions for machine-readable consumers", () => {
    const report = discoverPlannerQueueHealthReport({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      sourceSession: "~default",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "alpha",
            traceId: "trace-alpha",
            workTypeName: "task",
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "task-blocked",
            name: "beta",
            traceId: "trace-beta",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "alpha",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "task-failed",
            name: "gamma",
            traceId: "trace-gamma",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    const reportJsonText = serializePlannerQueueHealthReport(report);
    const parsedReport = JSON.parse(reportJsonText) as typeof report;

    expect(parsedReport).toEqual(report);

    const reportText = formatPlannerQueueHealthReport(report);
    expect(reportText).toContain(
      "totals active=1 blocked=1 repairable=1 noise=0",
    );
    expect(
      parsedReport.activeWork.items.map((item) => item.workItemName),
    ).toEqual(["alpha"]);
    expect(
      parsedReport.expectedBlockedItems.items.map((item) => item.workItemName),
    ).toEqual(["beta"]);
    expect(
      parsedReport.repairRecommendations.map((item) => item.workItemName),
    ).toEqual(["gamma"]);
  });

  test("covers the full planner-facing classification fixture without promoting stale noise into repair guidance", () => {
    const report = discoverPlannerQueueHealthReport({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      sourceSession: "~default",
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "idea-active",
            name: "fresh-idea",
            traceId: "trace-active",
            workTypeName: "idea",
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "thoughts-blocked",
            name: "loopback-waiting",
            traceId: "trace-blocked",
            workTypeName: "thoughts",
            state: { name: "init", type: "INITIAL" },
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-running",
                targetWorkName: "review-lane",
                requiredState: "complete",
              },
            ],
          },
          {
            workId: "task-running",
            name: "review-lane",
            traceId: "trace-running",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
          },
          {
            workId: "task-failed-stale",
            name: "shared-history",
            traceId: "trace-stale",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "task-complete",
            name: "shared-history",
            traceId: "trace-complete",
            workTypeName: "task",
            state: { name: "complete", type: "TERMINAL" },
          },
          {
            workId: "cron-1",
            name: "cron:though-retrigger",
            traceId: "trace-cron-1",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "cron-2",
            name: "cron:though-retrigger",
            traceId: "trace-cron-2",
            workTypeName: "thoughts",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "task-repair",
            name: "needs-repair",
            traceId: "trace-repair",
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    });

    expect(report.activeWork.items.map((item) => item.workItemName)).toEqual([
      "fresh-idea",
      "review-lane",
    ]);
    expect(
      report.expectedBlockedItems.items.map((item) => item.workItemName),
    ).toEqual(["loopback-waiting"]);
    expect(
      report.repairableFailures.items.map((item) => item.workItemName),
    ).toEqual(["needs-repair"]);
    expect(
      report.ignorableStaleNoise.items.map((item) => item.workItemName),
    ).toEqual(["cron:though-retrigger", "shared-history"]);
    expect(report.repairRecommendations).toEqual([
      expect.objectContaining({
        workItemName: "needs-repair",
        command: "you work move task-repair init --session ~default",
      }),
    ]);

    const parsedReport = JSON.parse(
      serializePlannerQueueHealthReport(report),
    ) as QueueHealthReport;
    expect(
      parsedReport.activeWork.items.map((item) => item.workItemName),
    ).toEqual(["fresh-idea", "review-lane"]);
    expect(
      parsedReport.ignorableStaleNoise.items.find(
        (item) => item.workItemName === "shared-history",
      )?.reasons,
    ).toEqual([
      "failed item is superseded by shared-history complete/terminal type=task work-id=task-complete trace=trace-complete",
    ]);
    expect(
      parsedReport.ignorableStaleNoise.items.find(
        (item) => item.workItemName === "cron:though-retrigger",
      ),
    ).toMatchObject({
      occurrenceCount: 2,
      relatedWorkIds: ["cron-1", "cron-2"],
      relatedTraceIds: ["trace-cron-1", "trace-cron-2"],
    });

    const reportText = formatPlannerQueueHealthReport(report);
    expect(reportText).toContain("Active Work (2)");
    expect(reportText).toContain("Expected Blocked Items (1)");
    expect(reportText).toContain("Repairable Failures (1)");
    expect(reportText).toContain("Ignorable Stale Noise (2)");
    expect(reportText).toContain(
      "reason=failed item is superseded by shared-history complete/terminal type=task work-id=task-complete trace=trace-complete",
    );
    expect(reportText).toContain(
      "reason=grouped 2 repeated failed cron thoughts items; group-work-ids=cron-1,cron-2; group-traces=trace-cron-1,trace-cron-2",
    );
    expect(reportText).toContain("Repair Guidance (1)");
    expect(reportText).toContain("work-item=needs-repair");
    expect(reportText).not.toContain(
      "command=you work move task-failed-stale init --session ~default",
    );
    expect(reportText).not.toContain(
      "command=you work move cron-1 init --session ~default",
    );
  });
});
