import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("legacy taxonomy compatibility budget command", () => {
  test("prints both governed compatibility surfaces and their approved baselines", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const result = spawnSync(
      "bun",
      [
        "./scripts/report-legacy-taxonomy-compatibility-budget.ts",
        "--repo-root",
        repoRoot,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr ?? "").toBe("");
    expect(result.stdout ?? "").toContain(
      "Legacy taxonomy compatibility budget",
    );
    expect(result.stdout ?? "").toContain(
      "registry runtime legacy classification bridges",
    );
    expect(result.stdout ?? "").toContain(
      "search typed-taxonomy compatibility cluster",
    );
    expect(result.stdout ?? "").toContain("Approved baseline: 8 bridges");
    expect(result.stdout ?? "").toContain(
      "Approved baseline: 3 entries, 14 field references",
    );
  });
});
