import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COVERAGE_TEST_ARGS,
  evaluateComponentCoverageGate,
  parseCoverageTable,
} from "@/lib/docs/component-coverage-gate";
import {
  REUSABLE_COVERAGE_COMPONENTS,
  REUSABLE_THIN_WRAPPERS,
} from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");
const coverageDocPath = join(repoRoot, "docs/phase-2-component-coverage.md");
const readmePath = join(repoRoot, "README.md");

function runCoverage(): ReturnType<typeof parseCoverageTable> {
  const result = spawnSync("bun", [...COVERAGE_TEST_ARGS], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`bun test --coverage failed:\n${combined.slice(-4000)}`);
  }

  return parseCoverageTable(combined);
}

describe("Phase 2 component coverage contract", () => {
  test("documents make coverage, thin-wrapper exceptions, and links the manifest", () => {
    const doc = readFileSync(coverageDocPath, "utf8");
    expect(doc).toMatch(/thin[- ]wrapper/i);
    expect(doc).toMatch(/component-manifest\.ts/);
    expect(doc).toMatch(/90%/);
    expect(doc).toMatch(/make coverage/);
    expect(doc).toMatch(/make ci.*make test/i);
    expect(doc).not.toMatch(/CI does \*\*not\*\* run/i);
  });

  test("README references reusable component coverage, make coverage, and make ci inclusion", () => {
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/phase-2-component-coverage\.md/);
    expect(readme).toMatch(/component-manifest\.ts/);
    expect(readme).toMatch(/make coverage/);
    expect(readme).toMatch(/make ci.*make test/i);
    expect(readme).not.toMatch(
      /make ci` does \*\*not\*\* run global coverage/i,
    );
  });

  test("manifest lists existing unit and a11y smoke test files", () => {
    for (const entry of REUSABLE_COVERAGE_COMPONENTS) {
      expect(existsSync(join(repoRoot, entry.file))).toBe(true);
      for (const testPath of entry.unitTests) {
        expect(existsSync(join(repoRoot, testPath))).toBe(true);
      }
    }

    for (const wrapper of REUSABLE_THIN_WRAPPERS) {
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
      const gate = evaluateComponentCoverageGate({
        coverageRows: runCoverage(),
        repoRoot,
      });
      expect(gate.ok).toBe(true);
    },
    { timeout: 120_000 },
  );
});
