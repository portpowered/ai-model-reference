import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  evaluateVerifierCoverageGate,
  formatVerifierCoverageSummaryLine,
} from "./verifier-coverage-gate";
import {
  VERIFIER_COVERAGE_MODULES,
  type VerifierCoverageEntry,
} from "./verifier-coverage-manifest";

const repoRoot = join(import.meta.dir, "../../..");

const TEST_MODULE: VerifierCoverageEntry = {
  file: "src/lib/verify/server-lifecycle.ts",
  label: "Verify server lifecycle",
  minReachableLinePercent: 90,
  unitTests: ["src/lib/verify/server-lifecycle.test.ts"],
};

describe("verifier-coverage-gate", () => {
  test("manifest lists existing verifier module and unit test files", () => {
    for (const entry of VERIFIER_COVERAGE_MODULES) {
      expect(entry.file.startsWith("src/lib/verify/")).toBe(true);
      expect(entry.minReachableLinePercent).toBeGreaterThanOrEqual(90);
    }
  });

  test("evaluateVerifierCoverageGate passes at or above minimum line percent", () => {
    const gate = evaluateVerifierCoverageGate({
      modules: [TEST_MODULE],
      coverageRows: [{ file: TEST_MODULE.file, linePercent: 90.66 }],
      repoRoot,
    });

    expect(gate.ok).toBe(true);
    expect(gate.errors).toHaveLength(0);
    expect(gate.summaryLines[0]?.status).toBe("PASS");
  });

  test("evaluateVerifierCoverageGate fails below minimum line percent", () => {
    const gate = evaluateVerifierCoverageGate({
      modules: [TEST_MODULE],
      coverageRows: [{ file: TEST_MODULE.file, linePercent: 87.76 }],
      repoRoot,
    });

    expect(gate.ok).toBe(false);
    expect(gate.errors.join("\n")).toContain("87.76%");
    expect(gate.errors.join("\n")).toContain("90%");
    expect(gate.summaryLines[0]?.status).toBe("FAIL");
  });

  test("formatVerifierCoverageSummaryLine mirrors component gate formatting", () => {
    const formatted = formatVerifierCoverageSummaryLine({
      label: TEST_MODULE.label,
      file: TEST_MODULE.file,
      linePercent: 90.66,
      status: "PASS",
    });

    expect(formatted).toContain(TEST_MODULE.label);
    expect(formatted).toContain("90.66%");
    expect(formatted).toContain("PASS");
  });
});
