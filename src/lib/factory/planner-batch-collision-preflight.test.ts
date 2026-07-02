import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ConflictHotspotSnapshot } from "./conflict-hotspot-report";
import {
  collectPlannerBatchCollisionPreflightSnapshot,
  formatPlannerBatchCollisionPreflightSnapshot,
  PlannerBatchCollisionPreflightCollectionError,
  PlannerBatchCollisionPreflightInputError,
  parsePlannerBatchCollisionCandidateInput,
} from "./planner-batch-collision-preflight";
import type { QueueWorktreePrLinkageLedger } from "./queue-worktree-pr-linkage-ledger";

const hotspotSnapshot: ConflictHotspotSnapshot = {
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
    {
      category: "authored-content",
      distinctPaths: 1,
      representativePaths: ["src/content/docs/attention/page.mdx"],
      surface: "src/content/docs",
      touches: 2,
    },
  ],
  topPaths: [
    {
      path: "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
      touches: 4,
    },
    {
      path: "src/lib/factory/conflict-hotspot-report.ts",
      touches: 3,
    },
    {
      path: "src/content/docs/attention/page.mdx",
      touches: 2,
    },
  ],
  worktrees: [],
};

const linkageLedger: QueueWorktreePrLinkageLedger = {
  generatedAtUtc: "2026-06-20T00:05:00.000Z",
  laneCount: 2,
  activeLaneCount: 2,
  failedLaneCount: 0,
  linkedLaneCount: 1,
  linkedWithGapsLaneCount: 1,
  issues: [],
  lanes: [
    {
      laneName: "alpha-lane",
      queueState: "active",
      rawQueueState: "active",
      linkageStatus: "linked",
      worktreePath: ".claude/worktrees/alpha-lane",
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
    {
      laneName: "beta-lane",
      queueState: "active",
      rawQueueState: "active",
      linkageStatus: "linked-with-gaps",
      worktreePath: ".claude/worktrees/beta-lane",
      branchName: "beta-lane",
      branchMetadataSource: "prd",
      pullRequest: null,
      pullRequestLookup: {
        status: "missing",
        failureKind: "not-found",
        failureReason: "no open PR metadata found for branch beta-lane",
      },
      missingLinkageReasons: ["no open PR metadata found for branch beta-lane"],
    },
  ],
};

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

function createOwnedLaneRepoFixture(options?: {
  leaveDirtyTrackedChange?: boolean;
}): {
  cleanup: () => void;
  repoRoot: string;
  worktreePath: string;
} {
  const repoRoot = mkdtempSync(join(tmpdir(), "planner-batch-preflight-"));
  const worktreePath = join(repoRoot, ".claude", "worktrees", "alpha-lane");
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
    "export const ledger = 'base';\n",
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
    "export const ledger = 'changed';\n",
  );
  writeFileSync(
    join(worktreePath, "src", "lib", "factory", "conflict-hotspot-report.ts"),
    "export const hotspot = 'changed';\n",
  );

  if (options?.leaveDirtyTrackedChange) {
    return {
      cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
      repoRoot,
      worktreePath,
    };
  }

  runCommand(worktreePath, ["git", "add", "."]);
  runCommand(worktreePath, ["git", "commit", "-m", "feature"]);

  return {
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true }),
    repoRoot,
    worktreePath,
  };
}

