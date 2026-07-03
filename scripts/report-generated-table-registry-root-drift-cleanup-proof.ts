import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildGeneratedTableRegistryActiveLaneOwnershipHandoff,
  buildGeneratedTableRegistryExpectedOutputOutcome,
  buildGeneratedTableRegistryStaleDriftHandoff,
  captureGeneratedTableRegistryRootDriftEvidence,
  formatGeneratedTableRegistryActiveLaneOwnershipHandoff,
  formatGeneratedTableRegistryExpectedOutputOutcome,
  formatGeneratedTableRegistryReproducibilityProof,
  formatGeneratedTableRegistryRootDriftEvidence,
  formatGeneratedTableRegistryStaleDriftHandoff,
  proveGeneratedTableRegistryReproducibility,
  resolveGeneratedTableRegistryProofContext,
  serializeGeneratedTableRegistryActiveLaneOwnershipHandoff,
  serializeGeneratedTableRegistryExpectedOutputOutcome,
  serializeGeneratedTableRegistryReproducibilityProof,
  serializeGeneratedTableRegistryRootDriftEvidence,
  serializeGeneratedTableRegistryStaleDriftHandoff,
} from "../src/lib/factory/generated-table-registry-root-drift-cleanup-proof";

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

function isReproducibilityProofRequested(argv: string[]): boolean {
  return (
    argv.includes("--reproducibility") ||
    argv.includes("--full-proof") ||
    argv.includes("--expected-output")
  );
}

function isDriftEvidenceRequested(argv: string[]): boolean {
  return (
    !argv.includes("--reproducibility") ||
    argv.includes("--full-proof") ||
    argv.includes("--expected-output")
  );
}

function isExpectedOutputRequested(argv: string[]): boolean {
  return argv.includes("--expected-output") || argv.includes("--full-proof");
}

function isStaleDriftHandoffRequested(argv: string[]): boolean {
  return (
    argv.includes("--stale-drift-handoff") || argv.includes("--full-proof")
  );
}

function isActiveLaneOwnershipRequested(argv: string[]): boolean {
  return (
    argv.includes("--active-lane-ownership") || argv.includes("--full-proof")
  );
}

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const remoteBaseRef = readFlagValue("--remote-base-ref");
const statusOutputPath = readFlagValue("--status-output");
const diffOutputPath = readFlagValue("--diff-output");
const generatedAtUtc = readFlagValue("--generated-at-utc");
const statusOutput = statusOutputPath
  ? readOptionalFile(statusOutputPath, "status output")
  : undefined;
const diffOutput = diffOutputPath
  ? readOptionalFile(diffOutputPath, "diff output")
  : undefined;
const jsonOutput = isJsonOutputRequested(process.argv);
const reproducibilityRequested = isReproducibilityProofRequested(process.argv);
const driftEvidenceRequested = isDriftEvidenceRequested(process.argv);
const expectedOutputRequested = isExpectedOutputRequested(process.argv);
const staleDriftHandoffRequested = isStaleDriftHandoffRequested(process.argv);
const activeLaneOwnershipRequested = isActiveLaneOwnershipRequested(
  process.argv,
);
const applyExpectedOutput = process.argv.includes("--apply");
const checkoutRepoPathOverride = readFlagValue("--checkout-repo-path");
const workListJsonPath = readFlagValue("--work-list-json");
const sessionListJsonPath = readFlagValue("--session-list-json");
const worktreesDir = readFlagValue("--worktrees-dir")
  ? resolve(readFlagValue("--worktrees-dir") as string)
  : resolve(repoRoot, ".claude", "worktrees");
const workListJsonText = workListJsonPath
  ? readOptionalFile(workListJsonPath, "work list")
  : undefined;
const sessionListJsonText = sessionListJsonPath
  ? readOptionalFile(sessionListJsonPath, "session list")
  : undefined;

const proofContext = resolveGeneratedTableRegistryProofContext({
  checkoutRepoPath: checkoutRepoPathOverride
    ? resolve(checkoutRepoPathOverride)
    : undefined,
  repoRoot,
});

const report = driftEvidenceRequested
  ? captureGeneratedTableRegistryRootDriftEvidence({
      diffOutput,
      generatedAtUtc,
      remoteBaseRef,
      repoRoot,
      statusOutput,
    })
  : null;

const reproducibilityProof = reproducibilityRequested
  ? proveGeneratedTableRegistryReproducibility({
      checkoutRepoPath: proofContext.checkoutRepoPath,
      generatedAtUtc,
      remoteBaseRef,
      repoRoot,
    })
  : null;

const expectedOutputOutcome = expectedOutputRequested
  ? buildGeneratedTableRegistryExpectedOutputOutcome({
      apply: applyExpectedOutput,
      checkoutRepoPath: proofContext.checkoutRepoPath,
      driftEvidence: report ?? undefined,
      generatedAtUtc,
      remoteBaseRef,
      repoRoot,
    })
  : null;

