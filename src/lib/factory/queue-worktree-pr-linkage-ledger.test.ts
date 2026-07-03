import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildQueueWorktreePrLinkageLedger,
  discoverQueueWorktreePrLinkageLedger,
  formatQueueWorktreePrLinkageSummary,
  isActionableLinkageGapLane,
  isQueueOnlyControlNoiseLane,
  isQueueOnlyMissingLinkageLane,
  isStaleCleanPrMismatchLane,
  isStaleFailedLoopbackLane,
  sortPlannerWatchdogLanes,
} from "@/lib/factory/queue-worktree-pr-linkage-ledger";

function createWorktree(
  worktreesRoot: string,
  name: string,
  branchName?: string,
): string {
  const worktreePath = join(worktreesRoot, name);
  mkdirSync(worktreePath, { recursive: true });
  if (branchName) {
    writeFileSync(
      join(worktreePath, "prd.json"),
      JSON.stringify({ branchName }, null, 2),
    );
  }
  return worktreePath;
}

describe("queue-worktree-pr-linkage-ledger", () => {
  test("keeps live-schema lanes visible through the shared linkage discovery path", () => {
    const ledger = discoverQueueWorktreePrLinkageLedger({
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
      worktreesDir: "/worktrees-not-needed-for-this-fixture",
      lookupPullRequest: (branchName) =>
        branchName === "alpha"
          ? {
              pullRequest: {
                number: 42,
                headRefName: "alpha",
                mergeStateStatus: "CLEAN",
                statusCheckRollup: [{ conclusion: "SUCCESS" }],
                url: "https://example.com/pr/42",
              },
            }
          : {
              pullRequest: null,
              failureKind: "not-found",
              failureReason: `no open PR metadata found for branch ${branchName}`,
            },
    });

    expect(ledger.laneCount).toBe(2);
    expect(ledger.activeLaneCount).toBe(1);
    expect(ledger.failedLaneCount).toBe(1);
    expect(ledger.linkedLaneCount).toBe(0);
    expect(ledger.linkedWithGapsLaneCount).toBe(2);
    expect(ledger.prBackedLaneCount).toBe(0);
    expect(ledger.actionableLinkageGapLaneCount).toBe(0);
    expect(ledger.queueOnlyControlNoiseLaneCount).toBe(2);
    expect(ledger.lanes).toEqual([
      expect.objectContaining({
        laneName: "alpha",
        queueState: "active",
        rawQueueState: "in-review",
        linkageStatus: "linked-with-gaps",
        pullRequest: null,
        pullRequestLookup: expect.objectContaining({ status: "missing" }),
        sessionId: "sess-1",
        sessionState: "running",
        missingLinkageReasons: ["no matching worktree under .claude/worktrees"],
      }),
      expect.objectContaining({
        laneName: "beta",
        queueState: "failed",
        rawQueueState: "failed",
        linkageStatus: "linked-with-gaps",
        pullRequest: null,
        pullRequestLookup: expect.objectContaining({ status: "missing" }),
        missingLinkageReasons: ["no matching worktree under .claude/worktrees"],
      }),
    ]);
  });

  test("reports resolved branch source and branch metadata mismatches", () => {
    const ledger = buildQueueWorktreePrLinkageLedger({
      issues: [],
      lanes: [
        {
          status: "unclassified",
          workItemName: "alpha",
          queueState: "active",
          rawQueueState: "active",
          worktreePath: ".claude/worktrees/alpha",
          workItemNameSource: "metadata",
          branchName: "alpha-git",
          branchMetadataSource: "metadata",
          metadataStatus: "conflicting",
          driftStatus: "up-to-date",
          commitsAheadOfMain: 0,
          commitsBehindMain: 0,
          prLookupFailureKind: "not-found",
          prLookupFailureReason:
            "no open PR metadata found for branch alpha-git",
          reasons: [
            "git branch alpha-git disagrees with prd branch alpha-prd",
            "no open PR metadata found for branch alpha-git",
          ],
        },
      ],
    });

    expect(ledger.lanes).toEqual([
      expect.objectContaining({
        laneName: "alpha",
        branchName: "alpha-git",
        workItemNameSource: "metadata",
        branchMetadataSource: "metadata",
        metadataStatus: "conflicting",
        linkageStatus: "linked-with-gaps",
        pullRequestLookup: {
          status: "missing",
          failureKind: "not-found",
          failureReason: "no open PR metadata found for branch alpha-git",
        },
        missingLinkageReasons: [
          "git branch alpha-git disagrees with prd branch alpha-prd",
          "no open PR metadata found for branch alpha-git",
        ],
      }),
    ]);

    expect(formatQueueWorktreePrLinkageSummary(ledger)).toContain(
      "work-item-source=metadata branch=alpha-git branch-source=metadata metadata=conflicting",
    );
    expect(formatQueueWorktreePrLinkageSummary(ledger)).toContain(
      "pr-status=missing",
    );
    expect(formatQueueWorktreePrLinkageSummary(ledger)).toContain(
      "pr-failure=not-found",
    );
    expect(formatQueueWorktreePrLinkageSummary(ledger)).toContain(
      "missing=git branch alpha-git disagrees with prd branch alpha-prd; no open PR metadata found for branch alpha-git",
    );
  });

  test("separates actionable linkage gaps from queue-only and control noise", () => {
    const ledger = buildQueueWorktreePrLinkageLedger({
      issues: [],
      lanes: [
        {
          status: "pr-backed",
          workItemName: "alpha",
          queueState: "active",
          rawQueueState: "active",
          prNumber: 42,
          reasons: [],
        },
        {
          status: "unclassified",
          workItemName: "beta",
          queueState: "failed",
          rawQueueState: "failed",
          worktreePath: ".claude/worktrees/beta",
          metadataStatus: "incomplete",
          prLookupFailureKind: "not-found",
          prLookupFailureReason: "no open PR metadata found for branch beta",
          reasons: [
            "stamped lane metadata is incomplete: missing branch name",
            "missing pull request metadata for actionable task/review lane",
          ],
        },
        {
          status: "unclassified",
          workItemName: "delta",
          queueState: "active",
          rawQueueState: "active",
          reasons: ["no matching worktree under .claude/worktrees"],
        },
        {
          status: "unclassified",
          workItemName: "loopback",
          queueState: "failed",
          rawQueueState: "failed",
          workTypeName: "thoughts",
          hasDependsOnRelation: true,
          worktreePath: ".claude/worktrees/loopback",
          reasons: ["no open PR metadata found for branch loopback"],
        },
      ],
    });

    expect(ledger.prBackedLaneCount).toBe(1);
    expect(ledger.actionableLinkageGapLaneCount).toBe(1);
    expect(ledger.queueOnlyControlNoiseLaneCount).toBe(2);
    expect(ledger.linkedWithGapsLaneCount).toBe(3);

    const summary = formatQueueWorktreePrLinkageSummary(ledger);
    expect(summary).toContain(
      "pr-backed=1 actionable-gaps=1 stale-clean-pr-mismatch=0 queue-only-noise=2",
    );
    expect(summary).toContain("lane=alpha");
    expect(summary).toContain("lane=beta");
    expect(summary).not.toContain("lane=delta");
    expect(summary).not.toContain("lane=loopback");
    expect(summary).toContain("Noise Summary");
    expect(summary).toContain(
      "noise=queue-only-missing-linkage count=1 work-items=delta",
    );
    expect(summary).toContain(
      "noise=stale-failed-loopbacks count=1 work-items=loopback",
    );
  });

  test("classifies queue-only and stale loopback noise helpers", () => {
    const queueOnlyLane = {
      laneName: "delta",
      queueState: "active" as const,
      rawQueueState: "active",
      linkageStatus: "linked-with-gaps" as const,
      pullRequest: null,
      pullRequestLookup: { status: "missing" as const },
      missingLinkageReasons: ["no matching worktree under .claude/worktrees"],
    };
    const loopbackLane = {
      laneName: "loopback",
      queueState: "failed" as const,
      rawQueueState: "failed",
      linkageStatus: "linked-with-gaps" as const,
      workTypeName: "thoughts",
      hasDependsOnRelation: true,
      worktreePath: ".claude/worktrees/loopback",
      pullRequest: null,
      pullRequestLookup: { status: "missing" as const },
      missingLinkageReasons: ["no open PR metadata found for branch loopback"],
    };
    const actionableLane = {
      laneName: "beta",
      queueState: "failed" as const,
      rawQueueState: "failed",
      linkageStatus: "linked-with-gaps" as const,
      worktreePath: ".claude/worktrees/beta",
      pullRequest: null,
      pullRequestLookup: { status: "missing" as const },
      missingLinkageReasons: [
        "missing pull request metadata for actionable task/review lane",
      ],
    };

    expect(isQueueOnlyMissingLinkageLane(queueOnlyLane)).toBe(true);
    expect(isStaleFailedLoopbackLane(loopbackLane)).toBe(true);
    expect(isActionableLinkageGapLane(actionableLane)).toBe(true);
    expect(isQueueOnlyControlNoiseLane(queueOnlyLane)).toBe(true);
    expect(isQueueOnlyControlNoiseLane(loopbackLane)).toBe(true);
    expect(isQueueOnlyControlNoiseLane(actionableLane)).toBe(false);
  });

  test("partitions stale-clean-pr-mismatch lanes out of actionable depth", () => {
    const staleMismatchLane = {
      laneName: "tokens-per-second-serving-metric-page",
      queueState: "failed" as const,
      rawQueueState: "failed",
      linkageStatus: "linked" as const,
      worktreePath: ".claude/worktrees/tokens-per-second-serving-metric-page",
      pullRequest: { number: 251, url: "https://example.com/pr/251" },
      pullRequestLookup: { status: "resolved" as const },
      mergeabilityClass: "mergeable" as const,
      checkHealth: "passing" as const,
      queueMismatchRisk: "queue-stale" as const,
      plannerLaneKind: "stale-clean-pr-mismatch" as const,
      staleMismatchReason:
        "clean-passing-open-pr-with-queue-failed pr=#251 queue=failed(failed) mergeability=mergeable checks=passing work-item=tokens-per-second-serving-metric-page",
      missingLinkageReasons: [] as string[],
      nextAction: "open-follow-up-throughput-prd" as const,
    };
    const activePageLane = {
      laneName: "alpha",
      queueState: "active" as const,
      rawQueueState: "active",
      linkageStatus: "linked" as const,
      pullRequest: { number: 42 },
      pullRequestLookup: { status: "resolved" as const },
      mergeabilityClass: "mergeable" as const,
      checkHealth: "passing" as const,
      plannerLaneKind: "active-page-implementation" as const,
      missingLinkageReasons: [] as string[],
    };
    const conflictLane = {
      laneName: "beta",
      queueState: "active" as const,
      rawQueueState: "active",
      linkageStatus: "linked" as const,
      pullRequest: { number: 43 },
      pullRequestLookup: { status: "resolved" as const },
      mergeabilityClass: "conflicting" as const,
      checkHealth: "passing" as const,
      queueMismatchRisk: "conflict-drift" as const,
      plannerLaneKind: "merge-conflict" as const,
      missingLinkageReasons: [] as string[],
      nextAction: "refresh-branch" as const,
    };

    expect(isStaleCleanPrMismatchLane(staleMismatchLane)).toBe(true);
    expect(isStaleCleanPrMismatchLane(activePageLane)).toBe(false);
    expect(isStaleCleanPrMismatchLane(conflictLane)).toBe(false);
    expect(isActionableLinkageGapLane(staleMismatchLane)).toBe(false);

    const ledger = buildQueueWorktreePrLinkageLedger({
      lanes: [
        {
          status: "pr-backed",
          workItemName: staleMismatchLane.laneName,
          queueState: staleMismatchLane.queueState,
          rawQueueState: staleMismatchLane.rawQueueState,
          worktreePath: staleMismatchLane.worktreePath,
          prNumber: 251,
          prUrl: staleMismatchLane.pullRequest.url,
          mergeabilityClass: staleMismatchLane.mergeabilityClass,
          checkHealth: staleMismatchLane.checkHealth,
          queueMismatchRisk: staleMismatchLane.queueMismatchRisk,
          plannerLaneKind: staleMismatchLane.plannerLaneKind,
          staleMismatchReason: staleMismatchLane.staleMismatchReason,
          nextAction: staleMismatchLane.nextAction,
          reasons: [],
        },
        {
          status: "pr-backed",
          workItemName: activePageLane.laneName,
          queueState: activePageLane.queueState,
          rawQueueState: activePageLane.rawQueueState,
          prNumber: 42,
          mergeabilityClass: activePageLane.mergeabilityClass,
          checkHealth: activePageLane.checkHealth,
          plannerLaneKind: activePageLane.plannerLaneKind,
          reasons: [],
        },
        {
          status: "pr-backed",
          workItemName: conflictLane.laneName,
          queueState: conflictLane.queueState,
          rawQueueState: conflictLane.rawQueueState,
          prNumber: 43,
          mergeabilityClass: conflictLane.mergeabilityClass,
          checkHealth: conflictLane.checkHealth,
          queueMismatchRisk: conflictLane.queueMismatchRisk,
          plannerLaneKind: conflictLane.plannerLaneKind,
          nextAction: conflictLane.nextAction,
          reasons: [],
        },
      ],
      issues: [],
    });

    expect(ledger.staleCleanPrMismatchLaneCount).toBe(1);
    expect(ledger.actionableLinkageGapLaneCount).toBe(0);

    const summary = formatQueueWorktreePrLinkageSummary(ledger);
    expect(summary).toContain("stale-clean-pr-mismatch=1");
    expect(summary).toContain("Stale PR Mismatch Summary");
    expect(summary).toContain("lane=tokens-per-second-serving-metric-page");
    expect(summary).toContain("lane-kind=stale-clean-pr-mismatch");
    expect(summary).toContain(
      "mismatch-reason=clean-passing-open-pr-with-queue-failed pr=#251",
    );
    expect(summary).toContain("lane=alpha");
    expect(summary).toContain("lane=beta");
    expect(summary).toContain("lane-kind=merge-conflict");
    expect(summary).toMatch(
      /Stale PR Mismatch Summary\n- lane=tokens-per-second-serving-metric-page[\s\S]*\n\n- lane=beta/,
    );
  });

  test("active-pr-watchdog-worktree-linkage-repair-002: discovery keeps worktree gaps actionable and missing worktrees as noise", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-linkage-gap-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });
    createWorktree(worktreesRoot, "delta", "delta");
    createWorktree(worktreesRoot, "planner-follow-up", "planner-follow-up");

    const ledger = discoverQueueWorktreePrLinkageLedger({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [
          { name: "delta", state: "failed" },
          { name: "zeta", state: "active" },
          {
            name: "planner-follow-up",
            state: "failed",
            workTypeName: "thoughts",
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-active",
                targetWorkName: "zeta",
                requiredState: "complete",
              },
            ],
          },
        ],
      }),
      worktreesDir: worktreesRoot,
      lookupPullRequest: (branchName) => ({
        pullRequest: null,
        failureKind: "not-found",
        failureReason: `no open PR metadata found for branch ${branchName}`,
      }),
    });

    expect(ledger.prBackedLaneCount).toBe(0);
    expect(ledger.actionableLinkageGapLaneCount).toBe(1);
    expect(ledger.queueOnlyControlNoiseLaneCount).toBe(2);
    expect(ledger.linkedWithGapsLaneCount).toBe(3);
    expect(ledger.linkedLaneCount).toBe(0);
    expect(
      ledger.actionableLinkageGapLaneCount +
        ledger.queueOnlyControlNoiseLaneCount +
        ledger.staleCleanPrMismatchLaneCount +
        ledger.prBackedLaneCount,
    ).toBeLessThanOrEqual(ledger.laneCount);

    const summary = formatQueueWorktreePrLinkageSummary(ledger);
    expect(summary).toContain("lane=delta");
    expect(summary).not.toContain("lane=zeta");
    expect(summary).not.toContain("lane=planner-follow-up");
    expect(summary).toContain(
      "noise=queue-only-missing-linkage count=1 work-items=zeta",
    );
    expect(summary).toContain(
      "noise=stale-failed-loopbacks count=1 work-items=planner-follow-up",
    );

    rmSync(repoRoot, { recursive: true, force: true });
  });

  test("sorts actionable PR-backed lanes ahead of waiting cases and linkage noise", () => {
    const ordered = sortPlannerWatchdogLanes([
      {
        laneName: "metadata-repair",
        queueState: "failed",
        rawQueueState: "failed",
        linkageStatus: "linked-with-gaps",
        pullRequest: null,
        pullRequestLookup: {
          status: "missing",
          failureKind: "auth",
          failureReason: "gh auth token is expired",
        },
        missingLinkageReasons: ["gh auth token is expired"],
        queueMismatchRisk: "metadata-unavailable",
        nextAction: "repair-token",
      },
      {
        laneName: "wait-lane",
        queueState: "active",
        rawQueueState: "in-review",
        linkageStatus: "linked",
        pullRequest: { number: 43 },
        pullRequestLookup: { status: "resolved" },
        missingLinkageReasons: [],
        checkHealth: "pending",
        mergeabilityClass: "check-blocked",
        queueMismatchRisk: "checks-blocked",
        nextAction: "wait",
      },
      {
        laneName: "conflict-lane",
        queueState: "active",
        rawQueueState: "in-review",
        linkageStatus: "linked",
        pullRequest: { number: 42 },
        pullRequestLookup: { status: "resolved" },
        missingLinkageReasons: [],
        checkHealth: "passing",
        mergeabilityClass: "conflicting",
        queueMismatchRisk: "conflict-drift",
        nextAction: "refresh-branch",
      },
      {
        laneName: "failing-checks",
        queueState: "active",
        rawQueueState: "in-review",
        linkageStatus: "linked",
        pullRequest: { number: 44 },
        pullRequestLookup: { status: "resolved" },
        missingLinkageReasons: [],
        checkHealth: "failing",
        mergeabilityClass: "check-blocked",
        queueMismatchRisk: "checks-blocked",
        nextAction: "open-follow-up-throughput-prd",
      },
    ]);

    expect(ordered.map((lane) => lane.laneName)).toEqual([
      "conflict-lane",
      "failing-checks",
      "wait-lane",
      "metadata-repair",
    ]);
  });
});

