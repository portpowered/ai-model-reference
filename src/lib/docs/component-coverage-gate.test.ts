import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  evaluateComponentCoverageGate,
  formatComponentCoverageSummaryLine,
  formatCoverageSubprocessFailure,
  isAllowedManifestPath,
  parseCoverageTable,
} from "@/lib/docs/component-coverage-gate";
import {
  type ComponentCoverageEntry,
  REUSABLE_COVERAGE_COMPONENTS,
  type ThinWrapperEntry,
} from "@/lib/docs/component-manifest";

const repoRoot = join(import.meta.dir, "../../..");

const SAMPLE_TABLE = `
 src/features/docs/components/Callout.tsx                  |  100.00 |  100.00 |
 src/features/docs/search/SearchResults.tsx                |   66.67 |   91.76 |
`;

const TEST_COMPONENT: ComponentCoverageEntry = {
  file: "src/features/docs/components/Callout.tsx",
  label: "Callout",
  minReachableLinePercent: 90,
  unitTests: ["src/features/docs/components/Callout.test.tsx"],
};

const TEST_THIN_WRAPPER: ThinWrapperEntry = {
  file: "src/components/ui/button.tsx",
  label: "Button (thin wrapper)",
  forwardsTo: "radix-ui Button",
  smokeTests: ["src/features/docs/components/Callout.test.tsx"],
};

describe("component-coverage-gate", () => {
  test("formatCoverageSubprocessFailure includes failing test lines before output tail", () => {
    const combined = [
      "(pass) example > ok [1ms]",
      "(fail) flaky probe > times out [5000ms]",
      "1 tests failed:",
      "coverage table tail",
    ].join("\n");
    const formatted = formatCoverageSubprocessFailure(combined, 20);
    expect(formatted).toContain("(fail) flaky probe > times out");
    expect(formatted).toContain("1 tests failed:");
    expect(formatted).toContain("coverage table tail");
  });

  test("parseCoverageTable maps Bun table rows to file and line percent", () => {
    const rows = parseCoverageTable(SAMPLE_TABLE);
    expect(rows).toEqual([
      { file: "src/features/docs/components/Callout.tsx", linePercent: 100 },
      {
        file: "src/features/docs/search/SearchResults.tsx",
        linePercent: 91.76,
      },
    ]);
  });

  test("isAllowedManifestPath accepts component and search UI paths", () => {
    expect(
      isAllowedManifestPath("src/features/docs/components/Callout.tsx"),
    ).toBe(true);
    expect(
      isAllowedManifestPath("src/features/docs/search/SearchResults.tsx"),
    ).toBe(true);
    expect(
      isAllowedManifestPath("src/features/docs/tags/TagsIndexList.tsx"),
    ).toBe(true);
    expect(isAllowedManifestPath("src/components/ui/button.tsx")).toBe(true);
    expect(isAllowedManifestPath("src/lib/utils.ts")).toBe(false);
  });

  test("evaluateComponentCoverageGate passes at or above minimum line percent", () => {
    const gate = evaluateComponentCoverageGate({
      components: [TEST_COMPONENT],
      thinWrappers: [],
      coverageRows: [{ file: TEST_COMPONENT.file, linePercent: 90 }],
    });
    expect(gate.ok).toBe(true);
    expect(gate.errors).toEqual([]);
    expect(gate.summaryLines).toEqual([
      {
        label: "Callout",
        file: TEST_COMPONENT.file,
        linePercent: 90,
        status: "PASS",
      },
    ]);
  });

  test("evaluateComponentCoverageGate fails below minimum with observed and required", () => {
    const entry = REUSABLE_COVERAGE_COMPONENTS[0];
    const coverageRows = REUSABLE_COVERAGE_COMPONENTS.map((component) => ({
      file: component.file,
      linePercent:
        component.file === entry.file ? 50 : component.minReachableLinePercent,
    }));
    const gate = evaluateComponentCoverageGate({ coverageRows });
    expect(gate.ok).toBe(false);
    const failure = gate.errors.find((message) =>
      message.includes(entry.label),
    );
    expect(failure).toBeDefined();
    expect(failure).toContain("50%");
    expect(failure).toContain(`${entry.minReachableLinePercent}%`);
  });

  test("thin-wrapper entries skip line percent and pass when smoke tests exist", () => {
    const gate = evaluateComponentCoverageGate({
      components: [],
      thinWrappers: [TEST_THIN_WRAPPER],
      coverageRows: [],
      repoRoot,
    });
    expect(gate.ok).toBe(true);
    expect(gate.summaryLines).toEqual([
      {
        label: TEST_THIN_WRAPPER.label,
        file: TEST_THIN_WRAPPER.file,
        linePercent: null,
        status: "PASS",
        detail: "thin wrapper (line threshold skipped)",
      },
    ]);
  });

  test("thin-wrapper entries fail when a smoke test path is missing", () => {
    const gate = evaluateComponentCoverageGate({
      components: [],
      thinWrappers: [
        {
          ...TEST_THIN_WRAPPER,
          smokeTests: ["src/missing/smoke.test.tsx"],
        },
      ],
      coverageRows: [],
      repoRoot,
    });
    expect(gate.ok).toBe(false);
    expect(gate.summaryLines[0]?.status).toBe("FAIL");
    expect(gate.summaryLines[0]?.linePercent).toBeNull();
    expect(gate.errors[0]).toContain(TEST_THIN_WRAPPER.label);
    expect(gate.errors[0]).toContain("missing smoke test");
    expect(gate.errors[0]).toContain("src/missing/smoke.test.tsx");
  });

  test("failure output includes label, path, observed percent, and required percent", () => {
    const gate = evaluateComponentCoverageGate({
      components: [TEST_COMPONENT],
      thinWrappers: [],
      coverageRows: [{ file: TEST_COMPONENT.file, linePercent: 88.5 }],
    });
    const failureLine = gate.summaryLines[0];
    expect(failureLine?.status).toBe("FAIL");
    if (!failureLine) {
      throw new Error("expected a failing coverage summary line");
    }
    const formatted = formatComponentCoverageSummaryLine(failureLine);
    expect(formatted).toContain(TEST_COMPONENT.label);
    expect(formatted).toContain(TEST_COMPONENT.file);
    expect(formatted).toContain("88.50%");
    expect(formatted).toContain("required 90%");
    expect(formatted).toContain("FAIL");
  });
});
