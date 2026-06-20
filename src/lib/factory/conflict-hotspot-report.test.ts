import { describe, expect, test } from "bun:test";
import {
  CONFLICT_HOTSPOT_REPORT_HEADER,
  formatConflictHotspotSnapshot,
  parseRecentPathTouches,
  parseWorktreeListPorcelain,
  rankConflictHotspotSurfaces,
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
      rankedSurfaces: [
        {
          category: "authored-content",
          distinctPaths: 2,
          representativePaths: ["docs/guide.md", "docs/overview.md"],
          surface: "docs",
          touches: 5,
        },
        {
          category: "shared-test",
          distinctPaths: 1,
          representativePaths: ["src/tests/ci/planner-hotspots.test.ts"],
          surface: "src/tests/ci",
          touches: 2,
        },
      ],
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
    expect(report).toContain("Authored content surfaces");
    expect(report).toContain(
      "docs [authored content] (5 touches across 2 paths; examples: docs/guide.md, docs/overview.md)",
    );
    expect(report).toContain(
      "src/tests/ci [shared test/verification] (2 touches across 1 path; examples: src/tests/ci/planner-hotspots.test.ts)",
    );
    expect(report).toContain("docs/guide.md (4 touches)");
  });
});

describe("rankConflictHotspotSurfaces", () => {
  test("groups recent path evidence into ranked planner-facing surfaces", () => {
    expect(
      rankConflictHotspotSurfaces([
        { path: "docs/guide.md", touches: 3 },
        { path: "docs/overview.md", touches: 2 },
        { path: "src/content/docs/modules/gelu/page.mdx", touches: 2 },
        { path: "src/tests/ci/planner-hotspots.test.ts", touches: 4 },
        { path: "scripts/generate-registry-runtime.ts", touches: 1 },
      ]),
    ).toEqual([
      {
        category: "authored-content",
        distinctPaths: 2,
        representativePaths: ["docs/guide.md", "docs/overview.md"],
        surface: "docs",
        touches: 5,
      },
      {
        category: "shared-test",
        distinctPaths: 1,
        representativePaths: ["src/tests/ci/planner-hotspots.test.ts"],
        surface: "src/tests/ci",
        touches: 4,
      },
      {
        category: "authored-content",
        distinctPaths: 1,
        representativePaths: ["src/content/docs/modules/gelu/page.mdx"],
        surface: "src/content/docs",
        touches: 2,
      },
      {
        category: "shared-registry",
        distinctPaths: 1,
        representativePaths: ["scripts/generate-registry-runtime.ts"],
        surface: "scripts/generate-registry-runtime.ts",
        touches: 1,
      },
    ]);
  });
});
