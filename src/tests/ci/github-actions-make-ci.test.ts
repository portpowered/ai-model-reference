import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");
const makefilePath = join(repoRoot, "Makefile");
const buildTracingRegressionTestPath = join(
  repoRoot,
  "src/tests/build/next-build-tracing-warning.test.ts",
);

const ciTargets = [
  "lint",
  "typecheck",
  "test",
  "coverage",
  "build",
  "build-export",
  "test-build-contract",
  "test-integration",
  "validate-data",
  "linkcheck",
] as const;

const excludedCiTargets = [
  "validate-pdf",
  "deploy",
  "build-search-index",
] as const;

function parseMakefileCiPrerequisites(makefile: string): string[] {
  const ciLine = makefile
    .split("\n")
    .find((line) => line.startsWith("ci:") && !line.startsWith(".PHONY"));
  if (!ciLine) {
    throw new Error("Makefile is missing a ci: target");
  }
  return ciLine.slice("ci:".length).trim().split(/\s+/).filter(Boolean);
}

describe("GitHub Actions make ci", () => {
  test("ci workflow runs make ci after frozen lockfile install at repo root", () => {
    const workflow = readFileSync(ciWorkflowPath, "utf8");

    const frozenInstallIndex = workflow.indexOf(
      "bun install --frozen-lockfile",
    );
    const makeCiIndex = workflow.indexOf("run: make ci");

    expect(frozenInstallIndex).toBeGreaterThan(-1);
    expect(makeCiIndex).toBeGreaterThan(frozenInstallIndex);
    expect(workflow).not.toMatch(/continue-on-error:\s*true/i);
  });

  test("make ci splits fast tests from explicit build-contract tests", () => {
    expect(existsSync(buildTracingRegressionTestPath)).toBe(true);

    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: { test: string; "test:build-contract": string } };
    expect(packageJson.scripts.test).toBe("bun ./scripts/run-fast-tests.ts");
    expect(packageJson.scripts["test:build-contract"]).toBe(
      "bun test src/tests/build",
    );

    const workflow = readFileSync(ciWorkflowPath, "utf8");
    expect(workflow).not.toMatch(/--exclude/i);
    expect(workflow).not.toMatch(/next-build-tracing-warning/i);

    const makefile = readFileSync(makefilePath, "utf8");
    expect(parseMakefileCiPrerequisites(makefile)).toContain("test");
    expect(parseMakefileCiPrerequisites(makefile)).toContain(
      "test-build-contract",
    );
  });

  test("Makefile ci target runs CI gates in order including linkcheck", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const prerequisites = parseMakefileCiPrerequisites(makefile);

    expect(prerequisites).toEqual([...ciTargets]);

    for (const excluded of excludedCiTargets) {
      expect(prerequisites).not.toContain(excluded);
    }
  });

  test("make ci stops on the first failing prerequisite", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "make-ci-abort-"));

    try {
      writeFileSync(
        join(fixtureRoot, "Makefile"),
        [
          ".PHONY: ci lint typecheck",
          "ci: lint typecheck",
          "lint:",
          "\texit 1",
          "typecheck:",
          "\t@echo typecheck-should-not-run",
        ].join("\n"),
      );

      const result = spawnSync("make", ["ci"], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });

      expect(result.status).not.toBe(0);
      expect(result.stdout ?? "").not.toContain("typecheck-should-not-run");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
