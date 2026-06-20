import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("report-planner-queue-health script", () => {
  test("prints matching human-readable and machine-readable summaries for the same queue snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-queue-health-"));
    const workListPath = join(dir, "work-list.json");

    writeFileSync(
      workListPath,
      JSON.stringify({
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
    );

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-queue-health.ts",
          "--work-list-json",
          workListPath,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-queue-health.ts",
          "--work-list-json",
          workListPath,
          "--json",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain("Planner queue-health summary");
      expect(humanResult.stdout).toContain(
        "totals active=1 blocked=1 repairable=1 noise=0",
      );

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        activeWork: { items: Array<{ workItemName: string }> };
        expectedBlockedItems: { items: Array<{ workItemName: string }> };
        repairableFailures: { items: Array<{ workItemName: string }> };
        repairRecommendations: Array<{ workItemName: string; command: string }>;
      };
      expect(
        jsonReport.activeWork.items.map((item) => item.workItemName),
      ).toEqual(["alpha"]);
      expect(
        jsonReport.expectedBlockedItems.items.map((item) => item.workItemName),
      ).toEqual(["beta"]);
      expect(
        jsonReport.repairableFailures.items.map((item) => item.workItemName),
      ).toEqual(["gamma"]);
      expect(jsonReport.repairRecommendations).toHaveLength(1);
      expect(jsonReport.repairRecommendations[0]).toMatchObject({
        workItemName: "gamma",
        command: "you work move task-failed init --session ~default",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("surfaces all planner-facing buckets while keeping stale noise out of repair guidance", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-queue-health-"));
    const workListPath = join(dir, "work-list.json");

    writeFileSync(
      workListPath,
      JSON.stringify({
        results: [
          {
            workId: "idea-active",
            name: "fresh-idea",
            traceId: "trace-active",
            workTypeName: "idea",
            state: { name: "init", type: "INITIAL" },
          },
          {
            workId: "task-running",
            name: "review-lane",
            traceId: "trace-running",
            workTypeName: "task",
            state: { name: "in-review", type: "PROCESSING" },
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
    );

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-queue-health.ts",
          "--work-list-json",
          workListPath,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-queue-health.ts",
          "--work-list-json",
          workListPath,
          "--format",
          "json",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain(
        "totals active=2 blocked=1 repairable=1 noise=2",
      );
      expect(humanResult.stdout).toContain("Active Work (2)");
      expect(humanResult.stdout).toContain("Expected Blocked Items (1)");
      expect(humanResult.stdout).toContain("Repairable Failures (1)");
      expect(humanResult.stdout).toContain("Ignorable Stale Noise (2)");
      expect(humanResult.stdout).toContain(
        "command=you work move task-repair init --session ~default",
      );
      expect(humanResult.stdout).not.toContain(
        "command=you work move task-failed-stale init --session ~default",
      );
      expect(humanResult.stdout).not.toContain(
        "command=you work move cron-1 init --session ~default",
      );

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        activeWork: { items: Array<{ workItemName: string }> };
        expectedBlockedItems: { items: Array<{ workItemName: string }> };
        repairableFailures: { items: Array<{ workItemName: string }> };
        ignorableStaleNoise: {
          items: Array<{
            workItemName: string;
            occurrenceCount?: number;
            relatedWorkIds?: string[];
          }>;
        };
        repairRecommendations: Array<{ workItemName: string; command: string }>;
      };
      expect(
        jsonReport.activeWork.items.map((item) => item.workItemName),
      ).toEqual(["fresh-idea", "review-lane"]);
      expect(
        jsonReport.expectedBlockedItems.items.map((item) => item.workItemName),
      ).toEqual(["loopback-waiting"]);
      expect(
        jsonReport.repairableFailures.items.map((item) => item.workItemName),
      ).toEqual(["needs-repair"]);
      expect(
        jsonReport.ignorableStaleNoise.items.map((item) => item.workItemName),
      ).toEqual(["cron:though-retrigger", "shared-history"]);
      expect(jsonReport.repairRecommendations).toEqual([
        expect.objectContaining({
          workItemName: "needs-repair",
          command: "you work move task-repair init --session ~default",
        }),
      ]);
      expect(
        jsonReport.ignorableStaleNoise.items.find(
          (item) => item.workItemName === "cron:though-retrigger",
        ),
      ).toMatchObject({
        occurrenceCount: 2,
        relatedWorkIds: ["cron-1", "cron-2"],
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
