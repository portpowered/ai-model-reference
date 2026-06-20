import { describe, expect, test } from "bun:test";
import {
  collectPlannerBatchCollisionPreflightSnapshot,
  formatPlannerBatchCollisionPreflightSnapshot,
  PlannerBatchCollisionPreflightInputError,
  parsePlannerBatchCollisionCandidateInput,
} from "./planner-batch-collision-preflight";

describe("planner batch collision preflight", () => {
  test("accepts multiple candidates with normalized surface hints", () => {
    const snapshot = collectPlannerBatchCollisionPreflightSnapshot(
      [
        "docs-lane=docs/guide.md, src/content/docs/attention/page.mdx",
        "factory-lane=scripts/report-planner-conflict-hotspots.ts,src\\\\lib\\\\factory\\\\queue-worktree-pr-linkage-ledger.ts",
      ],
      "2026-06-20T00:00:00.000Z",
    );

    expect(snapshot).toEqual({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      candidates: [
        {
          name: "docs-lane",
          expectedSurfaceHints: [
            "docs/guide.md",
            "src/content/docs/attention/page.mdx",
          ],
        },
        {
          name: "factory-lane",
          expectedSurfaceHints: [
            "scripts/report-planner-conflict-hotspots.ts",
            "src/lib/factory/queue-worktree-pr-linkage-ledger.ts",
          ],
        },
      ],
    });
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

  test("formats every submitted candidate by name in one compact report", () => {
    const output = formatPlannerBatchCollisionPreflightSnapshot({
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      candidates: [
        {
          name: "alpha",
          expectedSurfaceHints: ["docs/guide.md"],
        },
        {
          name: "beta",
          expectedSurfaceHints: ["src/lib/factory"],
        },
      ],
    });

    expect(output).toContain("Planner Batch Collision Preflight");
    expect(output).toContain("Candidates: 2");
    expect(output).toContain(
      "- candidate=alpha expected-surfaces=docs/guide.md hint-count=1",
    );
    expect(output).toContain(
      "- candidate=beta expected-surfaces=src/lib/factory hint-count=1",
    );
  });
});
