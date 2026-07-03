import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  captureOwnerlessGeneratedTableRegistryDriftEvidence,
  formatOwnerlessGeneratedTableRegistryDriftEvidenceReport,
  serializeOwnerlessGeneratedTableRegistryDriftEvidenceReport,
} from "../src/lib/factory/ownerless-generated-table-registry-drift";

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
const statusOutputPath = readFlagValue("--status-output");
const diffOutputPath = readFlagValue("--diff-output");
const statusOutput = statusOutputPath
  ? readRequiredFile(statusOutputPath, "status output")
  : undefined;
const diffOutput = diffOutputPath
  ? readRequiredFile(diffOutputPath, "diff output")
  : undefined;

const report = captureOwnerlessGeneratedTableRegistryDriftEvidence({
  diffOutput,
  remoteBaseRef,
  repoRoot,
  statusOutput,
});

const output = isJsonOutputRequested(process.argv)
  ? serializeOwnerlessGeneratedTableRegistryDriftEvidenceReport(report)
  : formatOwnerlessGeneratedTableRegistryDriftEvidenceReport(report);

process.stdout.write(output);
