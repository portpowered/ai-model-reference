import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type ComponentCoverageSummaryLine,
  type CoverageRow,
  formatComponentCoverageSummaryLine,
} from "@/lib/docs/component-coverage-gate";
import {
  VERIFIER_COVERAGE_MODULES,
  type VerifierCoverageEntry,
} from "./verifier-coverage-manifest";

export type VerifierCoverageGateResult = {
  ok: boolean;
  summaryLines: ComponentCoverageSummaryLine[];
  errors: string[];
};

function checkVerifierCoverageEntry(
  entry: VerifierCoverageEntry,
  coverageByFile: Map<string, number>,
  repoRoot: string,
  errors: string[],
): ComponentCoverageSummaryLine {
  for (const testPath of entry.unitTests) {
    if (!existsSync(join(repoRoot, testPath))) {
      errors.push(
        `${entry.label} (${entry.file}): missing unit test ${testPath}`,
      );
    }
  }

  const observed = coverageByFile.get(entry.file);
  if (observed === undefined) {
    errors.push(
      `${entry.label} (${entry.file}): no coverage row (required ≥ ${entry.minReachableLinePercent}%)`,
    );
    return {
      label: entry.label,
      file: entry.file,
      linePercent: null,
      status: "FAIL",
      detail: `required ≥ ${entry.minReachableLinePercent}%`,
    };
  }

  const pass = observed >= entry.minReachableLinePercent;
  if (!pass) {
    errors.push(
      `${entry.label} (${entry.file}): ${observed}% < required ${entry.minReachableLinePercent}%`,
    );
  }

  return {
    label: entry.label,
    file: entry.file,
    linePercent: observed,
    status: pass ? "PASS" : "FAIL",
    detail: pass
      ? undefined
      : `observed ${observed}% < required ${entry.minReachableLinePercent}%`,
  };
}

export function evaluateVerifierCoverageGate(options: {
  coverageRows: CoverageRow[];
  repoRoot?: string;
  modules?: VerifierCoverageEntry[];
}): VerifierCoverageGateResult {
  const repoRoot = options.repoRoot ?? process.cwd();
  const modules = options.modules ?? VERIFIER_COVERAGE_MODULES;
  const errors: string[] = [];
  const summaryLines: ComponentCoverageSummaryLine[] = [];
  const coverageByFile = new Map(
    options.coverageRows.map((row) => [row.file, row.linePercent]),
  );

  for (const entry of modules) {
    summaryLines.push(
      checkVerifierCoverageEntry(entry, coverageByFile, repoRoot, errors),
    );
  }

  const ok =
    errors.length === 0 && summaryLines.every((line) => line.status === "PASS");

  return { ok, summaryLines, errors };
}

export {
  formatComponentCoverageSummaryLine as formatVerifierCoverageSummaryLine,
};
