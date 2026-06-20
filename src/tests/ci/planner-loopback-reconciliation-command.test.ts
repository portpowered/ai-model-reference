import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("report-planner-loopback-reconciliation script", () => {
  test("prints matching text and JSON loopback dependency evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-loopback-reconciliation-"));
    const workListPath = join(dir, "work-list.json");

    writeFileSync(
      workListPath,
      JSON.stringify({
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
            workId: "loopback-complete",
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
            workId: "loopback-active",
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
            workId: "loopback-failed",
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
            workId: "loopback-missing",
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
        ],
      }),
    );

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-loopback-reconciliation.ts",
          "--work-list-json",
          workListPath,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-loopback-reconciliation.ts",
          "--work-list-json",
          workListPath,
          "--json",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain("Planner loopback reconciliation");
      expect(humanResult.stdout).toContain(
        "totals loopbacks=4 dependencies=4 complete=1 active=1 failed=1 missing-from-queue=1 unknown=0",
      );
      expect(humanResult.stdout).toContain("work-item=loopback-ready");
      expect(humanResult.stdout).toContain(
        "depends-on=done-lane status=complete",
      );
      expect(humanResult.stdout).toContain("work-item=loopback-blocked");
      expect(humanResult.stdout).toContain(
        "depends-on=review-lane status=active",
      );
      expect(humanResult.stdout).toContain(
        "depends-on=failed-lane status=failed",
      );
      expect(humanResult.stdout).toContain(
        "depends-on=missing-lane status=missing-from-queue",
      );

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        summary: {
          loopbackCount: number;
          completeDependencies: number;
          activeDependencies: number;
          failedDependencies: number;
          missingFromQueueDependencies: number;
        };
        loopbacks: Array<{
          workItemName: string;
          dependencies: Array<{
            targetWorkName: string;
            status: string;
          }>;
        }>;
      };

      expect(jsonReport.summary).toMatchObject({
        loopbackCount: 4,
        completeDependencies: 1,
        activeDependencies: 1,
        failedDependencies: 1,
        missingFromQueueDependencies: 1,
      });
      expect(
        jsonReport.loopbacks.map((loopback) => loopback.workItemName),
      ).toEqual([
        "loopback-blocked",
        "loopback-failed-dependency",
        "loopback-missing-dependency",
        "loopback-ready",
      ]);
      expect(
        jsonReport.loopbacks.map(
          (loopback) => loopback.dependencies[0]?.status,
        ),
      ).toEqual(["active", "failed", "missing-from-queue", "complete"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
