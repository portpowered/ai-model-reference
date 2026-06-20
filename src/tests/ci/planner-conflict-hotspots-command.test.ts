import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runGit(repoRoot: string, args: readonly string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
}

function initFixtureRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), "planner-hotspots-"));
  runGit(repoRoot, ["init"]);
  runGit(repoRoot, ["checkout", "-b", "main"]);
  runGit(repoRoot, ["config", "user.name", "Planner Tests"]);
  runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);

  mkdirSync(join(repoRoot, "docs"), { recursive: true });
  mkdirSync(join(repoRoot, "src/content"), { recursive: true });

  writeFileSync(join(repoRoot, "docs/guide.md"), "# Guide\n");
  writeFileSync(join(repoRoot, "src/content/page.mdx"), "# Page\n");
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "seed hotspot evidence"]);

  writeFileSync(join(repoRoot, "docs/guide.md"), "# Guide\nupdated\n");
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "touch guide again"]);

  return repoRoot;
}

describe("report-planner-conflict-hotspots script", () => {
  test("exits non-zero with a clear reason when repository evidence cannot be collected", () => {
    const nonRepoDir = mkdtempSync(join(tmpdir(), "planner-hotspots-missing-"));

    const result = spawnSync(
      "bun",
      ["./scripts/report-planner-conflict-hotspots.ts", nonRepoDir],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr ?? "").toContain(
      "Planner conflict-hotspot report failed.",
    );
    expect(result.stderr ?? "").toContain(
      "git rev-parse --show-toplevel failed.",
    );

    rmSync(nonRepoDir, { recursive: true, force: true });
  });

  test("prints a planner-facing snapshot from current git evidence", () => {
    const repoRoot = initFixtureRepo();

    try {
      const result = spawnSync(
        "bun",
        ["./scripts/report-planner-conflict-hotspots.ts", repoRoot],
        {
          cwd: process.cwd(),
          encoding: "utf8",
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout ?? "").toContain(
        "Planner conflict-hotspot snapshot",
      );
      expect(result.stdout ?? "").toContain("Evidence sources");
      expect(result.stdout ?? "").toContain("docs/guide.md (2 touches)");
      expect(result.stdout ?? "").toContain("main (clean)");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
