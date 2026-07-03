import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createWorktree(
  worktreesRoot: string,
  worktreeName: string,
  branchName: string,
): void {
  const worktreePath = join(worktreesRoot, worktreeName);
  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(
    join(worktreePath, "prd.json"),
    JSON.stringify({ branchName }, null, 2),
  );
}

function writeLaneMetadata(
  worktreesRoot: string,
  worktreeName: string,
  metadata: Record<string, unknown>,
): void {
  const metadataDir = join(worktreesRoot, worktreeName, ".claude");
  mkdirSync(metadataDir, { recursive: true });
  writeFileSync(
    join(metadataDir, "lane-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function installFakeYouBinary(dir: string, logPath: string): string {
  const binDir = join(dir, "bin");
  const binaryPath = join(binDir, "you");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(
    binaryPath,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "${logPath}"
if [ "$1" = "work" ] && [ "$2" = "list" ]; then
  printf '%s' '{"items":[{"name":"alpha","state":"active","sessionId":"sess-1"}]}'
  exit 0
fi
if [ "$1" = "session" ] && [ "$2" = "list" ]; then
  printf '%s' '{"sessions":[{"id":"sess-1","workItemName":"alpha","status":"running"}]}'
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(binaryPath, 0o755);
  return binDir;
}

function installFakePaginatedYouBinary(dir: string, logPath: string): string {
  const binDir = join(dir, "bin");
  const binaryPath = join(binDir, "you");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(
    binaryPath,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "${logPath}"
if [ "$1" = "work" ] && [ "$2" = "list" ]; then
  case "$*" in
    *"--next-token cursor-page-2"*)
      printf '%s' '{"results":[{"workId":"task-beta","name":"beta","placeId":"lane-beta","state":{"name":"failed","type":"FAILED"}}]}'
      ;;
    *)
      printf '%s' '{"results":[{"workId":"task-alpha","name":"alpha","placeId":"lane-alpha","state":{"name":"in-review","type":"PROCESSING"},"sessionId":"sess-1"}],"paginationContext":{"nextToken":"cursor-page-2"}}'
      ;;
  esac
  exit 0
fi
if [ "$1" = "session" ] && [ "$2" = "list" ]; then
  printf '%s' '{"sessions":[{"id":"sess-1","workItemName":"alpha","status":"running"}]}'
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(binaryPath, 0o755);
  return binDir;
}

describe("queue-worktree-pr-linkage-ledger script", () => {
  test("can refresh stamped worktree metadata during planner linkage reporting", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    writeLaneMetadata(worktreesRoot, "alpha", {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "alpha"),
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    writeFileSync(
      workListPath,
      JSON.stringify({
        results: [
          {
            workId: "task-active",
            name: "alpha",
            placeId: "lane-alpha",
            state: { name: "in-review", type: "PROCESSING" },
            sessionId: "sess-1",
          },
        ],
      }),
    );
    writeFileSync(
      sessionListPath,
      JSON.stringify({
        sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
      }),
    );
    writeFileSync(
      prMapPath,
      JSON.stringify({
        alpha: {
          number: 42,
          headRefName: "alpha",
          mergeStateStatus: "CLEAN",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
          url: "https://example.com/pr/42",
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
        "--pr-map-json",
        prMapPath,
        "--refresh-metadata",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const metadata = JSON.parse(
      readFileSync(
        join(worktreesRoot, "alpha", ".claude", "lane-metadata.json"),
        "utf8",
      ),
    ) as {
      branchName: string;
      branchMetadataSource: string;
      pullRequest: { number: number; url: string } | null;
      linkage: {
        branch: { status: string };
        pullRequest: { status: string };
      };
    };

    expect(metadata.branchName).toBe("alpha");
    expect(metadata.branchMetadataSource).toBe("setup");
    expect(metadata.pullRequest).toEqual({
      number: 42,
      url: "https://example.com/pr/42",
    });
    expect(metadata.linkage).toEqual({
      branch: expect.objectContaining({ status: "current" }),
      pullRequest: expect.objectContaining({ status: "current" }),
    });

    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps live-schema queue lanes visible in the ledger summary", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    writeLaneMetadata(worktreesRoot, "alpha", {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "alpha"),
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(worktreesRoot, "beta", {
      schemaVersion: 1,
      workItemName: "beta",
      worktreePath: join(worktreesRoot, "beta"),
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    writeFileSync(
      workListPath,
      JSON.stringify({
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
    );
    writeFileSync(
      sessionListPath,
      JSON.stringify({
        sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
      }),
    );
    writeFileSync(
      prMapPath,
      JSON.stringify({
        alpha: {
          number: 42,
          headRefName: "alpha",
          mergeStateStatus: "CLEAN",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
          url: "https://example.com/pr/42",
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
        "--pr-map-json",
        prMapPath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "queue-derived-lanes=2 active=1 failed=1 pr-backed=1 actionable-gaps=1 stale-clean-pr-mismatch=0 queue-only-noise=0 linked=1 linked-with-gaps=1",
    );
    expect(result.stdout).toContain("lane=alpha");
    expect(result.stdout).toContain("queue=active");
    expect(result.stdout).toContain("pr=#42");
    expect(result.stdout).toContain("branch-source=metadata");
    expect(result.stdout).toContain("lane=beta");
    expect(result.stdout).toContain("queue=failed");
    expect(result.stdout).toContain("linkage=linked-with-gaps");
    expect(result.stdout).toContain("metadata=incomplete");
    expect(result.stdout).toContain(
      "missing=stamped lane metadata is incomplete: missing branch name; no open PR metadata found for branch beta; missing pull request metadata for actionable task/review lane",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("prints explicit stale metadata gaps without dropping the lane", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    writeLaneMetadata(worktreesRoot, "alpha", {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "alpha"),
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

    writeFileSync(
      workListPath,
      JSON.stringify({
        items: [{ name: "alpha", state: "active", sessionId: "sess-1" }],
      }),
    );
    writeFileSync(
      sessionListPath,
      JSON.stringify({
        sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
      }),
    );
    writeFileSync(prMapPath, JSON.stringify({}));

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
        "--pr-map-json",
        prMapPath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "queue-derived-lanes=1 active=1 failed=0 pr-backed=0 actionable-gaps=1 stale-clean-pr-mismatch=0 queue-only-noise=0 linked=0 linked-with-gaps=1",
    );
    expect(result.stdout).toContain("lane=alpha");
    expect(result.stdout).toContain("metadata=present");
    expect(result.stdout).toContain("linkage=linked-with-gaps");
    expect(result.stdout).toContain(
      "metadata-refresh=stamped branch linkage is stale: git branch inspection failed during the last refresh; stamped pull request linkage is stale: pull request lookup API returned 502",
    );
    expect(result.stdout).toContain(
      "missing=no open PR metadata found for branch alpha",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("prints a planner-facing queue summary while keeping missing-linkage lanes visible", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    writeLaneMetadata(worktreesRoot, "alpha", {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "alpha"),
      sessionId: "sess-1",
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    writeFileSync(
      workListPath,
      JSON.stringify({
        items: [
          { name: "alpha", state: "active", sessionId: "sess-1" },
          { name: "beta", state: "failed" },
          { name: "gamma", state: "queued" },
        ],
      }),
    );
    writeFileSync(
      sessionListPath,
      JSON.stringify({
        sessions: [{ id: "sess-1", workItemName: "alpha", status: "running" }],
      }),
    );
    writeFileSync(
      prMapPath,
      JSON.stringify({
        alpha: {
          number: 42,
          headRefName: "alpha",
          mergeStateStatus: "CLEAN",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
          url: "https://example.com/pr/42",
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
        "--pr-map-json",
        prMapPath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Queue Worktree PR Linkage Ledger");
    expect(result.stdout).toContain(
      "queue-derived-lanes=2 active=1 failed=1 pr-backed=1 actionable-gaps=0 stale-clean-pr-mismatch=0 queue-only-noise=1 linked=1 linked-with-gaps=1",
    );
    expect(result.stdout).toContain("lane=alpha");
    expect(result.stdout).toContain("pr=#42");
    expect(result.stdout).toContain("pr-status=resolved");
    expect(result.stdout).toContain("pr-url=https://example.com/pr/42");
    expect(result.stdout).toContain("work-item-source=metadata");
    expect(result.stdout).toContain("metadata=present");
    expect(result.stdout).toContain("Noise Summary");
    expect(result.stdout).toContain(
      "noise=queue-only-missing-linkage count=1 work-items=beta",
    );
    expect(result.stdout).toContain(
      "1x:no matching worktree under .claude/worktrees",
    );
    expect(result.stdout).not.toContain("lane=beta");
    expect(result.stdout).not.toContain("lane=gamma");

    rmSync(dir, { recursive: true, force: true });
  });

  test("emits a machine-readable ledger with explicit missing-linkage reasons", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    writeLaneMetadata(worktreesRoot, "alpha", {
      schemaVersion: 1,
      workItemName: "alpha",
      branchName: "alpha",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "alpha"),
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(worktreesRoot, "beta", {
      schemaVersion: 1,
      workItemName: "beta",
      worktreePath: join(worktreesRoot, "beta"),
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    writeFileSync(
      workListPath,
      JSON.stringify({
        items: [
          { name: "alpha", state: "active" },
          { name: "beta", state: "failed" },
        ],
      }),
    );
    writeFileSync(sessionListPath, JSON.stringify({ sessions: [] }));
    writeFileSync(
      prMapPath,
      JSON.stringify({
        alpha: {
          number: 42,
          headRefName: "alpha",
          mergeStateStatus: "CLEAN",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
          url: "https://example.com/pr/42",
        },
        beta: {
          pullRequest: null,
          failureKind: "not-found",
          failureReason: "no open PR metadata found for branch beta",
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
        "--pr-map-json",
        prMapPath,
        "--format",
        "json",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const ledger = JSON.parse(result.stdout);
    expect(ledger.laneCount).toBe(2);
    expect(ledger.activeLaneCount).toBe(1);
    expect(ledger.failedLaneCount).toBe(1);
    expect(ledger.linkedLaneCount).toBe(1);
    expect(ledger.linkedWithGapsLaneCount).toBe(1);
    expect(ledger.lanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          laneName: "alpha",
          queueState: "active",
          linkageStatus: "linked",
          branchName: "alpha",
          workItemNameSource: "metadata",
          branchMetadataSource: "metadata",
          metadataStatus: "present",
          pullRequest: expect.objectContaining({
            number: 42,
            url: "https://example.com/pr/42",
          }),
          pullRequestLookup: {
            status: "resolved",
          },
          missingLinkageReasons: [],
        }),
        expect.objectContaining({
          laneName: "beta",
          queueState: "failed",
          linkageStatus: "linked-with-gaps",
          branchName: "beta",
          workItemNameSource: "metadata",
          branchMetadataSource: "prd",
          metadataStatus: "incomplete",
          pullRequest: null,
          pullRequestLookup: {
            status: "missing",
            failureKind: "not-found",
            failureReason: "no open PR metadata found for branch beta",
          },
          missingLinkageReasons: [
            "stamped lane metadata is incomplete: missing branch name",
            "no open PR metadata found for branch beta",
            "missing pull request metadata for actionable task/review lane",
          ],
        }),
      ]),
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("scopes live queue discovery to the requested planner session", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const commandLogPath = join(dir, "you-command.log");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });
    createWorktree(worktreesRoot, "alpha", "alpha");
    const fakeYouBinDir = installFakeYouBinary(dir, commandLogPath);

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--worktrees-dir",
        worktreesRoot,
        "--session",
        "planner-session-42",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${fakeYouBinDir}:${process.env.PATH ?? ""}`,
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("lane=alpha");

    const commandLog = readFileSync(commandLogPath, "utf8");
    expect(commandLog).toContain(
      "work list --session planner-session-42 --json",
    );
    expect(commandLog).toContain("session list --json");

    rmSync(dir, { recursive: true, force: true });
  });

  test("follows live work-list pagination so later-page lanes stay visible in the ledger", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const commandLogPath = join(dir, "you-command.log");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });
    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    const fakeYouBinDir = installFakePaginatedYouBinary(dir, commandLogPath);

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-queue-worktree-pr-linkage-ledger.ts",
        "--worktrees-dir",
        worktreesRoot,
        "--session",
        "planner-session-77",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${fakeYouBinDir}:${process.env.PATH ?? ""}`,
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "queue-derived-lanes=2 active=1 failed=1 pr-backed=0 actionable-gaps=2 stale-clean-pr-mismatch=0 queue-only-noise=0 linked=0 linked-with-gaps=2",
    );
    expect(result.stdout).toContain("lane=alpha");
    expect(result.stdout).toContain("lane=beta");
    expect(result.stdout).toContain("queue=failed");

    const commandLog = readFileSync(commandLogPath, "utf8");
    expect(commandLog).toContain(
      "work list --session planner-session-77 --json",
    );
    expect(commandLog).toContain(
      "work list --session planner-session-77 --next-token cursor-page-2 --json",
    );

    rmSync(dir, { recursive: true, force: true });
  });
});
