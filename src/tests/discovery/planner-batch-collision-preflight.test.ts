import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function writeHotspotSnapshotFixture(): {
  cleanup: () => void;
  snapshotPath: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "planner-batch-hotspot-"));
  const snapshotPath = join(dir, "hotspot-snapshot.json");
  writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        recentCommitLimit: 40,
        repoRoot: "/repo",
        rankedSurfaces: [
          {
            category: "shared-helper",
            distinctPaths: 2,
            representativePaths: [
              "src/lib/factory/conflict-hotspot-report.ts",
              "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
            ],
            surface: "src/lib/factory",
            touches: 7,
          },
        ],
        topPaths: [
          {
            path: "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
            touches: 4,
          },
        ],
        worktrees: [],
      },
      null,
      2,
    ),
  );

  return {
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
    snapshotPath,
  };
}

describe("planner batch collision preflight script", () => {
  test("prints each submitted candidate batch by name in one run", () => {
    const fixture = writeHotspotSnapshotFixture();
    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-batch-collision-preflight.ts",
        "--candidate",
        "docs-lane=docs/guide.md,src/content/docs/attention/page.mdx",
        "--candidate",
        "factory-lane=src/lib/factory",
        "--hotspot-snapshot-json",
        fixture.snapshotPath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Planner Batch Collision Preflight");
    expect(result.stdout).toContain("Candidates: 2");
    expect(result.stdout).toContain("candidate=docs-lane");
    expect(result.stdout).toContain("candidate=factory-lane");
    expect(result.stdout).toContain("hotspot-overlap=src/lib/factory");

    fixture.cleanup();
  });

  test("rejects missing candidate input with planner-usable feedback", () => {
    const result = spawnSync(
      "bun",
      ["./scripts/report-planner-batch-collision-preflight.ts"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Planner batch collision preflight failed.",
    );
    expect(result.stderr).toContain("Missing candidate input.");
  });

  test("emits machine-readable output for the same candidate payload", () => {
    const fixture = writeHotspotSnapshotFixture();
    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-batch-collision-preflight.ts",
        "--candidate",
        "alpha=src/lib/factory",
        "--hotspot-snapshot-json",
        fixture.snapshotPath,
        "--format",
        "json",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.hotspotEvidence).toEqual({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      recentCommitLimit: 40,
      repoRoot: "/repo",
      topPathCount: 1,
    });
    expect(payload.candidates).toEqual([
      expect.objectContaining({
        name: "alpha",
        expectedSurfaceHints: ["src/lib/factory"],
        hotspotSurfaceOverlaps: [
          expect.objectContaining({
            surface: "src/lib/factory",
            category: "shared-helper",
          }),
        ],
      }),
    ]);

    fixture.cleanup();
  });
});
