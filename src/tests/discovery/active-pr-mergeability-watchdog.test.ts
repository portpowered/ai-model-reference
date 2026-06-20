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
    expect(result.stdout).toContain("lanes=2 pr-backed=1 linked-with-gaps=1");
    expect(result.stdout).toContain("work-item=alpha");
    expect(result.stdout).toContain("pr=#42");
    expect(result.stdout).toContain("pr-status=resolved");
    expect(result.stdout).toContain("drift=unknown");
    expect(result.stdout).toContain("mergeability=mergeable");
    expect(result.stdout).toContain("checks=passing");
    expect(result.stdout).not.toContain("next-action=");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=beta branch=beta",
    );
    expect(result.stdout).toContain("pr-status=missing");
    expect(result.stdout).toContain(
      "reason=no open PR metadata found for branch beta",
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
    expect(result.stdout).toContain("lanes=2 pr-backed=1 linked-with-gaps=1");
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=alpha branch=alpha",
    );
    expect(result.stdout).toContain("mergeability=mergeable");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=beta branch=beta",
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
    expect(result.stdout).toContain("lanes=3 pr-backed=2 linked-with-gaps=1");
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=alpha branch=alpha",
    );
    expect(result.stdout).toContain("pr=#42 pr-status=resolved");
    expect(result.stdout).toContain("mergeability=conflicting");
    expect(result.stdout).toContain("risk=conflict-drift");
    expect(result.stdout).toContain("next-action=refresh-branch");
    expect(result.stdout).toContain(
      "- status=pr-backed queue=active work-item=beta branch=beta",
    );
    expect(result.stdout).toContain("pr=#43 pr-status=resolved");
    expect(result.stdout).toContain("mergeability=check-blocked");
    expect(result.stdout).toContain("checks=pending");
    expect(result.stdout).toContain("next-action=wait");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=failed work-item=gamma branch=gamma",
    );
    expect(result.stdout).toContain("pr-status=missing");
    expect(result.stdout).toContain("pr-failure=auth");
    expect(result.stdout).toContain("risk=metadata-unavailable");
    expect(result.stdout).toContain("next-action=repair-token");
    expect(result.stdout).toContain("reason=gh auth token is expired");

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes the planner session to live work-list discovery", () => {
    const dir = mkdtempSync(join(tmpdir(), "active-pr-watchdog-script-"));
    const commandLogPath = join(dir, "you-command.log");
    const worktreesRoot = join(dir, ".claude", "worktrees");
    mkdirSync(worktreesRoot, { recursive: true });
    createWorktree(worktreesRoot, "alpha", "alpha");
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
    expect(result.stdout).toContain("lanes=1 pr-backed=0 linked-with-gaps=1");
    expect(result.stdout).toContain("work-item=alpha");
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
    expect(result.stdout).toContain("lanes=1 pr-backed=0 linked-with-gaps=1");
    expect(result.stdout).toContain(
      "- status=linked-with-gaps queue=active work-item=alpha branch=alpha",
    );
    expect(result.stdout).toContain("session=sess-1 session-state=running");

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
    expect(result.stdout).toContain("lanes=2 pr-backed=0 linked-with-gaps=2");
    expect(result.stdout).toContain("work-item=alpha");
    expect(result.stdout).toContain("work-item=beta");
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
