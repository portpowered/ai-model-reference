import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("report-planner-concurrency-floor script", () => {
  test("prints matching human-readable and machine-readable floor summaries for the same queue snapshot", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-concurrency-floor-"));
    const workListPath = join(dir, "work-list.json");
    const rootStatusPath = join(dir, "root-status.txt");
    const tasksRoot = join(dir, "tasks");
    const tempRoot = join(dir, "docs", "temp");

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
    writeFileSync(rootStatusPath, "");
    mkdirSync(join(tasksRoot, "ideas-to-review", "content"), {
      recursive: true,
    });
    mkdirSync(tempRoot, { recursive: true });

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
          "--floor",
          "3",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
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
    const rootStatusPath = join(dir, "root-status.txt");
    const tasksRoot = join(dir, "tasks");
    const tempRoot = join(dir, "docs", "temp");

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
    writeFileSync(rootStatusPath, "");
    mkdirSync(tasksRoot, { recursive: true });
    mkdirSync(tempRoot, { recursive: true });

    try {
      const result = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
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

  test("reads planner-owned backlog candidates from tasks and excludes held or already-active lanes from refill suggestions", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-concurrency-floor-"));
    const workListPath = join(dir, "work-list.json");
    const rootStatusPath = join(dir, "root-status.txt");
    const tasksRoot = join(dir, "tasks");
    const tempRoot = join(dir, "docs", "temp");

    writeFileSync(
      workListPath,
      JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "active-lane",
            sessionId: "session-active",
            state: { name: "in-review", type: "PROCESSING" },
          },
        ],
      }),
    );
    writeFileSync(rootStatusPath, "");
    mkdirSync(join(tasksRoot, "ideas-to-review", "content"), {
      recursive: true,
    });
    mkdirSync(tempRoot, { recursive: true });
    writeFileSync(
      join(tasksRoot, "ideas-to-review", "content", "alpha-refill.md"),
      "# Alpha Refill\n- Scope `src/features/docs/search`\n",
    );
    writeFileSync(
      join(tasksRoot, "ideas-to-review", "content", "beta-held.md"),
      "# Beta Held\n",
    );
    writeFileSync(
      join(tasksRoot, "ideas-to-review", "content", "active-lane.md"),
      "# Active Lane\n",
    );
    writeFileSync(
      join(tempRoot, "checklist.md"),
      [
        "# Planner Checklist",
        "",
        "## Holds",
        "- beta-held blocked by dependency on generated registry cleanup",
      ].join("\n"),
    );

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
          "--floor",
          "3",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
          "--floor",
          "3",
          "--json",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain(
        "Planner-Owned Backlog Candidates (3)",
      );
      expect(humanResult.stdout).toContain(
        "task=ideas-to-review/content/alpha-refill status=ready eligible=true recommendation=prefer evidence=grounded",
      );
      expect(humanResult.stdout).toContain(
        "task=ideas-to-review/content/beta-held status=held eligible=false recommendation=hold",
      );
      expect(humanResult.stdout).toContain(
        "task=ideas-to-review/content/active-lane status=already-active eligible=false recommendation=hold",
      );
      expect(humanResult.stdout).toContain("Refill Candidates (1)");
      expect(humanResult.stdout).toContain(
        "task=ideas-to-review/content/alpha-refill title=Alpha Refill recommendation=prefer evidence=grounded",
      );

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        plannerOwnedBacklogCandidates: Array<{
          refillRecommendation: string;
          taskId: string;
          status: string;
          eligibleForRefill: boolean;
        }>;
        refillCandidates: Array<{
          refillRecommendation: string;
          taskId: string;
        }>;
      };

      expect(
        jsonReport.plannerOwnedBacklogCandidates.map((candidate) => ({
          eligibleForRefill: candidate.eligibleForRefill,
          recommendation: candidate.refillRecommendation,
          status: candidate.status,
          taskId: candidate.taskId,
        })),
      ).toEqual([
        {
          eligibleForRefill: false,
          recommendation: "hold",
          status: "already-active",
          taskId: "ideas-to-review/content/active-lane",
        },
        {
          eligibleForRefill: true,
          recommendation: "prefer",
          status: "ready",
          taskId: "ideas-to-review/content/alpha-refill",
        },
        {
          eligibleForRefill: false,
          recommendation: "hold",
          status: "held",
          taskId: "ideas-to-review/content/beta-held",
        },
      ]);
      expect(
        jsonReport.refillCandidates.map((candidate) => ({
          recommendation: candidate.refillRecommendation,
          taskId: candidate.taskId,
        })),
      ).toEqual([
        {
          recommendation: "prefer",
          taskId: "ideas-to-review/content/alpha-refill",
        },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("ranks refill recommendations by dirty-path overlap and evidence completeness", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-concurrency-floor-"));
    const workListPath = join(dir, "work-list.json");
    const rootStatusPath = join(dir, "root-status.txt");
    const tasksRoot = join(dir, "tasks");
    const tempRoot = join(dir, "docs", "temp");

    writeFileSync(
      workListPath,
      JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "active-lane",
            sessionId: "session-active",
            state: { name: "in-review", type: "PROCESSING" },
          },
        ],
      }),
    );
    writeFileSync(
      rootStatusPath,
      " M src/lib/factory/planner-concurrency-floor-report.ts\n",
    );
    mkdirSync(join(tasksRoot, "ideas-to-review", "content"), {
      recursive: true,
    });
    mkdirSync(tempRoot, { recursive: true });
    writeFileSync(
      join(tasksRoot, "ideas-to-review", "content", "alpha-safe.md"),
      ["# Alpha Safe", "", "- Scope `src/features/docs/search` only."].join(
        "\n",
      ),
    );
    writeFileSync(
      join(tasksRoot, "ideas-to-review", "content", "beta-overlap.md"),
      [
        "# Beta Overlap",
        "",
        "- Touches `src/lib/factory/planner-concurrency-floor-report.ts`.",
      ].join("\n"),
    );
    writeFileSync(
      join(tasksRoot, "ideas-to-review", "content", "gamma-unclear.md"),
      "# Gamma Unclear\n",
    );

    try {
      const humanResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
          "--floor",
          "4",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      const jsonResult = spawnSync(
        "bun",
        [
          "./scripts/report-planner-concurrency-floor.ts",
          "--root-git-status-file",
          rootStatusPath,
          "--work-list-json",
          workListPath,
          "--tasks-root",
          tasksRoot,
          "--temp-root",
          tempRoot,
          "--floor",
          "4",
          "--json",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(humanResult.status).toBe(0);
      expect(jsonResult.status).toBe(0);
      expect(humanResult.stdout).toContain("Refill Candidates (3)");

      const jsonReport = JSON.parse(jsonResult.stdout) as {
        refillCandidates: Array<{
          evidenceQuality: string;
          refillRecommendation: string;
          taskId: string;
        }>;
      };

      expect(
        jsonReport.refillCandidates.map((candidate) => candidate.taskId),
      ).toEqual([
        "ideas-to-review/content/alpha-safe",
        "ideas-to-review/content/gamma-unclear",
        "ideas-to-review/content/beta-overlap",
      ]);
      expect(
        jsonReport.refillCandidates.map((candidate) => ({
          evidenceQuality: candidate.evidenceQuality,
          refillRecommendation: candidate.refillRecommendation,
        })),
      ).toEqual([
        {
          evidenceQuality: "grounded",
          refillRecommendation: "prefer",
        },
        {
          evidenceQuality: "missing",
          refillRecommendation: "uncertain",
        },
        {
          evidenceQuality: "partial",
          refillRecommendation: "hold",
        },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
