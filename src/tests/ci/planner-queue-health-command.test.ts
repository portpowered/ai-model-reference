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
});
