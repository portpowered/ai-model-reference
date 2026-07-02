import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SESSION_ID = "0fdc5077-95ed-4396-a183-06e5b16555ca";
const WORK_ITEM = "tokens-per-second-serving-metric-page";
const PR_NUMBER = 251;
const BATCH_061_ACTIVE_LANES = [
  "stable-diffusion-model-page",
  "relative-position-bias-concept-page",
  "prefill-decode-split-concept-page",
] as const;

const MERGE_HANDOFF_ALLOWLISTED_DIFF_PATHS = [
  "docs/internal/processes/tokens-per-second-pr251-merge-handoff-relevant-files.md",
  "docs/internal/processes/factory-linkage-relevant-files.md",
  "src/tests/discovery/tokens-per-second-pr251-merge-handoff-compatibility.test.ts",
] as const;

const MERGE_HANDOFF_PROHIBITED_DIFF_PATTERN =
  /src\/content\/|src\/lib\/content\/|stable-diffusion|relative-position-bias|prefill-decode-split|tokens-per-second\//;

const HANDOFF_ARTIFACT_PATH =
  "docs/internal/processes/tokens-per-second-pr251-merge-handoff-relevant-files.md";

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

interface Pr251Batch061Fixture extends Pr251MergeHandoffFixture {
  concurrencyFloorWorkListPath: string;
}

