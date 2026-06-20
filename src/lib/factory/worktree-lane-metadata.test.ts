import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readWorktreeLaneMetadata,
  refreshWorktreeLaneMetadata,
  resolveWorktreeLaneMetadataPath,
} from "@/lib/factory/worktree-lane-metadata";

function writeMetadataFixture(
  worktreePath: string,
  metadata: Record<string, unknown>,
): string {
  mkdirSync(join(worktreePath, ".claude"), { recursive: true });
  const metadataPath = resolveWorktreeLaneMetadataPath(worktreePath);
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  return metadataPath;
}

describe("worktree-lane-metadata", () => {
  test("refreshes branch and pull request linkage in place", () => {
    const worktreePath = mkdtempSync(join(tmpdir(), "lane-metadata-refresh-"));
    writeMetadataFixture(worktreePath, {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath,
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
      linkage: {
        branch: {
          status: "current",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
        pullRequest: {
          status: "missing",
          issue: "pull request linkage has not been refreshed yet",
          refreshedAtUtc: "2026-06-20T21:08:34.000Z",
        },
      },
    });

    const refreshed = refreshWorktreeLaneMetadata({
      worktreePath,
      branchName: "alpha-git",
      branchMetadataSource: "git",
      pullRequestLookup: {
        status: "resolved",
        pullRequest: {
          number: 42,
          url: "https://example.com/pr/42",
        },
      },
      refreshedAtUtc: "2026-06-21T00:00:00.000Z",
    });

    expect(refreshed).toEqual({
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha-git",
      branchMetadataSource: "git",
      worktreePath,
      sessionId: "sess-1",
      pullRequest: {
        number: 42,
        url: "https://example.com/pr/42",
      },
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-21T00:00:00.000Z",
      linkage: {
        branch: {
          status: "current",
          refreshedAtUtc: "2026-06-21T00:00:00.000Z",
        },
        pullRequest: {
          status: "current",
          refreshedAtUtc: "2026-06-21T00:00:00.000Z",
        },
      },
    });

    expect(readWorktreeLaneMetadata(worktreePath)).toEqual(refreshed);
    rmSync(worktreePath, { recursive: true, force: true });
  });

  test("preserves last known linkage and marks explicit stale gaps when refresh fails", () => {
    const worktreePath = mkdtempSync(join(tmpdir(), "lane-metadata-refresh-"));
    const metadataPath = writeMetadataFixture(worktreePath, {
      schemaVersion: 1,
      workItemName: "beta",
      branchName: "beta",
      branchMetadataSource: "git",
      worktreePath,
      sessionId: "sess-2",
      pullRequest: {
        number: 7,
        url: "https://example.com/pr/7",
      },
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    const refreshed = refreshWorktreeLaneMetadata({
      worktreePath,
      branchIssue:
        "worktree exists but branch metadata could not be determined",
      pullRequestLookup: {
        status: "missing",
        pullRequest: null,
        failureKind: "api",
        failureReason: "pull request lookup API returned 502",
      },
      refreshedAtUtc: "2026-06-21T00:05:00.000Z",
    });

    expect(refreshed).toEqual({
      schemaVersion: 1,
      workItemName: "beta",
      branchName: "beta",
      branchMetadataSource: "git",
      worktreePath,
      sessionId: "sess-2",
      pullRequest: {
        number: 7,
        url: "https://example.com/pr/7",
      },
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-21T00:05:00.000Z",
      linkage: {
        branch: {
          status: "stale",
          issue: "worktree exists but branch metadata could not be determined",
          refreshedAtUtc: "2026-06-21T00:05:00.000Z",
        },
        pullRequest: {
          status: "stale",
          issue: "pull request lookup API returned 502",
          refreshedAtUtc: "2026-06-21T00:05:00.000Z",
        },
      },
    });

    expect(JSON.parse(readFileSync(metadataPath, "utf8"))).toEqual(refreshed);
    rmSync(worktreePath, { recursive: true, force: true });
  });
});
