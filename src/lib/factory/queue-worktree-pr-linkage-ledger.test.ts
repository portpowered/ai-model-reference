import { describe, expect, test } from "bun:test";
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
