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

describe("queue-worktree-pr-linkage-ledger script", () => {
  test("prints a planner-facing queue summary while keeping missing-linkage lanes visible", () => {
    const dir = mkdtempSync(join(tmpdir(), "queue-linkage-ledger-script-"));
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");
    const prMapPath = join(dir, "pr-map.json");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });

    createWorktree(worktreesRoot, "alpha", "alpha");

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
      "queue-derived-lanes=2 active=1 failed=1 linked=1 linked-with-gaps=1",
    );
    expect(result.stdout).toContain("lane=alpha");
    expect(result.stdout).toContain("pr=#42");
    expect(result.stdout).toContain("pr-status=resolved");
    expect(result.stdout).toContain("pr-url=https://example.com/pr/42");
    expect(result.stdout).toContain("lane=beta");
    expect(result.stdout).toContain("pr-status=missing");
    expect(result.stdout).toContain(
      "missing=no matching worktree under .claude/worktrees",
    );
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
          branchMetadataSource: "prd",
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
          branchMetadataSource: "prd",
          pullRequest: null,
          pullRequestLookup: {
            status: "missing",
            failureKind: "not-found",
            failureReason: "no open PR metadata found for branch beta",
          },
          missingLinkageReasons: ["no open PR metadata found for branch beta"],
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
});
