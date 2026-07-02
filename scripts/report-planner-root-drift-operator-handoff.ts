import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  discoverPlannerRootDriftHandoffEvidenceReport,
  formatPlannerRootDriftHandoffEvidenceMarkdown,
  formatPlannerRootDriftHandoffEvidenceReport,
  serializePlannerRootDriftHandoffEvidenceReport,
} from "../src/lib/factory/planner-root-drift-operator-handoff";

const defaultRepoRoot = resolve(import.meta.dir, "..");
const DEFAULT_STATUS_FIXTURE = resolve(
  import.meta.dir,
  "../src/tests/fixtures/planner-root-drift-operator-handoff/nine-dirty-paths-status.txt",
);

function formatUsage(): string {
  return [
    "Usage: bun ./scripts/report-planner-root-drift-operator-handoff.ts [options]",
    "",
    "Planner-facing operator handoff that records root dirty paths and read-only evidence commands.",
    "",
    "Options:",
    "  --help                         Show this usage summary",
    "  --json                         Shortcut for --format json",
    "  --format <human|json|markdown> Output format. Default: human",
    "  --repo-root <path>             Repository root for live git evidence",
    "  --status-output <path>         Saved `git status --short --branch` snapshot",
    "  --write-artifact <path>        Write markdown artifact to the given path",
    "",
    "When no live root checkout evidence is available, the script falls back to the",
    "nine-path fixture under src/tests/fixtures/planner-root-drift-operator-handoff/.",
  ].join("\n");
}

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readOptionalFile(path: string, label: string): string {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label} at ${path}`);
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

function readOutputFormat(argv: string[]): "human" | "json" | "markdown" {
  if (isJsonOutputRequested(argv)) {
    return "json";
  }

  const formatIndex = argv.indexOf("--format");
  if (formatIndex >= 0) {
    const format = argv[formatIndex + 1]?.trim().toLowerCase();
    if (format === "json" || format === "markdown" || format === "human") {
      return format;
    }
    throw new Error(`Unsupported --format value: ${argv[formatIndex + 1]}`);
  }

  return "human";
}

if (process.argv.includes("--help")) {
  process.stdout.write(`${formatUsage()}\n`);
  process.exit(0);
}

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const statusOutputPath = readFlagValue("--status-output");
const writeArtifactPath = readFlagValue("--write-artifact");
const outputFormat = readOutputFormat(process.argv);

const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : existsSync(DEFAULT_STATUS_FIXTURE)
    ? `## main...origin/main\n${readOptionalFile(DEFAULT_STATUS_FIXTURE, "default status fixture").trimEnd()}\n`
    : undefined;

const report = discoverPlannerRootDriftHandoffEvidenceReport({
  repoRoot,
  statusOutput,
});

const output =
  outputFormat === "json"
    ? serializePlannerRootDriftHandoffEvidenceReport(report)
    : outputFormat === "markdown"
      ? `${formatPlannerRootDriftHandoffEvidenceMarkdown(report)}\n`
      : `${formatPlannerRootDriftHandoffEvidenceReport(report)}\n`;

if (writeArtifactPath) {
  writeFileSync(
    resolve(writeArtifactPath),
    formatPlannerRootDriftHandoffEvidenceMarkdown(report),
  );
}

process.stdout.write(output);
