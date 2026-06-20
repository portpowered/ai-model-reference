import { describe, expect, test } from "bun:test";
import type { ConflictHotspotSnapshot } from "./conflict-hotspot-report";
import {
  collectPlannerBatchCollisionPreflightSnapshot,
  formatPlannerBatchCollisionPreflightSnapshot,
  PlannerBatchCollisionPreflightCollectionError,
  PlannerBatchCollisionPreflightInputError,
  parsePlannerBatchCollisionCandidateInput,
} from "./planner-batch-collision-preflight";

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
      }),
      expect.objectContaining({
        name: "factory-lane",
        expectedSurfaceHints: [
          "scripts/report-planner-conflict-hotspots.ts",
          "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
        ],
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

  test("formats every submitted candidate by name in one compact report", () => {
    const output = formatPlannerBatchCollisionPreflightSnapshot({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      hotspotEvidence: {
        generatedAtUtc: "2026-06-20T00:00:00.000Z",
        recentCommitLimit: 40,
        repoRoot: "/repo",
        topPathCount: 3,
      },
      candidates: [
        {
          name: "alpha",
          expectedSurfaceHints: ["docs/guide.md"],
          hotspotEvidenceSummary: [
            "No ranked hotspot overlap found for alpha in the recent planner hotspot sample.",
          ],
          hotspotPathOverlaps: [],
          hotspotSurfaceOverlaps: [],
        },
        {
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
        },
      ],
    });

    expect(output).toContain("Planner Batch Collision Preflight");
    expect(output).toContain("Candidates: 2");
    expect(output).toContain("Hotspot sample: last 40 commits from /repo");
    expect(output).toContain(
      "- candidate=alpha expected-surfaces=docs/guide.md hint-count=1",
    );
    expect(output).toContain("hotspot-overlap=none");
    expect(output).toContain(
      "- candidate=beta expected-surfaces=src/lib/factory hint-count=1",
    );
    expect(output).toContain(
      "hotspot-overlap=src/lib/factory [shared helper] touches=7 matched-hints=src/lib/factory",
    );
  });
});
