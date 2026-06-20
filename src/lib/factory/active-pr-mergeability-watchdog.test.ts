import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyBranchDrift,
  classifyMergeability,
  determineQueueMismatchRisk,
  discoverActivePrLaneReport,
  discoverWorktreeLaneRecords,
  formatActivePrLaneReport,
  type PullRequestLookupResult,
  parseQueueLaneRecords,
  parseSessionLaneRecords,
  type RunCommand,
  recommendPlannerNextAction,
  summarizeCheckHealth,
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

function runCommandStub(
  branchesByPath: Map<string, string>,
  driftCountsByBranch: Map<string, string> = new Map(),
): RunCommand {
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
    if (
      binary === "git" &&
      args[0] === "rev-list" &&
      args[1] === "--left-right" &&
      args[2] === "--count"
    ) {
      const spec = args[3] ?? "";
      const branchName = spec.split("...")[1] ?? "";
      const stdout = driftCountsByBranch.get(branchName);
      if (stdout) {
        return {
          ok: true,
          stdout: `${stdout}\n`,
          stderr: "",
          exitCode: 0,
        };
      }
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
  test("reports PR-backed and unclassified lanes with drift, checks, and mergeability", () => {
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
        new Map([
          ["alpha", "0\t2"],
          ["beta", "3\t0"],
        ]),
      ),
      lookupPullRequest: (branchName): PullRequestLookupResult =>
        branchName === "alpha"
          ? {
              pullRequest: {
                number: 42,
                headRefName: "alpha",
                baseRefName: "main",
                mergeStateStatus: "BLOCKED",
                statusCheckRollup: [{ status: "IN_PROGRESS" }],
              },
            }
          : {
              pullRequest: null,
              failureKind: "not-found",
              failureReason: `no open PR metadata found for branch ${branchName}`,
            },
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
        branchMetadataSource: "git",
        prNumber: 42,
        prUrl: undefined,
        sessionId: "sess-1",
        sessionState: "running",
        driftStatus: "ahead",
        commitsAheadOfMain: 2,
        commitsBehindMain: 0,
        checkHealth: "pending",
        mergeabilityClass: "check-blocked",
        queueMismatchRisk: "checks-blocked",
        nextAction: "wait",
        reasons: [],
      },
      {
        status: "unclassified",
        workItemName: "beta",
        queueState: "failed",
        rawQueueState: "failed",
        worktreePath: ".claude/worktrees/beta",
        branchName: "beta",
        branchMetadataSource: "git",
        sessionId: undefined,
        sessionState: undefined,
        driftStatus: "behind",
        commitsAheadOfMain: 0,
        commitsBehindMain: 3,
        queueMismatchRisk: undefined,
        nextAction: undefined,
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
          driftStatus: "diverged",
          commitsAheadOfMain: 2,
          commitsBehindMain: 1,
          checkHealth: "failing",
          mergeabilityClass: "conflicting",
          queueMismatchRisk: "conflict-drift",
          nextAction: "refresh-branch",
          reasons: [],
        },
        {
          status: "unclassified",
          workItemName: "beta",
          queueState: "failed",
          rawQueueState: "failed",
          branchName: "beta",
          worktreePath: ".claude/worktrees/beta",
          driftStatus: "unknown",
          reasons: ["no open PR metadata found for branch beta"],
        },
      ],
    });

    expect(reportText).toContain("Active PR Mergeability Watchdog");
    expect(reportText).toContain("lanes=2 pr-backed=1 unclassified=1");
    expect(reportText).toContain(
      "- status=pr-backed queue=active work-item=alpha branch=alpha worktree=.claude/worktrees/alpha pr=#42 drift=diverged(ahead=2,behind=1) mergeability=conflicting checks=failing risk=conflict-drift next-action=refresh-branch",
    );
    expect(reportText).toContain(
      "pr=? drift=unknown reason=no open PR metadata found for branch beta",
    );
  });
});

