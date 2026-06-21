import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { typedTaxonomyConsumerAuditContract } from "@/lib/governance/typed-taxonomy-consumer-audit";

describe("legacy taxonomy compatibility budget command", () => {
  test("prints both governed compatibility surfaces and their approved baselines", () => {
    const workspaceRoot = resolve(import.meta.dir, "../../..");
    const snapshotRoot = mkdtempSync(
      join(tmpdir(), "legacy-taxonomy-compatibility-budget-"),
    );

    try {
      for (const entry of typedTaxonomyConsumerAuditContract) {
        const sourcePath = join(workspaceRoot, entry.path);
        const targetPath = join(snapshotRoot, entry.path);
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, readFileSync(sourcePath, "utf8"));
      }

      const result = spawnSync(
        "bun",
        [
          "run",
          "report:legacy-taxonomy-compatibility-budget",
          "--",
          "--repo-root",
          snapshotRoot,
        ],
        {
          cwd: workspaceRoot,
          encoding: "utf8",
        },
      );

      expect(result.status).toBe(0);
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
    } finally {
      rmSync(snapshotRoot, { recursive: true, force: true });
    }
  });
});
