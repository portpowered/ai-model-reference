import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";
import { resolveMainRepoRoot } from "./merged-pr-drain-rows-reconciliation";
import { detectDefaultRemoteBaseRef } from "./planner-root-checkout-reconciliation";
import {
  classifyRootRemoteRelationship,
  type RootRemoteRelationship,
} from "./planner-root-main-lag-current-truth-reconciliation";
import type {
  PlannerWorktreeDirtyPath,
  PlannerWorktreeDriftOwnership,
  PlannerWorktreeDriftSnapshot,
} from "./planner-worktree-drift-watchdog";

export const OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER =
  "Ownerless Generated Table Registry Drift Evidence";

export const GENERATED_TABLE_REGISTRY_ARTIFACT_PATH =
  "src/lib/content/generated/table-registry.generated.ts";

export const OBSERVED_TABLE_ENTRY_FILE_NAME =
  "looped-transformers-comparison.json";

export const OBSERVED_TABLE_ENTRY_ID = "table.looped-transformers-comparison";

export const OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_PRESERVE_POLICY =
  "Do not revert, restore, stage, unstage, clean, delete, overwrite, normalize, or regenerate the generated table registry artifact while capturing evidence.";

export type GeneratedTableRegistryArtifactDirtyStatus = "clean" | "dirty";

export type LoopedTransformersComparisonEntryObservationKind =
  | "present-in-worktree"
  | "added-in-diff"
  | "removed-in-diff"
  | "modified-in-diff"
  | "absent-on-head-and-worktree"
  | "diff-unavailable";

export interface LoopedTransformersComparisonEntryObservation {
  importStatementPresentOnHead: boolean;
  importStatementPresentInWorktree: boolean;
  kind: LoopedTransformersComparisonEntryObservationKind;
  observedDiffLines: string[];
  payloadEntryPresentOnHead: boolean;
  payloadEntryPresentInWorktree: boolean;
  sourceFileListEntryPresentOnHead: boolean;
  sourceFileListEntryPresentInWorktree: boolean;
  tableEntryFileName: string;
  tableEntryId: string;
}

export interface GeneratedTableRegistryArtifactDirtyEvidence {
  artifactPath: string;
  diffExcerpt: string | null;
  dirtyStatus: GeneratedTableRegistryArtifactDirtyStatus;
  statusCode: string | null;
  statusLine: string | null;
  loopedTransformersComparisonEntry: LoopedTransformersComparisonEntryObservation;
}

export interface RootGitTruthEvidence {
  commitsAheadOfRemote: number;
  commitsBehindRemote: number;
  headSha: string;
  headShortSha: string;
  remoteBaseRef: string;
  remoteMainSha: string;
  remoteMainShortSha: string;
  remoteRelationship: RootRemoteRelationship;
  repoRoot: string;
}

export interface OwnerlessGeneratedTableRegistryDriftEvidenceReport {
  capturePolicy: string;
  generatedArtifact: GeneratedTableRegistryArtifactDirtyEvidence;
  generatedAtUtc: string;
  rootGitTruth: RootGitTruthEvidence;
}

export interface CaptureOwnerlessGeneratedTableRegistryDriftEvidenceOptions {
  artifactPath?: string;
  diffOutput?: string;
  generatedAtUtc?: string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitStatus?: RunGitStatus;
  statusOutput?: string;
  tableEntryFileName?: string;
}

type RunGit = (repoRoot: string, args: readonly string[]) => GitCommandResult;
type RunGitStatus = (cwd: string) => string;

