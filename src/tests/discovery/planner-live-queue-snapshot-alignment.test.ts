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

function createWorktree(
  worktreesRoot: string,
  worktreeName: string,
  branchName: string,
): void {
  const worktreePath = join(worktreesRoot, worktreeName);
  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(
    join(worktreePath, "prd.json"),
    JSON.stringify({ branchName }, null, 2),
  );
}

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
      printf '%s' '{"results":[{"workId":"task-known-complete-1","name":"planner-loopback-reconciliation-and-completion-repair","traceId":"trace-complete-1","workTypeName":"task","state":{"name":"complete","type":"TERMINAL"}},{"workId":"task-known-complete-2","name":"ontology-topology-search-topology-prototype","traceId":"trace-complete-2","workTypeName":"task","state":{"name":"complete","type":"TERMINAL"}},{"workId":"task-beta","name":"beta","placeId":"lane-beta","traceId":"trace-beta","workTypeName":"task","state":{"name":"failed","type":"FAILED"}}]}'
      ;;
    *)
      printf '%s' '{"results":[{"workId":"loopback-follow-up","name":"planner-follow-up","traceId":"trace-follow-up","workTypeName":"thoughts","state":{"name":"failed","type":"FAILED"},"relations":[{"type":"DEPENDS_ON","targetWorkId":"task-known-complete-1","targetWorkName":"planner-loopback-reconciliation-and-completion-repair","requiredState":"complete"},{"type":"DEPENDS_ON","targetWorkId":"task-known-complete-2","targetWorkName":"ontology-topology-search-topology-prototype","requiredState":"complete"}]},{"workId":"task-alpha","name":"alpha","placeId":"lane-alpha","traceId":"trace-alpha","workTypeName":"task","state":{"name":"in-review","type":"PROCESSING"},"sessionId":"sess-1"}],"paginationContext":{"nextToken":"cursor-page-2"}}'
      ;;
  esac
  exit 0
fi
if [ "$1" = "session" ] && [ "$2" = "list" ]; then
  printf '%s' '{"sessions":[{"id":"sess-1","workItemName":"alpha","status":"running"}]}'
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(binaryPath, 0o755);
  writeFileSync(
    join(binDir, "gh"),
    `#!/bin/sh
set -eu
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  printf '%s' '[]'
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(join(binDir, "gh"), 0o755);
  return binDir;
}

function runPlannerScript(
  args: string[],
  fakeYouBinDir: string,
): ReturnType<typeof spawnSync> {
  return spawnSync("bun", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeYouBinDir}:${process.env.PATH ?? ""}`,
    },
  });
}

function readStdoutText(result: ReturnType<typeof spawnSync>): string {
  return typeof result.stdout === "string"
    ? result.stdout
    : result.stdout.toString("utf8");
}

describe("planner live queue snapshot alignment", () => {
  test(
    "planner reports agree on later-page completed work and active or failed lanes",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "planner-live-queue-alignment-"));
      const commandLogPath = join(dir, "you-command.log");
      const worktreesRoot = join(dir, ".claude", "worktrees");
      mkdirSync(worktreesRoot, { recursive: true });

      createWorktree(worktreesRoot, "alpha", "alpha");
      createWorktree(worktreesRoot, "beta", "beta");

      const fakeYouBinDir = installFakePaginatedYouBinary(dir, commandLogPath);

      try {
        const queueHealthResult = runPlannerScript(
          [
            "./scripts/report-planner-queue-health.ts",
            "--session",
            "planner-session-91",
            "--json",
          ],
          fakeYouBinDir,
        );
        const loopbackResult = runPlannerScript(
          [
            "./scripts/report-planner-loopback-reconciliation.ts",
            "--session",
            "planner-session-91",
            "--json",
          ],
          fakeYouBinDir,
        );
        const linkageResult = runPlannerScript(
          [
            "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
            "--worktrees-dir",
            worktreesRoot,
            "--session",
            "planner-session-91",
          ],
          fakeYouBinDir,
        );
        const mergeabilityResult = runPlannerScript(
          [
            "./scripts/active-pr-mergeability-watchdog.ts",
            "--worktrees-dir",
            worktreesRoot,
            "--session",
            "planner-session-91",
          ],
          fakeYouBinDir,
        );

        expect(queueHealthResult.status).toBe(0);
        expect(loopbackResult.status).toBe(0);
        expect(linkageResult.status).toBe(0);
        expect(mergeabilityResult.status).toBe(0);

        const queueHealthReport = JSON.parse(
          readStdoutText(queueHealthResult),
        ) as {
          expectedBlockedItems: { items: Array<{ workItemName: string }> };
          repairableFailures: { items: Array<{ workItemName: string }> };
        };
        expect(queueHealthReport.expectedBlockedItems.items).toEqual([]);
        expect(queueHealthReport.repairableFailures.items).toHaveLength(2);
        expect(
          queueHealthReport.repairableFailures.items.map(
            (item) => item.workItemName,
          ),
        ).toEqual(expect.arrayContaining(["planner-follow-up", "beta"]));

        const loopbackReport = JSON.parse(readStdoutText(loopbackResult)) as {
          summary: { missingFromQueueDependencies: number };
          loopbacks: Array<{
            workItemName: string;
            dependencies: Array<{ targetWorkName: string; status: string }>;
          }>;
        };
        expect(loopbackReport.summary.missingFromQueueDependencies).toBe(0);
        expect(loopbackReport.loopbacks).toEqual([
          expect.objectContaining({
            workItemName: "planner-follow-up",
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

        const linkageStdout = readStdoutText(linkageResult);
        expect(linkageStdout).toContain(
          "queue-derived-lanes=3 active=1 failed=2 pr-backed=0 actionable-gaps=2 queue-only-noise=1 linked=0 linked-with-gaps=3",
        );
        expect(linkageStdout).toContain("lane=alpha");
        expect(linkageStdout).toContain("lane=beta");
        expect(linkageStdout).toContain("Noise Summary");
        expect(linkageStdout).toContain(
          "noise=queue-only-missing-linkage count=1 work-items=planner-follow-up",
        );
        expect(linkageStdout).not.toContain("lane=planner-follow-up");

        const mergeabilityStdout = readStdoutText(mergeabilityResult);
        expect(mergeabilityStdout).toContain(
          "lanes=3 pr-backed=0 actionable-gaps=2 queue-only-noise=1",
        );
        expect(mergeabilityStdout).toContain("work-item=alpha");
        expect(mergeabilityStdout).toContain(
          "- status=linked-with-gaps queue=failed work-item=beta",
        );
        expect(mergeabilityStdout).toContain(
          "noise=queue-only-missing-linkage count=1 work-items=planner-follow-up",
        );
        expect(mergeabilityStdout).not.toContain(
          "noise=stale-failed-loopbacks count=1 work-items=beta",
        );
        expect(mergeabilityStdout).not.toContain(
          "- status=linked-with-gaps queue=failed work-item=planner-follow-up",
        );
        expect(mergeabilityStdout).not.toContain(
          "No active or failed queue lanes were discovered.",
        );

        const commandLog = readFileSync(commandLogPath, "utf8");
        expect(
          commandLog.match(
            /work list --session planner-session-91 --next-token cursor-page-2 --json/g,
          ),
        ).toHaveLength(4);
        expect(commandLog.match(/session list --json/g)).toHaveLength(2);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    { timeout: 20_000 },
  );
});
