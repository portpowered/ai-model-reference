import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SESSION_ID = "0fdc5077-95ed-4396-a183-06e5b16555ca";
const WORK_ITEM = "tokens-per-second-serving-metric-page";
const PR_NUMBER = 251;

interface Pr251MergeHandoffFixture {
  cleanup: () => void;
  workListPath: string;
  sessionListPath: string;
  prMapPath: string;
  worktreesRoot: string;
}

function createPr251MergeHandoffFixture(): Pr251MergeHandoffFixture {
  const dir = mkdtempSync(
    join(tmpdir(), "tokens-per-second-pr251-merge-handoff-"),
  );
  const workListPath = join(dir, "work-list.json");
  const sessionListPath = join(dir, "session-list.json");
  const prMapPath = join(dir, "pr-map.json");
  const worktreesRoot = join(dir, ".claude", "worktrees");
  const worktreePath = join(worktreesRoot, WORK_ITEM);

  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(
    join(worktreePath, "prd.json"),
    JSON.stringify({ branchName: WORK_ITEM }, null, 2),
  );
  mkdirSync(join(worktreePath, ".claude"), { recursive: true });
  writeFileSync(
    join(worktreePath, ".claude", "lane-metadata.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        workItemName: WORK_ITEM,
        branchName: WORK_ITEM,
        branchMetadataSource: "setup",
        worktreePath,
        sessionId: SESSION_ID,
        pullRequest: {
          number: PR_NUMBER,
          url: `https://example.com/pull/${PR_NUMBER}`,
        },
        createdAtUtc: "2026-06-20T21:08:34.000Z",
        refreshedAtUtc: "2026-07-02T05:01:30.864Z",
        linkage: {
          branch: {
            status: "current",
            refreshedAtUtc: "2026-07-02T05:01:30.864Z",
          },
          pullRequest: {
            status: "current",
            refreshedAtUtc: "2026-07-02T05:01:30.864Z",
          },
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    workListPath,
    JSON.stringify({
      items: [
        {
          name: WORK_ITEM,
          workId: "work-task-155",
          workTypeName: "task",
          state: "failed",
          sessionId: SESSION_ID,
        },
        {
          name: WORK_ITEM,
          workId:
            "batch-serving-metric-tokens-per-second-batch-039-tokens-per-second-serving-metric-page",
          workTypeName: "idea",
          state: "to-complete",
          sessionId: SESSION_ID,
        },
      ],
    }),
  );
  writeFileSync(
    sessionListPath,
    JSON.stringify({
      sessions: [
        { id: SESSION_ID, workItemName: WORK_ITEM, status: "running" },
      ],
    }),
  );
  writeFileSync(
    prMapPath,
    JSON.stringify({
      [WORK_ITEM]: {
        number: PR_NUMBER,
        headRefName: WORK_ITEM,
        mergeStateStatus: "CLEAN",
        statusCheckRollup: [{ conclusion: "SUCCESS" }],
        url: `https://example.com/pull/${PR_NUMBER}`,
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

function fixtureArgs(fixture: Pr251MergeHandoffFixture): string[] {
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

function assertPr251StaleMismatchWatchdogEvidence(stdout: string): void {
  expect(stdout).toContain("Active PR Mergeability Watchdog");
  expect(stdout).toContain(`work-item=${WORK_ITEM}`);
  expect(stdout).toContain(`pr=#${PR_NUMBER}`);
  expect(stdout).toContain("actionable-gaps=0");
  expect(stdout).toContain("action=open-follow-up");
  expect(stdout).not.toContain("lane-kind=active-page-implementation");
}

function assertPr251StaleMismatchLedgerEvidence(stdout: string): void {
  expect(stdout).toContain("Queue Worktree PR Linkage Ledger");
  expect(stdout).toContain(`lane=${WORK_ITEM}`);
  expect(stdout).toContain(`pr=#${PR_NUMBER}`);
  expect(stdout).toContain("queue=failed");
  expect(stdout).toContain("mergeability=mergeable");
  expect(stdout).toContain("checks=passing");
  expect(stdout).toContain("risk=queue-stale");
  expect(stdout).toContain("lane-kind=stale-clean-pr-mismatch");
  expect(stdout).toContain(
    `mismatch-reason=clean-passing-open-pr-with-queue-failed pr=#251`,
  );
  expect(stdout).toContain("next-action=open-follow-up-throughput-prd");
  expect(stdout).toContain("Stale PR Mismatch Summary");
  expect(stdout).toContain("stale-clean-pr-mismatch=1");
  expect(stdout).toContain("actionable-gaps=0");
  expect(stdout).not.toContain(
    `lane-kind=active-page-implementation lane=${WORK_ITEM}`,
  );
}

describe("tokens-per-second PR #251 merge handoff compatibility", () => {
  test("watchdog and ledger reports capture PR #251 stale queue evidence", () => {
    const fixture = createPr251MergeHandoffFixture();

    try {
      const watchdogResult = runScript([
        "./scripts/active-pr-mergeability-watchdog.ts",
        ...fixtureArgs(fixture),
      ]);
      const ledgerResult = runScript([
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        ...fixtureArgs(fixture),
      ]);

      expect(watchdogResult.status).toBe(0);
      expect(ledgerResult.status).toBe(0);

      assertPr251StaleMismatchWatchdogEvidence(readStdoutText(watchdogResult));
      assertPr251StaleMismatchLedgerEvidence(readStdoutText(ledgerResult));
    } finally {
      fixture.cleanup();
    }
  });

  test("package commands keep the same PR #251 merge handoff evidence output", () => {
    const fixture = createPr251MergeHandoffFixture();

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

      assertPr251StaleMismatchWatchdogEvidence(readStdoutText(watchdogResult));
      assertPr251StaleMismatchLedgerEvidence(readStdoutText(ledgerResult));
    } finally {
      fixture.cleanup();
    }
  });
});
