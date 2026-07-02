import { resolve } from "node:path";
import {
  formatLatentDiffusionLandedEvidenceReport,
  serializeLatentDiffusionLandedEvidenceReport,
  verifyLatentDiffusionLandedEvidence,
} from "../src/lib/factory/planner-latent-diffusion-root-deletion-reconciliation";

const defaultRepoRoot = resolve(import.meta.dir, "..");

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
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

const report = verifyLatentDiffusionLandedEvidence({
  remoteBaseRef,
  repoRoot,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? serializeLatentDiffusionLandedEvidenceReport(report)
    : `${formatLatentDiffusionLandedEvidenceReport(report)}\n`,
);
