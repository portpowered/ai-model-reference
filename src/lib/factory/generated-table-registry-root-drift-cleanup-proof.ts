import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { classifyBranchDrift } from "./active-pr-mergeability-watchdog";
import { resolveMainRepoRoot } from "./merged-pr-drain-rows-reconciliation";
import { detectDefaultRemoteBaseRef } from "./planner-root-checkout-reconciliation";

export const GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER =
  "Generated Table Registry Root Drift Cleanup Proof";

export const GENERATED_TABLE_REGISTRY_ARTIFACT_PATH =
  "src/lib/content/generated/table-registry.generated.ts";

export const LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME =
  "looped-transformers-comparison.json";

export const LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER =
  "loopedTransformersComparisonTableRecord";

export const GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_PRESERVE_POLICY =
  "Do not revert, restore, stage, unstage, clean, delete, overwrite, or commit the generated table registry artifact during evidence capture.";

export const GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_SCOPE_LIMIT =
  "Evidence capture is read-only; do not edit content page bundles, canonical source tables, or unrelated generated artifacts.";

export type GeneratedTableRegistryArtifactCleanliness = "clean" | "dirty";

export interface LoopedTransformersComparisonDiffHighlights {
  addedDiffHunks: string[];
  importLinePresent: boolean;
  payloadEntryPresent: boolean;
  removedDiffHunks: string[];
  sourceEntryPresent: boolean;
}

export interface GeneratedTableRegistryRootDriftEvidence {
  commitsAheadOfRemote: number;
  commitsBehindRemote: number;
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  generatedArtifactDiff: string;
  generatedArtifactPath: string;
  generatedArtifactStatusLine: string | null;
  generatedAtUtc: string;
  loopedTransformersComparisonDiffHighlights: LoopedTransformersComparisonDiffHighlights;
  originMainSha: string;
  preservePolicy: string;
  remoteBaseRef: string;
  rootHeadSha: string;
  rootRepoPath: string;
  scopeLimit: string;
  shortBranchStatusOutput: string;
}

