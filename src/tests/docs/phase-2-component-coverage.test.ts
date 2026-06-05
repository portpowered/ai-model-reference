import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COVERAGE_TEST_ARGS } from "@/lib/docs/component-coverage-gate";
import {
  REUSABLE_COVERAGE_COMPONENTS,
  REUSABLE_THIN_WRAPPERS,
} from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");
const coverageDocPath = join(repoRoot, "docs/phase-2-component-coverage.md");
const readmePath = join(repoRoot, "README.md");
const coverageGateScriptPath = join(
  repoRoot,
  "scripts/component-coverage-gate.ts",
);

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

  test("reachable line coverage minimums are enforced by make coverage, not nested bun test", () => {
    expect(existsSync(coverageGateScriptPath)).toBe(true);
    expect(COVERAGE_TEST_ARGS).toContain("--path-ignore-patterns");
    expect(COVERAGE_TEST_ARGS.join(" ")).toContain(
      "src/tests/docs/phase-2-component-coverage.test.ts",
    );
  });
});
