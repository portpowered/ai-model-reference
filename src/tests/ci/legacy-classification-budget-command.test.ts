import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("legacy classification compatibility budget guard command", () => {
  test("verifies the committed bridge inventory stays inside the approved budget", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const result = spawnSync(
      "bun",
      [
        "run",
        "verify:legacy-classification-budget",
        "--",
        "--repo-root",
        repoRoot,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout ?? "").toContain(
      "Legacy classification compatibility budget guard",
    );
    expect(result.stdout ?? "").toContain("Status: aligned");
    expect(result.stdout ?? "").toContain("Approved baseline: 8 bridges");
    expect(result.stdout ?? "").toContain(
      "No legacy classification bridge growth detected.",
    );
  });
});
