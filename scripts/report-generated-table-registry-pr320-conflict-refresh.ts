import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  captureGeneratedTableRegistryPr320ConflictRefreshEvidence,
  formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
  serializeGeneratedTableRegistryPr320ConflictRefreshEvidenceReport,
} from "../src/lib/factory/generated-table-registry-pr320-conflict-refresh";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readRequiredFile(path: string, label: string): string {
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
const remoteBaseRef = readFlagValue("--remote-base-ref");
const workListJsonPath = readFlagValue("--work-list-json");
const pr320PullRequestJsonPath = readFlagValue("--pr320-pull-request-json");
const workListJsonText = workListJsonPath
  ? readRequiredFile(workListJsonPath, "work list JSON")
  : readRequiredFile(
      resolve(
        repoRoot,
        "src/tests/fixtures/generated-table-registry-pr320-conflict-refresh/work-list.json",
      ),
      "default work list JSON",
    );

const evidenceReport =
  captureGeneratedTableRegistryPr320ConflictRefreshEvidence({
    pr320PullRequestJson: pr320PullRequestJsonPath
      ? readRequiredFile(pr320PullRequestJsonPath, "PR #320 JSON")
      : undefined,
    remoteBaseRef,
    repoRoot,
    workListJsonText,
  });

const output = isJsonOutputRequested(process.argv)
  ? serializeGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(
      evidenceReport,
    )
  : formatGeneratedTableRegistryPr320ConflictRefreshEvidenceReport(
      evidenceReport,
    );

process.stdout.write(`${output}\n`);
