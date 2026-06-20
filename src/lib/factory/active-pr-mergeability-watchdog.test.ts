import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discoverActivePrLaneReport,
  formatActivePrLaneReport,
  type PullRequestRecord,
  parseQueueLaneRecords,
  parseSessionLaneRecords,
  type RunCommand,
} from "@/lib/factory/active-pr-mergeability-watchdog";

function createWorktree(
  root: string,
  name: string,
  branchName?: string,
): string {
  const worktreePath = join(root, name);
  mkdirSync(worktreePath, { recursive: true });
  if (branchName) {
    writeFileSync(
      join(worktreePath, "prd.json"),
      JSON.stringify({ branchName }, null, 2),
    );
  }
  return worktreePath;
}

function runCommandStub(branchesByPath: Map<string, string>): RunCommand {
  return (binary, args, cwd) => {
    if (
      binary === "git" &&
      args[0] === "branch" &&
      args[1] === "--show-current" &&
      cwd
    ) {
      return {
        ok: true,
        stdout: `${branchesByPath.get(cwd) ?? ""}\n`,
        stderr: "",
        exitCode: 0,
      };
    }
    return {
      ok: false,
      stdout: "",
      stderr: "unsupported command",
      exitCode: 1,
    };
  };
}

describe("queue and session payload parsing", () => {
  test("keeps only active or failed work items from flexible queue payload JSON", () => {
    const payload = JSON.stringify({
      items: [
        { name: "alpha", state: "active", sessionId: "sess-1" },
        { name: "beta", status: "failed" },
        { name: "gamma", state: "done" },
      ],
    });

    expect(parseQueueLaneRecords(payload)).toEqual([
      {
        workItemName: "alpha",
        queueState: "active",
        rawState: "active",
        sessionId: "sess-1",
      },
      {
        workItemName: "beta",
        queueState: "failed",
        rawState: "failed",
        sessionId: undefined,
      },
    ]);
  });

  test("reads work item names from session payload JSON", () => {
    const payload = JSON.stringify({
      sessions: [
        { id: "sess-1", workItemName: "alpha", status: "running" },
        { id: "sess-2", workItem: { name: "beta" }, state: "failed" },
      ],
    });

    expect(parseSessionLaneRecords(payload)).toEqual([
      { workItemName: "alpha", sessionId: "sess-1", rawState: "running" },
      { workItemName: "beta", sessionId: "sess-2", rawState: "failed" },
    ]);
  });
});

describe("discoverActivePrLaneReport", () => {
  test("reports PR-backed and unclassified lanes from queue and worktree state", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "active-pr-watchdog-"));
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha");
    const betaPath = createWorktree(worktreesRoot, "beta", "beta");

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [
          { name: "alpha", state: "active", sessionId: "sess-1" },
          { name: "beta", state: "failed" },
          { name: "gamma", state: "active" },
        ],
      }),
      sessionListJsonText: JSON.stringify({
        sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(
        new Map([
          [alphaPath, "alpha"],
          [betaPath, "beta"],
        ]),
      ),
      lookupPullRequest: (branchName): PullRequestRecord | null =>
        branchName === "alpha" ? { number: 42, headRefName: "alpha" } : null,
    });

    expect(report.issues).toEqual([]);
    expect(report.lanes).toEqual([
      {
        status: "pr-backed",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        prNumber: 42,
        prUrl: undefined,
        sessionId: "sess-1",
        sessionState: "running",
        reasons: [],
      },
      {
        status: "unclassified",
        workItemName: "beta",
        queueState: "failed",
        rawQueueState: "failed",
        worktreePath: ".claude/worktrees/beta",
        branchName: "beta",
        sessionId: undefined,
        sessionState: undefined,
        reasons: ["no open PR metadata found for branch beta"],
      },
      {
        status: "unclassified",
        workItemName: "gamma",
        queueState: "active",
        rawQueueState: "active",
        sessionId: undefined,
        sessionState: undefined,
        reasons: ["no matching worktree under .claude/worktrees"],
      },
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("formats a compact planner-facing report", () => {
    const reportText = formatActivePrLaneReport({
      issues: [],
      lanes: [
        {
          status: "pr-backed",
          workItemName: "alpha",
          queueState: "active",
          rawQueueState: "active",
          branchName: "alpha",
          worktreePath: ".claude/worktrees/alpha",
          prNumber: 42,
          reasons: [],
        },
        {
          status: "unclassified",
          workItemName: "beta",
          queueState: "failed",
          rawQueueState: "failed",
          branchName: "beta",
          worktreePath: ".claude/worktrees/beta",
          reasons: ["no open PR metadata found for branch beta"],
        },
      ],
    });

    expect(reportText).toContain("Active PR Mergeability Watchdog");
    expect(reportText).toContain("lanes=2 pr-backed=1 unclassified=1");
    expect(reportText).toContain(
      "- status=pr-backed queue=active work-item=alpha branch=alpha worktree=.claude/worktrees/alpha pr=#42",
    );
    expect(reportText).toContain(
      "reason=no open PR metadata found for branch beta",
    );
  });
});
