import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("typed taxonomy consumer deprecation fence command", () => {
  test("verifies the current repo stays inside the declared compatibility fence", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const result = spawnSync(
      "bun",
      [
        "./scripts/verify-typed-taxonomy-consumer-fence.ts",
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
      "Typed taxonomy consumer deprecation fence",
    );
    expect(result.stdout ?? "").toContain("Contract status: aligned");
    expect(result.stdout ?? "").toContain("Violation status: clear");
    expect(result.stdout ?? "").toContain(
      "No uncategorized or undeclared typed-taxonomy usage",
    );
  });
});
