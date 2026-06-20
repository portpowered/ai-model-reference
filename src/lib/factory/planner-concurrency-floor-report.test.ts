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
      sourceSession: "~planner",
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
      sourceSession: "~default",
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
    expect(jsonReport).toMatchObject({
      usefulActiveLaneCount: 1,
      concurrencyFloor: 2,
      floorStatus: "below-target",
      lanesNeededToReachFloor: 1,
    });
    expect(jsonReport.ignoredStaleNoise).toEqual([]);
  });
});
