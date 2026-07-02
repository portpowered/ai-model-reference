import { existsSync, readFileSync } from "node:fs";
import {
  buildSharedFactoryLinkageStagedDriftEvidenceSnapshot,
  formatSharedFactoryLinkageStagedDriftEvidenceSnapshot,
  serializeSharedFactoryLinkageStagedDriftEvidenceSnapshot,
} from "../src/lib/factory/planner-shared-factory-linkage-root-staged-drift-handoff";

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readOptionalFile(path: string, label: string): string {
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

const statusOutputPath = readFlagValue("--status-output");
const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : undefined;

const snapshot = buildSharedFactoryLinkageStagedDriftEvidenceSnapshot({
  statusOutput,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? `${serializeSharedFactoryLinkageStagedDriftEvidenceSnapshot(snapshot)}\n`
    : `${formatSharedFactoryLinkageStagedDriftEvidenceSnapshot(snapshot)}\n`,
);
