import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildGeneratedTableRegistryPr320ConflictRefreshOutput,
  formatGeneratedTableRegistryPr320ConflictRefreshOutput,
  serializeGeneratedTableRegistryPr320ConflictRefreshOutput,
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

function isEvidenceOnlyRequested(argv: string[]): boolean {
  return argv.includes("--evidence-only");
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

const output = buildGeneratedTableRegistryPr320ConflictRefreshOutput({
  classifyOutcome: !isEvidenceOnlyRequested(process.argv),
  pr320PullRequestJson: pr320PullRequestJsonPath
    ? readRequiredFile(pr320PullRequestJsonPath, "PR #320 JSON")
    : undefined,
  remoteBaseRef,
  repoRoot,
  workListJsonText,
});

const rendered = isJsonOutputRequested(process.argv)
  ? serializeGeneratedTableRegistryPr320ConflictRefreshOutput(output)
  : formatGeneratedTableRegistryPr320ConflictRefreshOutput(output);

process.stdout.write(`${rendered}\n`);
