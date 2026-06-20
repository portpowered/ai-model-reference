import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

describe("planner batch collision preflight script", () => {
  test("prints each submitted candidate batch by name in one run", () => {
    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-batch-collision-preflight.ts",
        "--candidate",
        "docs-lane=docs/guide.md,src/content/docs/attention/page.mdx",
        "--candidate",
        "factory-lane=scripts/report-planner-conflict-hotspots.ts",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Planner Batch Collision Preflight");
    expect(result.stdout).toContain("Candidates: 2");
    expect(result.stdout).toContain("candidate=docs-lane");
    expect(result.stdout).toContain("candidate=factory-lane");
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
    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-batch-collision-preflight.ts",
        "--candidate",
        "alpha=docs/guide.md,src/lib/factory",
        "--format",
        "json",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.candidates).toEqual([
      {
        name: "alpha",
        expectedSurfaceHints: ["docs/guide.md", "src/lib/factory"],
      },
    ]);
  });
});
