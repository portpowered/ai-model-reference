import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  discoverPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
  formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceMarkdown,
  formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
  serializePlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport,
} from "../src/lib/factory/planner-terminal-audit-root-staged-deletion-handoff";
import { discoverPlannerWorktreeDriftSnapshot } from "../src/lib/factory/planner-worktree-drift-watchdog";

const defaultRepoRoot = resolve(import.meta.dir, "..");
const DEFAULT_STATUS_FIXTURE = resolve(
  import.meta.dir,
  "../src/tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff/six-dirty-paths-status.txt",
);
const DEFAULT_WATCHDOG_FIXTURE = resolve(
  import.meta.dir,
  "../src/tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff/six-dirty-paths-watchdog-report.txt",
);
const DEFAULT_CACHED_DIFF_FIXTURE = resolve(
  import.meta.dir,
  "../src/tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff/six-dirty-paths-cached-diff-stat.txt",
);

function formatUsage(): string {
  return [
    "Usage: bun ./scripts/report-planner-terminal-audit-root-staged-deletion-handoff.ts [options]",
    "",
    "Planner-facing handoff that records terminal-audit root staged deletion evidence.",
    "",
    "Options:",
    "  --help                         Show this usage summary",
    "  --json                         Shortcut for --format json",
    "  --format <human|json|markdown> Output format. Default: human",
    "  --repo-root <path>             Repository root for live git evidence",
    "  --status-output <path>         Saved `git status --short --branch` snapshot",
    "  --cached-diff-stat <path>      Saved `git diff --cached --stat` snapshot",
    "  --watchdog-report <path>       Saved worktree drift watchdog report text",
    "  --write-artifact <path>        Write markdown artifact to the given path",
    "",
    "When no live root checkout evidence is available, the script falls back to the",
    "six-path fixture under src/tests/fixtures/planner-terminal-audit-root-staged-deletion-handoff/.",
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

function runYouJsonCommand(repoRoot: string, args: string[]): string {
  const attempts = [
    [...args, "--json"],
    [...args, "--format", "json"],
  ];

  for (const attempt of attempts) {
    const proc = Bun.spawnSync(["you", ...attempt], {
      cwd: repoRoot,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode === 0 && proc.stdout.toString().trim()) {
      return proc.stdout.toString();
    }
  }

  throw new Error(
    `Unable to read live queue JSON from \`you ${args.join(" ")}\`.`,
  );
}

function discoverLiveWatchdogSnapshot(repoRoot: string) {
  const plannerSession = readFlagValue("--session") ?? "~default";
  const worktreesDir =
    readFlagValue("--worktrees-dir") ?? join(repoRoot, ".claude", "worktrees");
  const workListJsonText = runYouJsonCommand(repoRoot, [
    "work",
    "list",
    "--session",
    plannerSession,
  ]);
  const sessionListJsonText = runYouJsonCommand(repoRoot, ["session", "list"]);

  return discoverPlannerWorktreeDriftSnapshot({
    repoRoot,
    sessionListJsonText,
    workListJsonText,
    worktreesDir,
  });
}

if (process.argv.includes("--help")) {
  process.stdout.write(`${formatUsage()}\n`);
  process.exit(0);
}

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const statusOutputPath = readFlagValue("--status-output");
const cachedDiffStatPath = readFlagValue("--cached-diff-stat");
const watchdogReportPath = readFlagValue("--watchdog-report");
const writeArtifactPath = readFlagValue("--write-artifact");
const outputFormat = readOutputFormat(process.argv);

const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : readFlagValue("--repo-root")
    ? undefined
    : existsSync(DEFAULT_STATUS_FIXTURE)
      ? `## main...origin/main\n${readOptionalFile(DEFAULT_STATUS_FIXTURE, "default status fixture").trimEnd()}\n`
      : undefined;
const gitDiffCachedStat = cachedDiffStatPath
  ? readOptionalFile(cachedDiffStatPath, "cached diff stat")
  : readFlagValue("--repo-root")
    ? undefined
    : existsSync(DEFAULT_CACHED_DIFF_FIXTURE)
      ? readOptionalFile(
          DEFAULT_CACHED_DIFF_FIXTURE,
          "default cached diff fixture",
        )
      : undefined;

const watchdogSnapshot = readFlagValue("--repo-root")
  ? discoverLiveWatchdogSnapshot(repoRoot)
  : undefined;
const watchdogReportFormatted = watchdogReportPath
  ? readOptionalFile(watchdogReportPath, "watchdog report")
  : readFlagValue("--repo-root")
    ? undefined
    : existsSync(DEFAULT_WATCHDOG_FIXTURE)
      ? readOptionalFile(DEFAULT_WATCHDOG_FIXTURE, "default watchdog fixture")
      : undefined;

const report =
  discoverPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport({
    gitDiffCachedStat,
    remoteBaseRef: readFlagValue("--repo-root") ? undefined : "origin/main",
    repoRoot,
    runGit: readFlagValue("--repo-root")
      ? undefined
      : (_repoRoot, args) => {
          const objectSpec = args[2];
          if (args[0] === "cat-file" && typeof objectSpec === "string") {
            const [, path] = objectSpec.split(":");
            if (
              path &&
              [
                "scripts/report-terminal-lane-main-branch-landing-audit.ts",
                "src/lib/factory/terminal-lane-main-branch-landing-audit.test.ts",
                "src/lib/factory/terminal-lane-main-branch-landing-audit.ts",
              ].includes(path)
            ) {
              return { status: 0, stdout: "", stderr: "" };
            }
            return { status: 1, stdout: "", stderr: "missing" };
          }
          return { status: 0, stdout: "", stderr: "" };
        },
    statusOutput,
    watchdogReportFormatted,
    watchdogSnapshot,
  });

const output =
  outputFormat === "json"
    ? serializePlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(
        report,
      )
    : outputFormat === "markdown"
      ? `${formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceMarkdown(report)}\n`
      : `${formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceReport(report)}\n`;

if (writeArtifactPath) {
  writeFileSync(
    resolve(writeArtifactPath),
    formatPlannerTerminalAuditRootStagedDeletionHandoffEvidenceMarkdown(report),
  );
}

process.stdout.write(output);
