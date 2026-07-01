import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface RepresentativeLinkageFixture {
  cleanup: () => void;
  workListPath: string;
  sessionListPath: string;
  prMapPath: string;
  worktreesRoot: string;
}

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

function writeLaneMetadata(
  worktreesRoot: string,
  worktreeName: string,
  metadata: Record<string, unknown>,
): void {
  const metadataDir = join(worktreesRoot, worktreeName, ".claude");
  mkdirSync(metadataDir, { recursive: true });
  writeFileSync(
    join(metadataDir, "lane-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function createRepresentativeLinkageFixture(): RepresentativeLinkageFixture {
  const dir = mkdtempSync(join(tmpdir(), "linkage-report-compatibility-"));
  const workListPath = join(dir, "work-list.json");
  const sessionListPath = join(dir, "session-list.json");
  const prMapPath = join(dir, "pr-map.json");
  const worktreesRoot = join(dir, ".claude", "worktrees");
  mkdirSync(worktreesRoot, { recursive: true });

  createWorktree(worktreesRoot, "alpha", "alpha");
  createWorktree(worktreesRoot, "beta", "beta");
  createWorktree(worktreesRoot, "gamma", "gamma");
  writeLaneMetadata(worktreesRoot, "alpha", {
    schemaVersion: 1,
    workItemName: "alpha",
    branchName: "alpha",
    branchMetadataSource: "setup",
    worktreePath: join(worktreesRoot, "alpha"),
    sessionId: "sess-1",
    pullRequest: null,
    createdAtUtc: "2026-06-20T21:08:34.000Z",
    refreshedAtUtc: "2026-06-20T21:08:34.000Z",
  });
  writeLaneMetadata(worktreesRoot, "beta", {
    schemaVersion: 1,
    workItemName: "beta",
    worktreePath: join(worktreesRoot, "beta"),
    sessionId: null,
    pullRequest: null,
    createdAtUtc: "2026-06-20T21:08:34.000Z",
    refreshedAtUtc: "2026-06-20T21:08:34.000Z",
  });
  writeLaneMetadata(worktreesRoot, "gamma", {
    schemaVersion: 1,
    workItemName: "gamma",
    branchName: "gamma",
    branchMetadataSource: "setup",
    worktreePath: join(worktreesRoot, "gamma"),
    sessionId: null,
    pullRequest: null,
    createdAtUtc: "2026-06-20T21:08:34.000Z",
    refreshedAtUtc: "2026-06-20T21:08:34.000Z",
  });

  writeFileSync(
    workListPath,
    JSON.stringify({
      items: [
        { name: "alpha", state: "active", sessionId: "sess-1" },
        {
          name: "beta",
          state: "failed",
          workTypeName: "thoughts",
          relations: [
            {
              type: "DEPENDS_ON",
              targetWorkId: "task-alpha",
              targetWorkName: "alpha",
              requiredState: "complete",
            },
          ],
        },
        { name: "delta", state: "failed" },
        { name: "epsilon", state: "active" },
        { name: "gamma", state: "failed" },
      ],
    }),
  );
  writeFileSync(
    sessionListPath,
    JSON.stringify({
      sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
    }),
  );
  writeFileSync(
    prMapPath,
    JSON.stringify({
      alpha: {
        number: 42,
        headRefName: "alpha",
        mergeStateStatus: "DIRTY",
        statusCheckRollup: [{ conclusion: "SUCCESS" }],
        url: "https://example.com/pr/42",
      },
      gamma: {
        pullRequest: null,
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch gamma",
      },
    }),
  );

  return {
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
    workListPath,
    sessionListPath,
    prMapPath,
    worktreesRoot,
  };
}

function runScript(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bun", args, { cwd: process.cwd(), encoding: "utf8" });
}

function readStdoutText(result: ReturnType<typeof spawnSync>): string {
  return typeof result.stdout === "string"
    ? result.stdout
    : result.stdout.toString("utf8");
}

function fixtureArgs(fixture: RepresentativeLinkageFixture): string[] {
  return [
    "--work-list-json",
    fixture.workListPath,
    "--session-list-json",
    fixture.sessionListPath,
    "--worktrees-dir",
    fixture.worktreesRoot,
    "--pr-map-json",
    fixture.prMapPath,
  ];
}

function assertRepresentativeLinkageSummary(stdout: string): void {
  expect(stdout).toContain("pr-backed=1");
  expect(stdout).toContain("actionable-gaps=1");
  expect(stdout).toContain("queue-only-noise=3");
  expect(stdout).toContain("pr=#42");
  expect(stdout).toContain("Noise Summary");
  expect(stdout).toContain(
    "noise=stale-failed-loopbacks count=1 work-items=beta",
  );
  expect(stdout).toContain(
    "noise=queue-only-missing-linkage count=2 work-items=delta,epsilon",
  );
}

function assertRepresentativeWatchdogRows(stdout: string): void {
  assertRepresentativeLinkageSummary(stdout);
  expect(stdout).toContain("work-item=alpha");
  expect(stdout).toContain(
    "- status=linked-with-gaps queue=failed work-item=gamma",
  );
  expect(stdout).not.toContain("work-item=delta");
  expect(stdout).not.toContain("work-item=epsilon");
  expect(stdout).not.toContain(
    "- status=linked-with-gaps queue=failed work-item=beta",
  );
}

function assertRepresentativeLedgerRows(stdout: string): void {
  assertRepresentativeLinkageSummary(stdout);
  expect(stdout).toContain("lane=alpha");
  expect(stdout).toContain("lane=gamma");
  expect(stdout).toContain("linkage=linked-with-gaps");
  expect(stdout).not.toContain("lane=beta");
  expect(stdout).not.toContain("lane=delta");
  expect(stdout).not.toContain("lane=epsilon");
}

describe("linkage classifier report compatibility", () => {
  test("watchdog script reports representative PR-backed, actionable-gap, and queue-only cases", () => {
    const fixture = createRepresentativeLinkageFixture();

    try {
      const result = runScript([
        "./scripts/active-pr-mergeability-watchdog.ts",
        ...fixtureArgs(fixture),
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Active PR Mergeability Watchdog");
      assertRepresentativeWatchdogRows(readStdoutText(result));
    } finally {
      fixture.cleanup();
    }
  });

  test("ledger script distinguishes representative PR-backed, actionable-gap, and queue-only cases", () => {
    const fixture = createRepresentativeLinkageFixture();

    try {
      const result = runScript([
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        ...fixtureArgs(fixture),
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Queue Worktree PR Linkage Ledger");
      expect(result.stdout).toContain(
        "queue-derived-lanes=5 active=2 failed=3 pr-backed=1 actionable-gaps=1 queue-only-noise=3 linked=1 linked-with-gaps=4",
      );
      assertRepresentativeLedgerRows(readStdoutText(result));
    } finally {
      fixture.cleanup();
    }
  });

  test("package commands keep the same representative linkage summaries", () => {
    const fixture = createRepresentativeLinkageFixture();

    try {
      const watchdogResult = runScript([
        "run",
        "watch:active-pr-mergeability",
        ...fixtureArgs(fixture),
      ]);
      const ledgerResult = runScript([
        "run",
        "report:queue-worktree-pr-linkage-ledger",
        ...fixtureArgs(fixture),
      ]);

      expect(watchdogResult.status).toBe(0);
      expect(ledgerResult.status).toBe(0);
      assertRepresentativeWatchdogRows(readStdoutText(watchdogResult));
      assertRepresentativeLedgerRows(readStdoutText(ledgerResult));
    } finally {
      fixture.cleanup();
    }
  });

  test("queue-health and linkage reports run together on the same fixture snapshot", () => {
    const fixture = createRepresentativeLinkageFixture();

    try {
      const queueHealthResult = runScript([
        "./scripts/report-planner-queue-health.ts",
        "--work-list-json",
        fixture.workListPath,
        "--json",
      ]);
      const watchdogResult = runScript([
        "./scripts/active-pr-mergeability-watchdog.ts",
        ...fixtureArgs(fixture),
      ]);
      const ledgerResult = runScript([
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        ...fixtureArgs(fixture),
      ]);

      expect(queueHealthResult.status).toBe(0);
      expect(watchdogResult.status).toBe(0);
      expect(ledgerResult.status).toBe(0);

      const queueHealthReport = JSON.parse(
        readStdoutText(queueHealthResult),
      ) as {
        activeWork: { items: Array<{ workItemName: string }> };
        expectedBlockedItems: { items: Array<{ workItemName: string }> };
        repairableFailures: { items: Array<{ workItemName: string }> };
      };
      expect(
        queueHealthReport.activeWork.items.map((item) => item.workItemName),
      ).toEqual(expect.arrayContaining(["alpha", "epsilon"]));
      expect(
        queueHealthReport.expectedBlockedItems.items.map(
          (item) => item.workItemName,
        ),
      ).toEqual(["beta"]);
      expect(
        queueHealthReport.repairableFailures.items.map(
          (item) => item.workItemName,
        ),
      ).toEqual(expect.arrayContaining(["delta", "gamma"]));
      assertRepresentativeWatchdogRows(readStdoutText(watchdogResult));
      assertRepresentativeLedgerRows(readStdoutText(ledgerResult));
    } finally {
      fixture.cleanup();
    }
  });
});