describe("planner batch collision preflight", () => {
  test("accepts multiple candidates with normalized surface hints", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      [
        "docs-lane=docs/guide.md, src/content/docs/attention/page.mdx",
        "factory-lane=scripts/report-planner-conflict-hotspots.ts,src\\\\lib\\\\factory\\\\queue-worktree-pr-linkage-ledger.ts",
      ],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger,
      },
    );

    expect(snapshot.generatedAtUtc).toBe("2026-06-20T00:00:00.000Z");
    expect(snapshot.hotspotEvidence).toEqual({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      recentCommitLimit: 40,
      repoRoot: "/repo",
      topPathCount: 3,
    });
    expect(snapshot.candidates).toEqual([
      expect.objectContaining({
        name: "docs-lane",
        expectedSurfaceHints: [
          "docs/guide.md",
          "src/content/docs/attention/page.mdx",
        ],
        recommendation: "dispatch now",
      }),
      expect.objectContaining({
        name: "factory-lane",
        expectedSurfaceHints: [
          "scripts/report-planner-conflict-hotspots.ts",
          "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
        ],
        recommendation: "split the batch",
      }),
    ]);
  });

  test("rejects missing candidate input with planner-usable guidance", () => {
    expect(() => collectPlannerBatchCollisionPreflightSnapshot([])).toThrow(
      new PlannerBatchCollisionPreflightInputError(
        'Missing candidate input. Provide one or more --candidate "name=path/or/prefix,second/hint" values.',
      ),
    );
  });

  test("rejects empty or broad surface hints instead of falling back to a repo scan", () => {
    expect(() =>
      parsePlannerBatchCollisionCandidateInput("alpha="),
    ).toThrowError(
      new PlannerBatchCollisionPreflightInputError(
        'Candidate "alpha" must include at least one expected surface hint.',
      ),
    );

    expect(() =>
      parsePlannerBatchCollisionCandidateInput("alpha=.,src/lib/factory"),
    ).toThrowError(
      new PlannerBatchCollisionPreflightInputError(
        'Candidate "alpha" includes unusable surface hint ".". Provide concrete repo-local paths or prefixes instead of a broad repo scan placeholder.',
      ),
    );
  });

  test("reports explicit shared-helper hotspot overlaps when candidate hints hit hot surfaces", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["factory-lane=src/lib/factory"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger,
      },
    );

    expect(snapshot.candidates[0]?.hotspotSurfaceOverlaps).toEqual([
      {
        category: "shared-helper",
        categoryLabel: "shared helper",
        distinctPaths: 2,
        matchedHints: ["src/lib/factory"],
        representativePaths: [
          "src/lib/factory/conflict-hotspot-report.ts",
          "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
        ],
        surface: "src/lib/factory",
        touches: 7,
      },
    ]);
    expect(snapshot.candidates[0]?.hotspotPathOverlaps).toEqual([
      {
        matchedHints: ["src/lib/factory"],
        path: "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
        touches: 4,
      },
      {
        matchedHints: ["src/lib/factory"],
        path: "src/lib/factory/conflict-hotspot-report.ts",
        touches: 3,
      },
    ]);
    expect(snapshot.candidates[0]?.hotspotEvidenceSummary).toEqual([
      "Matched hotspot surface src/lib/factory [shared helper] at 7 touches across 2 paths.",
      "Shared-surface overlap is explicit via hints src/lib/factory.",
      "Direct touched-path matches: src/lib/factory/queue-worktree-pr-linkage-ledger.ts (4 touches), src/lib/factory/conflict-hotspot-report.ts (3 touches).",
    ]);
  });

  test("keeps authored-only overlap below shared-hotspot escalation", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["docs-lane=src/content/docs/attention/page.mdx"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger,
      },
    );

    expect(snapshot.candidates[0]?.hotspotSurfaceOverlaps).toEqual([
      {
        category: "authored-content",
        categoryLabel: "authored content",
        distinctPaths: 1,
        matchedHints: ["src/content/docs/attention/page.mdx"],
        representativePaths: ["src/content/docs/attention/page.mdx"],
        surface: "src/content/docs",
        touches: 2,
      },
    ]);
    expect(snapshot.candidates[0]?.hotspotEvidenceSummary).toContain(
      "Overlap is limited to authored-content surfaces in the current hotspot sample.",
    );
    expect(snapshot.candidates[0]?.collisionRisk).toBe("low");
    expect(snapshot.candidates[0]?.recommendation).toBe("dispatch now");
  });

  test("keeps candidate present with explicit hotspot evidence gap when snapshot has no ranked overlaps", () => {
    const emptyHotspotSnapshot: ConflictHotspotSnapshot = {
      ...hotspotSnapshot,
      rankedSurfaces: [],
      topPaths: [],
    };
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["novel-lane=src/lib/new-module.ts"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot: emptyHotspotSnapshot,
        linkageLedger,
      },
    );

    expect(snapshot.candidates).toHaveLength(1);
    expect(snapshot.candidates[0]).toEqual(
      expect.objectContaining({
        name: "novel-lane",
        expectedSurfaceHints: ["src/lib/new-module.ts"],
        hotspotSurfaceOverlaps: [],
        hotspotPathOverlaps: [],
        collisionRisk: "low",
        recommendation: "dispatch now",
      }),
    );
    expect(snapshot.candidates[0]?.hotspotEvidenceSummary).toEqual([
      "No ranked hotspot overlap found for novel-lane in the recent planner hotspot sample.",
    ]);
  });

  test("requires repo-local hotspot evidence when no injected snapshot is provided", () => {
    expect(() =>
      collectPlannerBatchCollisionPreflightSnapshot(
        ["docs-lane=src/content/docs/attention/page.mdx"],
        {
          generatedAtUtc: "2026-06-20T00:00:00.000Z",
        },
      ),
    ).toThrowError(
      new PlannerBatchCollisionPreflightCollectionError(
        "Hotspot evidence was not available for the planner batch collision preflight. Provide repoRoot or a precomputed hotspot snapshot.",
      ),
    );
  });

  test("reports active-lane overlaps and raises risk when a shared active lane owns the same surface", () => {
    const fixture = createOwnedLaneRepoFixture();
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["factory-lane=src/lib/factory"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger: {
          ...linkageLedger,
          lanes: [
            {
              ...linkageLedger.lanes[0],
            },
          ],
        },
        repoRoot: fixture.repoRoot,
      },
    );

    expect(snapshot.activeLaneEvidence).toEqual({
      activeLaneCount: 1,
      generatedAtUtc: "2026-06-20T00:05:00.000Z",
      linkedWithGapsLaneCount: 0,
    });
    expect(snapshot.candidates[0]?.collisionRisk).toBe("high");
    expect(snapshot.candidates[0]?.activeLaneOverlaps).toEqual([
      {
        branchName: "alpha-lane",
        category: "shared-helper",
        categoryLabel: "shared helper",
        laneName: "alpha-lane",
        linkageStatus: "linked",
        matchedHints: ["src/lib/factory"],
        ownedPathCount: 2,
        ownedPaths: [
          "src/lib/factory/conflict-hotspot-report.ts",
          "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
        ],
        ownedSurface: "src/lib/factory",
        worktreePath: ".claude/worktrees/alpha-lane",
      },
    ]);
    expect(snapshot.candidates[0]?.activeLaneEvidenceSummary).toContain(
      "Active ownership raises the current collision risk to high.",
    );
    expect(snapshot.candidates[0]?.recommendation).toBe("hold");
    expect(snapshot.candidates[0]?.recommendationEvidenceSummary).toContain(
      "Every submitted surface overlaps active lane alpha-lane",
    );

    fixture.cleanup();
  });

  test("counts dirty tracked linked-worktree files as active lane ownership", () => {
    const fixture = createOwnedLaneRepoFixture({
      leaveDirtyTrackedChange: true,
    });
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["factory-lane=src/lib/factory"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger: {
          ...linkageLedger,
          lanes: [
            {
              ...linkageLedger.lanes[0],
            },
          ],
        },
        repoRoot: fixture.repoRoot,
      },
    );

    expect(snapshot.candidates[0]?.collisionRisk).toBe("high");
    expect(snapshot.candidates[0]?.activeLaneOverlaps).toEqual([
      {
        branchName: "alpha-lane",
        category: "shared-helper",
        categoryLabel: "shared helper",
        laneName: "alpha-lane",
        linkageStatus: "linked",
        matchedHints: ["src/lib/factory"],
        ownedPathCount: 2,
        ownedPaths: [
          "src/lib/factory/conflict-hotspot-report.ts",
          "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
        ],
        ownedSurface: "src/lib/factory",
        worktreePath: ".claude/worktrees/alpha-lane",
      },
    ]);
    expect(snapshot.candidates[0]?.activeLaneEvidenceSummary).toContain(
      "Active ownership raises the current collision risk to high.",
    );
    expect(snapshot.candidates[0]?.recommendation).toBe("hold");
    expect(snapshot.candidates[0]?.recommendationEvidenceSummary).toContain(
      "Every submitted surface overlaps active lane alpha-lane",
    );

    fixture.cleanup();
  });

  test("recommends splitting the batch when only part of the candidate hits risky shared surfaces", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["mixed-lane=src/lib/factory,docs/guide.md"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger,
      },
    );

    expect(snapshot.candidates[0]?.collisionRisk).toBe("medium");
    expect(snapshot.candidates[0]?.recommendation).toBe("split the batch");
    expect(snapshot.candidates[0]?.recommendationEvidenceSummary).toBe(
      "Risk is concentrated in src/lib/factory, while docs/guide.md remains lower-risk and can be dispatched separately.",
    );
  });

  test("classifies hotspot-only shared overlap as medium risk with split recommendation and machine-readable evidence fields", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["factory-lane=src/lib/factory"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger,
      },
    );

    const candidate = snapshot.candidates[0];
    expect(candidate).toEqual(
      expect.objectContaining({
        name: "factory-lane",
        expectedSurfaceHints: ["src/lib/factory"],
        collisionRisk: "medium",
        recommendation: "split the batch",
        recommendationEvidenceSummary:
          "The current candidate is aimed at hot shared surface src/lib/factory, so it should be narrowed before dispatch.",
        hotspotSurfaceOverlaps: [
          expect.objectContaining({
            surface: "src/lib/factory",
            category: "shared-helper",
          }),
        ],
        activeLaneOverlaps: [],
        activeOwnershipGaps: expect.arrayContaining([
          expect.stringContaining("repoRoot was unavailable"),
        ]),
      }),
    );
    expect(candidate?.hotspotEvidenceSummary.length).toBeGreaterThan(0);
    expect(candidate?.activeLaneEvidenceSummary.length).toBeGreaterThan(0);
  });

  test("keeps active ownership gaps explicit when a linked lane cannot provide ownership details", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["docs-lane=src/content/docs/attention/page.mdx"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
        linkageLedger,
      },
    );

    expect(snapshot.candidates[0]?.activeLaneOverlaps).toEqual([]);
    expect(snapshot.candidates[0]?.activeOwnershipGaps).toEqual([
      "Lane alpha-lane ownership could not be collected because repoRoot was unavailable.",
      "Lane beta-lane has linkage gaps: no open PR metadata found for branch beta-lane",
      "Lane beta-lane ownership could not be collected because repoRoot was unavailable.",
    ]);
    expect(snapshot.candidates[0]?.activeLaneEvidenceSummary).toContain(
      "Ownership coverage gaps: Lane alpha-lane ownership could not be collected because repoRoot was unavailable. | Lane beta-lane has linkage gaps: no open PR metadata found for branch beta-lane | Lane beta-lane ownership could not be collected because repoRoot was unavailable.",
    );
  });

  test("keeps candidate present with explicit active-lane evidence gap when linkage ledger is unavailable", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      ["novel-lane=src/lib/new-module.ts"],
      {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        hotspotSnapshot,
      },
    );

    expect(snapshot.candidates).toHaveLength(1);
    expect(snapshot.candidates[0]).toEqual(
      expect.objectContaining({
        name: "novel-lane",
        expectedSurfaceHints: ["src/lib/new-module.ts"],
        activeLaneOverlaps: [],
        activeOwnershipGaps: [
          "Active-lane ownership was not collected because queue/worktree linkage data was unavailable.",
        ],
        collisionRisk: "low",
        recommendation: "dispatch now",
      }),
    );
    expect(snapshot.candidates[0]?.activeLaneEvidenceSummary).toContain(
      "Ownership coverage gaps: Active-lane ownership was not collected because queue/worktree linkage data was unavailable.",
    );
    expect(snapshot.activeLaneEvidence).toEqual({
      activeLaneCount: 0,
      generatedAtUtc: expect.any(String),
      linkedWithGapsLaneCount: 0,
    });
  });

  test("formats every submitted candidate by name in one compact report", () => {
    const output = formatPlannerBatchCollisionPreflightSnapshot({
      activeLaneEvidence: {
        activeLaneCount: 1,
        generatedAtUtc: "2026-06-20T00:05:00.000Z",
        linkedWithGapsLaneCount: 0,
      },
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      hotspotEvidence: {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        recentCommitLimit: 40,
        repoRoot: "/repo",
        topPathCount: 3,
      },
      candidates: [
        {
          activeLaneEvidenceSummary: [
            "No active-lane ownership overlap was confirmed for alpha.",
          ],
          activeLaneOverlaps: [],
          activeOwnershipGaps: [],
          collisionRisk: "low",
          name: "alpha",
          expectedSurfaceHints: ["docs/guide.md"],
          hotspotEvidenceSummary: [
            "No ranked hotspot overlap found for alpha in the recent planner hotspot sample.",
          ],
          hotspotPathOverlaps: [],
          hotspotSurfaceOverlaps: [],
          recommendation: "dispatch now",
          recommendationEvidenceSummary:
            "No shared hotspot or active-lane overlap was confirmed for the submitted surfaces.",
        },
        {
          activeLaneEvidenceSummary: [
            "Active lane alpha-lane currently owns src/lib/factory [shared helper] through 2 matching paths.",
            "Active ownership raises the current collision risk to high.",
          ],
          activeLaneOverlaps: [
            {
              branchName: "alpha-lane",
              category: "shared-helper",
              categoryLabel: "shared helper",
              laneName: "alpha-lane",
              linkageStatus: "linked",
              matchedHints: ["src/lib/factory"],
              ownedPathCount: 2,
              ownedPaths: [
                "src/lib/factory/conflict-hotspot-report.ts",
                "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
              ],
              ownedSurface: "src/lib/factory",
              worktreePath: ".claude/worktrees/alpha-lane",
            },
          ],
          activeOwnershipGaps: [],
          collisionRisk: "high",
          name: "beta",
          expectedSurfaceHints: ["src/lib/factory"],
          hotspotEvidenceSummary: [
            "Matched hotspot surface src/lib/factory [shared helper] at 7 touches across 2 paths.",
          ],
          hotspotPathOverlaps: [],
          hotspotSurfaceOverlaps: [
            {
              category: "shared-helper",
              categoryLabel: "shared helper",
              distinctPaths: 2,
              matchedHints: ["src/lib/factory"],
              representativePaths: [
                "src/lib/factory/conflict-hotspot-report.ts",
                "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
              ],
              surface: "src/lib/factory",
              touches: 7,
            },
          ],
          recommendation: "hold",
          recommendationEvidenceSummary:
            "Every submitted surface overlaps active lane alpha-lane or hot shared paths, so dispatch would collide immediately.",
        },
      ],
    });

    expect(output).toContain("Planner Batch Collision Preflight");
    expect(output).toContain("Candidates: 2");
    expect(output).toContain("Hotspot sample: last 40 commits from /repo");
    expect(output).toContain("Active lanes: 1 linked-with-gaps=0");
    expect(output).toContain(
      "- candidate=alpha expected-surfaces=docs/guide.md hint-count=1",
    );
    expect(output).toContain("collision-risk=low");
    expect(output).toContain("recommendation=dispatch now");
    expect(output).toContain("hotspot-overlap=none");
    expect(output).toContain("active-lane-overlap=none");
    expect(output).toContain(
      "- candidate=beta expected-surfaces=src/lib/factory hint-count=1",
    );
    expect(output).toContain("collision-risk=high");
    expect(output).toContain("recommendation=hold");
    expect(output).toContain(
      "active-lane-overlap=alpha-lane surface=src/lib/factory [shared helper] matched-hints=src/lib/factory",
    );
    expect(output).toContain(
      "hotspot-overlap=src/lib/factory [shared helper] touches=7 matched-hints=src/lib/factory",
    );
  });
});