interface GitCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function defaultRunGit(
  repoRoot: string,
  args: readonly string[],
): GitCommandResult {
  const result = spawnSync("git", [...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function defaultRunGitStatus(cwd: string): string {
  const result = defaultRunGit(cwd, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);

  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `git status --porcelain=v1 --untracked-files=all failed for ${cwd}.${details ? `\n${details}` : ""}`,
    );
  }

  return result.stdout;
}

function resolveGitRef(repoRoot: string, ref: string, runGit: RunGit): string {
  const result = runGit(repoRoot, ["rev-parse", ref]);
  if (result.status !== 0 || result.stdout.trim().length === 0) {
    throw new Error(`Unable to resolve ${ref} at ${repoRoot}`);
  }
  return result.stdout.trim();
}

function readGitObjectAtRef(
  repoRoot: string,
  ref: string,
  path: string,
  runGit: RunGit,
): string | null {
  const result = runGit(repoRoot, ["show", `${ref}:${path}`]);
  if (result.status !== 0) {
    return null;
  }
  return result.stdout;
}

function readWorkingTreeFile(repoRoot: string, path: string): string | null {
  try {
    return readFileSync(join(repoRoot, path), "utf8");
  } catch {
    return null;
  }
}

function extractScopedStatusLine(
  statusOutput: string,
  artifactPath: string,
): { statusCode: string | null; statusLine: string | null } {
  for (const line of statusOutput.split("\n")) {
    if (line.length < 4) {
      continue;
    }
    const path = line.slice(3);
    if (path === artifactPath) {
      return {
        statusCode: line.slice(0, 2),
        statusLine: line,
      };
    }
  }

  return {
    statusCode: null,
    statusLine: null,
  };
}

export function detectTableEntryPresenceInModuleSource(
  source: string | null,
  tableEntryFileName: string,
): {
  importStatementPresent: boolean;
  payloadEntryPresent: boolean;
  sourceFileListEntryPresent: boolean;
} {
  if (source === null) {
    return {
      importStatementPresent: false,
      payloadEntryPresent: false,
      sourceFileListEntryPresent: false,
    };
  }

  const importPattern = new RegExp(
    `from ["']@/content/registry/tables/${escapeRegExp(tableEntryFileName)}["']`,
  );
  const sourceListPattern = new RegExp(`"${escapeRegExp(tableEntryFileName)}"`);
  const payloadPattern = /loopedTransformersComparisonTableRecord/;

  return {
    importStatementPresent: importPattern.test(source),
    sourceFileListEntryPresent: sourceListPattern.test(source),
    payloadEntryPresent: payloadPattern.test(source),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractTableEntryDiffLines(
  diffOutput: string | null,
  tableEntryFileName: string,
): string[] {
  if (!diffOutput || diffOutput.trim().length === 0) {
    return [];
  }

  const needle = tableEntryFileName.replace(".json", "");
  return diffOutput
    .split("\n")
    .filter(
      (line) =>
        line.includes(tableEntryFileName) ||
        line.includes(needle) ||
        line.includes("loopedTransformersComparisonTableRecord"),
    );
}

export function classifyLoopedTransformersComparisonEntryObservation(input: {
  diffOutput: string | null;
  headSource: string | null;
  tableEntryFileName: string;
  worktreeSource: string | null;
}): LoopedTransformersComparisonEntryObservation {
  const headPresence = detectTableEntryPresenceInModuleSource(
    input.headSource,
    input.tableEntryFileName,
  );
  const worktreePresence = detectTableEntryPresenceInModuleSource(
    input.worktreeSource,
    input.tableEntryFileName,
  );
  const observedDiffLines = extractTableEntryDiffLines(
    input.diffOutput,
    input.tableEntryFileName,
  );

  let kind: LoopedTransformersComparisonEntryObservationKind;
  if (input.diffOutput === null) {
    kind = "diff-unavailable";
  } else if (observedDiffLines.length === 0) {
    const presentInWorktree =
      worktreePresence.importStatementPresent ||
      worktreePresence.sourceFileListEntryPresent ||
      worktreePresence.payloadEntryPresent;
    kind = presentInWorktree
      ? "present-in-worktree"
      : "absent-on-head-and-worktree";
  } else {
    const hasAdded = observedDiffLines.some((line) => line.startsWith("+"));
    const hasRemoved = observedDiffLines.some((line) => line.startsWith("-"));
    if (hasAdded && hasRemoved) {
      kind = "modified-in-diff";
    } else if (hasAdded) {
      kind = "added-in-diff";
    } else if (hasRemoved) {
      kind = "removed-in-diff";
    } else {
      kind = "present-in-worktree";
    }
  }

  return {
    importStatementPresentOnHead: headPresence.importStatementPresent,
    importStatementPresentInWorktree: worktreePresence.importStatementPresent,
    kind,
    observedDiffLines,
    payloadEntryPresentOnHead: headPresence.payloadEntryPresent,
    payloadEntryPresentInWorktree: worktreePresence.payloadEntryPresent,
    sourceFileListEntryPresentOnHead: headPresence.sourceFileListEntryPresent,
    sourceFileListEntryPresentInWorktree:
      worktreePresence.sourceFileListEntryPresent,
    tableEntryFileName: input.tableEntryFileName,
    tableEntryId: OBSERVED_TABLE_ENTRY_ID,
  };
}

export function captureRootGitTruthEvidence(options: {
  remoteBaseRef?: string;
  repoRoot: string;
  runGit: RunGit;
}): RootGitTruthEvidence {
  const remoteBaseRef =
    options.remoteBaseRef ??
    detectDefaultRemoteBaseRef(options.repoRoot, options.runGit);
  const headSha = resolveGitRef(options.repoRoot, "HEAD", options.runGit);
  const remoteMainSha = resolveGitRef(
    options.repoRoot,
    remoteBaseRef,
    options.runGit,
  );
  const relationship = classifyRootRemoteRelationship(
    options.repoRoot,
    remoteBaseRef,
    options.runGit,
  );

  return {
    ...relationship,
    headSha,
    headShortSha: headSha.slice(0, 7),
    remoteBaseRef,
    remoteMainSha,
    remoteMainShortSha: remoteMainSha.slice(0, 7),
    repoRoot: options.repoRoot,
  };
}

export function captureGeneratedTableRegistryArtifactEvidence(options: {
  artifactPath: string;
  diffOutput?: string;
  repoRoot: string;
  runGit: RunGit;
  statusOutput: string;
  tableEntryFileName: string;
}): GeneratedTableRegistryArtifactDirtyEvidence {
  const scopedStatus = extractScopedStatusLine(
    options.statusOutput,
    options.artifactPath,
  );
  const dirtyStatus: GeneratedTableRegistryArtifactDirtyStatus =
    scopedStatus.statusLine === null ? "clean" : "dirty";
  const headSource = readGitObjectAtRef(
    options.repoRoot,
    "HEAD",
    options.artifactPath,
    options.runGit,
  );
  const worktreeSource = readWorkingTreeFile(
    options.repoRoot,
    options.artifactPath,
  );
  const diffOutput =
    options.diffOutput ??
    (dirtyStatus === "dirty"
      ? options.runGit(options.repoRoot, [
          "diff",
          "HEAD",
          "--",
          options.artifactPath,
        ]).stdout
      : "");

  const loopedTransformersComparisonEntry =
    classifyLoopedTransformersComparisonEntryObservation({
      diffOutput: dirtyStatus === "dirty" ? diffOutput : "",
      headSource,
      tableEntryFileName: options.tableEntryFileName,
      worktreeSource,
    });

  return {
    artifactPath: options.artifactPath,
    diffExcerpt:
      dirtyStatus === "dirty" && diffOutput.trim().length > 0
        ? diffOutput
        : null,
    dirtyStatus,
    statusCode: scopedStatus.statusCode,
    statusLine: scopedStatus.statusLine,
    loopedTransformersComparisonEntry,
  };
}

export function captureOwnerlessGeneratedTableRegistryDriftEvidence(
  options: CaptureOwnerlessGeneratedTableRegistryDriftEvidenceOptions = {},
): OwnerlessGeneratedTableRegistryDriftEvidenceReport {
  const requestedRepoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const repoRoot = resolveMainRepoRoot(
    requestedRepoRoot,
    (binary, args, cwd) => {
      if (binary !== "git") {
        return {
          ok: false,
          stdout: "",
          stderr: "unsupported command",
          exitCode: 1,
        };
      }
      const result = runGit(cwd ?? requestedRepoRoot, args);
      return {
        ok: result.status === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.status,
      };
    },
  );
  const artifactPath =
    options.artifactPath ?? GENERATED_TABLE_REGISTRY_ARTIFACT_PATH;
  const tableEntryFileName =
    options.tableEntryFileName ?? OBSERVED_TABLE_ENTRY_FILE_NAME;
  const statusOutput = options.statusOutput ?? runGitStatus(repoRoot);

  return {
    capturePolicy: OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_PRESERVE_POLICY,
    generatedArtifact: captureGeneratedTableRegistryArtifactEvidence({
      artifactPath,
      diffOutput: options.diffOutput,
      repoRoot,
      runGit,
      statusOutput,
      tableEntryFileName,
    }),
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    rootGitTruth: captureRootGitTruthEvidence({
      remoteBaseRef: options.remoteBaseRef,
      repoRoot,
      runGit,
    }),
  };
}

export function formatOwnerlessGeneratedTableRegistryDriftEvidenceReport(
  report: OwnerlessGeneratedTableRegistryDriftEvidenceReport,
): string {
  const entry = report.generatedArtifact.loopedTransformersComparisonEntry;
  const gitTruth = report.rootGitTruth;
  const lines = [
    OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER,
    `generated-at-utc=${report.generatedAtUtc}`,
    `capture-policy=${report.capturePolicy}`,
    "",
    "[root-git-truth]",
    `repo-root=${gitTruth.repoRoot}`,
    `head-sha=${gitTruth.headSha} head-short=${gitTruth.headShortSha}`,
    `remote-base-ref=${gitTruth.remoteBaseRef} remote-main-sha=${gitTruth.remoteMainSha} remote-main-short=${gitTruth.remoteMainShortSha}`,
    `relationship=${gitTruth.remoteRelationship}(ahead=${gitTruth.commitsAheadOfRemote},behind=${gitTruth.commitsBehindRemote})`,
    "",
    "[generated-artifact]",
    `artifact-path=${report.generatedArtifact.artifactPath}`,
    `dirty-status=${report.generatedArtifact.dirtyStatus}`,
    `status-code=${report.generatedArtifact.statusCode ?? "none"}`,
    `status-line=${report.generatedArtifact.statusLine ?? "none"}`,
    "",
    "[looped-transformers-comparison-entry]",
    `table-entry-file=${entry.tableEntryFileName}`,
    `table-entry-id=${entry.tableEntryId}`,
    `observation-kind=${entry.kind}`,
    `import-on-head=${entry.importStatementPresentOnHead}`,
    `import-in-worktree=${entry.importStatementPresentInWorktree}`,
    `source-list-on-head=${entry.sourceFileListEntryPresentOnHead}`,
    `source-list-in-worktree=${entry.sourceFileListEntryPresentInWorktree}`,
    `payload-on-head=${entry.payloadEntryPresentOnHead}`,
    `payload-in-worktree=${entry.payloadEntryPresentInWorktree}`,
    `observed-diff-line-count=${entry.observedDiffLines.length}`,
  ];

  if (entry.observedDiffLines.length > 0) {
    lines.push("observed-diff-lines:");
    for (const line of entry.observedDiffLines) {
      lines.push(`  ${line}`);
    }
  }

  if (report.generatedArtifact.diffExcerpt) {
    lines.push("", "[artifact-diff-excerpt]");
    lines.push(report.generatedArtifact.diffExcerpt.trimEnd());
  }

  return `${lines.join("\n")}\n`;
}

export function serializeOwnerlessGeneratedTableRegistryDriftEvidenceReport(
  report: OwnerlessGeneratedTableRegistryDriftEvidenceReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export const OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_CLASSIFICATION_HEADER =
  "Ownerless Generated Table Registry Drift Classification";

export type GeneratedTableRegistryArtifactPrimaryStatus =
  | "expected"
  | "stale"
  | "ownerless"
  | "owned";

export type TableRegistryRegenerationProofKind =
  | "full-module-match"
  | "table-entry-match"
  | "no-match"
  | "unavailable";

export interface TableRegistrySourceCatalog {
  canonicalSourceFilePresent: boolean;
  sourceFileNames: readonly string[];
  tablesRegistryRoot: string;
}

export interface TableRegistryRegenerationProof {
  canonicalSourceFilePresent: boolean;
  headMatchesRegeneration: boolean | null;
  kind: TableRegistryRegenerationProofKind;
  observedTableEntryInExpectedModule: boolean;
  proofEvidence: string[];
  worktreeMatchesRegeneration: boolean | null;
}

export interface GeneratedTableRegistryLaneOwnershipEvidence {
  branchName?: string;
  laneName: string;
  ownershipKind: PlannerWorktreeDriftOwnership["kind"];
  reason: string;
  reasonCode: PlannerWorktreeDriftOwnership["reasonCode"];
}

export interface GeneratedTableRegistryArtifactClassification {
  artifactPath: string;
  classificationEvidence: string[];
  evidenceGaps: string[];
  laneOwnership: GeneratedTableRegistryLaneOwnershipEvidence | null;
  primaryStatus: GeneratedTableRegistryArtifactPrimaryStatus;
  regenerationProof: TableRegistryRegenerationProof;
  tableEntryFileName: string;
  tableEntryId: string;
}

export interface OwnerlessGeneratedTableRegistryDriftClassificationReport {
  classification: GeneratedTableRegistryArtifactClassification;
  evidenceReport: OwnerlessGeneratedTableRegistryDriftEvidenceReport;
  generatedAtUtc: string;
}

export interface BuildTableRegistryRegenerationProofOptions {
  headSource: string | null;
  repoRoot: string;
  tableEntryFileName: string;
  worktreeSource: string | null;
  loadSourceCatalog?: (
    repoRoot: string,
    tableEntryFileName: string,
  ) => TableRegistrySourceCatalog | null;
}

export interface ClassifyGeneratedTableRegistryArtifactOptions {
  artifactPath?: string;
  driftSnapshot?: PlannerWorktreeDriftSnapshot | null;
  evidenceReport: OwnerlessGeneratedTableRegistryDriftEvidenceReport;
  headSource?: string | null;
  laneOwnership?: GeneratedTableRegistryLaneOwnershipEvidence | null;
  loadSourceCatalog?: (
    repoRoot: string,
    tableEntryFileName: string,
  ) => TableRegistrySourceCatalog | null;
  tableEntryFileName?: string;
  worktreeSource?: string | null;
}

function moduleSourcesMatchRegenerationProof(
  proof: TableRegistryRegenerationProof,
): boolean {
  return (
    proof.worktreeMatchesRegeneration === true ||
    proof.headMatchesRegeneration === true
  );
}

function tableEntryMatchesRegenerationProof(
  proof: TableRegistryRegenerationProof,
): boolean {
  return (
    proof.observedTableEntryInExpectedModule &&
    (proof.worktreeMatchesRegeneration === true ||
      proof.headMatchesRegeneration === true ||
      proof.kind === "table-entry-match")
  );
}

function resolveTablesRegistryRoot(repoRoot: string): string {
  return join(repoRoot, "src/content/registry/tables");
}

export function loadTableRegistrySourceCatalog(
  repoRoot: string,
  tableEntryFileName: string,
): TableRegistrySourceCatalog | null {
  const tablesRegistryRoot = resolveTablesRegistryRoot(repoRoot);
  if (!existsSync(tablesRegistryRoot)) {
    return null;
  }

  const sourceFileNames = readdirSync(tablesRegistryRoot)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  return {
    canonicalSourceFilePresent: sourceFileNames.includes(tableEntryFileName),
    sourceFileNames,
    tablesRegistryRoot,
  };
}

export function renderExpectedTableRegistryModuleSource(
  sourceFileNames: readonly string[],
): string {
  return renderGeneratedTableRegistryModule(
    createTableRegistrySourceEntries(sourceFileNames),
  );
}

export function buildTableRegistryRegenerationProof(
  options: BuildTableRegistryRegenerationProofOptions,
): TableRegistryRegenerationProof {
  const loadSourceCatalog =
    options.loadSourceCatalog ?? loadTableRegistrySourceCatalog;
  const catalog = loadSourceCatalog(
    options.repoRoot,
    options.tableEntryFileName,
  );
  const proofEvidence: string[] = [];

  if (catalog === null) {
    return {
      canonicalSourceFilePresent: false,
      headMatchesRegeneration: null,
      kind: "unavailable",
      observedTableEntryInExpectedModule: false,
      proofEvidence: [
        `tables-registry-root-missing=${resolveTablesRegistryRoot(options.repoRoot)}`,
      ],
      worktreeMatchesRegeneration: null,
    };
  }

  proofEvidence.push(
    `canonical-source-file-present=${catalog.canonicalSourceFilePresent}`,
    `canonical-table-count=${catalog.sourceFileNames.length}`,
  );

  if (!catalog.canonicalSourceFilePresent) {
    return {
      canonicalSourceFilePresent: false,
      headMatchesRegeneration: null,
      kind: "unavailable",
      observedTableEntryInExpectedModule: false,
      proofEvidence: [
        ...proofEvidence,
        `missing-canonical-source=${options.tableEntryFileName}`,
      ],
      worktreeMatchesRegeneration: null,
    };
  }

  const expectedModuleSource = renderExpectedTableRegistryModuleSource(
    catalog.sourceFileNames,
  );
  const expectedEntryPresence = detectTableEntryPresenceInModuleSource(
    expectedModuleSource,
    options.tableEntryFileName,
  );
  const observedTableEntryInExpectedModule =
    expectedEntryPresence.importStatementPresent &&
    expectedEntryPresence.sourceFileListEntryPresent &&
    expectedEntryPresence.payloadEntryPresent;

  proofEvidence.push(
    `expected-table-entry-import=${expectedEntryPresence.importStatementPresent}`,
    `expected-table-entry-source-list=${expectedEntryPresence.sourceFileListEntryPresent}`,
    `expected-table-entry-payload=${expectedEntryPresence.payloadEntryPresent}`,
  );

  const worktreeMatchesRegeneration =
    options.worktreeSource === null
      ? null
      : options.worktreeSource === expectedModuleSource;
  const headMatchesRegeneration =
    options.headSource === null
      ? null
      : options.headSource === expectedModuleSource;

  if (worktreeMatchesRegeneration !== null) {
    proofEvidence.push(
      `worktree-full-module-match=${worktreeMatchesRegeneration}`,
    );
  }
  if (headMatchesRegeneration !== null) {
    proofEvidence.push(`head-full-module-match=${headMatchesRegeneration}`);
  }

  let kind: TableRegistryRegenerationProofKind;
  if (
    worktreeMatchesRegeneration === true ||
    headMatchesRegeneration === true
  ) {
    kind = "full-module-match";
  } else if (
    worktreeMatchesRegeneration === false ||
    headMatchesRegeneration === false
  ) {
    const worktreeEntryPresence =
      options.worktreeSource === null
        ? null
        : detectTableEntryPresenceInModuleSource(
            options.worktreeSource,
            options.tableEntryFileName,
          );
    const headEntryPresence =
      options.headSource === null
        ? null
        : detectTableEntryPresenceInModuleSource(
            options.headSource,
            options.tableEntryFileName,
          );
    const worktreeEntryMatches =
      worktreeEntryPresence === null
        ? null
        : worktreeEntryPresence.importStatementPresent ===
            expectedEntryPresence.importStatementPresent &&
          worktreeEntryPresence.sourceFileListEntryPresent ===
            expectedEntryPresence.sourceFileListEntryPresent &&
          worktreeEntryPresence.payloadEntryPresent ===
            expectedEntryPresence.payloadEntryPresent;
    const headEntryMatches =
      headEntryPresence === null
        ? null
        : headEntryPresence.importStatementPresent ===
            expectedEntryPresence.importStatementPresent &&
          headEntryPresence.sourceFileListEntryPresent ===
            expectedEntryPresence.sourceFileListEntryPresent &&
          headEntryPresence.payloadEntryPresent ===
            expectedEntryPresence.payloadEntryPresent;

    if (worktreeEntryMatches === true || headEntryMatches === true) {
      kind = "table-entry-match";
      proofEvidence.push("table-entry-only-match=true");
    } else {
      kind = "no-match";
      proofEvidence.push("table-entry-only-match=false");
    }
  } else {
    kind = "unavailable";
    proofEvidence.push("regeneration-comparison-unavailable=true");
  }

  return {
    canonicalSourceFilePresent: true,
    headMatchesRegeneration,
    kind,
    observedTableEntryInExpectedModule,
    proofEvidence,
    worktreeMatchesRegeneration,
  };
}

function isOwnedDriftOwnership(
  ownership: PlannerWorktreeDriftOwnership,
): ownership is PlannerWorktreeDriftOwnership & {
  kind: "worktree-owned" | "already-merged-owned";
  laneName: string;
} {
  return (
    (ownership.kind === "worktree-owned" ||
      ownership.kind === "already-merged-owned") &&
    typeof ownership.laneName === "string" &&
    ownership.laneName.length > 0
  );
}

export function resolveGeneratedTableRegistryLaneOwnership(input: {
  artifactPath: string;
  driftSnapshot?: PlannerWorktreeDriftSnapshot | null;
}): GeneratedTableRegistryLaneOwnershipEvidence | null {
  if (!input.driftSnapshot) {
    return null;
  }

  const matchingPath = input.driftSnapshot.root.dirtyPaths.find(
    (dirtyPath) => dirtyPath.path === input.artifactPath,
  );
  if (!matchingPath) {
    return null;
  }

  return mapLaneOwnershipEvidence(matchingPath);
}

function mapLaneOwnershipEvidence(
  dirtyPath: PlannerWorktreeDirtyPath,
): GeneratedTableRegistryLaneOwnershipEvidence | null {
  if (!isOwnedDriftOwnership(dirtyPath.ownership)) {
    return null;
  }

  return {
    branchName: dirtyPath.ownership.branchName,
    laneName: dirtyPath.ownership.laneName,
    ownershipKind: dirtyPath.ownership.kind,
    reason: dirtyPath.ownership.reason,
    reasonCode: dirtyPath.ownership.reasonCode,
  };
}

export function classifyGeneratedTableRegistryArtifactStatus(
  options: ClassifyGeneratedTableRegistryArtifactOptions,
): GeneratedTableRegistryArtifactClassification {
  const artifactPath =
    options.artifactPath ??
    options.evidenceReport.generatedArtifact.artifactPath;
  const tableEntryFileName =
    options.tableEntryFileName ?? OBSERVED_TABLE_ENTRY_FILE_NAME;
  const repoRoot = options.evidenceReport.rootGitTruth.repoRoot;
  const generatedArtifact = options.evidenceReport.generatedArtifact;
  const laneOwnership =
    options.laneOwnership ??
    resolveGeneratedTableRegistryLaneOwnership({
      artifactPath,
      driftSnapshot: options.driftSnapshot,
    });
  const regenerationProof = buildTableRegistryRegenerationProof({
    headSource:
      options.headSource ??
      readGitObjectAtRef(repoRoot, "HEAD", artifactPath, defaultRunGit),
    loadSourceCatalog: options.loadSourceCatalog,
    repoRoot,
    tableEntryFileName,
    worktreeSource:
      options.worktreeSource ?? readWorkingTreeFile(repoRoot, artifactPath),
  });

  const classificationEvidence: string[] = [
    `artifact-path=${artifactPath}`,
    `dirty-status=${generatedArtifact.dirtyStatus}`,
    `table-entry-file=${tableEntryFileName}`,
    `table-entry-id=${OBSERVED_TABLE_ENTRY_ID}`,
    `observation-kind=${generatedArtifact.loopedTransformersComparisonEntry.kind}`,
    ...regenerationProof.proofEvidence,
  ];
  const evidenceGaps: string[] = [];

  if (laneOwnership) {
    classificationEvidence.push(
      `lane-name=${laneOwnership.laneName}`,
      `ownership-kind=${laneOwnership.ownershipKind}`,
      `ownership-reason-code=${laneOwnership.reasonCode}`,
      `ownership-reason=${laneOwnership.reason}`,
    );
    if (laneOwnership.branchName) {
      classificationEvidence.push(`lane-branch=${laneOwnership.branchName}`);
    }
  }

  let primaryStatus: GeneratedTableRegistryArtifactPrimaryStatus;

  if (generatedArtifact.dirtyStatus === "dirty" && laneOwnership !== null) {
    primaryStatus = "owned";
  } else if (moduleSourcesMatchRegenerationProof(regenerationProof)) {
    primaryStatus = "expected";
    classificationEvidence.push(
      "expected-proof=deterministic-table-registry-regeneration",
    );
  } else if (
    regenerationProof.canonicalSourceFilePresent &&
    !tableEntryMatchesRegenerationProof(regenerationProof)
  ) {
    primaryStatus = "stale";
    classificationEvidence.push(
      "stale-proof=generated-entry-not-reproducible-from-canonical-source",
    );
  } else if (tableEntryMatchesRegenerationProof(regenerationProof)) {
    primaryStatus = "expected";
    classificationEvidence.push(
      "expected-proof=table-entry-regeneration-match",
    );
  } else {
    primaryStatus = "ownerless";
    if (!regenerationProof.canonicalSourceFilePresent) {
      evidenceGaps.push(
        `Missing canonical table source ${tableEntryFileName} under src/content/registry/tables.`,
      );
    }
    if (regenerationProof.kind === "unavailable") {
      evidenceGaps.push(
        "Table registry regeneration proof unavailable for observed artifact sources.",
      );
    }
    if (generatedArtifact.dirtyStatus === "dirty" && laneOwnership === null) {
      evidenceGaps.push(
        "No active or merged lane claims ownership of the dirty generated artifact.",
      );
    }
    classificationEvidence.push("ownerless-proof=evidence-gap");
    if (evidenceGaps.length > 0) {
      classificationEvidence.push(`evidence-gap-count=${evidenceGaps.length}`);
    }
  }

  return {
    artifactPath,
    classificationEvidence,
    evidenceGaps,
    laneOwnership,
    primaryStatus,
    regenerationProof,
    tableEntryFileName,
    tableEntryId: OBSERVED_TABLE_ENTRY_ID,
  };
}

export function buildOwnerlessGeneratedTableRegistryDriftClassificationReport(input: {
  driftSnapshot?: PlannerWorktreeDriftSnapshot | null;
  evidenceReport: OwnerlessGeneratedTableRegistryDriftEvidenceReport;
  generatedAtUtc?: string;
  headSource?: string | null;
  laneOwnership?: GeneratedTableRegistryLaneOwnershipEvidence | null;
  loadSourceCatalog?: (
    repoRoot: string,
    tableEntryFileName: string,
  ) => TableRegistrySourceCatalog | null;
  worktreeSource?: string | null;
}): OwnerlessGeneratedTableRegistryDriftClassificationReport {
  return {
    classification: classifyGeneratedTableRegistryArtifactStatus({
      driftSnapshot: input.driftSnapshot,
      evidenceReport: input.evidenceReport,
      headSource: input.headSource,
      laneOwnership: input.laneOwnership,
      loadSourceCatalog: input.loadSourceCatalog,
      worktreeSource: input.worktreeSource,
    }),
    evidenceReport: input.evidenceReport,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
  };
}

export function formatOwnerlessGeneratedTableRegistryDriftClassificationReport(
  report: OwnerlessGeneratedTableRegistryDriftClassificationReport,
): string {
  const classification = report.classification;
  const lines = [
    OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_CLASSIFICATION_HEADER,
    `generated-at-utc=${report.generatedAtUtc}`,
    "",
    "[artifact-classification]",
    `artifact-path=${classification.artifactPath}`,
    `primary-status=${classification.primaryStatus}`,
    `table-entry-file=${classification.tableEntryFileName}`,
    `table-entry-id=${classification.tableEntryId}`,
    `regeneration-proof-kind=${classification.regenerationProof.kind}`,
    `canonical-source-file-present=${classification.regenerationProof.canonicalSourceFilePresent}`,
    `observed-table-entry-in-expected-module=${classification.regenerationProof.observedTableEntryInExpectedModule}`,
  ];

  if (classification.laneOwnership) {
    lines.push(
      `owned-lane=${classification.laneOwnership.laneName}`,
      `ownership-kind=${classification.laneOwnership.ownershipKind}`,
      `ownership-reason-code=${classification.laneOwnership.reasonCode}`,
    );
  }

  lines.push("", "[classification-evidence]");
  for (const evidence of classification.classificationEvidence) {
    lines.push(`  - ${evidence}`);
  }

  if (classification.evidenceGaps.length > 0) {
    lines.push("", "[evidence-gaps]");
    for (const gap of classification.evidenceGaps) {
      lines.push(`  - ${gap}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function serializeOwnerlessGeneratedTableRegistryDriftClassificationReport(
  report: OwnerlessGeneratedTableRegistryDriftClassificationReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export const OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_NEXT_ACTION_HEADER =
  "Ownerless Generated Table Registry Drift Next Action";

export type GeneratedTableRegistryArtifactNextSafeAction =
  | "land-minimal-generated-registry-proof"
  | "operator-cleanup-scoped-artifact"
  | "planner-hold-missing-evidence"
  | "wait-for-or-inspect-named-lane";

export interface GeneratedTableRegistryArtifactNextAction {
  action: GeneratedTableRegistryArtifactNextSafeAction;
  artifactPath: string;
  laneBranch?: string;
  laneName?: string;
  missingEvidence: readonly string[];
  primaryStatus: GeneratedTableRegistryArtifactPrimaryStatus;
  reason: string;
  tableEntryFileName: string;
  tableEntryId: string;
}

export interface OwnerlessGeneratedTableRegistryDriftPlannerReport {
  classificationReport: OwnerlessGeneratedTableRegistryDriftClassificationReport;
  evidenceReport: OwnerlessGeneratedTableRegistryDriftEvidenceReport;
  generatedAtUtc: string;
  nextAction: GeneratedTableRegistryArtifactNextAction;
}

export function resolveGeneratedTableRegistryArtifactNextAction(
  classification: GeneratedTableRegistryArtifactClassification,
): GeneratedTableRegistryArtifactNextAction {
  const base = {
    artifactPath: classification.artifactPath,
    missingEvidence: classification.evidenceGaps,
    primaryStatus: classification.primaryStatus,
    tableEntryFileName: classification.tableEntryFileName,
    tableEntryId: classification.tableEntryId,
  };

  switch (classification.primaryStatus) {
    case "expected":
      return {
        ...base,
        action: "land-minimal-generated-registry-proof",
        missingEvidence: [],
        reason: `Land or hand off only the minimal generated registry proof for ${classification.tableEntryFileName} (${classification.tableEntryId}) and any required canonical table source under src/content/registry/tables; do not open broad content work or mutate unrelated generated artifacts.`,
      };
    case "stale":
      return {
        ...base,
        action: "operator-cleanup-scoped-artifact",
        missingEvidence: [],
        reason: `Request operator-reviewed cleanup scoped only to ${classification.artifactPath}; preserve dirty files until review and do not revert, regenerate, or mutate unrelated generated artifacts.`,
      };
    case "owned": {
      const laneName = classification.laneOwnership?.laneName ?? "unknown-lane";
      const laneBranch = classification.laneOwnership?.branchName;
      return {
        ...base,
        action: "wait-for-or-inspect-named-lane",
        laneBranch,
        laneName,
        missingEvidence: [],
        reason: `Wait for, refresh, or inspect lane ${laneName}${
          laneBranch ? ` (${laneBranch})` : ""
        } instead of treating ${classification.artifactPath} as ownerless.`,
      };
    }
    case "ownerless": {
      const missingEvidenceSummary =
        classification.evidenceGaps.length > 0
          ? classification.evidenceGaps.join(" ")
          : "Table registry regeneration proof and lane ownership evidence are unavailable.";
      return {
        ...base,
        action: "planner-hold-missing-evidence",
        reason: `Hold priority refill for ${classification.artifactPath} until missing proof or ownership evidence is resolved: ${missingEvidenceSummary}`,
      };
    }
  }
}

export function buildOwnerlessGeneratedTableRegistryDriftPlannerReport(input: {
  classificationReport: OwnerlessGeneratedTableRegistryDriftClassificationReport;
  evidenceReport: OwnerlessGeneratedTableRegistryDriftEvidenceReport;
  generatedAtUtc?: string;
}): OwnerlessGeneratedTableRegistryDriftPlannerReport {
  const generatedAtUtc =
    input.generatedAtUtc ??
    input.classificationReport.generatedAtUtc ??
    new Date().toISOString();

  return {
    classificationReport: input.classificationReport,
    evidenceReport: input.evidenceReport,
    generatedAtUtc,
    nextAction: resolveGeneratedTableRegistryArtifactNextAction(
      input.classificationReport.classification,
    ),
  };
}

export function formatOwnerlessGeneratedTableRegistryDriftNextActionReport(
  report: OwnerlessGeneratedTableRegistryDriftPlannerReport,
): string {
  const nextAction = report.nextAction;
  const lines = [
    OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_NEXT_ACTION_HEADER,
    `generated-at-utc=${report.generatedAtUtc}`,
    "",
    "[planner-next-action]",
    `artifact-path=${nextAction.artifactPath}`,
    `primary-status=${nextAction.primaryStatus}`,
    `table-entry-file=${nextAction.tableEntryFileName}`,
    `table-entry-id=${nextAction.tableEntryId}`,
    `next-safe-action=${nextAction.action}`,
    `next-safe-action-reason=${nextAction.reason}`,
  ];

  if (nextAction.laneName) {
    lines.push(`owned-lane=${nextAction.laneName}`);
  }
  if (nextAction.laneBranch) {
    lines.push(`owned-lane-branch=${nextAction.laneBranch}`);
  }
  if (nextAction.missingEvidence.length > 0) {
    lines.push("", "[missing-evidence]");
    for (const gap of nextAction.missingEvidence) {
      lines.push(`  - ${gap}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function serializeOwnerlessGeneratedTableRegistryDriftPlannerReport(
  report: OwnerlessGeneratedTableRegistryDriftPlannerReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatOwnerlessGeneratedTableRegistryDriftUnifiedReport(input: {
  classificationReport: OwnerlessGeneratedTableRegistryDriftClassificationReport;
  evidenceReport: OwnerlessGeneratedTableRegistryDriftEvidenceReport;
  generatedAtUtc?: string;
}): string {
  const plannerReport =
    buildOwnerlessGeneratedTableRegistryDriftPlannerReport(input);

  return [
    formatOwnerlessGeneratedTableRegistryDriftEvidenceReport(
      input.evidenceReport,
    ).trimEnd(),
    "",
    formatOwnerlessGeneratedTableRegistryDriftClassificationReport(
      input.classificationReport,
    ).trimEnd(),
    "",
    formatOwnerlessGeneratedTableRegistryDriftNextActionReport(
      plannerReport,
    ).trimEnd(),
    "",
  ].join("\n");
}
