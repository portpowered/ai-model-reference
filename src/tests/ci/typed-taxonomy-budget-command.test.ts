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

describe("typed taxonomy compatibility budget command", () => {
  test("verifies the governed search cluster stays inside the declared budget", () => {
    const workspaceRoot = resolve(import.meta.dir, "../../..");
    const snapshotRoot = mkdtempSync(
      join(tmpdir(), "typed-taxonomy-budget-guard-"),
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
          "verify:typed-taxonomy-budget",
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
        "Deprecated typed-taxonomy compatibility budget guard",
      );
      expect(result.stdout ?? "").toContain("Status: aligned");
      expect(result.stdout ?? "").toContain(
        "Approved baseline: 3 entries, 14 field references",
      );
      expect(result.stdout ?? "").toContain(
        "No deprecated typed-taxonomy budget growth detected.",
      );
    } finally {
      rmSync(snapshotRoot, { recursive: true, force: true });
    }
  });
});
