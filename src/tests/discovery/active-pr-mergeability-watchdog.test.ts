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
  printf '%s' '{"results":[{"workId":"task-active","name":"alpha","placeId":"lane-alpha","state":{"name":"in-review","type":"PROCESSING"},"sessionId":"sess-1"}]}'
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
  writeFileSync(
    join(binDir, "gh"),
    `#!/bin/sh
set -eu
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  printf '%s' '[]'
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(join(binDir, "gh"), 0o755);
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
  writeFileSync(
    join(binDir, "gh"),
    `#!/bin/sh
set -eu
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  printf '%s' '[]'
  exit 0
fi
echo "unexpected args: $*" >&2
exit 1
`,
  );
  chmodSync(join(binDir, "gh"), 0o755);
  return binDir;
}

describe("active-pr-mergeability-watchdog script", () => {
  test("prints compact discovery rows from fixture queue and worktree state", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
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
        items: [
          { name: "alpha", state: "active", sessionId: "sess-1" },
          { name: "beta", state: "failed" },
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
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
    expect(result.stdout).toContain("Active PR Mergeability Watchdog");
    expect(result.stdout).toContain(
      "lanes=2 pr-backed=1 actionable-gaps=1 queue-only-noise=0",
    );
    expect(result.stdout).toContain("work-item=alpha");
    expect(result.stdout).toContain("work-item-source=metadata");
    expect(result.stdout).toContain("pr=#42");
    expect(result.stdout).toContain("pr-status=resolved");
    expect(result.stdout).toContain("drift=unknown");
    expect(result.stdout).toContain("mergeability=mergeable");
    expect(result.stdout).toContain("checks=passing");
    expect(result.stdout).toContain("branch-source=metadata");
    expect(result.stdout).toContain("metadata=present");
    expect(result.stdout).not.toContain("Action Queue");
    expect(result.stdout).not.toContain("next-action=");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=beta",
    );
    expect(result.stdout).toContain(
      "reason=stamped lane metadata is incomplete: missing branch name; no open PR metadata found for branch beta; missing pull request metadata for actionable task/review lane",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps failed non-loopback tasks as detailed rows while summarizing true stale loopbacks", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    createWorktree(worktreesRoot, "loopback-done", "loopback-done");
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
      branchName: "beta",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "beta"),
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(worktreesRoot, "loopback-done", {
      schemaVersion: 1,
      workItemName: "loopback-done",
      branchName: "loopback-done",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "loopback-done"),
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
            workTypeName: "task",
            state: { name: "failed", type: "FAILED" },
          },
          {
            workId: "loopback-failed",
            name: "loopback-done",
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
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
      "- status=linked-with-gaps queue=failed work-item=beta",
    );
    expect(result.stdout).toContain(
      "noise=stale-failed-loopbacks count=1 work-items=loopback-done",
    );
    expect(result.stdout).not.toContain(
      "- status=linked-with-gaps queue=failed work-item=loopback-done",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps live-schema results payload lanes visible in the watchdog output", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
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
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
      "lanes=2 pr-backed=1 actionable-gaps=1 queue-only-noise=0",
    );
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=alpha work-item-source=metadata branch=alpha branch-source=metadata metadata=present",
    );
    expect(result.stdout).toContain("mergeability=mergeable");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=beta",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps reporting other lanes when fixture PR metadata fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    createWorktree(worktreesRoot, "gamma", "gamma");
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
      branchName: "beta",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "beta"),
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });
    writeLaneMetadata(worktreesRoot, "gamma", {
      schemaVersion: 1,
      workItemName: "gamma",
      branchName: "gamma",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "gamma"),
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    writeFileSync(
      workListPath,
      JSON.stringify({
        items: [
          { name: "alpha", state: "active", sessionId: "sess-1" },
          { name: "beta", state: "active" },
          { name: "gamma", state: "failed" },
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
          mergeStateStatus: "DIRTY",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
        },
        beta: {
          number: 43,
          headRefName: "beta",
          mergeStateStatus: "BLOCKED",
          statusCheckRollup: [{ status: "IN_PROGRESS" }],
        },
        gamma: {
          pullRequest: null,
          failureKind: "auth",
          failureReason: "gh auth token is expired",
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
      "lanes=3 pr-backed=2 actionable-gaps=1 queue-only-noise=0",
    );
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=alpha work-item-source=metadata branch=alpha branch-source=metadata metadata=present",
    );
    expect(result.stdout).toContain("pr=#42 pr-status=resolved");
    expect(result.stdout).toContain("mergeability=conflicting");
    expect(result.stdout).toContain("risk=conflict-drift");
    expect(result.stdout).toContain("next-action=refresh-branch");
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=beta work-item-source=metadata branch=beta branch-source=metadata metadata=present",
    );
    expect(result.stdout).toContain("pr=#43 pr-status=resolved");
    expect(result.stdout).toContain("mergeability=check-blocked");
    expect(result.stdout).toContain("checks=pending");
    expect(result.stdout).toContain("next-action=wait");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=gamma work-item-source=metadata branch=gamma branch-source=metadata metadata=present",
    );
    expect(result.stdout).toContain("pr-status=missing");
    expect(result.stdout).toContain("pr-failure=auth");
    expect(result.stdout).toContain("risk=metadata-unavailable");
    expect(result.stdout).toContain("next-action=repair-token");
    expect(result.stdout).toContain("reason=gh auth token is expired");
    expect(result.stdout).toContain("Action Queue");
    expect(result.stdout).toContain(
      "1. action=refresh-branch work-item=alpha pr=#42 branch=alpha",
    );
    expect(result.stdout).toContain(
      "2. action=wait-on-checks work-item=beta pr=#43 branch=beta checks=pending",
    );
    expect(result.stdout).toContain(
      "3. action=repair-metadata work-item=gamma pr=? branch=gamma pr-status=missing",
    );

    const actionQueueIndex = result.stdout.indexOf("Action Queue");
    const alphaIndex = result.stdout.indexOf(
      "- status=pr-backed queue=active work-item=alpha",
    );
    const betaIndex = result.stdout.indexOf(
      "- status=pr-backed queue=active work-item=beta",
    );
    const gammaIndex = result.stdout.indexOf(
      "- status=linked-with-gaps queue=failed work-item=gamma",
    );
    expect(actionQueueIndex).toBeGreaterThanOrEqual(0);
    expect(alphaIndex).toBeGreaterThan(actionQueueIndex);
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(betaIndex).toBeGreaterThan(alphaIndex);
    expect(gammaIndex).toBeGreaterThan(betaIndex);

    rmSync(dir, { recursive: true, force: true });
  });

  test("renders failing-check follow-up lanes with a planner-facing action label", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
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
      sessionId: null,
      pullRequest: null,
      createdAtUtc: "2026-06-20T21:08:34.000Z",
      refreshedAtUtc: "2026-06-20T21:08:34.000Z",
    });

    writeFileSync(
      workListPath,
      JSON.stringify({
        items: [{ name: "alpha", state: "active" }],
      }),
    );
    writeFileSync(sessionListPath, JSON.stringify({ sessions: [] }));
    writeFileSync(
      prMapPath,
      JSON.stringify({
        alpha: {
          number: 42,
          headRefName: "alpha",
          mergeStateStatus: "BLOCKED",
          statusCheckRollup: [{ conclusion: "FAILURE" }],
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
    expect(result.stdout).toContain("Action Queue");
    expect(result.stdout).toContain(
      "1. action=open-follow-up work-item=alpha pr=#42 branch=alpha",
    );
    const detailedLaneIndex = result.stdout.indexOf(
      "- status=pr-backed queue=active work-item=alpha",
    );
    const actionQueueOutput = result.stdout.slice(0, detailedLaneIndex);
    expect(actionQueueOutput).not.toContain(
      "action=open-follow-up-throughput-prd",
    );
    expect(result.stdout).toContain("mergeability=check-blocked");
    expect(result.stdout).toContain("checks=failing");
    expect(result.stdout).toContain("risk=checks-blocked");
    expect(result.stdout).toContain(
      "next-action=open-follow-up-throughput-prd",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("surfaces actionable PR-backed lanes before queue-only linkage noise", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    createWorktree(worktreesRoot, "gamma", "gamma");
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
      branchName: "beta",
      branchMetadataSource: "setup",
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
          { name: "gamma", state: "failed" },
          { name: "beta", state: "active" },
          { name: "alpha", state: "active" },
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
          mergeStateStatus: "DIRTY",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
        },
        beta: {
          number: 43,
          headRefName: "beta",
          mergeStateStatus: "BLOCKED",
          statusCheckRollup: [{ status: "IN_PROGRESS" }],
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
    const alphaIndex = result.stdout.indexOf(
      "- status=pr-backed queue=active work-item=alpha",
    );
    const betaIndex = result.stdout.indexOf(
      "- status=pr-backed queue=active work-item=beta",
    );
    const gammaIndex = result.stdout.indexOf(
      "- status=linked-with-gaps queue=failed work-item=gamma",
    );
    const noiseSummaryIndex = result.stdout.indexOf("Noise Summary");
    const refreshActionIndex = result.stdout.indexOf(
      "1. action=refresh-branch work-item=alpha pr=#42 branch=alpha",
    );
    const waitActionIndex = result.stdout.indexOf(
      "2. action=wait-on-checks work-item=beta pr=#43 branch=beta checks=pending",
    );
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(betaIndex).toBeGreaterThan(alphaIndex);
    expect(gammaIndex).toBeGreaterThan(betaIndex);
    expect(noiseSummaryIndex).toBe(-1);
    expect(refreshActionIndex).toBeGreaterThanOrEqual(0);
    expect(waitActionIndex).toBeGreaterThan(refreshActionIndex);
    expect(alphaIndex).toBeGreaterThan(waitActionIndex);
    expect(result.stdout).toContain("next-action=refresh-branch");
    expect(result.stdout).toContain("next-action=wait");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=gamma",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes the planner session to live work-list discovery", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const commandLogPath = join(dir, "you-command.log");
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
    const fakeYouBinDir = installFakeYouBinary(dir, commandLogPath);

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
    expect(result.stdout).toContain(
      "lanes=1 pr-backed=0 actionable-gaps=1 queue-only-noise=0",
    );
    expect(result.stdout).toContain("work-item=alpha");
    expect(result.stdout).toContain("metadata=present");
    expect(result.stdout).toContain("queue=active");

    const commandLog = readFileSync(commandLogPath, "utf8");
    expect(commandLog).toContain(
      "work list --session planner-session-42 --json",
    );
    expect(commandLog).toContain("session list --json");

    rmSync(dir, { recursive: true, force: true });
  });

  test("bun run watch:active-pr-mergeability keeps live-schema lanes visible through the package command", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const commandLogPath = join(dir, "you-command.log");
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
    const fakeYouBinDir = installFakeYouBinary(dir, commandLogPath);

    const result = spawnSync(
      "bun",
      [
        "run",
        "watch:active-pr-mergeability",
        "--worktrees-dir",
        worktreesRoot,
        "--session",
        "planner-session-99",
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
    expect(result.stdout).toContain("Active PR Mergeability Watchdog");
    expect(result.stdout).toContain(
      "lanes=1 pr-backed=0 actionable-gaps=1 queue-only-noise=0",
    );
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=active work-item=alpha work-item-source=metadata branch=alpha branch-source=metadata metadata=present",
    );
    expect(result.stdout).toContain(
      "session=sess-1 session-source=queue session-state=running",
    );

    const commandLog = readFileSync(commandLogPath, "utf8");
    expect(commandLog).toContain(
      "work list --session planner-session-99 --json",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("follows live work-list pagination so later-page lanes stay visible", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const commandLogPath = join(dir, "you-command.log");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });
    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    const fakeYouBinDir = installFakePaginatedYouBinary(dir, commandLogPath);

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
      "lanes=2 pr-backed=0 actionable-gaps=2 queue-only-noise=0",
    );
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=active work-item=alpha",
    );
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=beta",
    );

    const commandLog = readFileSync(commandLogPath, "utf8");
    expect(commandLog).toContain(
      "work list --session planner-session-77 --json",
    );
    expect(commandLog).toContain(
      "work list --session planner-session-77 --next-token cursor-page-2 --json",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("summarizes stale loopbacks and queue-only missing linkage as compact noise", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");
    createWorktree(worktreesRoot, "beta", "beta");
    createWorktree(worktreesRoot, "gamma", "gamma");
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
    writeLaneMetadata(worktreesRoot, "gamma", {
      schemaVersion: 1,
      workItemName: "gamma",
      branchName: "gamma",
      branchMetadataSource: "setup",
      worktreePath: join(worktreesRoot, "gamma"),
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
          {
            name: "beta",
            state: "failed",
            workTypeName: "thoughts",
            relations: [
              {
                type: "DEPENDS_ON",
                targetWorkId: "task-alpha",
                targetWorkName: "alpha",
                requiredState: "complete",
              },
            ],
          },
          { name: "delta", state: "failed" },
          { name: "epsilon", state: "active" },
          { name: "gamma", state: "failed" },
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
          mergeStateStatus: "DIRTY",
          statusCheckRollup: [{ conclusion: "SUCCESS" }],
        },
        gamma: {
          pullRequest: null,
          failureKind: "auth",
          failureReason: "gh auth token is expired",
        },
      }),
    );

    const result = spawnSync(
      "bun",
      [
        "./scripts/active-pr-mergeability-watchdog.ts",
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
    expect(result.stdout).toContain("Action Queue");
    expect(result.stdout).toContain(
      "1. action=refresh-branch work-item=alpha pr=#42 branch=alpha",
    );
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=alpha work-item-source=metadata branch=alpha",
    );
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=gamma work-item-source=metadata branch=gamma",
    );
    expect(result.stdout).toContain("Noise Summary");
    expect(result.stdout).toContain(
      "noise=stale-failed-loopbacks count=1 work-items=beta",
    );
    expect(result.stdout).toContain(
      "noise=queue-only-missing-linkage count=2 work-items=delta,epsilon",
    );
    expect(result.stdout).toContain(
      "2x:no matching worktree under .claude/worktrees",
    );
    expect(result.stdout).not.toContain(
      "- status=linked-with-gaps queue=failed work-item=beta",
    );
    expect(result.stdout).not.toContain(
      "- status=linked-with-gaps queue=failed work-item=delta",
    );
    expect(result.stdout).not.toContain(
      "- status=linked-with-gaps queue=active work-item=epsilon",
    );

    const gammaIndex = result.stdout.indexOf(
      "- status=linked-with-gaps queue=failed work-item=gamma",
    );
    const noiseSummaryIndex = result.stdout.indexOf("Noise Summary");
    expect(gammaIndex).toBeGreaterThanOrEqual(0);
    expect(noiseSummaryIndex).toBeGreaterThan(gammaIndex);

    rmSync(dir, { recursive: true, force: true });
  });
});
