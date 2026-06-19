import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { COVERAGE_TEST_ARGS } from "@/lib/docs/component-coverage-gate";
import {
  REUSABLE_COVERAGE_COMPONENTS,
  REUSABLE_THIN_WRAPPERS,
} from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");
const coverageGateScriptPath = join(
  repoRoot,
  "scripts/component-coverage-gate.ts",
);

describe("component coverage contract", () => {
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

  test("reachable line coverage minimums are enforced by make internal-coverage, not nested bun test", () => {
    expect(existsSync(coverageGateScriptPath)).toBe(true);
    expect(COVERAGE_TEST_ARGS).toContain("--path-ignore-patterns");
    expect(COVERAGE_TEST_ARGS.join(" ")).toContain(
      "src/tests/docs/component-coverage.test.ts",
    );
  });
});
