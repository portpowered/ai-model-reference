import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCompleteLiveWorkListSnapshotJson } from "../src/lib/factory/live-queue-snapshot";
import {
  collectMergedPrDrainRowsEvidence,
  formatMergedPrDrainRowsEvidenceReport,
  MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID,
  resolveDefaultWorktreesDir,
  serializeMergedPrDrainRowsEvidenceReport,
} from "../src/lib/factory/merged-pr-drain-rows-reconciliation";

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
const sourceSession =
  readFlagValue("--session") ?? MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID;
const workListPath = readFlagValue("--work-list-json");
const worktreesDir =
  readFlagValue("--worktrees-dir") ?? resolveDefaultWorktreesDir(repoRoot);
const remoteBaseRef = readFlagValue("--remote-base-ref");

const workListJsonText = workListPath
  ? readRequiredJsonFile(workListPath, "work list")
  : readCompleteLiveWorkListSnapshotJson(repoRoot, [
      "work",
      "list",
      "--session",
      sourceSession,
    ]);

const report = collectMergedPrDrainRowsEvidence({
  remoteBaseRef,
  repoRoot,
  sourceSession,
  workListJsonText,
  worktreesDir,
});

const output = isJsonOutputRequested(process.argv)
  ? serializeMergedPrDrainRowsEvidenceReport(report)
  : formatMergedPrDrainRowsEvidenceReport(report);

process.stdout.write(output);
