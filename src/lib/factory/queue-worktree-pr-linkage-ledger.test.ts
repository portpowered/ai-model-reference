import { describe, expect, test } from "bun:test";
import {
  buildQueueWorktreePrLinkageLedger,
  discoverQueueWorktreePrLinkageLedger,
  formatQueueWorktreePrLinkageSummary,
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
});