export interface CaptureGeneratedTableRegistryRootDriftEvidenceOptions {
  diffOutput?: string;
  generatedAtUtc?: string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  runGitStatus?: RunGitStatus;
  statusOutput?: string;
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
  const result = defaultRunGit(cwd, ["status", "--short", "--branch"]);
  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `git status --short --branch failed for ${cwd}.${details ? `\n${details}` : ""}`,
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

function extractStatusLineForPath(
  statusOutput: string,
  targetPath: string,
): string | null {
  for (const line of statusOutput.split("\n")) {
    if (line.startsWith("## ")) {
      continue;
    }
    const trimmed = line.trimEnd();
    if (trimmed.length < 4) {
      continue;
    }
    const rawPath = trimmed.slice(3).trim();
    const renameSplit = rawPath.split(" -> ");
    const path = renameSplit[renameSplit.length - 1] ?? rawPath;
    if (path === targetPath) {
      return trimmed;
    }
  }
  return null;
}

function captureAheadBehindCounts(
  repoRoot: string,
  remoteBaseRef: string,
  runGit: RunGit,
): Pick<
  GeneratedTableRegistryRootDriftEvidence,
  "commitsAheadOfRemote" | "commitsBehindRemote"
> {
  const drift = classifyBranchDrift(
    "HEAD",
    (command, args, cwd) => {
      if (command !== "git") {
        return {
          ok: false,
          stdout: "",
          stderr: "unsupported command",
          exitCode: 1,
        };
      }
      const result = runGit(cwd ?? repoRoot, args);
      return {
        ok: result.status === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.status,
      };
    },
    remoteBaseRef,
    repoRoot,
  );

  return {
    commitsAheadOfRemote: drift.commitsAheadOfMain ?? 0,
    commitsBehindRemote: drift.commitsBehindMain ?? 0,
  };
}

export function extractLoopedTransformersComparisonDiffHighlights(
  diffOutput: string,
): LoopedTransformersComparisonDiffHighlights {
  const addedDiffHunks: string[] = [];
  const removedDiffHunks: string[] = [];
  let importLinePresent = false;
  let sourceEntryPresent = false;
  let payloadEntryPresent = false;

  for (const line of diffOutput.split("\n")) {
    const isAdded = line.startsWith("+") && !line.startsWith("+++");
    const isRemoved = line.startsWith("-") && !line.startsWith("---");
    if (!isAdded && !isRemoved) {
      continue;
    }

    const content = line.slice(1);
    const mentionsLoopedTransformers =
      content.includes(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME) ||
      content.includes(LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER);

    if (!mentionsLoopedTransformers) {
      continue;
    }

    if (isAdded) {
      addedDiffHunks.push(line);
    } else {
      removedDiffHunks.push(line);
    }

    if (content.includes("import ") && content.includes("from ")) {
      importLinePresent = true;
    }
    if (content.includes(`"${LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME}"`)) {
      sourceEntryPresent = true;
    }
    if (
      content.includes(LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER) &&
      !content.includes("import ")
    ) {
      payloadEntryPresent = true;
    }
  }

  return {
    addedDiffHunks,
    importLinePresent,
    payloadEntryPresent,
    removedDiffHunks,
    sourceEntryPresent,
  };
}

export function captureGeneratedTableRegistryRootDriftEvidence(
  options: CaptureGeneratedTableRegistryRootDriftEvidenceOptions = {},
): GeneratedTableRegistryRootDriftEvidence {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const mainRepoRoot = resolveMainRepoRoot(repoRoot, (_binary, args, cwd) => {
    const result = runGit(cwd ?? repoRoot, args);
    return {
      ok: result.status === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.status,
    };
  });
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(mainRepoRoot, runGit);
  const statusOutput = options.statusOutput ?? runGitStatus(mainRepoRoot);
  const generatedArtifactStatusLine = extractStatusLineForPath(
    statusOutput,
    GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  );
  const generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness =
    generatedArtifactStatusLine ? "dirty" : "clean";
  const generatedArtifactDiff =
    options.diffOutput ??
    (() => {
      const diffResult = runGit(mainRepoRoot, [
        "diff",
        "--",
        GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
      ]);
      if (diffResult.status !== 0) {
        throw new Error(
          `git diff failed for ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH} at ${mainRepoRoot}`,
        );
      }
      return diffResult.stdout;
    })();
  const { commitsAheadOfRemote, commitsBehindRemote } =
    captureAheadBehindCounts(mainRepoRoot, remoteBaseRef, runGit);

  return {
    commitsAheadOfRemote,
    commitsBehindRemote,
    generatedArtifactCleanliness,
    generatedArtifactDiff,
    generatedArtifactPath: GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
    generatedArtifactStatusLine,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    loopedTransformersComparisonDiffHighlights:
      extractLoopedTransformersComparisonDiffHighlights(generatedArtifactDiff),
    originMainSha: resolveGitRef(mainRepoRoot, remoteBaseRef, runGit),
    preservePolicy: GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_PRESERVE_POLICY,
    remoteBaseRef,
    rootHeadSha: resolveGitRef(mainRepoRoot, "HEAD", runGit),
    rootRepoPath: mainRepoRoot,
    scopeLimit: GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_SCOPE_LIMIT,
    shortBranchStatusOutput: statusOutput,
  };
}

export function formatGeneratedTableRegistryRootDriftEvidence(
  report: GeneratedTableRegistryRootDriftEvidence,
): string {
  const highlights = report.loopedTransformersComparisonDiffHighlights;
  const lines = [
    GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER,
    `generated-at-utc=${report.generatedAtUtc}`,
    `root-repo-path=${report.rootRepoPath}`,
    `remote-base-ref=${report.remoteBaseRef}`,
    `root-head-sha=${report.rootHeadSha}`,
    `origin-main-sha=${report.originMainSha}`,
    `commits-ahead=${report.commitsAheadOfRemote}`,
    `commits-behind=${report.commitsBehindRemote}`,
    `generated-artifact-path=${report.generatedArtifactPath}`,
    `generated-artifact-cleanliness=${report.generatedArtifactCleanliness}`,
    `generated-artifact-status-line=${report.generatedArtifactStatusLine ?? "none"}`,
    `preserve-policy=${report.preservePolicy}`,
    `scope-limit=${report.scopeLimit}`,
    "",
    "short-branch-status:",
    report.shortBranchStatusOutput.trimEnd(),
    "",
    `looped-transformers-comparison-import-present=${highlights.importLinePresent}`,
    `looped-transformers-comparison-source-present=${highlights.sourceEntryPresent}`,
    `looped-transformers-comparison-payload-present=${highlights.payloadEntryPresent}`,
    `looped-transformers-comparison-added-hunks=${highlights.addedDiffHunks.length}`,
    `looped-transformers-comparison-removed-hunks=${highlights.removedDiffHunks.length}`,
    "",
    "generated-artifact-diff:",
    report.generatedArtifactDiff.length > 0
      ? report.generatedArtifactDiff.trimEnd()
      : "(no diff)",
  ];

  if (highlights.addedDiffHunks.length > 0) {
    lines.push("", "looped-transformers-comparison-added-lines:");
    lines.push(...highlights.addedDiffHunks);
  }

  if (highlights.removedDiffHunks.length > 0) {
    lines.push("", "looped-transformers-comparison-removed-lines:");
    lines.push(...highlights.removedDiffHunks);
  }

  return lines.join("\n");
}

export function serializeGeneratedTableRegistryRootDriftEvidence(
  report: GeneratedTableRegistryRootDriftEvidence,
): string {
  return JSON.stringify(report, null, 2);
}
