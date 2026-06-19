import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");

describe("GitHub Actions Bun install", () => {
  test("ci workflow runs setup-bun before frozen lockfile install at repo root", () => {
    const workflow = readFileSync(ciWorkflowPath, "utf8");

    const setupBunIndex = workflow.indexOf("oven-sh/setup-bun@v2");
    const pinnedBunVersionIndex = workflow.indexOf("bun-version: 1.3.13");
    const frozenInstallIndex = workflow.indexOf(
      "bun install --frozen-lockfile",
    );

    expect(setupBunIndex).toBeGreaterThan(-1);
    expect(pinnedBunVersionIndex).toBeGreaterThan(setupBunIndex);
    expect(frozenInstallIndex).toBeGreaterThan(setupBunIndex);
    expect(workflow).not.toMatch(/\bbun update\b/);
    expect(workflow).not.toMatch(/\bbun install\b(?!\s+--frozen-lockfile)/);
  });

  test("bun install --frozen-lockfile fails when package.json drifts from bun.lock", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "frozen-lockfile-drift-"));

    try {
      writeFileSync(
        join(fixtureRoot, "package.json"),
        JSON.stringify({
          name: "frozen-lockfile-fixture",
          version: "0.0.0",
          private: true,
          dependencies: {
            "is-odd": "3.0.1",
          },
        }),
      );

      const initialInstall = spawnSync("bun", ["install"], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });
      expect(initialInstall.status).toBe(0);

      writeFileSync(
        join(fixtureRoot, "package.json"),
        JSON.stringify({
          name: "frozen-lockfile-fixture",
          version: "0.0.0",
          private: true,
          dependencies: {
            "is-odd": "3.0.1",
            "is-even": "1.0.0",
          },
        }),
      );

      const frozenInstall = spawnSync("bun", ["install", "--frozen-lockfile"], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });

      expect(frozenInstall.status).not.toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
