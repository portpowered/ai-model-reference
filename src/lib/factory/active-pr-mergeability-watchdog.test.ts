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

function writeLaneMetadata(
  worktreePath: string,
  metadata: Record<string, unknown>,
): void {
  const metadataDir = join(worktreePath, ".claude");
  mkdirSync(metadataDir, { recursive: true });
  writeFileSync(
    join(metadataDir, "lane-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
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
        workTypeName: undefined,
        hasDependsOnRelation: false,
      },
      {
        workItemName: "beta",
        queueState: "failed",
        rawState: "failed",
        sessionId: undefined,
        workTypeName: undefined,
        hasDependsOnRelation: false,
      },
    ]);
  });

  test("accepts live work-list records with nested state objects and extra placement metadata", () => {
    const payload = JSON.stringify({
      results: [
        {
          workId: "task-active",
          name: "alpha",
          placeId: "lane-alpha",
          state: { name: "in-review", type: "PROCESSING" },
          sessionId: "sess-1",
        },
        {
          workId: "task-failed",
          name: "beta",
          placeId: "lane-beta",
          state: { name: "failed", type: "FAILED" },
        },
        {
          workId: "loopback-failed",
          name: "planner-follow-up",
          workTypeName: "thoughts",
          state: { name: "failed", type: "FAILED" },
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
          workId: "task-queued",
          name: "gamma",
          placeId: "lane-gamma",
          state: { name: "init", type: "INITIAL" },
        },
      ],
    });

    expect(parseQueueLaneRecords(payload)).toEqual([
      {
        workItemName: "alpha",
        queueState: "active",
        rawState: "in-review",
        sessionId: "sess-1",
        workTypeName: undefined,
        hasDependsOnRelation: false,
      },
      {
        workItemName: "beta",
        queueState: "failed",
        rawState: "failed",
        sessionId: undefined,
        workTypeName: undefined,
        hasDependsOnRelation: false,
      },
      {
        workItemName: "planner-follow-up",
        queueState: "failed",
        rawState: "failed",
        sessionId: undefined,
        workTypeName: "thoughts",
        hasDependsOnRelation: true,
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
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(betaPath, {
      schemaVersion: 1,
      workItemName: "beta",
      branchName: "beta",
      branchMetadataSource: "setup",
      worktreePath: betaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

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
        workTypeName: undefined,
        hasDependsOnRelation: false,
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        prNumber: 42,
        prUrl: undefined,
        sessionId: "sess-1",
        sessionIdSource: "queue",
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
        workTypeName: undefined,
        hasDependsOnRelation: false,
        worktreePath: ".claude/worktrees/beta",
        branchName: "beta",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        prLookupFailureKind: "not-found",
        prLookupFailureReason: "no open PR metadata found for branch beta",
        sessionId: undefined,
        sessionIdSource: undefined,
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
        workTypeName: undefined,
        hasDependsOnRelation: false,
        sessionId: undefined,
        sessionIdSource: undefined,
        sessionState: undefined,
        reasons: ["no matching worktree under .claude/worktrees"],
        workItemNameSource: "queue",
      },
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("keeps live-schema active and failed lanes visible through discovery", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "active-pr-watchdog-live-"));
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha");
    const betaPath = createWorktree(worktreesRoot, "beta", "beta");
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(betaPath, {
      schemaVersion: 1,
      workItemName: "beta",
      branchName: "beta",
      branchMetadataSource: "setup",
      worktreePath: betaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "alpha",
            placeId: "lane-alpha",
            state: { name: "in-review", type: "PROCESSING" },
            sessionId: "sess-1",
          },
          {
            workId: "task-failed",
            name: "beta",
            placeId: "lane-beta",
            state: { name: "failed", type: "FAILED" },
          },
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
          ["alpha", "0\t0"],
          ["beta", "0\t1"],
        ]),
      ),
      lookupPullRequest: (branchName): PullRequestLookupResult =>
        branchName === "alpha"
          ? {
              pullRequest: {
                number: 42,
                headRefName: "alpha",
                mergeStateStatus: "CLEAN",
                statusCheckRollup: [{ conclusion: "SUCCESS" }],
              },
            }
          : {
              pullRequest: null,
              failureKind: "not-found",
              failureReason: "no open PR metadata found for branch beta",
            },
    });

    expect(report.issues).toEqual([]);
    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "pr-backed",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "in-review",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        sessionId: "sess-1",
        sessionIdSource: "queue",
        sessionState: "running",
        mergeabilityClass: "mergeable",
        checkHealth: "passing",
      }),
      expect.objectContaining({
        status: "unclassified",
        workItemName: "beta",
        queueState: "failed",
        rawQueueState: "failed",
        worktreePath: ".claude/worktrees/beta",
        branchName: "beta",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        prLookupFailureKind: "not-found",
        prLookupFailureReason: "no open PR metadata found for branch beta",
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("keeps lanes visible and surfaces stamped stale linkage as explicit gaps", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "active-pr-watchdog-stale-"));
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha");
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: "sess-1",
      pullRequest: {
        number: 7,
        url: "https://example.com/pr/7",
      },
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-21T00:05:00.000Z",
      linkage: {
        branch: {
          status: "stale",
          issue: "git branch inspection failed during the last refresh",
          refreshedAtUtc: "2026-06-21T00:05:00.000Z",
        },
        pullRequest: {
          status: "stale",
          issue: "pull request lookup API returned 502",
          refreshedAtUtc: "2026-06-21T00:05:00.000Z",
        },
      },
    });

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "alpha", state: "active", sessionId: "sess-1" }],
      }),
      sessionListJsonText: JSON.stringify({
        sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(new Map([[alphaPath, "alpha"]])),
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "api",
        failureReason: "GitHub CLI returned 502 while refreshing PR metadata",
      }),
    });

    expect(report.issues).toEqual([]);
    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "unclassified",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        prLookupFailureKind: "api",
        prLookupFailureReason:
          "GitHub CLI returned 502 while refreshing PR metadata",
        queueMismatchRisk: "metadata-unavailable",
        nextAction: "repair-token",
        reasons: [
          "stamped branch linkage is stale: git branch inspection failed during the last refresh",
          "stamped pull request linkage is stale: pull request lookup API returned 502",
          "GitHub CLI returned 502 while refreshing PR metadata",
        ],
      }),
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
          workItemNameSource: "metadata",
          branchMetadataSource: "metadata",
          metadataStatus: "present",
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
          workItemNameSource: "queue",
          worktreePath: ".claude/worktrees/beta",
          driftStatus: "unknown",
          reasons: ["no open PR metadata found for branch beta"],
        },
      ],
    });

    expect(reportText).toContain("Active PR Mergeability Watchdog");
    expect(reportText).toContain("lanes=2 pr-backed=1 unclassified=1");
    expect(reportText).toContain(
      "- status=pr-backed queue=active work-item=alpha work-item-source=metadata branch=alpha branch-source=metadata worktree=.claude/worktrees/alpha pr=#42 drift=diverged(ahead=2,behind=1) metadata=present mergeability=conflicting checks=failing risk=conflict-drift next-action=refresh-branch",
    );
    expect(reportText).toContain(
      "pr=? drift=unknown reason=no open PR metadata found for branch beta",
    );
  });
});

