import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveMainRepoRoot } from "./merged-pr-drain-rows-reconciliation";
import { detectDefaultRemoteBaseRef } from "./planner-root-checkout-reconciliation";
import {
  classifyRootRemoteRelationship,
  type RootRemoteRelationship,
} from "./planner-root-main-lag-current-truth-reconciliation";

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
