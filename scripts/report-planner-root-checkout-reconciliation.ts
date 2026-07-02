import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  discoverPlannerRootCheckoutReconciliationReport,
  formatPlannerRootCheckoutReconciliationReport,
  serializePlannerRootCheckoutReconciliationReport,
} from "../src/lib/factory/planner-root-checkout-reconciliation";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readOptionalFile(path: string, label: string): string | undefined {
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
const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : undefined;

const report = discoverPlannerRootCheckoutReconciliationReport({
  remoteBaseRef,
  repoRoot,
  statusOutput,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? serializePlannerRootCheckoutReconciliationReport(report)
    : `${formatPlannerRootCheckoutReconciliationReport(report)}\n`,
);
