import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCompleteLiveWorkListSnapshotJson } from "../src/lib/factory/live-queue-snapshot";
import {
  buildMergedPrDrainRowsReconciliationOutput,
  collectMergedPrDrainRowsEvidence,
  formatMergedPrDrainRowsReconciliationReport,
  MERGED_PR_DRAIN_ROWS_TARGET_SESSION_ID,
  resolveDefaultWorktreesDir,
  serializeMergedPrDrainRowsReconciliationOutput,
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

function isExecuteConsumeRequested(argv: string[]): boolean {
  return argv.includes("--execute-consume");
}

function isExecuteCompleteRequested(argv: string[]): boolean {
  return argv.includes("--execute-complete");
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

const reconciliationOutput = buildMergedPrDrainRowsReconciliationOutput(report, {
  executeConsume: isExecuteConsumeRequested(process.argv),
  executeComplete: isExecuteCompleteRequested(process.argv),
  sessionId: sourceSession,
});

const output = isJsonOutputRequested(process.argv)
  ? serializeMergedPrDrainRowsReconciliationOutput(reconciliationOutput)
  : formatMergedPrDrainRowsReconciliationReport(report, {
      consumeReport: reconciliationOutput.consumeReport,
      completeReport: reconciliationOutput.completeReport,
      finalVerificationReport: reconciliationOutput.finalVerificationReport,
      noOpReport: reconciliationOutput.noOpReport,
    });

process.stdout.write(output);
