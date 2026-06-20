import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCompleteLiveWorkListSnapshotJson } from "../src/lib/factory/live-queue-snapshot";
import {
  discoverPlannerQueueHealthReport,
  formatPlannerQueueHealthReport,
  serializePlannerQueueHealthReport,
} from "../src/lib/factory/planner-queue-health";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
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
const sourceSession = readFlagValue("--session") ?? "~default";
const workListPath = readFlagValue("--work-list-json");

const workListJsonText = workListPath
  ? readRequiredJsonFile(workListPath, "work list")
  : readCompleteLiveWorkListSnapshotJson(repoRoot, [
      "work",
      "list",
      "--session",
      sourceSession,
    ]);

const report = discoverPlannerQueueHealthReport({
  sourceSession,
  workListJsonText,
});

const output = isJsonOutputRequested(process.argv)
  ? serializePlannerQueueHealthReport(report)
  : `${formatPlannerQueueHealthReport(report)}\n`;

process.stdout.write(output);