const staleDriftHandoff = staleDriftHandoffRequested
  ? buildGeneratedTableRegistryStaleDriftHandoff({
      checkoutRepoPath: proofContext.checkoutRepoPath,
      driftEvidence: report ?? undefined,
      generatedAtUtc,
      remoteBaseRef,
      repoRoot,
    })
  : null;

const activeLaneOwnershipHandoff = activeLaneOwnershipRequested
  ? buildGeneratedTableRegistryActiveLaneOwnershipHandoff({
      checkoutRepoPath: proofContext.checkoutRepoPath,
      driftEvidence: report ?? undefined,
      generatedAtUtc,
      remoteBaseRef,
      repoRoot,
      sessionListJsonText,
      workListJsonText,
      worktreesDir,
    })
  : null;

if (jsonOutput) {
  if (
    report !== null &&
    reproducibilityProof !== null &&
    expectedOutputOutcome !== null &&
    staleDriftHandoff !== null &&
    activeLaneOwnershipHandoff !== null
  ) {
    process.stdout.write(
      `${JSON.stringify(
        {
          activeLaneOwnershipHandoff,
          driftEvidence: report,
          expectedOutputOutcome,
          reproducibilityProof,
          staleDriftHandoff,
        },
        null,
        2,
      )}\n`,
    );
  } else if (
    report !== null &&
    reproducibilityProof !== null &&
    expectedOutputOutcome !== null &&
    staleDriftHandoff !== null
  ) {
    process.stdout.write(
      `${JSON.stringify(
        {
          driftEvidence: report,
          expectedOutputOutcome,
          reproducibilityProof,
          staleDriftHandoff,
        },
        null,
        2,
      )}\n`,
    );
  } else if (
    report !== null &&
    reproducibilityProof !== null &&
    expectedOutputOutcome !== null
  ) {
    process.stdout.write(
      `${JSON.stringify(
        {
          driftEvidence: report,
          expectedOutputOutcome,
          reproducibilityProof,
        },
        null,
        2,
      )}\n`,
    );
  } else if (expectedOutputOutcome !== null && reproducibilityProof !== null) {
    process.stdout.write(
      `${JSON.stringify(
        {
          expectedOutputOutcome,
          reproducibilityProof,
        },
        null,
        2,
      )}\n`,
    );
  } else if (report !== null && reproducibilityProof !== null) {
    process.stdout.write(
      `${JSON.stringify(
        {
          driftEvidence: report,
          reproducibilityProof,
        },
        null,
        2,
      )}\n`,
    );
  } else if (staleDriftHandoff !== null && reproducibilityProof !== null) {
    process.stdout.write(
      `${JSON.stringify(
        {
          reproducibilityProof,
          staleDriftHandoff,
        },
        null,
        2,
      )}\n`,
    );
  } else if (expectedOutputOutcome !== null) {
    process.stdout.write(
      `${serializeGeneratedTableRegistryExpectedOutputOutcome(expectedOutputOutcome)}\n`,
    );
  } else if (activeLaneOwnershipHandoff !== null) {
    process.stdout.write(
      `${serializeGeneratedTableRegistryActiveLaneOwnershipHandoff(activeLaneOwnershipHandoff)}\n`,
    );
  } else if (staleDriftHandoff !== null) {
    process.stdout.write(
      `${serializeGeneratedTableRegistryStaleDriftHandoff(staleDriftHandoff)}\n`,
    );
  } else if (reproducibilityProof !== null) {
    process.stdout.write(
      `${serializeGeneratedTableRegistryReproducibilityProof(reproducibilityProof)}\n`,
    );
  } else if (report !== null) {
    process.stdout.write(
      `${serializeGeneratedTableRegistryRootDriftEvidence(report)}\n`,
    );
  }
} else {
  const outputSections: string[] = [];
  if (report !== null) {
    outputSections.push(formatGeneratedTableRegistryRootDriftEvidence(report));
  }
  if (reproducibilityProof !== null) {
    outputSections.push(
      formatGeneratedTableRegistryReproducibilityProof(reproducibilityProof),
    );
  }
  if (expectedOutputOutcome !== null) {
    outputSections.push(
      formatGeneratedTableRegistryExpectedOutputOutcome(expectedOutputOutcome),
    );
  }
  if (staleDriftHandoff !== null) {
    outputSections.push(
      formatGeneratedTableRegistryStaleDriftHandoff(staleDriftHandoff),
    );
  }
  if (activeLaneOwnershipHandoff !== null) {
    outputSections.push(
      formatGeneratedTableRegistryActiveLaneOwnershipHandoff(
        activeLaneOwnershipHandoff,
      ),
    );
  }
  process.stdout.write(`${outputSections.join("\n\n")}\n`);
}
