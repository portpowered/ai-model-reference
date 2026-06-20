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
  mkdirSync(join(repoRoot, "src/generated"), { recursive: true });
  mkdirSync(join(repoRoot, "src/tests/ci"), { recursive: true });
  mkdirSync(join(repoRoot, "scripts"), { recursive: true });

  writeFileSync(join(repoRoot, "docs/guide.md"), "# Guide\n");
  writeFileSync(join(repoRoot, "docs/overview.md"), "# Overview\n");
  writeFileSync(join(repoRoot, "src/content/page.mdx"), "# Page\n");
  writeFileSync(
    join(repoRoot, "src/generated/search-index.json"),
    '{"docs":["guide"]}\n',
  );
  writeFileSync(
    join(repoRoot, "src/tests/ci/planner-hotspots.test.ts"),
    "export {};\n",
  );
  writeFileSync(
    join(repoRoot, "scripts/generate-registry-runtime.ts"),
    "export {};\n",
  );
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "seed hotspot evidence"]);

  writeFileSync(join(repoRoot, "docs/guide.md"), "# Guide\nupdated\n");
  writeFileSync(join(repoRoot, "docs/overview.md"), "# Overview\nupdated\n");
  writeFileSync(
    join(repoRoot, "src/generated/search-index.json"),
    '{"docs":["guide","overview"]}\n',
  );
  writeFileSync(
    join(repoRoot, "src/tests/ci/planner-hotspots.test.ts"),
    "export const touched = true;\n",
  );
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "touch shared surfaces again"]);

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
      expect(result.stdout ?? "").toContain("Ranked collision surfaces");
      expect(result.stdout ?? "").toContain("Authored content surfaces");
      expect(result.stdout ?? "").toContain(
        "Recurring generated artifact/runtime churn",
      );
      expect(result.stdout ?? "").toContain(
        "High-collision test and verification surfaces",
      );
      expect(result.stdout ?? "").toContain(
        "docs [authored content] (4 touches across 2 paths; examples: docs/guide.md, docs/overview.md)",
      );
      expect(result.stdout ?? "").toContain(
        "src/generated/search-index.json [generated artifact/runtime churn] (2 touches across 1 path; examples: src/generated/search-index.json)",
      );
      expect(result.stdout ?? "").toContain(
        "src/tests/ci [shared test/verification] (2 touches across 1 path; examples: src/tests/ci/planner-hotspots.test.ts)",
      );
      expect(result.stdout ?? "").toContain(
        "scripts/generate-registry-runtime.ts [shared registry/manifest] (1 touch across 1 path; examples: scripts/generate-registry-runtime.ts)",
      );
      expect(result.stdout ?? "").toContain("docs/guide.md (2 touches)");
      expect(result.stdout ?? "").toContain("main (clean)");
      expect(result.stdout ?? "").toContain("Safe next-lanes dispatch hint");
      expect(result.stdout ?? "").toContain(
        "Hold lanes around src/generated/search-index.json [generated artifact/runtime churn] (2 touches).",
      );
      expect(result.stdout ?? "").toContain(
        "Prefer authored lanes around src/content/page.mdx [authored content] (1 touch) while src/generated/search-index.json stays hotter in the same sample.",
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
