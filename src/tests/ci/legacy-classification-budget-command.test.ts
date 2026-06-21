import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { legacyTaxonomyCompatibilityBudgetContract } from "@/lib/governance/legacy-taxonomy-compatibility-budget";

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

  test("fails when the approved bridge inventory grows beyond budget", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const fixtureDir = mkdtempSync(
      join(tmpdir(), "legacy-classification-budget-guard-"),
    );
    const fixturePath = join(fixtureDir, "bridges.json");

    try {
      writeFileSync(
        fixturePath,
        JSON.stringify(
          [
            ...legacyTaxonomyCompatibilityBudgetContract
              .legacyClassificationSurface.approvedBridges,
            {
              legacyId: "classification.extra-legacy-bridge",
              canonicalId: "classification.module.attention",
            },
          ],
          null,
          2,
        ),
      );

      const result = spawnSync(
        "bun",
        [
          "run",
          "verify:legacy-classification-budget",
          "--",
          "--repo-root",
          repoRoot,
          "--legacy-bridge-inventory-file",
          fixturePath,
        ],
        {
          cwd: repoRoot,
          encoding: "utf8",
        },
      );

      expect(result.status).toBe(1);
      expect(result.stdout ?? "").toContain("Status: drifted");
      expect(result.stdout ?? "").toContain("Approved baseline: 8 bridges");
      expect(result.stdout ?? "").toContain("Current measured: 9 bridges");
      expect(result.stdout ?? "").toContain(
        'registry runtime legacy classification bridges added "classification.extra-legacy-bridge -> classification.module.attention"',
      );
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  test("stays green when the approved bridge inventory shrinks", () => {
    const repoRoot = resolve(import.meta.dir, "../../..");
    const fixtureDir = mkdtempSync(
      join(tmpdir(), "legacy-classification-budget-shrink-"),
    );
    const fixturePath = join(fixtureDir, "bridges.json");

    try {
      writeFileSync(
        fixturePath,
        JSON.stringify(
          legacyTaxonomyCompatibilityBudgetContract.legacyClassificationSurface.approvedBridges.slice(
            0,
            -1,
          ),
          null,
          2,
        ),
      );

      const result = spawnSync(
        "bun",
        [
          "run",
          "verify:legacy-classification-budget",
          "--",
          "--repo-root",
          repoRoot,
          "--legacy-bridge-inventory-file",
          fixturePath,
        ],
        {
          cwd: repoRoot,
          encoding: "utf8",
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout ?? "").toContain("Status: aligned");
      expect(result.stdout ?? "").toContain("Approved baseline: 8 bridges");
      expect(result.stdout ?? "").toContain("Current measured: 7 bridges");
      expect(result.stdout ?? "").toContain(
        "No legacy classification bridge growth detected.",
      );
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});
