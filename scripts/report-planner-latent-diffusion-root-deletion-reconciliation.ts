import { resolve } from "node:path";
import {
  buildLatentDiffusionRootDirtyPathClassificationReport,
  formatLatentDiffusionCompletedWorktreeEvidenceReport,
  formatLatentDiffusionLandedEvidenceReport,
  formatLatentDiffusionRootDirtyPathClassificationReport,
  inspectLatentDiffusionCompletedWorktreeEvidence,
  serializeLatentDiffusionCompletedWorktreeEvidenceReport,
  serializeLatentDiffusionLandedEvidenceReport,
  serializeLatentDiffusionRootDirtyPathClassificationReport,
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
const worktreeEvidenceReport = inspectLatentDiffusionCompletedWorktreeEvidence({
  remoteBaseRef,
  repoRoot,
});
const classificationReport = buildLatentDiffusionRootDirtyPathClassificationReport({
  completedWorktreeReport: worktreeEvidenceReport,
  landedEvidenceReport: report,
  remoteBaseRef,
  repoRoot,
});

process.stdout.write(
  isJsonOutputRequested(process.argv)
    ? `${JSON.stringify(
        {
          classification: JSON.parse(
            serializeLatentDiffusionRootDirtyPathClassificationReport(
              classificationReport,
            ),
          ),
          completedWorktreeEvidence: JSON.parse(
            serializeLatentDiffusionCompletedWorktreeEvidenceReport(
              worktreeEvidenceReport,
            ),
          ),
          landedEvidence: JSON.parse(
            serializeLatentDiffusionLandedEvidenceReport(report),
          ),
        },
        null,
        2,
      )}\n`
    : `${formatLatentDiffusionLandedEvidenceReport(report)}\n\n${formatLatentDiffusionCompletedWorktreeEvidenceReport(worktreeEvidenceReport)}\n\n${formatLatentDiffusionRootDirtyPathClassificationReport(classificationReport)}\n`,
);
