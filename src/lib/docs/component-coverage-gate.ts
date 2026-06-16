import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type ComponentCoverageEntry,
  REUSABLE_COVERAGE_COMPONENTS,
  REUSABLE_THIN_WRAPPERS,
  type ThinWrapperEntry,
} from "@/lib/docs/component-manifest";
import { VERIFIER_COVERAGE_MODULES } from "@/lib/verify/verifier-coverage-manifest";

/** Bun `bun test --coverage` args shared by make coverage and the gate script. */
export const COVERAGE_TEST_ARGS = [
  "test",
  "--coverage",
  "--path-ignore-patterns",
  "src/tests/docs/component-coverage.test.ts",
] as const;

/** Documented search UI paths allowed outside `components/` directories. */
export const SEARCH_UI_MANIFEST_PREFIX = "src/features/docs/search/";

/** Documented tag list UI paths allowed outside `components/` directories. */
export const DOCS_TAG_LIST_MANIFEST_PREFIX = "src/features/docs/tags/";

export type CoverageRow = {
  file: string;
  linePercent: number;
};

export type ComponentCoverageSummaryLine = {
  label: string;
  file: string;
  linePercent: number | null;
  status: "PASS" | "FAIL";
  detail?: string;
};

export type ComponentCoverageGateResult = {
  ok: boolean;
  summaryLines: ComponentCoverageSummaryLine[];
  errors: string[];
};

export function normalizeSmokeTestPath(testPath: string): string {
  return testPath.replace(/\s+\(.*\)$/, "").trim();
}

export function collectCoverageTestPaths(options?: {
  components?: ComponentCoverageEntry[];
  thinWrappers?: ThinWrapperEntry[];
  verifierModules?: Array<{ unitTests: string[] }>;
}): string[] {
  const components = options?.components ?? REUSABLE_COVERAGE_COMPONENTS;
  const thinWrappers = options?.thinWrappers ?? REUSABLE_THIN_WRAPPERS;
  const verifierModules = options?.verifierModules ?? VERIFIER_COVERAGE_MODULES;
  const testPaths = new Set<string>();

  for (const component of components) {
    for (const testPath of component.unitTests) {
      testPaths.add(normalizeSmokeTestPath(testPath));
    }
    for (const testPath of component.a11ySmokeTests ?? []) {
      testPaths.add(normalizeSmokeTestPath(testPath));
    }
  }

  for (const wrapper of thinWrappers) {
    for (const testPath of wrapper.smokeTests) {
      testPaths.add(normalizeSmokeTestPath(testPath));
    }
  }

  for (const verifierModule of verifierModules) {
    for (const testPath of verifierModule.unitTests) {
      testPaths.add(normalizeSmokeTestPath(testPath));
    }
  }

  return [...testPaths].sort();
}

/** Surfaces failing test lines plus a tail slice when a coverage subprocess fails. */
export function formatCoverageSubprocessFailure(
  combined: string,
  maxTailChars = 4000,
): string {
  const lines = combined.split("\n");
  const failureMarkers = lines.filter(
    (line) =>
      /\(fail\)/.test(line) ||
      /^error:/.test(line.trim()) ||
      /tests failed:/.test(line),
  );
  const summaryBlock =
    failureMarkers.length > 0
      ? `Failing subprocess output:\n${failureMarkers.slice(-30).join("\n")}\n\n`
      : "";
  return `${summaryBlock}--- subprocess output (last ${maxTailChars} chars) ---\n${combined.slice(-maxTailChars)}`;
}

/** Runs `bun test --coverage` with shared gate args and parses the coverage table. */
export function runCoverageSubprocess(cwd: string): {
  rows: CoverageRow[];
  rawOutput: string;
} {
  const result = spawnSync(
    "bun",
    [...COVERAGE_TEST_ARGS, ...collectCoverageTestPaths()],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        VERIFY_COVERAGE_SUBPROCESS: "1",
      },
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(
      `bun test --coverage failed (exit ${result.status ?? "unknown"}):\n${formatCoverageSubprocessFailure(combined)}`,
    );
  }

  return { rows: parseCoverageTable(combined), rawOutput: combined };
}

/** Parses Bun coverage table rows for repo-relative `src/` paths. */
export function parseCoverageTable(output: string): CoverageRow[] {
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

/** True for manifest paths under shared component globs or documented search UI. */
export function isAllowedManifestPath(file: string): boolean {
  if (file.startsWith("src/components/")) {
    return true;
  }
  if (/^src\/features\/[^/]+\/components\//.test(file)) {
    return true;
  }
  if (file.startsWith(SEARCH_UI_MANIFEST_PREFIX)) {
    return true;
  }
  if (file.startsWith(DOCS_TAG_LIST_MANIFEST_PREFIX)) {
    return true;
  }
  return false;
}

function checkThinWrapper(
  wrapper: ThinWrapperEntry,
  repoRoot: string,
  errors: string[],
): ComponentCoverageSummaryLine {
  let failed = false;

  for (const testPath of wrapper.smokeTests) {
    const normalized = normalizeSmokeTestPath(testPath);
    if (!existsSync(join(repoRoot, normalized))) {
      failed = true;
      errors.push(
        `${wrapper.label} (${wrapper.file}): missing smoke test ${normalized}`,
      );
    }
  }

  return {
    label: wrapper.label,
    file: wrapper.file,
    linePercent: null,
    status: failed ? "FAIL" : "PASS",
    detail: "thin wrapper (line threshold skipped)",
  };
}

function checkCoverageEntry(
  entry: ComponentCoverageEntry,
  coverageByFile: Map<string, number>,
  errors: string[],
): ComponentCoverageSummaryLine {
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

export function evaluateComponentCoverageGate(options: {
  coverageRows: CoverageRow[];
  repoRoot?: string;
  /** Override manifest entries in unit tests without mutating production data. */
  components?: ComponentCoverageEntry[];
  thinWrappers?: ThinWrapperEntry[];
}): ComponentCoverageGateResult {
  const repoRoot = options.repoRoot ?? process.cwd();
  const components = options.components ?? REUSABLE_COVERAGE_COMPONENTS;
  const thinWrappers = options.thinWrappers ?? REUSABLE_THIN_WRAPPERS;
  const errors: string[] = [];
  const summaryLines: ComponentCoverageSummaryLine[] = [];

  for (const entry of [...components, ...thinWrappers]) {
    if (!isAllowedManifestPath(entry.file)) {
      errors.push(
        `Manifest path not allowed (use src/components/**, src/features/**/components/**, ${SEARCH_UI_MANIFEST_PREFIX}, or ${DOCS_TAG_LIST_MANIFEST_PREFIX}): ${entry.file}`,
      );
    }
  }

  const coverageByFile = new Map(
    options.coverageRows.map((row) => [row.file, row.linePercent]),
  );

  for (const entry of components) {
    summaryLines.push(checkCoverageEntry(entry, coverageByFile, errors));
  }

  for (const wrapper of thinWrappers) {
    const line = checkThinWrapper(wrapper, repoRoot, errors);
    summaryLines.push(line);
  }

  const ok =
    errors.length === 0 && summaryLines.every((line) => line.status === "PASS");

  return { ok, summaryLines, errors };
}

export function formatComponentCoverageSummaryLine(
  line: ComponentCoverageSummaryLine,
): string {
  const percent =
    line.linePercent === null ? "n/a" : `${line.linePercent.toFixed(2)}%`;
  const detail = line.detail ? ` (${line.detail})` : "";
  return `${line.label} | ${line.file} | ${percent} | ${line.status}${detail}`;
}