describe("story 002 classification helpers", () => {
  test("prefers live git branch metadata and falls back to prd branch metadata", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "worktree-branch-resolution-"));
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const gitBackedPath = createWorktree(worktreesRoot, "alpha", "alpha-prd");
    createWorktree(worktreesRoot, "beta", "beta-prd");
    createWorktree(worktreesRoot, "gamma");

    const records = discoverWorktreeLaneRecords(
      worktreesRoot,
      runCommandStub(new Map([[gitBackedPath, "alpha-git"]])),
    ).sort((left, right) =>
      left.worktreeName.localeCompare(right.worktreeName),
    );

    expect(records).toEqual([
      {
        worktreeName: "alpha",
        worktreePath: gitBackedPath,
        branchName: "alpha-git",
        branchMetadataSource: "git",
        gitBranchName: "alpha-git",
        prdBranchName: "alpha-prd",
      },
      {
        worktreeName: "beta",
        worktreePath: join(worktreesRoot, "beta"),
        branchName: "beta-prd",
        branchMetadataSource: "prd",
        gitBranchName: undefined,
        prdBranchName: "beta-prd",
      },
      {
        worktreeName: "gamma",
        worktreePath: join(worktreesRoot, "gamma"),
        branchName: undefined,
        branchMetadataSource: undefined,
        gitBranchName: undefined,
        prdBranchName: undefined,
      },
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("classifies drift against main from git rev-list counts", () => {
    const runCommand: RunCommand = (_, args) => ({
      ok: true,
      stdout:
        args[3] === "main...ahead-branch"
          ? "0\t4\n"
          : args[3] === "main...behind-branch"
            ? "2\t0\n"
            : args[3] === "main...diverged-branch"
              ? "3\t1\n"
              : "0\t0\n",
      stderr: "",
      exitCode: 0,
    });

    expect(classifyBranchDrift("ahead-branch", runCommand)).toEqual({
      status: "ahead",
      commitsAheadOfMain: 4,
      commitsBehindMain: 0,
    });
    expect(classifyBranchDrift("behind-branch", runCommand)).toEqual({
      status: "behind",
      commitsAheadOfMain: 0,
      commitsBehindMain: 2,
    });
    expect(classifyBranchDrift("diverged-branch", runCommand)).toEqual({
      status: "diverged",
      commitsAheadOfMain: 1,
      commitsBehindMain: 3,
    });
    expect(classifyBranchDrift("clean-branch", runCommand)).toEqual({
      status: "up-to-date",
      commitsAheadOfMain: 0,
      commitsBehindMain: 0,
    });
  });

  test("summarizes check health and mergeability into planner-facing classes", () => {
    expect(summarizeCheckHealth([{ conclusion: "SUCCESS" }])).toBe("passing");
    expect(summarizeCheckHealth([{ status: "IN_PROGRESS" }])).toBe("pending");
    expect(summarizeCheckHealth([{ conclusion: "FAILURE" }])).toBe("failing");
    expect(summarizeCheckHealth(undefined)).toBe("unavailable");

    expect(classifyMergeability("CLEAN", "passing")).toBe("mergeable");
    expect(classifyMergeability("DIRTY", "passing")).toBe("conflicting");
    expect(classifyMergeability("BLOCKED", "pending")).toBe("check-blocked");
    expect(classifyMergeability(undefined, "unavailable")).toBe("unknown");
  });

  test("maps lane risk to one constrained planner action", () => {
    expect(
      determineQueueMismatchRisk({
        queueState: "active",
        mergeabilityClass: "conflicting",
        checkHealth: "passing",
      }),
    ).toBe("conflict-drift");
    expect(
      recommendPlannerNextAction({
        queueMismatchRisk: "conflict-drift",
        mergeabilityClass: "conflicting",
        checkHealth: "passing",
      }),
    ).toBe("refresh-branch");

    expect(
      determineQueueMismatchRisk({
        queueState: "active",
        mergeabilityClass: "check-blocked",
        checkHealth: "pending",
      }),
    ).toBe("checks-blocked");
    expect(
      recommendPlannerNextAction({
        queueMismatchRisk: "checks-blocked",
        mergeabilityClass: "check-blocked",
        checkHealth: "pending",
      }),
    ).toBe("wait");
    expect(
      recommendPlannerNextAction({
        queueMismatchRisk: "checks-blocked",
        mergeabilityClass: "check-blocked",
        checkHealth: "failing",
      }),
    ).toBe("open-follow-up-throughput-prd");

    expect(
      determineQueueMismatchRisk({
        queueState: "failed",
        mergeabilityClass: "mergeable",
        checkHealth: "passing",
      }),
    ).toBe("queue-stale");
    expect(
      recommendPlannerNextAction({
        queueMismatchRisk: "queue-stale",
        mergeabilityClass: "mergeable",
        checkHealth: "passing",
      }),
    ).toBe("open-follow-up-throughput-prd");

    expect(
      recommendPlannerNextAction({
        queueMismatchRisk: "metadata-unavailable",
        mergeabilityClass: "unknown",
        checkHealth: "unavailable",
      }),
    ).toBe("repair-token");
  });

  test("surfaces auth failures as planner-usable metadata risk", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "active-pr-watchdog-auth-"));
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha");

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "alpha", state: "active" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(new Map([[alphaPath, "alpha"]])),
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "auth",
        failureReason: "gh auth token is expired",
      }),
    });

    expect(report.lanes).toEqual([
      {
        status: "unclassified",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        branchMetadataSource: "git",
        sessionId: undefined,
        sessionState: undefined,
        driftStatus: "unknown",
        commitsAheadOfMain: undefined,
        commitsBehindMain: undefined,
        queueMismatchRisk: "metadata-unavailable",
        nextAction: "repair-token",
        reasons: ["gh auth token is expired"],
      },
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("keeps the lane visible when git and prd branch metadata disagree", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-mismatch-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha-prd");

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "alpha", state: "active" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(
        new Map([[alphaPath, "alpha-git"]]),
        new Map([["alpha-git", "0\t0"]]),
      ),
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch alpha-git",
      }),
    });

    expect(report.lanes).toEqual([
      {
        status: "unclassified",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha-git",
        branchMetadataSource: "git",
        sessionId: undefined,
        sessionState: undefined,
        driftStatus: "up-to-date",
        commitsAheadOfMain: 0,
        commitsBehindMain: 0,
        queueMismatchRisk: undefined,
        nextAction: undefined,
        reasons: [
          "git branch alpha-git disagrees with prd branch alpha-prd",
          "no open PR metadata found for branch alpha-git",
        ],
      },
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });
});
