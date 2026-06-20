import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("report-planner-concurrency-floor script", () => {
  test("prints matching human-readable and machine-readable floor summaries for the same queue snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-concurrency-floor-"));
    const workListPath = join(dir, "work-list.json");

    writeFileSync(
      workListPath,
      JSON.stringify({
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
            workId: "task-failed",
            name: "historic-failure",
            state: { name: "failed", type: "FAILED" },
          },
        ],
      }),
    );

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--work-list-json",
          workListPath,
          "--floor",
          "3",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--work-list-json",
          workListPath,
          "--floor",
          "3",
          "--json",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain("Planner concurrency-floor summary");
      expect(humanResult.stdout).toContain(
        "summary useful-active=2 floor=3 status=below-target refill-needed=1 advisory-only=true",
      );
      expect(humanResult.stdout).toContain("Useful Active Lanes (2)");
      expect(humanResult.stdout).toContain("Ignored Stale Noise (0)");

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        advisoryOnly: boolean;
        usefulActiveLaneCount: number;
        concurrencyFloor: number;
        floorStatus: string;
        lanesNeededToReachFloor: number;
        usefulActiveLanes: Array<{ workItemName: string }>;
      };
      expect(jsonReport).toMatchObject({
        advisoryOnly: true,
        usefulActiveLaneCount: 2,
        concurrencyFloor: 3,
        floorStatus: "below-target",
        lanesNeededToReachFloor: 1,
      });
      expect(
        jsonReport.usefulActiveLanes.map((lane) => lane.workItemName),
      ).toEqual(["alpha", "beta"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("surfaces stale noise evidence without letting it raise the useful active lane count", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-concurrency-floor-"));
    const workListPath = join(dir, "work-list.json");

    writeFileSync(
      workListPath,
      JSON.stringify({
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
            sessionId: "session-loopback",
            state: { name: "in-review", type: "PROCESSING" },
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
    );

    try {
      const result = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--work-list-json",
          workListPath,
          "--floor",
          "2",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        "summary useful-active=2 floor=2 status=at-target refill-needed=0 advisory-only=true",
      );
      expect(result.stdout).toContain("Ignored Stale Noise (2)");
      expect(result.stdout).toContain("work-item=cron:though-retrigger");
      expect(result.stdout).toContain("occurrences=2");
      expect(result.stdout).toContain("work-item=loopback-refill");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