function createPr251WithBatch061Fixture(): Pr251Batch061Fixture {
  const base = createPr251MergeHandoffFixture();
  const dir = join(base.workListPath, "..");
  const concurrencyFloorWorkListPath = join(
    dir,
    "concurrency-floor-work-list.json",
  );

  for (const [index, laneName] of BATCH_061_ACTIVE_LANES.entries()) {
    const worktreePath = join(base.worktreesRoot, laneName);
    mkdirSync(worktreePath, { recursive: true });
    writeFileSync(
      join(worktreePath, "prd.json"),
      JSON.stringify({ branchName: laneName }, null, 2),
    );
    mkdirSync(join(worktreePath, ".claude"), { recursive: true });
    writeFileSync(
      join(worktreePath, ".claude", "lane-metadata.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          workItemName: laneName,
          branchName: laneName,
          branchMetadataSource: "setup",
          worktreePath,
          sessionId: `batch-061-session-${index + 1}`,
          pullRequest: {
            number: 300 + index,
            url: `https://example.com/pull/${300 + index}`,
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
  }

  const prMap = JSON.parse(readFileSync(base.prMapPath, "utf8")) as Record<
    string,
    unknown
  >;
  for (const [index, laneName] of BATCH_061_ACTIVE_LANES.entries()) {
    prMap[laneName] = {
      number: 300 + index,
      headRefName: laneName,
      mergeStateStatus: "CLEAN",
      statusCheckRollup: [{ conclusion: "SUCCESS" }],
      url: `https://example.com/pull/${300 + index}`,
    };
  }
  writeFileSync(base.prMapPath, JSON.stringify(prMap, null, 2));

  const workList = JSON.parse(readFileSync(base.workListPath, "utf8")) as {
    items: Array<Record<string, unknown>>;
  };
  workList.items.push(
    ...BATCH_061_ACTIVE_LANES.map((laneName, index) => ({
      name: laneName,
      workId: `batch-061-task-${index + 1}`,
      workTypeName: "task",
      state: "in-progress",
      sessionId: `batch-061-session-${index + 1}`,
    })),
  );
  writeFileSync(base.workListPath, JSON.stringify(workList, null, 2));

  const sessionList = JSON.parse(
    readFileSync(base.sessionListPath, "utf8"),
  ) as {
    sessions: Array<Record<string, unknown>>;
  };
  sessionList.sessions.push(
    ...BATCH_061_ACTIVE_LANES.map((laneName, index) => ({
      id: `batch-061-session-${index + 1}`,
      workItemName: laneName,
      status: "running",
    })),
  );
  writeFileSync(base.sessionListPath, JSON.stringify(sessionList, null, 2));

  writeFileSync(
    concurrencyFloorWorkListPath,
    JSON.stringify({
      results: [
        {
          workId: "work-task-155",
          name: WORK_ITEM,
          sessionId: SESSION_ID,
          state: { name: "failed", type: "FAILED" },
        },
        {
          workId:
            "batch-serving-metric-tokens-per-second-batch-039-tokens-per-second-serving-metric-page",
          name: WORK_ITEM,
          workTypeName: "idea",
          state: { name: "to-complete", type: "PROCESSING" },
        },
        ...BATCH_061_ACTIVE_LANES.map((laneName, index) => ({
          workId: `batch-061-task-${index + 1}`,
          name: laneName,
          sessionId: `batch-061-session-${index + 1}`,
          state: { name: "in-progress", type: "PROCESSING" },
        })),
      ],
    }),
  );

  return {
    ...base,
    concurrencyFloorWorkListPath,
  };
}

function runScript(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bun", args, { cwd: process.cwd(), encoding: "utf8" });
}

function runGit(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
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

function resolveMergeHandoffBaseRef(): string | null {
  for (const candidate of ["origin/main", "main"]) {
    const probe = runGit(["rev-parse", "--verify", candidate]);
    if (probe.status === 0) {
      return candidate;
    }
  }

  return null;
}

function readBranchDiffPaths(): string[] {
  const baseRef = resolveMergeHandoffBaseRef();
  expect(baseRef).not.toBeNull();

  let result = runGit(["diff", `${baseRef}...HEAD`, "--name-only"]);
  if (result.status !== 0) {
    result = runGit([
      "log",
      `${baseRef}..HEAD`,
      "--name-only",
      "--pretty=format:",
    ]);
  }

  expect(result.status).toBe(0);
  return [...new Set(
    readStdoutText(result)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  )].sort();
}

function assertMergeHandoffScopePreservation(diffPaths: string[]): void {
  expect([...diffPaths].sort()).toEqual(
    [...MERGE_HANDOFF_ALLOWLISTED_DIFF_PATHS].sort(),
  );
  for (const path of diffPaths) {
    expect(path).not.toMatch(MERGE_HANDOFF_PROHIBITED_DIFF_PATTERN);
  }
}

function assertMergeHandoffCompleteness(handoffMarkdown: string): void {
  expect(handoffMarkdown).toContain("## PR #251 state");
  expect(handoffMarkdown).toContain(`pr=#${PR_NUMBER}`);
  expect(handoffMarkdown).toContain("work-task-155");
  expect(handoffMarkdown).toContain("idea:to-complete");
  expect(handoffMarkdown).toContain("## Branch and worktree metadata");
  expect(handoffMarkdown).toContain("lane-kind=stale-clean-pr-mismatch");
  expect(handoffMarkdown).toContain("## Lane decision (story 002)");
  expect(handoffMarkdown).toContain("safe branch refresh");
  expect(handoffMarkdown).toContain(
    "## Planner report classification (story 003)",
  );
  expect(handoffMarkdown).toContain(
    "## Non-page scope preservation and handoff verification (story 004)",
  );
}

function assertPr251RecoveryClassificationEvidence(
  watchdogStdout: string,
  ledgerStdout: string,
): void {
  expect(watchdogStdout).toContain(`work-item=${WORK_ITEM}`);
  expect(watchdogStdout).toContain(`pr=#${PR_NUMBER}`);
  expect(watchdogStdout).toContain("action=open-follow-up");
  expect(watchdogStdout).not.toContain(
    `lane-kind=active-page-implementation work-item=${WORK_ITEM}`,
  );

  expect(ledgerStdout).toContain("Stale PR Mismatch Summary");
  expect(ledgerStdout).toContain(`lane=${WORK_ITEM}`);
  expect(ledgerStdout).toContain(`pr=#${PR_NUMBER}`);
  expect(ledgerStdout).toContain("lane-kind=stale-clean-pr-mismatch");
  expect(ledgerStdout).toContain("next-action=open-follow-up-throughput-prd");
  expect(ledgerStdout).toContain("stale-clean-pr-mismatch=1");
  expect(ledgerStdout).not.toContain(
    `lane-kind=active-page-implementation lane=${WORK_ITEM}`,
  );

  for (const laneName of BATCH_061_ACTIVE_LANES) {
    expect(ledgerStdout).toContain(`lane=${laneName}`);
    expect(ledgerStdout).toContain(`lane-kind=active-page-implementation`);
    expect(ledgerStdout).not.toContain(
      `lane-kind=stale-clean-pr-mismatch lane=${laneName}`,
    );
    expect(watchdogStdout).toContain(`work-item=${laneName}`);
    expect(watchdogStdout).not.toContain(
      `action=open-follow-up work-item=${laneName}`,
    );
  }
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

  test("merge handoff lane preserves non-page scope and records complete handoff", () => {
    const diffPaths = readBranchDiffPaths();
    const handoffMarkdown = readFileSync(HANDOFF_ARTIFACT_PATH, "utf8");

    assertMergeHandoffScopePreservation(diffPaths);
    assertMergeHandoffCompleteness(handoffMarkdown);
  });

  test("planner reports separate PR #251 recovery from batch 061 useful active lanes", () => {
    const fixture = createPr251WithBatch061Fixture();
    const rootStatusPath = join(fixture.workListPath, "..", "root-status.txt");
    const tasksRoot = join(fixture.workListPath, "..", "tasks");
    const tempRoot = join(fixture.workListPath, "..", "docs", "temp");
    writeFileSync(rootStatusPath, "");
    mkdirSync(tasksRoot, { recursive: true });
    mkdirSync(tempRoot, { recursive: true });

    try {
      const watchdogResult = runScript([
        "./scripts/active-pr-mergeability-watchdog.ts",
        ...fixtureArgs(fixture),
      ]);
      const ledgerResult = runScript([
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        ...fixtureArgs(fixture),
      ]);
      const concurrencyFloorResult = runScript([
        "./scripts/report-planner-concurrency-floor.ts",
        "--root-git-status-file",
        rootStatusPath,
        "--work-list-json",
        fixture.concurrencyFloorWorkListPath,
        "--tasks-root",
        tasksRoot,
        "--temp-root",
        tempRoot,
        "--floor",
        "3",
        "--json",
      ]);

      expect(watchdogResult.status).toBe(0);
      expect(ledgerResult.status).toBe(0);
      expect(concurrencyFloorResult.status).toBe(0);

      const watchdogStdout = readStdoutText(watchdogResult);
      const ledgerStdout = readStdoutText(ledgerResult);
      const concurrencyFloorReport = JSON.parse(
        readStdoutText(concurrencyFloorResult),
      ) as {
        usefulActiveLaneCount: number;
        usefulActiveLanes: Array<{ workItemName: string }>;
      };

      assertPr251RecoveryClassificationEvidence(watchdogStdout, ledgerStdout);
      expect(concurrencyFloorReport.usefulActiveLaneCount).toBe(3);
      expect(
        concurrencyFloorReport.usefulActiveLanes
          .map((lane) => lane.workItemName)
          .sort(),
      ).toEqual([...BATCH_061_ACTIVE_LANES].sort());
      expect(
        concurrencyFloorReport.usefulActiveLanes.some(
          (lane) => lane.workItemName === WORK_ITEM,
        ),
      ).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });
});
