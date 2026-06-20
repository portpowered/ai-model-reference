import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    expect(result.stdout).toContain("lanes=2 pr-backed=1 unclassified=1");
    expect(result.stdout).toContain("work-item=alpha");
    expect(result.stdout).toContain("pr=#42");
    expect(result.stdout).toContain("drift=unknown");
    expect(result.stdout).toContain("mergeability=mergeable");
    expect(result.stdout).toContain("checks=passing");
    expect(result.stdout).not.toContain("next-action=");
    expect(result.stdout).toContain(
      "reason=no open PR metadata found for branch beta",
    );

    rmSync(dir, { recursive: true, force: true });
  });
});
