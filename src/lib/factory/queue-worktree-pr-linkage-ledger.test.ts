import { describe, expect, test } from "bun:test";
import {
  buildQueueWorktreePrLinkageLedger,
  formatQueueWorktreePrLinkageSummary,
} from "@/lib/factory/queue-worktree-pr-linkage-ledger";

describe("queue-worktree-pr-linkage-ledger", () => {
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
          branchName: "alpha-git",
          branchMetadataSource: "git",
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
        branchMetadataSource: "git",
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
      "branch=alpha-git branch-source=git",
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
