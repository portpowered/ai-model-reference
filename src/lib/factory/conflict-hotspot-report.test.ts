import { describe, expect, test } from "bun:test";
import {
  CONFLICT_HOTSPOT_REPORT_HEADER,
  formatConflictHotspotSnapshot,
  parseRecentPathTouches,
  parseWorktreeListPorcelain,
} from "./conflict-hotspot-report";

describe("parseWorktreeListPorcelain", () => {
  test("reads tracked paths and branches from git worktree porcelain output", () => {
    const output = [
      "worktree /repo",
      "HEAD 0123456789abcdef",
      "branch refs/heads/main",
      "",
      "worktree /repo/.claude/worktrees/story-1",
      "HEAD fedcba9876543210",
      "branch refs/heads/story-1",
      "",
    ].join("\n");

    expect(parseWorktreeListPorcelain(output)).toEqual([
      { branch: "refs/heads/main", path: "/repo" },
      { branch: "refs/heads/story-1", path: "/repo/.claude/worktrees/story-1" },
    ]);
  });
});

describe("parseRecentPathTouches", () => {
  test("aggregates and sorts repeated paths from git log name-only output", () => {
    const output = [
      "docs/guide.md",
      "src/content/page.mdx",
      "",
      "docs/guide.md",
      "scripts/report.ts",
      "src/content/page.mdx",
      "",
    ].join("\n");

    expect(parseRecentPathTouches(output)).toEqual([
      { path: "docs/guide.md", touches: 2 },
      { path: "src/content/page.mdx", touches: 2 },
      { path: "scripts/report.ts", touches: 1 },
    ]);
  });
});

describe("formatConflictHotspotSnapshot", () => {
  test("prints a concise report with evidence sources and worktree state", () => {
    const report = formatConflictHotspotSnapshot({
      generatedAtUtc: "2026-06-20T12:00:00.000Z",
      recentCommitLimit: 20,
      repoRoot: "/repo",
      topPaths: [
        { path: "docs/guide.md", touches: 4 },
        { path: "src/content/page.mdx", touches: 3 },
      ],
      worktrees: [
        { branch: "main", path: "/repo", state: "current-clean" },
        {
          branch: "story-1",
          path: "/repo/.claude/worktrees/story-1",
          state: "tracked",
        },
      ],
    });

    expect(report).toContain(CONFLICT_HOTSPOT_REPORT_HEADER);
    expect(report).toContain("Evidence sources");
    expect(report).toContain("Current worktree: clean");
    expect(report).toContain("story-1 (tracked)");
    expect(report).toContain("docs/guide.md (4 touches)");
  });
});
