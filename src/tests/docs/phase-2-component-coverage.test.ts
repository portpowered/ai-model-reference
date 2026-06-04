import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PHASE_2_COVERAGE_COMPONENTS,
  PHASE_2_THIN_WRAPPERS,
} from "@/lib/docs/phase-2-component-manifest";

const repoRoot = join(import.meta.dir, "../../..");
const coverageDocPath = join(repoRoot, "docs/phase-2-component-coverage.md");
const readmePath = join(repoRoot, "README.md");

type CoverageRow = {
  file: string;
  linePercent: number;
};

function parseCoverageTable(output: string): CoverageRow[] {
  const rows: CoverageRow[] = [];

  for (const line of output.split("\n")) {
    const match = line.match(
      /^\s+(src\/\S+)\s+\|\s+[\d.]+\s+\|\s+([\d.]+)\s+\|/,
    );
    if (!match) {
      continue;
    }
    rows.push({
      file: match[1],
      linePercent: Number.parseFloat(match[2]),
    });
  }

  return rows;
}

function runCoverage(): CoverageRow[] {
  const result = spawnSync(
    "bun",
    [
      "test",
      "--coverage",
      "--path-ignore-patterns",
      "src/tests/docs/phase-2-component-coverage.test.ts",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0" },
    },
  );

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`bun test --coverage failed:\n${combined.slice(-4000)}`);
  }

  return parseCoverageTable(combined);
}

describe("Phase 2 component coverage contract", () => {
  test("documents thin-wrapper exceptions and links the manifest", () => {
    const doc = readFileSync(coverageDocPath, "utf8");
    expect(doc).toMatch(/thin[- ]wrapper/i);
    expect(doc).toMatch(/phase-2-component-manifest\.ts/);
    expect(doc).toMatch(/90%/);
    expect(doc).not.toMatch(/make ci.*coverage threshold/i);
  });

  test("README references Phase 2 coverage documentation without adding make ci coverage", () => {
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/phase-2-component-coverage\.md/);
    const makefile = readFileSync(join(repoRoot, "Makefile"), "utf8");
    const ciLine = makefile
      .split("\n")
      .find((line) => line.startsWith("ci:") && !line.startsWith(".PHONY"));
    expect(ciLine).toBeDefined();
    expect(ciLine).not.toMatch(/\bcoverage\b/);
  });

  test("manifest lists existing unit and a11y smoke test files", () => {
    for (const entry of PHASE_2_COVERAGE_COMPONENTS) {
      expect(existsSync(join(repoRoot, entry.file))).toBe(true);
      for (const testPath of entry.unitTests) {
        expect(existsSync(join(repoRoot, testPath))).toBe(true);
      }
    }

    for (const wrapper of PHASE_2_THIN_WRAPPERS) {
      expect(existsSync(join(repoRoot, wrapper.file))).toBe(true);
      for (const testPath of wrapper.smokeTests) {
        const normalized = testPath.replace(/\s+\(.*\)$/, "");
        expect(existsSync(join(repoRoot, normalized))).toBe(true);
      }
    }
  });

  test(
    "Phase 2 reusable components meet reachable line coverage minimums",
    () => {
      const coverage = runCoverage();

      for (const entry of PHASE_2_COVERAGE_COMPONENTS) {
        const row = coverage.find((item) => item.file === entry.file);
        expect(row).toBeDefined();
        expect(row?.linePercent).toBeGreaterThanOrEqual(
          entry.minReachableLinePercent,
        );
      }
    },
    { timeout: 120_000 },
  );
});
