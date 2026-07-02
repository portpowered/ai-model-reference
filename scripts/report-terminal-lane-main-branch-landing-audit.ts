import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCompleteLiveWorkListSnapshotJson } from "../src/lib/factory/live-queue-snapshot";
import {
  collectTerminalLaneMainBranchLandingAuditReport,
  formatTerminalLaneMainBranchLandingAuditReport,
  serializeTerminalLaneMainBranchLandingAuditReport,
  TerminalLaneLandingAuditComparisonError,
  TerminalLaneLandingAuditDiscoveryError,
  TerminalLaneMainBranchLandingAuditError,
} from "../src/lib/factory/terminal-lane-main-branch-landing-audit";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValues(flag: string): string[] {
  const values: string[] = [];

  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag) {
      const value = process.argv[index + 1];
      if (value) {
        values.push(value);
      }
    }
  }

  return values;
}

function readFlagValue(flag: string): string | undefined {
  return readFlagValues(flag).at(-1);
}

function readRequiredJsonFile(path: string, label: string): string {
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

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const plannerSession = readFlagValue("--session") ?? "~default";
const workListPath = readFlagValue("--work-list-json");
const worktreesDir = readFlagValue("--worktrees-dir")
  ? resolve(readFlagValue("--worktrees-dir") as string)
  : resolve(repoRoot, ".claude", "worktrees");
const mainRef = readFlagValue("--main-ref");
const explicitLaneNames = readFlagValues("--lane");

try {
  const workListJsonText = workListPath
    ? readRequiredJsonFile(workListPath, "work list")
    : readCompleteLiveWorkListSnapshotJson(repoRoot, [
        "work",
        "list",
        "--session",
        plannerSession,
      ]);

  const report = collectTerminalLaneMainBranchLandingAuditReport({
    explicitLaneNames:
      explicitLaneNames.length > 0 ? explicitLaneNames : undefined,
    mainRef,
    repoRoot,
    workListJsonText,
    worktreesDir,
  });

  process.stdout.write(
    isJsonOutputRequested(process.argv)
      ? serializeTerminalLaneMainBranchLandingAuditReport(report)
      : `${formatTerminalLaneMainBranchLandingAuditReport(report)}\n`,
  );
} catch (error) {
  console.error("Terminal lane main-branch landing audit failed.");
  if (
    error instanceof TerminalLaneLandingAuditDiscoveryError ||
    error instanceof TerminalLaneLandingAuditComparisonError ||
    error instanceof TerminalLaneMainBranchLandingAuditError
  ) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}