describe("active-pr-watchdog-worktree-linkage-repair-001", () => {
  test("classifies active lanes as PR-backed from stamped lane metadata when live PR lookup fails", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-metadata-pr-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha");
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: "sess-1",
      pullRequest: {
        number: 42,
        url: "https://example.com/pull/42",
      },
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
      linkage: {
        branch: {
          status: "current",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
        pullRequest: {
          status: "current",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
      },
    });

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "alpha", state: "active", sessionId: "sess-1" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(new Map([[alphaPath, "alpha"]])),
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch alpha",
      }),
    });

    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "pr-backed",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        prNumber: 42,
        prUrl: "https://example.com/pull/42",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        sessionId: "sess-1",
        sessionIdSource: "queue",
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("keeps PR-backed classification on one lane when another lane lacks PR metadata", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-metadata-pr-mix-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const alphaPath = createWorktree(worktreesRoot, "alpha", "alpha");
    const betaPath = createWorktree(worktreesRoot, "beta", "beta");
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: null,
      pullRequest: {
        number: 42,
        url: "https://example.com/pull/42",
      },
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
      linkage: {
        branch: {
          status: "current",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
        pullRequest: {
          status: "current",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
      },
    });
    writeLaneMetadata(betaPath, {
      schemaVersion: 1,
      workItemName: "beta",
      branchName: "beta",
      branchMetadataSource: "setup",
      worktreePath: betaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [
          { name: "alpha", state: "active" },
          { name: "beta", state: "failed" },
        ],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(
        new Map([
          [alphaPath, "alpha"],
          [betaPath, "beta"],
        ]),
      ),
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch",
      }),
    });

    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "pr-backed",
        workItemName: "alpha",
        prNumber: 42,
        prUrl: "https://example.com/pull/42",
      }),
      expect.objectContaining({
        status: "unclassified",
        workItemName: "beta",
        prLookupFailureKind: "not-found",
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });
});

