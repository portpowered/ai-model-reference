import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("typed taxonomy consumer audit command", () => {
  test("prints the tracked cluster summary for the current repo", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const result = spawnSync(
      "bun",
      ["./scripts/audit-typed-taxonomy-consumers.ts", "--repo-root", repoRoot],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr ?? "").toBe("");
    expect(result.stdout ?? "").toContain("Typed taxonomy consumer audit");
    expect(result.stdout ?? "").toContain("Cluster summary");
    expect(result.stdout ?? "").toContain("search");
    expect(result.stdout ?? "").toContain("sidebar/topology");
    expect(result.stdout ?? "").toContain("page-spec authoring");
  });
});
