import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  expect(result.status).toBe(0);
}

describe("planner-worktree-drift-watchdog script", () => {
  test("prints current root and active-worktree dirty shared paths from fixture queue/worktree evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "planner-worktree-drift-"));
    const repoRoot = join(dir, "repo");
    const worktreesRoot = join(repoRoot, ".claude", "worktrees");
    const workListPath = join(dir, "work-list.json");
    const sessionListPath = join(dir, "session-list.json");

    mkdirSync(repoRoot, { recursive: true });
    runGit(repoRoot, ["init", "-b", "main"]);
    runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
    runGit(repoRoot, ["config", "user.name", "Planner Tests"]);

    mkdirSync(join(repoRoot, "src", "lib", "factory"), { recursive: true });
    writeFileSync(
      join(repoRoot, "src", "lib", "factory", "root.ts"),
      "export const rootValue = 1;\n",
    );
    writeFileSync(join(repoRoot, "README.md"), "# fixture\n");
    runGit(repoRoot, ["add", "."]);
    runGit(repoRoot, ["commit", "-m", "initial"]);

    mkdirSync(worktreesRoot, { recursive: true });
    runGit(repoRoot, [
      "worktree",
      "add",
      "-b",
      "alpha",
      join(worktreesRoot, "alpha"),
      "HEAD",
    ]);
    writeFileSync(
      join(worktreesRoot, "alpha", "prd.json"),
      JSON.stringify({ branchName: "alpha" }, null, 2),
    );

    writeFileSync(
      join(repoRoot, "src", "lib", "factory", "root.ts"),
      "export const rootValue = 2;\n",
    );
    mkdirSync(join(worktreesRoot, "alpha", "docs", "planner"), {
      recursive: true,
    });
    writeFileSync(
      join(worktreesRoot, "alpha", "docs", "planner", "notes.md"),
      "# drift\n",
    );

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

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-worktree-drift-watchdog.ts",
        "--repo-root",
        repoRoot,
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Planner Worktree Drift Watchdog");
    expect(result.stdout).toContain(
      "active-lanes=1 merged-lanes=0 evaluated-worktrees=1 risk-cases=1 root-dirty-shared-paths=1 worktree-dirty-shared-paths=1 total-dirty-shared-paths=2",
    );
    expect(result.stdout).not.toContain("- merged-lanes");
    expect(result.stdout).toContain("- risks");
    expect(result.stdout).toContain(
      "risk=root-drift-without-obvious-owner path=src/lib/factory/root.ts surface=src/lib/factory lanes=none next-action=investigate evidence=Root dirty path src/lib/factory/root.ts has no obvious active owner.",
    );
    expect(result.stdout).toContain(
      `- location=root repo=${repoRoot} dirty-shared-paths=1`,
    );
    expect(result.stdout).toContain(
      "path=src/lib/factory/root.ts status= M change=modified surface=src/lib/factory category=shared-helper owner=root-owned ownership-reason=No active lane currently matches this dirty path or shared surface, so the drift remains rooted in the planner checkout.",
    );
    expect(result.stdout).toContain(
      "- location=worktree lane=alpha branch=alpha linkage=linked-with-gaps worktree=.claude/worktrees/alpha dirty-shared-paths=1 next-action=wait",
    );
    expect(result.stdout).toContain(
      "path=docs/planner/notes.md status=?? change=untracked surface=docs/planner category=authored-content owner=worktree-owned:alpha ownership-reason=Dirty path was observed directly in active lane alpha.",
    );

    const jsonResult = spawnSync(
      "bun",
      [
        "./scripts/report-planner-worktree-drift-watchdog.ts",
        "--repo-root",
        repoRoot,
        "--work-list-json",
        workListPath,
        "--session-list-json",
        sessionListPath,
        "--worktrees-dir",
        worktreesRoot,
        "--json",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(jsonResult.status).toBe(0);
    expect(JSON.parse(jsonResult.stdout)).toEqual(
      expect.objectContaining({
        activeLaneCount: 1,
        evaluatedWorktreeCount: 1,
        root: expect.objectContaining({
          dirtyPaths: [
            expect.objectContaining({
              ownership: expect.objectContaining({
                kind: "root-owned",
                reasonCode: "root-unmatched",
              }),
            }),
          ],
        }),
        risks: [
          expect.objectContaining({
            kind: "root-drift-without-obvious-owner",
            nextAction: "investigate",
            path: "src/lib/factory/root.ts",
          }),
        ],
        totalDirtyPathCount: 2,
      }),
    );

    rmSync(dir, { recursive: true, force: true });
  });
});
