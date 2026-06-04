import { describe, expect, test } from "bun:test";
import {
  evaluateComponentCoverageGate,
  formatComponentCoverageSummaryLine,
  isAllowedManifestPath,
  parseCoverageTable,
} from "@/lib/docs/component-coverage-gate";
import { REUSABLE_COVERAGE_COMPONENTS } from "@/lib/docs/component-manifest";

const SAMPLE_TABLE = `
 src/features/docs/components/Callout.tsx                  |  100.00 |  100.00 |
 src/features/docs/search/SearchResults.tsx                |   66.67 |   91.76 |
`;

describe("component-coverage-gate", () => {
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
    expect(isAllowedManifestPath("src/components/ui/button.tsx")).toBe(true);
    expect(isAllowedManifestPath("src/lib/utils.ts")).toBe(false);
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

  test("formatComponentCoverageSummaryLine includes label, path, percent, and status", () => {
    const formatted = formatComponentCoverageSummaryLine({
      label: "Callout",
      file: "src/features/docs/components/Callout.tsx",
      linePercent: 88.5,
      status: "FAIL",
      detail: "observed 88.5% < required 90%",
    });
    expect(formatted).toContain("Callout");
    expect(formatted).toContain("src/features/docs/components/Callout.tsx");
    expect(formatted).toContain("88.50%");
    expect(formatted).toContain("FAIL");
  });
});