describe("story 002 classification helpers", () => {
  test("prefers stamped metadata before git and prd fallback metadata", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "worktree-branch-resolution-"));
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const gitBackedPath = createWorktree(worktreesRoot, "alpha", "alpha-prd");
    const betaPath = createWorktree(worktreesRoot, "beta", "beta-prd");
    createWorktree(worktreesRoot, "gamma");
    writeLaneMetadata(gitBackedPath, {
      schemaVersion: 1,
      workItemName: "alpha-lane",
      branchName: "alpha-metadata",
      branchMetadataSource: "setup",
      worktreePath: gitBackedPath,
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(betaPath, {
      schemaVersion: 1,
      workItemName: "beta",
      worktreePath: betaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

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
        workItemName: "alpha-lane",
        workItemNameSource: "metadata",
        branchName: "alpha-metadata",
        branchMetadataSource: "metadata",
        gitBranchName: "alpha-git",
        prdBranchName: "alpha-prd",
        metadataStatus: "conflicting",
        metadataIssues: [
          "stamped work item alpha-lane does not match worktree directory alpha",
          "stamped branch alpha-metadata disagrees with git branch alpha-git",
          "stamped branch alpha-metadata disagrees with prd branch alpha-prd",
        ],
        metadataSessionId: "sess-1",
        metadataPullRequest: null,
        metadataBranchLinkage: {
          status: "current",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
        metadataPullRequestLinkage: {
          status: "missing",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
      },
      {
        worktreeName: "beta",
        worktreePath: betaPath,
        workItemName: "beta",
        workItemNameSource: "metadata",
        branchName: "beta-prd",
        branchMetadataSource: "prd",
        gitBranchName: undefined,
        prdBranchName: "beta-prd",
        metadataStatus: "incomplete",
        metadataIssues: [
          "stamped lane metadata is incomplete: missing branch name",
        ],
        metadataSessionId: null,
        metadataPullRequest: null,
        metadataBranchLinkage: {
          status: "missing",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
        metadataPullRequestLinkage: {
          status: "missing",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
      },
      {
        worktreeName: "gamma",
        worktreePath: join(worktreesRoot, "gamma"),
        workItemName: "gamma",
        workItemNameSource: "directory",
        branchName: undefined,
        branchMetadataSource: undefined,
        gitBranchName: undefined,
        prdBranchName: undefined,
        metadataStatus: "missing",
        metadataIssues: [
          "stamped lane metadata missing; fell back to worktree heuristics",
        ],
        metadataSessionId: undefined,
        metadataPullRequest: null,
        metadataBranchLinkage: undefined,
        metadataPullRequestLinkage: undefined,
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
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

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
        workTypeName: undefined,
        hasDependsOnRelation: false,
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "present",
        prLookupFailureKind: "auth",
        prLookupFailureReason: "gh auth token is expired",
        sessionId: undefined,
        sessionIdSource: undefined,
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
    writeLaneMetadata(alphaPath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha-meta",
      branchMetadataSource: "setup",
      worktreePath: alphaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

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
      lookupPullRequest: (branchName): PullRequestLookupResult =>
        branchName === "alpha-git"
          ? {
              pullRequest: {
                number: 99,
                headRefName: "alpha-git",
                mergeStateStatus: "CLEAN",
                statusCheckRollup: [{ conclusion: "SUCCESS" }],
              },
            }
          : {
              pullRequest: null,
              failureKind: "not-found",
              failureReason: `no open PR metadata found for branch ${branchName}`,
            },
    });

    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "pr-backed",
        workItemName: "alpha",
        queueState: "active",
        rawQueueState: "active",
        worktreePath: ".claude/worktrees/alpha",
        branchName: "alpha-git",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "conflicting",
        prNumber: 99,
        mergeabilityClass: "mergeable",
        checkHealth: "passing",
        reasons: [
          "stamped branch alpha-meta disagrees with git branch alpha-git",
          "stamped branch alpha-meta disagrees with prd branch alpha-prd",
          "git branch alpha-git disagrees with prd branch alpha-prd",
          "PR resolved via worktree branch alpha-git after stamped branch alpha-meta had no open PR",
        ],
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });
});

describe("active-pr-watchdog-worktree-linkage-repair-002", () => {
  test("classifies PR-backed lanes from prd branch when stamped metadata omits branch name", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-worktree-prd-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const betaPath = createWorktree(worktreesRoot, "beta", "beta");
    writeLaneMetadata(betaPath, {
      schemaVersion: 1,
      workItemName: "beta",
      worktreePath: betaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "beta", state: "active" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(new Map(), new Map([["beta", "0\t1"]])),
      lookupPullRequest: (branchName): PullRequestLookupResult =>
        branchName === "beta"
          ? {
              pullRequest: {
                number: 51,
                headRefName: "beta",
                url: "https://example.com/pull/51",
                mergeStateStatus: "CLEAN",
                statusCheckRollup: [{ conclusion: "SUCCESS" }],
              },
            }
          : {
              pullRequest: null,
              failureKind: "not-found",
              failureReason: `no open PR metadata found for branch ${branchName}`,
            },
    });

    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "pr-backed",
        workItemName: "beta",
        queueState: "active",
        worktreePath: ".claude/worktrees/beta",
        branchName: "beta",
        branchMetadataSource: "prd",
        metadataStatus: "incomplete",
        prNumber: 51,
        prUrl: "https://example.com/pull/51",
        reasons: ["stamped lane metadata is incomplete: missing branch name"],
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("classifies PR-backed lanes from git branch when worktree metadata is missing", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-worktree-git-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const gammaPath = createWorktree(worktreesRoot, "gamma", "gamma-prd");

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "gamma", state: "active" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(
        new Map([[gammaPath, "gamma-git"]]),
        new Map([["gamma-git", "1\t0"]]),
      ),
      lookupPullRequest: (branchName): PullRequestLookupResult =>
        branchName === "gamma-git"
          ? {
              pullRequest: {
                number: 77,
                headRefName: "gamma-git",
                mergeStateStatus: "CLEAN",
                statusCheckRollup: [{ conclusion: "SUCCESS" }],
              },
            }
          : {
              pullRequest: null,
              failureKind: "not-found",
              failureReason: `no open PR metadata found for branch ${branchName}`,
            },
    });

    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "pr-backed",
        workItemName: "gamma",
        worktreePath: ".claude/worktrees/gamma",
        branchName: "gamma-git",
        branchMetadataSource: "git",
        metadataStatus: "missing",
        prNumber: 77,
        driftStatus: "behind",
        commitsAheadOfMain: 0,
        commitsBehindMain: 1,
        reasons: [
          "stamped lane metadata missing; fell back to worktree heuristics",
          "git branch gamma-git disagrees with prd branch gamma-prd",
        ],
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("names missing PR metadata as an actionable linkage gap when branch candidates all fail", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-worktree-gap-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const deltaPath = createWorktree(worktreesRoot, "delta", "delta");
    writeLaneMetadata(deltaPath, {
      schemaVersion: 1,
      workItemName: "delta",
      worktreePath: deltaPath,
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    const report = discoverActivePrLaneReport({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "delta", state: "failed" }],
      }),
      worktreesDir: worktreesRoot,
      runCommand: runCommandStub(new Map()),
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch delta",
      }),
    });

    expect(report.lanes).toEqual([
      expect.objectContaining({
        status: "unclassified",
        workItemName: "delta",
        queueState: "failed",
        worktreePath: ".claude/worktrees/delta",
        branchName: "delta",
        branchMetadataSource: "prd",
        metadataStatus: "incomplete",
        prLookupFailureKind: "not-found",
        prLookupFailureReason: "no open PR metadata found for branch delta",
        reasons: [
          "stamped lane metadata is incomplete: missing branch name",
          "no open PR metadata found for branch delta",
          "missing pull request metadata for actionable task/review lane",
        ],
      }),
    ]);

    rmSync(repoRoot, { recursive: true, force: true });
  });
});
