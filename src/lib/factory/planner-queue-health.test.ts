import { describe, expect, test } from "bun:test";
import {
  discoverPlannerQueueHealthReport,
  formatPlannerQueueHealthReport,
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
  });
});
