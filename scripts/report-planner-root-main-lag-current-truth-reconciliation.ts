import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatRootMainLagCurrentTruthHandoff,
  performRootMainLagReconciliation,
  ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS,
  type RootMainLagPlannerReportInput,
  serializeRootMainLagCurrentTruthHandoff,
} from "../src/lib/factory/planner-root-main-lag-current-truth-reconciliation";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readOptionalFile(path: string, label: string): string | undefined {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label} fixture at ${path}`);
  }
  return readFileSync(path, "utf8");
}

function isJsonOutputRequested(argv: string[]): boolean {
  return (
    argv.includes("--json") ||
    (argv.includes("--format") &&
      argv[argv.indexOf("--format") + 1]?.trim().toLowerCase() === "json")
  );
}

function readRepeatedFlagValues(flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== flag) {
      continue;
    }
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) {
      continue;
    }
    values.push(value);
  }
  return values;
}
function readPlannerReports(
  repoRoot: string,
  explicitPaths: string[],
): RootMainLagPlannerReportInput[] {
  const paths =
    explicitPaths.length > 0
      ? explicitPaths
      : [...ROOT_MAIN_LAG_DEFAULT_PLANNER_REPORT_PATHS];
  const reports: RootMainLagPlannerReportInput[] = [];

  for (const relativePath of paths) {
    const absolutePath = resolve(repoRoot, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    reports.push({
      path: relativePath,
      text: readFileSync(absolutePath, "utf8"),
    });
  }

  return reports;
}

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const remoteBaseRef = readFlagValue("--remote-base-ref");
const statusOutputPath = readFlagValue("--status-output");
const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : undefined;
const generatedAtUtc = readFlagValue("--generated-at-utc");
const workListPath = readFlagValue("--work-list-json");
const workListJsonText = workListPath
  ? readOptionalFile(workListPath, "work list")
  : undefined;
const explicitPlannerReportPaths = readRepeatedFlagValues("--planner-report");
const applyRequested = process.argv.includes("--apply");
const plannerReportPath = explicitPlannerReportPaths[0];

const handoff = performRootMainLagReconciliation({
  apply: applyRequested,
  generatedAtUtc,
  plannerReportPath,
  plannerReports: readPlannerReports(repoRoot, explicitPlannerReportPaths),
  remoteBaseRef,
  repoRoot,
  statusOutput,
  workListJsonText,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? serializeRootMainLagCurrentTruthHandoff(handoff)
    : `${formatRootMainLagCurrentTruthHandoff(handoff)}\n`,
);
