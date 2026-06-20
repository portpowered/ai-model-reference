import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function installFakePaginatedYouBinary(dir: string, logPath: string): string {
  const binDir = join(dir, "bin");
  const binaryPath = join(binDir, "you");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(
    binaryPath,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "${logPath}"
if [ "$1" = "work" ] && [ "$2" = "list" ]; then
  case "$*" in
    *"--next-token cursor-page-2"*)
      printf '%s' '{"results":[{"workId":"task-known-complete-1","name":"planner-loopback-reconciliation-and-completion-repair","traceId":"trace-complete-1","workTypeName":"task","state":{"name":"complete","type":"TERMINAL"}},{"workId":"task-known-complete-2","name":"ontology-topology-search-topology-prototype","traceId":"trace-complete-2","workTypeName":"task","state":{"name":"complete","type":"TERMINAL"}}]}'
      ;;
    *)
      printf '%s' '{"results":[{"workId":"loopback-known-complete","name":"loopback-known-complete","traceId":"trace-loopback-known-complete","workTypeName":"thoughts","state":{"name":"failed","type":"FAILED"},"relations":[{"type":"DEPENDS_ON","targetWorkId":"task-known-complete-1","targetWorkName":"planner-loopback-reconciliation-and-completion-repair","requiredState":"complete"},{"type":"DEPENDS_ON","targetWorkId":"task-known-complete-2","targetWorkName":"ontology-topology-search-topology-prototype","requiredState":"complete"}]}],"paginationContext":{"nextToken":"cursor-page-2"}}'
      ;;
  esac
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(binaryPath, 0o755);
  return binDir;
}

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
        "totals loopbacks=4 stale-noise=1 blocked=2 repairable=1 dependencies=4 complete=1 active=1 failed=1 missing-from-queue=1 unknown=0",
      );
      expect(humanResult.stdout).toContain("stale-noise (1)");
      expect(humanResult.stdout).toContain("blocked (2)");
      expect(humanResult.stdout).toContain("repairable (1)");
      expect(humanResult.stdout).toContain("work-item=loopback-ready");
      expect(humanResult.stdout).toContain("classification=stale-noise");
      expect(humanResult.stdout).toContain(
        "depends-on=done-lane status=complete",
      );
      expect(humanResult.stdout).toContain("work-item=loopback-blocked");
      expect(humanResult.stdout).toContain("classification=blocked");
      expect(humanResult.stdout).toContain(
        "depends-on=review-lane status=active",
      );
      expect(humanResult.stdout).toContain(
        "depends-on=failed-lane status=failed",
      );
      expect(humanResult.stdout).toContain("classification=repairable");
      expect(humanResult.stdout).toContain(
        "next-step=dispatch the missing dependency targets before moving this loopback: missing-lane",
      );
      expect(humanResult.stdout).toContain(
        "depends-on=missing-lane status=missing-from-queue",
      );

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        summary: {
          loopbackCount: number;
          staleNoiseLoopbacks: number;
          blockedLoopbacks: number;
          repairableLoopbacks: number;
          completeDependencies: number;
          activeDependencies: number;
          failedDependencies: number;
          missingFromQueueDependencies: number;
        };
        loopbacks: Array<{
          workItemName: string;
          classification: string;
          recommendedNextStep?: string;
          dependencies: Array<{
            targetWorkName: string;
            status: string;
          }>;
        }>;
      };

      expect(jsonReport.summary).toMatchObject({
        loopbackCount: 4,
        staleNoiseLoopbacks: 1,
        blockedLoopbacks: 2,
        repairableLoopbacks: 1,
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
        jsonReport.loopbacks.map((loopback) => loopback.classification),
      ).toEqual(["blocked", "blocked", "repairable", "stale-noise"]);
      expect(jsonReport.loopbacks[0]?.recommendedNextStep).toBeUndefined();
      expect(jsonReport.loopbacks[1]?.recommendedNextStep).toBeUndefined();
      expect(jsonReport.loopbacks[2]?.recommendedNextStep).toBe(
        "dispatch the missing dependency targets before moving this loopback: missing-lane",
      );
      expect(jsonReport.loopbacks[3]?.recommendedNextStep).toBeUndefined();
      expect(
        jsonReport.loopbacks.map(
          (loopback) => loopback.dependencies[0]?.status,
        ),
      ).toEqual(["active", "failed", "missing-from-queue", "complete"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("follows paginated live queue snapshots so known completed dependencies stay out of missing-from-queue output", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-loopback-reconciliation-"));
    const commandLogPath = join(dir, "you-command.log");
    const fakeYouBinDir = installFakePaginatedYouBinary(dir, commandLogPath);

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-loopback-reconciliation.ts",
          "--session",
          "planner-session-89",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${fakeYouBinDir}:${process.env.PATH ?? ""}`,
          },
        },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-loopback-reconciliation.ts",
          "--session",
          "planner-session-89",
          "--json",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${fakeYouBinDir}:${process.env.PATH ?? ""}`,
          },
        },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain(
        "totals loopbacks=1 stale-noise=1 blocked=0 repairable=0 dependencies=2 complete=2 active=0 failed=0 missing-from-queue=0 unknown=0",
      );
      expect(humanResult.stdout).toContain(
        "planner-loopback-reconciliation-and-completion-repair",
      );
      expect(humanResult.stdout).toContain(
        "ontology-topology-search-topology-prototype",
      );
      expect(humanResult.stdout).not.toContain("status=missing-from-queue");

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        summary: {
          staleNoiseLoopbacks: number;
          completeDependencies: number;
          missingFromQueueDependencies: number;
        };
        loopbacks: Array<{
          workItemName: string;
          classification: string;
          dependencies: Array<{ targetWorkName: string; status: string }>;
        }>;
      };
      expect(jsonReport.summary).toMatchObject({
        staleNoiseLoopbacks: 1,
        completeDependencies: 2,
        missingFromQueueDependencies: 0,
      });
      expect(jsonReport.loopbacks).toEqual([
        expect.objectContaining({
          workItemName: "loopback-known-complete",
          classification: "stale-noise",
          dependencies: [
            expect.objectContaining({
              targetWorkName:
                "planner-loopback-reconciliation-and-completion-repair",
              status: "complete",
            }),
            expect.objectContaining({
              targetWorkName: "ontology-topology-search-topology-prototype",
              status: "complete",
            }),
          ],
        }),
      ]);

      const commandLog = readFileSync(commandLogPath, "utf8");
      expect(commandLog).toContain(
        "work list --session planner-session-89 --json",
      );
      expect(commandLog).toContain(
        "work list --session planner-session-89 --next-token cursor-page-2 --json",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