describe("active-pr-watchdog-worktree-linkage-repair-current-003", () => {
  test("formats PR-backed ledger rows with planner conflict-priority evidence fields", () => {
    const conflictLane = {
      laneName: "conflict-lane",
      queueState: "active" as const,
      rawQueueState: "in-review",
      linkageStatus: "linked" as const,
      workItemNameSource: "metadata" as const,
      branchName: "conflict-lane",
      branchMetadataSource: "metadata" as const,
      metadataStatus: "present" as const,
      worktreePath: ".claude/worktrees/conflict-lane",
      pullRequest: {
        number: 42,
        url: "https://example.com/pull/42",
      },
      pullRequestLookup: { status: "resolved" as const },
      missingLinkageReasons: [] as string[],
      driftStatus: "diverged" as const,
      commitsAheadOfMain: 2,
      commitsBehindMain: 1,
      checkHealth: "passing" as const,
      mergeabilityClass: "conflicting" as const,
      queueMismatchRisk: "conflict-drift" as const,
      plannerLaneKind: "merge-conflict" as const,
      nextAction: "refresh-branch" as const,
    };
    const pendingLane = {
      laneName: "pending-lane",
      queueState: "active" as const,
      rawQueueState: "in-review",
      linkageStatus: "linked" as const,
      pullRequest: { number: 43 },
      pullRequestLookup: { status: "resolved" as const },
      missingLinkageReasons: [] as string[],
      checkHealth: "pending" as const,
      mergeabilityClass: "check-blocked" as const,
      queueMismatchRisk: "checks-blocked" as const,
      plannerLaneKind: "checks-blocked" as const,
      nextAction: "wait" as const,
    };
    const cleanLane = {
      laneName: "clean-lane",
      queueState: "active" as const,
      rawQueueState: "active",
      linkageStatus: "linked" as const,
      pullRequest: { number: 44 },
      pullRequestLookup: { status: "resolved" as const },
      missingLinkageReasons: [] as string[],
      checkHealth: "passing" as const,
      mergeabilityClass: "mergeable" as const,
      plannerLaneKind: "active-page-implementation" as const,
    };

    const ledger = buildQueueWorktreePrLinkageLedger({
      lanes: [
        {
          status: "pr-backed",
          workItemName: cleanLane.laneName,
          queueState: cleanLane.queueState,
          rawQueueState: cleanLane.rawQueueState,
          prNumber: 44,
          mergeabilityClass: cleanLane.mergeabilityClass,
          checkHealth: cleanLane.checkHealth,
          plannerLaneKind: cleanLane.plannerLaneKind,
          reasons: [],
        },
        {
          status: "pr-backed",
          workItemName: conflictLane.laneName,
          queueState: conflictLane.queueState,
          rawQueueState: conflictLane.rawQueueState,
          worktreePath: conflictLane.worktreePath,
          branchName: conflictLane.branchName,
          workItemNameSource: conflictLane.workItemNameSource,
          branchMetadataSource: conflictLane.branchMetadataSource,
          metadataStatus: conflictLane.metadataStatus,
          prNumber: 42,
          prUrl: conflictLane.pullRequest.url,
          driftStatus: conflictLane.driftStatus,
          commitsAheadOfMain: conflictLane.commitsAheadOfMain,
          commitsBehindMain: conflictLane.commitsBehindMain,
          checkHealth: conflictLane.checkHealth,
          mergeabilityClass: conflictLane.mergeabilityClass,
          queueMismatchRisk: conflictLane.queueMismatchRisk,
          plannerLaneKind: conflictLane.plannerLaneKind,
          nextAction: conflictLane.nextAction,
          reasons: [],
        },
        {
          status: "pr-backed",
          workItemName: pendingLane.laneName,
          queueState: pendingLane.queueState,
          rawQueueState: pendingLane.rawQueueState,
          prNumber: 43,
          checkHealth: pendingLane.checkHealth,
          mergeabilityClass: pendingLane.mergeabilityClass,
          queueMismatchRisk: pendingLane.queueMismatchRisk,
          plannerLaneKind: pendingLane.plannerLaneKind,
          nextAction: pendingLane.nextAction,
          reasons: [],
        },
      ],
      issues: [],
    });

    const summary = formatQueueWorktreePrLinkageSummary(ledger);
    expect(summary).toContain(
      "lane=conflict-lane queue=active linkage=linked work-item-source=metadata branch=conflict-lane branch-source=metadata metadata=present",
    );
    expect(summary).toContain("worktree=.claude/worktrees/conflict-lane");
    expect(summary).toContain("pr=#42");
    expect(summary).toContain("pr-url=https://example.com/pull/42");
    expect(summary).toContain("drift=diverged(ahead=2,behind=1)");
    expect(summary).toContain("mergeability=conflicting");
    expect(summary).toContain("checks=passing");
    expect(summary).toContain("risk=conflict-drift");
    expect(summary).toContain("lane-kind=merge-conflict");
    expect(summary).toContain("next-action=refresh-branch");

    const conflictIndex = summary.indexOf("lane=conflict-lane");
    const pendingIndex = summary.indexOf("lane=pending-lane");
    const cleanIndex = summary.indexOf("lane=clean-lane");
    expect(conflictIndex).toBeGreaterThanOrEqual(0);
    expect(pendingIndex).toBeGreaterThan(conflictIndex);
    expect(cleanIndex).toBeGreaterThan(pendingIndex);
  });

  test("surfaces actionable gap missing reasons and metadata refresh hints", () => {
    const repoRoot = mkdtempSync(
      join(tmpdir(), "active-pr-watchdog-gap-refresh-hints-"),
    );
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    const gapPath = createWorktree(worktreesRoot, "gamma", "gamma");
    mkdirSync(join(gapPath, ".claude"), { recursive: true });
    writeFileSync(
      join(gapPath, ".claude", "lane-metadata.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          workItemName: "gamma",
          branchName: "gamma",
          branchMetadataSource: "setup",
          worktreePath: gapPath,
          sessionId: null,
          pullRequest: null,
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
        },
        null,
        2,
      )}\n`,
    );

    const ledger = discoverQueueWorktreePrLinkageLedger({
      repoRoot,
      workListJsonText: JSON.stringify({
        items: [{ name: "gamma", state: "failed" }],
      }),
      worktreesDir: worktreesRoot,
      lookupPullRequest: () => ({
        pullRequest: null,
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch gamma",
      }),
    });

    expect(ledger.actionableLinkageGapLaneCount).toBe(1);
    const summary = formatQueueWorktreePrLinkageSummary(ledger);
    expect(summary).toContain("lane=gamma");
    expect(summary).toContain("linkage=linked-with-gaps");
    expect(summary).toContain(
      "missing=no open PR metadata found for branch gamma",
    );
    expect(summary).toContain("metadata-refresh=");
    expect(summary).toContain(
      "stamped branch linkage is stale: git branch inspection failed during the last refresh",
    );
    expect(summary).not.toContain("Noise Summary");

    rmSync(repoRoot, { recursive: true, force: true });
  });
});
