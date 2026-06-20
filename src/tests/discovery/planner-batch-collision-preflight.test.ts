import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function runCommand(cwd: string, args: string[]): void {
  const [command, ...rest] = args;
  if (!command) {
    throw new Error("Missing command");
  }

  const result = spawnSync(command, rest, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `command failed: ${args.join(" ")}`,
    );
  }
}

function writeQueueLinkageLedgerFixture(repoRoot: string): {
  cleanup: () => void;
  ledgerPath: string;
} {
  const worktreePath = join(
    repoRoot,
    ".claude",
    "worktrees",
    "alpha-lane-fixture",
  );
  mkdirSync(worktreePath, { recursive: true });
  runCommand(worktreePath, ["git", "init", "--initial-branch=main"]);
  runCommand(worktreePath, [
    "git",
    "config",
    "user.email",
    "fixture@example.com",
  ]);
  runCommand(worktreePath, ["git", "config", "user.name", "Fixture"]);
  mkdirSync(join(worktreePath, "src", "lib", "factory"), { recursive: true });
  writeFileSync(
    join(
      worktreePath,
      "src",
      "lib",
      "factory",
      "queue-worktree-pr-linkage-ledger.ts",
    ),
    "export const lane = 'base';\n",
  );
  writeFileSync(
    join(worktreePath, "src", "lib", "factory", "conflict-hotspot-report.ts"),
    "export const hotspot = 'base';\n",
  );
  runCommand(worktreePath, ["git", "add", "."]);
  runCommand(worktreePath, ["git", "commit", "-m", "base"]);
  runCommand(worktreePath, ["git", "checkout", "-b", "alpha-lane"]);
  writeFileSync(
    join(
      worktreePath,
      "src",
      "lib",
      "factory",
      "queue-worktree-pr-linkage-ledger.ts",
    ),
    "export const lane = 'changed';\n",
  );
  writeFileSync(
    join(worktreePath, "src", "lib", "factory", "conflict-hotspot-report.ts"),
    "export const hotspot = 'changed';\n",
  );
  runCommand(worktreePath, ["git", "add", "."]);
  runCommand(worktreePath, ["git", "commit", "-m", "feature"]);

  const ledgerPath = join(worktreePath, "..", "queue-linkage-ledger.json");
  writeFileSync(
    ledgerPath,
    JSON.stringify(
      {
        generatedAtUtc: "2026-06-20T00:05:00.000Z",
        laneCount: 1,
        activeLaneCount: 1,
        failedLaneCount: 0,
        linkedLaneCount: 1,
        linkedWithGapsLaneCount: 0,
        issues: [],
        lanes: [
          {
            laneName: "alpha-lane",
            queueState: "active",
            rawQueueState: "active",
            linkageStatus: "linked",
            worktreePath: ".claude/worktrees/alpha-lane-fixture",
            branchName: "alpha-lane",
            branchMetadataSource: "prd",
            pullRequest: {
              number: 42,
              url: "https://example.com/pr/42",
            },
            pullRequestLookup: {
              status: "resolved",
            },
            missingLinkageReasons: [],
          },
        ],
      },
      null,
      2,
    ),
  );

  return {
    cleanup: () => {
      rmSync(ledgerPath, { force: true });
      rmSync(worktreePath, { recursive: true, force: true });
    },
    ledgerPath,
  };
}

describe("planner batch collision preflight script", () => {
  test("prints each submitted candidate batch by name in one run", () => {
    const fixture = writeHotspotSnapshotFixture();
    const ledgerFixture = writeQueueLinkageLedgerFixture(process.cwd());
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
        "--queue-linkage-ledger-json",
        ledgerFixture.ledgerPath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Planner Batch Collision Preflight");
    expect(result.stdout).toContain("Candidates: 2");
    expect(result.stdout).toContain("candidate=docs-lane");
    expect(result.stdout).toContain("candidate=factory-lane");
    expect(result.stdout).toContain("collision-risk=high");
    expect(result.stdout).toContain("recommendation=hold");
    expect(result.stdout).toContain("hotspot-overlap=src/lib/factory");
    expect(result.stdout).toContain(
      "active-lane-overlap=alpha-lane surface=src/lib/factory [shared helper]",
    );

    fixture.cleanup();
    ledgerFixture.cleanup();
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
    const ledgerFixture = writeQueueLinkageLedgerFixture(process.cwd());
    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-batch-collision-preflight.ts",
        "--candidate",
        "alpha=src/lib/factory",
        "--hotspot-snapshot-json",
        fixture.snapshotPath,
        "--queue-linkage-ledger-json",
        ledgerFixture.ledgerPath,
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
    expect(payload.activeLaneEvidence).toEqual({
      activeLaneCount: 1,
      generatedAtUtc: "2026-06-20T00:05:00.000Z",
      linkedWithGapsLaneCount: 0,
    });
    expect(payload.candidates).toEqual([
      expect.objectContaining({
        collisionRisk: "high",
        name: "alpha",
        recommendation: "hold",
        recommendationEvidenceSummary:
          "Every submitted surface overlaps active lane alpha-lane or hot shared paths, so dispatch would collide immediately.",
        expectedSurfaceHints: ["src/lib/factory"],
        activeLaneOverlaps: [
          expect.objectContaining({
            laneName: "alpha-lane",
            ownedSurface: "src/lib/factory",
          }),
        ],
        hotspotSurfaceOverlaps: [
          expect.objectContaining({
            surface: "src/lib/factory",
            category: "shared-helper",
          }),
        ],
      }),
    ]);

    fixture.cleanup();
    ledgerFixture.cleanup();
  });
});
