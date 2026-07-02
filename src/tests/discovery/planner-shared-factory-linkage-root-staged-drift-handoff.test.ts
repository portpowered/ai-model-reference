import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS } from "@/lib/factory/planner-shared-factory-linkage-root-staged-drift-handoff";

const STAGED_DRIFT_STATUS_FIXTURE = join(
  import.meta.dir,
  "../fixtures/planner-shared-factory-linkage-root-staged-drift-handoff/staged-drift-evidence-status.txt",
);

describe("planner-shared-factory-linkage-root-staged-drift-handoff script", () => {
  test("emits the supplied evidence snapshot without mutating fixture input", () => {
    const fixtureBefore = readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8");

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-planner-shared-factory-linkage-root-staged-drift-handoff.ts",
        "--status-output",
        STAGED_DRIFT_STATUS_FIXTURE,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Shared Factory Linkage Root Staged Drift Handoff",
    );
    expect(result.stdout).toContain("evidence-timestamp=2026-07-01T22:08-0700");
    expect(result.stdout).toContain(
      "session=0fdc5077-95ed-4396-a183-06e5b16555ca",
    );
    expect(result.stdout).toContain(
      "root-head=3cd6734934e55e52d8a595ed93421609f9e142c1",
    );
    expect(result.stdout).toContain(
      "staged-dirty-paths=12 unstaged-diff=false",
    );
    expect(result.stdout).toContain(
      "read-only-policy This lane is read-only and must not mutate",
    );
    for (const path of SHARED_FACTORY_LINKAGE_CUSTOMER_SUPPLIED_DIRTY_PATHS) {
      expect(result.stdout).toContain(`path=${path}`);
    }

    const fixtureAfter = readFileSync(STAGED_DRIFT_STATUS_FIXTURE, "utf8");
    expect(fixtureAfter).toBe(fixtureBefore);
  });
});
