import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getRegistryCollectionRoot } from "@/lib/content/content-paths";
import { generatedTableRegistrySourceFiles } from "@/lib/content/generated/table-registry.generated";
import {
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";
import { getTableById } from "@/lib/content/table-registry-runtime";
import { verifyGeneratedTableRegistryState } from "@/lib/content/table-registry-verification";
import { classifyBranchDrift } from "./active-pr-mergeability-watchdog";
import { resolveMainRepoRoot } from "./merged-pr-drain-rows-reconciliation";
import {
  detectDefaultRemoteBaseRef,
  pathExistsOnGitRef,
} from "./planner-root-checkout-reconciliation";
import {
  discoverPlannerWorktreeDriftSnapshot,
  type PlannerWorktreeDirtyPath,
  type PlannerWorktreeDriftOwnership,
  type PlannerWorktreeDriftSnapshot,
} from "./planner-worktree-drift-watchdog";
import type {
  QueueWorktreePrLinkageLane,
  QueueWorktreePrLinkageLedger,
} from "./queue-worktree-pr-linkage-ledger";

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

export const TABLE_REGISTRY_GENERATION_COMMAND =
  "bun run generate:table-registry";

export const TABLE_REGISTRY_VALIDATION_COMMAND =
  "bun run verify:table-registry";

export const LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH = `src/content/registry/tables/${LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME}`;

export const LOOPED_TRANSFORMERS_COMPARISON_TABLE_ID =
  "table.looped-transformers-comparison";

export const GENERATED_TABLE_REGISTRY_EXPECTED_OUTPUT_UNRELATED_PATHS_NOTE =
  "No unrelated dirty root paths were modified, reverted, staged, overwritten, or deleted.";

export const GENERATED_TABLE_REGISTRY_PROOF_TARGET_ROOT_CHECKOUT_POLICY =
  "Root drift proof uses the main repo root checkout for drift evidence, reproducibility, validation, and apply; nested worktree invocations must not classify root drift from worktree artifacts.";

export interface GeneratedTableRegistryProofContext {
  checkoutRepoPath: string;
  invocationRepoPath: string;
  invocationUsesNestedWorktree: boolean;
  proofTargetRepoPath: string;
  proofTargetUsesRootCheckout: boolean;
}

export type CanonicalSourcePresenceStatus = "present" | "absent";

export type GeneratedTableRegistryReproducibilityOutcome =
  | "differs-from-deterministic-generation"
  | "matches-deterministic-generation"
  | "missing-canonical-source-table"
  | "missing-generated-artifact";

export type GeneratedTableRegistryArtifactCleanliness = "clean" | "dirty";

export interface LoopedTransformersComparisonDiffHighlights {
  addedDiffHunks: string[];
  importLinePresent: boolean;
  payloadEntryPresent: boolean;
  removedDiffHunks: string[];
  sourceEntryPresent: boolean;
}

export interface LoopedTransformersSourceTablePresence {
  checkoutFilesystem: CanonicalSourcePresenceStatus;
  originMain: CanonicalSourcePresenceStatus;
  rootHead: CanonicalSourcePresenceStatus;
}

export interface GeneratedTableRegistryReproducibilityProof {
  checkoutRepoPath: string;
  invocationRepoPath: string;
  proofTargetUsesRootCheckout: boolean;
  currentGeneratedArtifactMatchesDryRun: boolean;
  currentGeneratedModuleSource: string | null;
  dryRunGeneratedModuleSource: string;
  generatedAtUtc: string;
  generationCommand: string;
  loopedTransformersEntriesMatchDryRun: boolean;
  loopedTransformersSourceTablePath: string;
  loopedTransformersSourceTablePresence: LoopedTransformersSourceTablePresence;
  missingCanonicalSourceTableFiles: string[];
  originMainSha: string;
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
  remoteBaseRef: string;
  rootHeadSha: string;
  rootRepoPath: string;
  validationCommand: string;
  validationProblems: string[];
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

export interface ProveGeneratedTableRegistryReproducibilityOptions {
  checkoutRepoPath?: string;
  generatedAtUtc?: string;
  pathExists?: (filePath: string) => boolean;
  readDir?: (directoryPath: string) => string[];
  readFile?: (filePath: string) => string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
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

function createGitCommandAdapter(
  runGit: RunGit,
  fallbackCwd: string,
): (
  binary: string,
  args: readonly string[],
  cwd?: string,
) => {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
} {
  return (_binary, args, cwd) => {
    const result = runGit(cwd ?? fallbackCwd, args);
    return {
      ok: result.status === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.status,
    };
  };
}

export function resolveGeneratedTableRegistryProofContext(
  options: {
    checkoutRepoPath?: string;
    repoRoot?: string;
    runGit?: RunGit;
  } = {},
): GeneratedTableRegistryProofContext {
  const invocationRepoPath = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const proofTargetRepoPath = resolveMainRepoRoot(
    invocationRepoPath,
    createGitCommandAdapter(runGit, invocationRepoPath),
  );
  const explicitCheckoutRepoPath = options.checkoutRepoPath
    ? resolve(options.checkoutRepoPath)
    : undefined;
  const checkoutRepoPath = explicitCheckoutRepoPath ?? proofTargetRepoPath;

  return {
    checkoutRepoPath,
    invocationRepoPath,
    invocationUsesNestedWorktree: invocationRepoPath !== proofTargetRepoPath,
    proofTargetRepoPath,
    proofTargetUsesRootCheckout: checkoutRepoPath === proofTargetRepoPath,
  };
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
  const mainRepoRoot = resolveMainRepoRoot(
    repoRoot,
    createGitCommandAdapter(runGit, repoRoot),
  );
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(mainRepoRoot, runGit);
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
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

function defaultReadDir(directoryPath: string): string[] {
  return readdirSync(directoryPath);
}

function defaultReadFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function fileExistsAtPath(filePath: string): boolean {
  return existsSync(filePath);
}

export function extractLoopedTransformersGeneratedLines(
  generatedModuleSource: string,
): string[] {
  return generatedModuleSource
    .split("\n")
    .filter(
      (line) =>
        line.includes(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME) ||
        line.includes(LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER),
    );
}

export function buildDryRunGeneratedTableRegistryModuleSource(
  checkoutRepoPath: string,
  readDir: (directoryPath: string) => string[] = defaultReadDir,
): string {
  const tablesRegistryRoot = getRegistryCollectionRoot(
    "tables",
    join(checkoutRepoPath, "src/content/registry"),
  );
  const fileNames = readDir(tablesRegistryRoot);
  const entries = createTableRegistrySourceEntries(fileNames);
  return renderGeneratedTableRegistryModule(entries);
}

export function collectLoopedTransformersSourceTablePresence(input: {
  checkoutRepoPath: string;
  loopedTransformersSourceTablePath?: string;
  pathExists?: (filePath: string) => boolean;
  remoteBaseRef: string;
  rootRepoPath: string;
  runGit: RunGit;
}): LoopedTransformersSourceTablePresence {
  const sourceTablePath =
    input.loopedTransformersSourceTablePath ??
    LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH;
  const pathExists = input.pathExists ?? fileExistsAtPath;

  return {
    checkoutFilesystem: pathExists(
      join(input.checkoutRepoPath, sourceTablePath),
    )
      ? "present"
      : "absent",
    originMain: pathExistsOnGitRef(
      input.rootRepoPath,
      input.remoteBaseRef,
      sourceTablePath,
      input.runGit,
    )
      ? "present"
      : "absent",
    rootHead: pathExistsOnGitRef(
      input.rootRepoPath,
      "HEAD",
      sourceTablePath,
      input.runGit,
    )
      ? "present"
      : "absent",
  };
}

function extractGeneratedTableRegistrySourceFileNames(
  generatedModuleSource: string,
): string[] {
  const match = generatedModuleSource.match(
    /export const generatedTableRegistrySourceFiles = \[([\s\S]*?)\] as const;/,
  );
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/"([^"]+\.json)"/g)].map((entry) => entry[1]);
}

function findMissingCanonicalSourceTableFiles(
  checkoutRepoPath: string,
  sourceFileNames: readonly string[],
  pathExists: (filePath: string) => boolean = fileExistsAtPath,
): string[] {
  const tablesRegistryRoot = getRegistryCollectionRoot(
    "tables",
    join(checkoutRepoPath, "src/content/registry"),
  );

  return sourceFileNames.filter(
    (fileName) => !pathExists(join(tablesRegistryRoot, fileName)),
  );
}

function classifyGeneratedTableRegistryReproducibilityOutcome(input: {
  currentGeneratedModuleSource: string | null;
  currentGeneratedArtifactMatchesDryRun: boolean;
  missingCanonicalSourceTableFiles: readonly string[];
}): GeneratedTableRegistryReproducibilityOutcome {
  if (input.currentGeneratedModuleSource === null) {
    return "missing-generated-artifact";
  }

  if (input.missingCanonicalSourceTableFiles.length > 0) {
    return "missing-canonical-source-table";
  }

  return input.currentGeneratedArtifactMatchesDryRun
    ? "matches-deterministic-generation"
    : "differs-from-deterministic-generation";
}

function loadSourceRecordsFromCheckout(
  checkoutRepoPath: string,
  readDir: (directoryPath: string) => string[],
  readFile: (filePath: string) => string,
) {
  const tablesRegistryRoot = getRegistryCollectionRoot(
    "tables",
    join(checkoutRepoPath, "src/content/registry"),
  );

  return readDir(tablesRegistryRoot)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      fileName,
      record: JSON.parse(
        readFile(join(tablesRegistryRoot, fileName)),
      ) as unknown,
    }));
}

export function proveGeneratedTableRegistryReproducibility(
  options: ProveGeneratedTableRegistryReproducibilityOptions = {},
): GeneratedTableRegistryReproducibilityProof {
  const proofContext = resolveGeneratedTableRegistryProofContext({
    checkoutRepoPath: options.checkoutRepoPath,
    repoRoot: options.repoRoot,
    runGit: options.runGit,
  });
  const checkoutRepoPath = proofContext.checkoutRepoPath;
  const runGit = options.runGit ?? defaultRunGit;
  const readDir = options.readDir ?? defaultReadDir;
  const readFile = options.readFile ?? defaultReadFile;
  const pathExists = options.pathExists ?? fileExistsAtPath;
  const mainRepoRoot = proofContext.proofTargetRepoPath;
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(mainRepoRoot, runGit);
  const generatedArtifactPath = join(
    checkoutRepoPath,
    GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  );
  const currentGeneratedModuleSource = pathExists(generatedArtifactPath)
    ? readFile(generatedArtifactPath)
    : null;
  const dryRunGeneratedModuleSource =
    buildDryRunGeneratedTableRegistryModuleSource(checkoutRepoPath, readDir);
  const currentGeneratedArtifactMatchesDryRun =
    currentGeneratedModuleSource === dryRunGeneratedModuleSource;
  const loopedTransformersEntriesMatchDryRun =
    extractLoopedTransformersGeneratedLines(
      currentGeneratedModuleSource ?? "",
    ).join("\n") ===
    extractLoopedTransformersGeneratedLines(dryRunGeneratedModuleSource).join(
      "\n",
    );
  const loopedTransformersSourceTablePresence =
    collectLoopedTransformersSourceTablePresence({
      checkoutRepoPath,
      pathExists,
      remoteBaseRef,
      rootRepoPath: mainRepoRoot,
      runGit,
    });
  const missingCanonicalSourceTableFiles =
    currentGeneratedModuleSource === null
      ? []
      : findMissingCanonicalSourceTableFiles(
          checkoutRepoPath,
          extractGeneratedTableRegistrySourceFileNames(
            currentGeneratedModuleSource,
          ),
          pathExists,
        );
  const sourceRecords = loadSourceRecordsFromCheckout(
    checkoutRepoPath,
    readDir,
    readFile,
  );
  const validationProblems: string[] = [];
  if (currentGeneratedModuleSource === null) {
    validationProblems.push(
      "Missing generated table registry module at `src/lib/content/generated/table-registry.generated.ts`. Run `bun run generate:table-registry` and commit the result.",
    );
  } else if (currentGeneratedModuleSource !== dryRunGeneratedModuleSource) {
    validationProblems.push(
      "Generated table registry module is out of sync with `src/content/registry/tables`. Run `bun run generate:table-registry` and commit the updated file.",
    );
  } else {
    try {
      const runtimeValidationProblems = verifyGeneratedTableRegistryState({
        sourceRecords,
        generatedModuleSource: currentGeneratedModuleSource,
        runtimeTableRecords: [],
      }).filter(
        (problem) =>
          !problem.startsWith(
            "Synchronous table runtime does not expose the same table ids",
          ),
      );
      validationProblems.push(...runtimeValidationProblems);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      validationProblems.push(
        `Table registry validation raised an error before reporting sync problems: ${message}`,
      );
    }
  }

  return {
    checkoutRepoPath,
    invocationRepoPath: proofContext.invocationRepoPath,
    proofTargetUsesRootCheckout: proofContext.proofTargetUsesRootCheckout,
    currentGeneratedArtifactMatchesDryRun,
    currentGeneratedModuleSource,
    dryRunGeneratedModuleSource,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    generationCommand: TABLE_REGISTRY_GENERATION_COMMAND,
    loopedTransformersEntriesMatchDryRun,
    loopedTransformersSourceTablePath:
      LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH,
    loopedTransformersSourceTablePresence,
    missingCanonicalSourceTableFiles,
    originMainSha: resolveGitRef(mainRepoRoot, remoteBaseRef, runGit),
    reproducibilityOutcome:
      classifyGeneratedTableRegistryReproducibilityOutcome({
        currentGeneratedModuleSource,
        currentGeneratedArtifactMatchesDryRun,
        missingCanonicalSourceTableFiles,
      }),
    remoteBaseRef,
    rootHeadSha: resolveGitRef(mainRepoRoot, "HEAD", runGit),
    rootRepoPath: mainRepoRoot,
    validationCommand: TABLE_REGISTRY_VALIDATION_COMMAND,
    validationProblems,
  };
}

export function formatGeneratedTableRegistryReproducibilityProof(
  report: GeneratedTableRegistryReproducibilityProof,
): string {
  const presence = report.loopedTransformersSourceTablePresence;
  const lines = [
    `${GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER} — Reproducibility`,
    `generated-at-utc=${report.generatedAtUtc}`,
    `invocation-repo-path=${report.invocationRepoPath}`,
    `checkout-repo-path=${report.checkoutRepoPath}`,
    `root-repo-path=${report.rootRepoPath}`,
    `proof-target-uses-root-checkout=${report.proofTargetUsesRootCheckout}`,
    `remote-base-ref=${report.remoteBaseRef}`,
    `root-head-sha=${report.rootHeadSha}`,
    `origin-main-sha=${report.originMainSha}`,
    `generation-command=${report.generationCommand}`,
    `validation-command=${report.validationCommand}`,
    `looped-transformers-source-table-path=${report.loopedTransformersSourceTablePath}`,
    `looped-transformers-present-on-origin-main=${presence.originMain}`,
    `looped-transformers-present-on-root-head=${presence.rootHead}`,
    `looped-transformers-present-on-checkout-filesystem=${presence.checkoutFilesystem}`,
    `reproducibility-outcome=${report.reproducibilityOutcome}`,
    `current-generated-artifact-matches-dry-run=${report.currentGeneratedArtifactMatchesDryRun}`,
    `looped-transformers-entries-match-dry-run=${report.loopedTransformersEntriesMatchDryRun}`,
    `missing-canonical-source-table-files=${report.missingCanonicalSourceTableFiles.length === 0 ? "(none)" : report.missingCanonicalSourceTableFiles.join(", ")}`,
    `validation-problem-count=${report.validationProblems.length}`,
  ];

  if (!report.proofTargetUsesRootCheckout) {
    lines.push(
      "proof-target-warning=checkout-repo-path differs from root proof target; reproducibility and apply may not reflect root drift evidence",
    );
  }

  if (report.validationProblems.length > 0) {
    lines.push("", "validation-problems:");
    for (const problem of report.validationProblems) {
      lines.push(`  - ${problem}`);
    }
  }

  lines.push(
    "",
    "looped-transformers-generated-lines-from-current-artifact:",
    ...(report.currentGeneratedModuleSource === null
      ? ["(missing generated artifact)"]
      : extractLoopedTransformersGeneratedLines(
          report.currentGeneratedModuleSource,
        )),
    "",
    "looped-transformers-generated-lines-from-dry-run:",
    ...extractLoopedTransformersGeneratedLines(
      report.dryRunGeneratedModuleSource,
    ),
  );

  return lines.join("\n");
}

export function serializeGeneratedTableRegistryReproducibilityProof(
  report: GeneratedTableRegistryReproducibilityProof,
): string {
  return JSON.stringify(report, null, 2);
}

export type GeneratedTableRegistryExpectedOutputKind =
  | "already-aligned-no-commit"
  | "land-minimal-expected-output-required"
  | "not-applicable";

export type GeneratedTableRegistryExpectedOutputApplyStatus =
  | "applied"
  | "failed"
  | "not-requested"
  | "skipped";

export interface GeneratedTableRegistryExpectedOutputOutcome {
  applicable: boolean;
  applyDetail?: string;
  applyStatus: GeneratedTableRegistryExpectedOutputApplyStatus;
  changedPaths: string[];
  checkoutRepoPath: string;
  generatedAtUtc: string;
  kind: GeneratedTableRegistryExpectedOutputKind;
  loopedTransformersSourceDiscoverable: boolean;
  loopedTransformersTableDiscoverable: boolean;
  loopedTransformersTableId: string;
  operationalSummary: string;
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
  rootGeneratedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  unrelatedDirtyPathsPreserved: boolean;
  unrelatedPathsNote: string;
  validationCommand: string;
  validationPassed: boolean;
  validationProblems: string[];
}

export interface BuildGeneratedTableRegistryExpectedOutputOutcomeOptions {
  apply?: boolean;
  checkoutRepoPath?: string;
  driftEvidence?: GeneratedTableRegistryRootDriftEvidence;
  generatedAtUtc?: string;
  pathExists?: (filePath: string) => boolean;
  readDir?: (directoryPath: string) => string[];
  readFile?: (filePath: string) => string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  writeFile?: (filePath: string, contents: string) => void;
}

export function classifyGeneratedTableRegistryExpectedOutputKind(input: {
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
}): GeneratedTableRegistryExpectedOutputKind {
  if (input.reproducibilityOutcome !== "matches-deterministic-generation") {
    return "not-applicable";
  }

  return input.generatedArtifactCleanliness === "dirty"
    ? "land-minimal-expected-output-required"
    : "already-aligned-no-commit";
}

export function verifyLoopedTransformersTableRegistryDiscoverability(): {
  loopedTransformersSourceDiscoverable: boolean;
  loopedTransformersTableDiscoverable: boolean;
  loopedTransformersTableId: string;
} {
  const table = getTableById(LOOPED_TRANSFORMERS_COMPARISON_TABLE_ID);
  const loopedTransformersSourceDiscoverable =
    generatedTableRegistrySourceFiles.includes(
      LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
    );

  return {
    loopedTransformersSourceDiscoverable,
    loopedTransformersTableDiscoverable:
      table?.id === LOOPED_TRANSFORMERS_COMPARISON_TABLE_ID,
    loopedTransformersTableId: LOOPED_TRANSFORMERS_COMPARISON_TABLE_ID,
  };
}

function buildExpectedOutputOperationalSummary(input: {
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  kind: GeneratedTableRegistryExpectedOutputKind;
}): string {
  if (input.kind === "not-applicable") {
    return "Story 003 does not apply because reproducibility is not matches-deterministic-generation; use stories 004 or 005.";
  }

  if (input.kind === "already-aligned-no-commit") {
    return "Looped-transformers generated entries are expected and the generated table registry artifact is already clean and aligned with deterministic output; no registry commit is required.";
  }

  return `Looped-transformers generated entries are expected while ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH} is dirty on the root checkout; land only the minimal regenerated artifact after ${TABLE_REGISTRY_GENERATION_COMMAND}.`;
}

export function applyGeneratedTableRegistryExpectedOutput(input: {
  checkoutRepoPath: string;
  dryRunGeneratedModuleSource: string;
  kind: GeneratedTableRegistryExpectedOutputKind;
  writeFile?: (filePath: string, contents: string) => void;
}): {
  applyDetail: string;
  applyStatus: Exclude<
    GeneratedTableRegistryExpectedOutputApplyStatus,
    "not-requested"
  >;
  changedPaths: string[];
} {
  if (input.kind !== "land-minimal-expected-output-required") {
    return {
      applyDetail:
        "Apply skipped because story 003 expected-output landing is not required.",
      applyStatus: "skipped",
      changedPaths: [],
    };
  }

  const artifactPath = join(
    input.checkoutRepoPath,
    GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  );
  const writeFile = input.writeFile ?? writeFileSync;

  try {
    writeFile(artifactPath, input.dryRunGeneratedModuleSource);
    return {
      applyDetail: `Wrote deterministic generated output to ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}.`,
      applyStatus: "applied",
      changedPaths: [GENERATED_TABLE_REGISTRY_ARTIFACT_PATH],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      applyDetail: `Failed to write ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}: ${message}`,
      applyStatus: "failed",
      changedPaths: [],
    };
  }
}

export function buildGeneratedTableRegistryExpectedOutputOutcome(
  options: BuildGeneratedTableRegistryExpectedOutputOutcomeOptions = {},
): GeneratedTableRegistryExpectedOutputOutcome {
  const proofContext = resolveGeneratedTableRegistryProofContext({
    checkoutRepoPath: options.checkoutRepoPath,
    repoRoot: options.repoRoot,
    runGit: options.runGit,
  });
  const checkoutRepoPath = proofContext.checkoutRepoPath;
  const driftEvidence =
    options.driftEvidence ??
    captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef: options.remoteBaseRef,
      repoRoot: proofContext.invocationRepoPath,
      runGit: options.runGit,
    });
  const reproducibilityProof = proveGeneratedTableRegistryReproducibility({
    checkoutRepoPath,
    generatedAtUtc: options.generatedAtUtc,
    pathExists: options.pathExists,
    readDir: options.readDir,
    readFile: options.readFile,
    remoteBaseRef: options.remoteBaseRef,
    repoRoot: proofContext.invocationRepoPath,
    runGit: options.runGit,
  });
  const kind = classifyGeneratedTableRegistryExpectedOutputKind({
    generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
    reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
  });
  const discoverability =
    verifyLoopedTransformersTableRegistryDiscoverability();
  const validationProblems = [...reproducibilityProof.validationProblems];
  if (!discoverability.loopedTransformersTableDiscoverable) {
    validationProblems.push(
      `Generated table registry runtime does not expose ${LOOPED_TRANSFORMERS_COMPARISON_TABLE_ID}.`,
    );
  }

  let applyStatus: GeneratedTableRegistryExpectedOutputApplyStatus =
    "not-requested";
  let applyDetail: string | undefined;
  let changedPaths: string[] = [];

  if (options.apply) {
    const applyResult = applyGeneratedTableRegistryExpectedOutput({
      checkoutRepoPath,
      dryRunGeneratedModuleSource:
        reproducibilityProof.dryRunGeneratedModuleSource,
      kind,
      writeFile: options.writeFile,
    });
    applyStatus = applyResult.applyStatus;
    applyDetail = applyResult.applyDetail;
    changedPaths = applyResult.changedPaths;
  }

  return {
    applicable: kind !== "not-applicable",
    applyDetail,
    applyStatus,
    changedPaths,
    checkoutRepoPath,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    kind,
    loopedTransformersSourceDiscoverable:
      discoverability.loopedTransformersSourceDiscoverable,
    loopedTransformersTableDiscoverable:
      discoverability.loopedTransformersTableDiscoverable,
    loopedTransformersTableId: discoverability.loopedTransformersTableId,
    operationalSummary: buildExpectedOutputOperationalSummary({
      generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
      kind,
    }),
    reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
    rootGeneratedArtifactCleanliness:
      driftEvidence.generatedArtifactCleanliness,
    unrelatedDirtyPathsPreserved: true,
    unrelatedPathsNote:
      GENERATED_TABLE_REGISTRY_EXPECTED_OUTPUT_UNRELATED_PATHS_NOTE,
    validationCommand: reproducibilityProof.validationCommand,
    validationPassed: validationProblems.length === 0,
    validationProblems,
  };
}

export function formatGeneratedTableRegistryExpectedOutputOutcome(
  outcome: GeneratedTableRegistryExpectedOutputOutcome,
): string {
  const lines = [
    `${GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER} — Expected Output`,
    `generated-at-utc=${outcome.generatedAtUtc}`,
    `checkout-repo-path=${outcome.checkoutRepoPath}`,
    `kind=${outcome.kind}`,
    `applicable=${outcome.applicable}`,
    `reproducibility-outcome=${outcome.reproducibilityOutcome}`,
    `root-generated-artifact-cleanliness=${outcome.rootGeneratedArtifactCleanliness}`,
    `validation-command=${outcome.validationCommand}`,
    `validation-passed=${outcome.validationPassed}`,
    `looped-transformers-table-id=${outcome.loopedTransformersTableId}`,
    `looped-transformers-table-discoverable=${outcome.loopedTransformersTableDiscoverable}`,
    `looped-transformers-source-discoverable=${outcome.loopedTransformersSourceDiscoverable}`,
    `unrelated-dirty-paths-preserved=${outcome.unrelatedDirtyPathsPreserved}`,
    `unrelated-paths-note=${outcome.unrelatedPathsNote}`,
    `apply-status=${outcome.applyStatus}`,
    `changed-paths=${outcome.changedPaths.length === 0 ? "(none)" : outcome.changedPaths.join(", ")}`,
    `operational-summary=${outcome.operationalSummary}`,
  ];

  if (outcome.validationProblems.length > 0) {
    lines.push("", "validation-problems:");
    for (const problem of outcome.validationProblems) {
      lines.push(`  - ${problem}`);
    }
  }

  if (outcome.applyDetail) {
    lines.push(`apply-detail=${outcome.applyDetail}`);
  }

  return lines.join("\n");
}

export function serializeGeneratedTableRegistryExpectedOutputOutcome(
  outcome: GeneratedTableRegistryExpectedOutputOutcome,
): string {
  return JSON.stringify(outcome, null, 2);
}

export const GENERATED_TABLE_REGISTRY_STALE_DRIFT_PAGE_REFILL_HOLD_RULE =
  "Hold page refills until the root generated table registry artifact is clean or explicitly accepted by an operator after review.";

export const GENERATED_TABLE_REGISTRY_STALE_DRIFT_UNRELATED_PATHS_NOTE =
  "Do not revert, stage, overwrite, delete, or modify unrelated paths while cleaning stale generated table registry drift.";

export type GeneratedTableRegistryStaleDriftOperatorActionKind =
  | "accept-and-preserve"
  | "restore-from-origin-main"
  | "restore-from-head"
  | "regenerate-from-canonical-sources"
  | "verify-after-cleanup";

export interface GeneratedTableRegistryStaleDriftOperatorAction {
  command: string;
  description: string;
  kind: GeneratedTableRegistryStaleDriftOperatorActionKind;
}

export interface GeneratedTableRegistryStaleDriftHandoff {
  applicable: boolean;
  checkoutRepoPath: string;
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  generatedArtifactPath: string;
  generatedAtUtc: string;
  generationCommand: string;
  loopedTransformersEntriesMatchDryRun: boolean;
  notApplicableReason?: string;
  operatorSafeActions: GeneratedTableRegistryStaleDriftOperatorAction[];
  pageRefillHoldRule: string;
  reproductionFailureEvidence: string[];
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
  rootRepoPath: string;
  staleDriftRationale?: string;
  unrelatedPathsNote: string;
  validationCommand: string;
}

export interface BuildGeneratedTableRegistryStaleDriftHandoffOptions {
  checkoutRepoPath?: string;
  driftEvidence?: GeneratedTableRegistryRootDriftEvidence;
  generatedAtUtc?: string;
  pathExists?: (filePath: string) => boolean;
  readDir?: (directoryPath: string) => string[];
  readFile?: (filePath: string) => string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
}

export function classifyGeneratedTableRegistryStaleDriftApplicable(
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome,
): boolean {
  return reproducibilityOutcome !== "matches-deterministic-generation";
}

function buildStaleDriftNotApplicableReason(
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome,
): string {
  return `Story 004 does not apply because reproducibility is ${reproducibilityOutcome}; the generated table registry artifact is reproducible from canonical source tables and is not stale root drift.`;
}

function buildStaleDriftRationale(input: {
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  loopedTransformersEntriesMatchDryRun: boolean;
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
  validationProblems: readonly string[];
}): string {
  switch (input.reproducibilityOutcome) {
    case "differs-from-deterministic-generation":
      return input.generatedArtifactCleanliness === "dirty"
        ? "The dirty generated table registry artifact does not match deterministic output from canonical source tables; this is stale root checkout drift rather than expected generated output."
        : "The committed generated table registry artifact does not match deterministic output from canonical source tables.";
    case "missing-canonical-source-table":
      return "The generated table registry artifact references canonical source table files that are absent on the checkout filesystem; looped-transformers entries cannot be reproduced from current canonical sources.";
    case "missing-generated-artifact":
      return "The generated table registry artifact is missing on the checkout filesystem.";
    default:
      return "The generated table registry artifact is not reproducible from canonical source tables.";
  }
}

function buildStaleDriftReproductionFailureEvidence(input: {
  generationCommand: string;
  loopedTransformersEntriesMatchDryRun: boolean;
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
  validationCommand: string;
  validationProblems: readonly string[];
}): string[] {
  const evidence = [
    `reproducibility-outcome=${input.reproducibilityOutcome}`,
    `generation-command=${input.generationCommand}`,
    `validation-command=${input.validationCommand}`,
    `looped-transformers-entries-match-dry-run=${input.loopedTransformersEntriesMatchDryRun}`,
  ];

  for (const problem of input.validationProblems) {
    evidence.push(`validation-problem=${problem}`);
  }

  return evidence;
}

function buildStaleDriftOperatorSafeActions(input: {
  remoteBaseRef: string;
  reproducibilityOutcome: GeneratedTableRegistryReproducibilityOutcome;
}): GeneratedTableRegistryStaleDriftOperatorAction[] {
  const artifactPath = GENERATED_TABLE_REGISTRY_ARTIFACT_PATH;
  const actions: GeneratedTableRegistryStaleDriftOperatorAction[] = [
    {
      kind: "accept-and-preserve",
      command: "(no file mutation)",
      description:
        "Preserve the current root artifact after operator review when the drift must be investigated further; keep page refills on hold until the operator explicitly accepts the dirty state.",
    },
  ];

  actions.push({
    kind: "restore-from-origin-main",
    command: `git restore --source=${input.remoteBaseRef} --worktree -- ${artifactPath}`,
    description:
      "Restore only the generated table registry artifact from the remote main baseline when the dirty content is stale checkout drift and canonical sources on main are authoritative.",
  });

  if (input.reproducibilityOutcome !== "missing-generated-artifact") {
    actions.push({
      kind: "restore-from-head",
      command: `git restore --worktree -- ${artifactPath}`,
      description:
        "Discard unstaged worktree edits to the generated artifact when root HEAD already matches the intended committed baseline.",
    });
  }

  if (
    input.reproducibilityOutcome === "differs-from-deterministic-generation" ||
    input.reproducibilityOutcome === "missing-generated-artifact"
  ) {
    actions.push({
      kind: "regenerate-from-canonical-sources",
      command: TABLE_REGISTRY_GENERATION_COMMAND,
      description:
        "Regenerate only the generated table registry artifact from canonical source tables when canonical files are present and the drift should be replaced with deterministic output.",
    });
  }

  actions.push({
    kind: "verify-after-cleanup",
    command: TABLE_REGISTRY_VALIDATION_COMMAND,
    description:
      "After any cleanup or regeneration, verify generated table registry completeness before resuming page refills.",
  });

  return actions;
}

export function buildGeneratedTableRegistryStaleDriftHandoff(
  options: BuildGeneratedTableRegistryStaleDriftHandoffOptions = {},
): GeneratedTableRegistryStaleDriftHandoff {
  const proofContext = resolveGeneratedTableRegistryProofContext({
    checkoutRepoPath: options.checkoutRepoPath,
    repoRoot: options.repoRoot,
    runGit: options.runGit,
  });
  const checkoutRepoPath = proofContext.checkoutRepoPath;
  const driftEvidence =
    options.driftEvidence ??
    captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef: options.remoteBaseRef,
      repoRoot: proofContext.invocationRepoPath,
      runGit: options.runGit,
    });
  const reproducibilityProof = proveGeneratedTableRegistryReproducibility({
    checkoutRepoPath,
    generatedAtUtc: options.generatedAtUtc,
    pathExists: options.pathExists,
    readDir: options.readDir,
    readFile: options.readFile,
    remoteBaseRef: options.remoteBaseRef,
    repoRoot: proofContext.invocationRepoPath,
    runGit: options.runGit,
  });
  const applicable = classifyGeneratedTableRegistryStaleDriftApplicable(
    reproducibilityProof.reproducibilityOutcome,
  );

  if (!applicable) {
    return {
      applicable: false,
      checkoutRepoPath,
      generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
      generatedArtifactPath: GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
      generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
      generationCommand: reproducibilityProof.generationCommand,
      loopedTransformersEntriesMatchDryRun:
        reproducibilityProof.loopedTransformersEntriesMatchDryRun,
      notApplicableReason: buildStaleDriftNotApplicableReason(
        reproducibilityProof.reproducibilityOutcome,
      ),
      operatorSafeActions: [],
      pageRefillHoldRule:
        GENERATED_TABLE_REGISTRY_STALE_DRIFT_PAGE_REFILL_HOLD_RULE,
      reproductionFailureEvidence: [],
      reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
      rootRepoPath: driftEvidence.rootRepoPath,
      unrelatedPathsNote:
        GENERATED_TABLE_REGISTRY_STALE_DRIFT_UNRELATED_PATHS_NOTE,
      validationCommand: reproducibilityProof.validationCommand,
    };
  }

  return {
    applicable: true,
    checkoutRepoPath,
    generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
    generatedArtifactPath: GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    generationCommand: reproducibilityProof.generationCommand,
    loopedTransformersEntriesMatchDryRun:
      reproducibilityProof.loopedTransformersEntriesMatchDryRun,
    operatorSafeActions: buildStaleDriftOperatorSafeActions({
      remoteBaseRef: reproducibilityProof.remoteBaseRef,
      reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
    }),
    pageRefillHoldRule:
      GENERATED_TABLE_REGISTRY_STALE_DRIFT_PAGE_REFILL_HOLD_RULE,
    reproductionFailureEvidence: buildStaleDriftReproductionFailureEvidence({
      generationCommand: reproducibilityProof.generationCommand,
      loopedTransformersEntriesMatchDryRun:
        reproducibilityProof.loopedTransformersEntriesMatchDryRun,
      reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
      validationCommand: reproducibilityProof.validationCommand,
      validationProblems: reproducibilityProof.validationProblems,
    }),
    reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
    rootRepoPath: driftEvidence.rootRepoPath,
    staleDriftRationale: buildStaleDriftRationale({
      generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
      loopedTransformersEntriesMatchDryRun:
        reproducibilityProof.loopedTransformersEntriesMatchDryRun,
      reproducibilityOutcome: reproducibilityProof.reproducibilityOutcome,
      validationProblems: reproducibilityProof.validationProblems,
    }),
    unrelatedPathsNote:
      GENERATED_TABLE_REGISTRY_STALE_DRIFT_UNRELATED_PATHS_NOTE,
    validationCommand: reproducibilityProof.validationCommand,
  };
}

export function formatGeneratedTableRegistryStaleDriftHandoff(
  handoff: GeneratedTableRegistryStaleDriftHandoff,
): string {
  const lines = [
    `${GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER} — Stale Drift Handoff`,
    `generated-at-utc=${handoff.generatedAtUtc}`,
    `checkout-repo-path=${handoff.checkoutRepoPath}`,
    `root-repo-path=${handoff.rootRepoPath}`,
    `generated-artifact-path=${handoff.generatedArtifactPath}`,
    `generated-artifact-cleanliness=${handoff.generatedArtifactCleanliness}`,
    `applicable=${handoff.applicable}`,
    `reproducibility-outcome=${handoff.reproducibilityOutcome}`,
    `generation-command=${handoff.generationCommand}`,
    `validation-command=${handoff.validationCommand}`,
    `looped-transformers-entries-match-dry-run=${handoff.loopedTransformersEntriesMatchDryRun}`,
    `page-refill-hold-rule=${handoff.pageRefillHoldRule}`,
    `unrelated-paths-note=${handoff.unrelatedPathsNote}`,
  ];

  if (handoff.notApplicableReason) {
    lines.push(`not-applicable-reason=${handoff.notApplicableReason}`);
  }

  if (handoff.staleDriftRationale) {
    lines.push(`stale-drift-rationale=${handoff.staleDriftRationale}`);
  }

  if (handoff.reproductionFailureEvidence.length > 0) {
    lines.push("", "reproduction-failure-evidence:");
    for (const evidence of handoff.reproductionFailureEvidence) {
      lines.push(`  - ${evidence}`);
    }
  }

  lines.push("", "operator-safe-actions:");
  if (handoff.operatorSafeActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of handoff.operatorSafeActions) {
      lines.push(
        `- kind=${action.kind}`,
        `  command=${action.command}`,
        `  description=${action.description}`,
      );
    }
  }

  return lines.join("\n");
}

export function serializeGeneratedTableRegistryStaleDriftHandoff(
  handoff: GeneratedTableRegistryStaleDriftHandoff,
): string {
  return JSON.stringify(handoff, null, 2);
}

export const GENERATED_TABLE_REGISTRY_ACTIVE_LANE_OWNERSHIP_PAGE_REFILL_HOLD_RULE =
  "Hold page refills until the owning active lane lands, refreshes, or releases src/lib/content/generated/table-registry.generated.ts.";

export const GENERATED_TABLE_REGISTRY_ACTIVE_LANE_OWNERSHIP_WATCHDOG_COMMAND =
  "bun run report:planner-worktree-drift-watchdog";

export const GENERATED_TABLE_REGISTRY_ACTIVE_LANE_OWNERSHIP_LINKAGE_COMMAND =
  "bun run report:queue-worktree-pr-linkage-ledger";

export type GeneratedTableRegistryActiveLaneOwnershipDiscoveryStatus =
  | "available"
  | "unavailable";

export interface GeneratedTableRegistryActiveLaneOwnershipHandoff {
  applicable: boolean;
  branchName?: string;
  checkoutRepoPath: string;
  discoveryStatus: GeneratedTableRegistryActiveLaneOwnershipDiscoveryStatus;
  discoveryUnavailableReason?: string;
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  generatedArtifactPath: string;
  generatedArtifactStatusLine: string | null;
  generatedAtUtc: string;
  laneName?: string;
  linkageStatus?: QueueWorktreePrLinkageLane["linkageStatus"];
  notApplicableReason?: string;
  ownership?: PlannerWorktreeDriftOwnership;
  ownershipEvidence: string[];
  ownershipRationale?: string;
  pageRefillHoldRule: string;
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  rootRepoPath: string;
  worktreePath?: string;
}

export interface BuildGeneratedTableRegistryActiveLaneOwnershipHandoffOptions {
  checkoutRepoPath?: string;
  driftEvidence?: GeneratedTableRegistryRootDriftEvidence;
  driftSnapshot?: PlannerWorktreeDriftSnapshot;
  generatedAtUtc?: string;
  linkageLedger?: QueueWorktreePrLinkageLedger;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  sessionListJsonText?: string;
  skipWorktreeDriftDiscovery?: boolean;
  workListJsonText?: string;
  worktreesDir?: string;
}

export function findGeneratedTableRegistryRootDirtyPath(
  driftSnapshot: PlannerWorktreeDriftSnapshot,
): PlannerWorktreeDirtyPath | undefined {
  return driftSnapshot.root.dirtyPaths.find(
    (dirtyPath) => dirtyPath.path === GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  );
}

export function classifyGeneratedTableRegistryActiveLaneOwnershipApplicable(input: {
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  ownership?: PlannerWorktreeDriftOwnership | null;
}): boolean {
  if (input.generatedArtifactCleanliness !== "dirty") {
    return false;
  }

  return (
    input.ownership?.kind === "worktree-owned" &&
    Boolean(input.ownership.laneName)
  );
}

function buildActiveLaneOwnershipNotApplicableReason(input: {
  discoveryStatus: GeneratedTableRegistryActiveLaneOwnershipDiscoveryStatus;
  discoveryUnavailableReason?: string;
  generatedArtifactCleanliness: GeneratedTableRegistryArtifactCleanliness;
  ownership?: PlannerWorktreeDriftOwnership;
}): string {
  if (input.generatedArtifactCleanliness !== "dirty") {
    return "Story 005 does not apply because the root generated table registry artifact is clean; no active-lane ownership attribution is required.";
  }

  if (input.discoveryStatus === "unavailable") {
    return `Story 005 cannot confirm active-lane ownership because worktree drift discovery is unavailable${input.discoveryUnavailableReason ? `: ${input.discoveryUnavailableReason}` : ""}.`;
  }

  if (!input.ownership) {
    return `Story 005 does not apply because ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH} is not present in the root dirty-path set reported by the worktree drift watchdog.`;
  }

  if (input.ownership.kind === "worktree-owned") {
    return "Story 005 does not apply because worktree-owned drift was expected but lane metadata was missing.";
  }

  if (input.ownership.reasonCode === "ambiguous-shared-surface") {
    return `Story 005 does not apply because ownership is ambiguous across active lanes on shared surface for ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}; operator investigation is required before attributing the generated artifact to one lane.`;
  }

  if (input.ownership.kind === "already-merged-owned") {
    return `Story 005 does not apply because root drift on ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH} is attributed to already-merged lane ${input.ownership.laneName ?? "unknown"} rather than an active in-flight lane.`;
  }

  return `Story 005 does not apply because ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH} is ownerless root drift (${input.ownership.kind}/${input.ownership.reasonCode}); use story 004 stale-drift handoff or operator investigation instead of active-lane ownership.`;
}

function buildActiveLaneOwnershipRationale(input: {
  branchName?: string;
  laneName: string;
  ownership: PlannerWorktreeDriftOwnership;
  pullRequestNumber?: number;
}): string {
  const prLabel =
    typeof input.pullRequestNumber === "number"
      ? `PR #${input.pullRequestNumber}`
      : "its open PR";
  return `Root dirty ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH} is intentionally held by active lane ${input.laneName}${input.branchName ? ` (${input.branchName})` : ""} via ${prLabel}; ${input.ownership.reason}`;
}

function buildActiveLaneOwnershipEvidence(input: {
  branchName?: string;
  discoveryStatus: GeneratedTableRegistryActiveLaneOwnershipDiscoveryStatus;
  generatedArtifactStatusLine: string | null;
  laneName?: string;
  linkageStatus?: QueueWorktreePrLinkageLane["linkageStatus"];
  ownership?: PlannerWorktreeDriftOwnership;
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  worktreePath?: string;
}): string[] {
  const evidence = [
    `watchdog-command=${GENERATED_TABLE_REGISTRY_ACTIVE_LANE_OWNERSHIP_WATCHDOG_COMMAND}`,
    `linkage-command=${GENERATED_TABLE_REGISTRY_ACTIVE_LANE_OWNERSHIP_LINKAGE_COMMAND}`,
    `discovery-status=${input.discoveryStatus}`,
    `generated-artifact-path=${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
    `generated-artifact-status-line=${input.generatedArtifactStatusLine ?? "none"}`,
  ];

  if (input.ownership) {
    evidence.push(
      `ownership-kind=${input.ownership.kind}`,
      `ownership-reason-code=${input.ownership.reasonCode}`,
      `ownership-reason=${input.ownership.reason}`,
    );
  }

  if (input.laneName) {
    evidence.push(`owning-lane=${input.laneName}`);
  }
  if (input.branchName) {
    evidence.push(`owning-branch=${input.branchName}`);
  }
  if (typeof input.pullRequestNumber === "number") {
    evidence.push(`owning-pr-number=${input.pullRequestNumber}`);
  }
  if (input.pullRequestUrl) {
    evidence.push(`owning-pr-url=${input.pullRequestUrl}`);
  }
  if (input.linkageStatus) {
    evidence.push(`linkage-status=${input.linkageStatus}`);
  }
  if (input.worktreePath) {
    evidence.push(`owning-worktree-path=${input.worktreePath}`);
  }

  return evidence;
}

function resolveLinkageLaneForOwnership(
  linkageLedger: QueueWorktreePrLinkageLedger | undefined,
  laneName: string | undefined,
): QueueWorktreePrLinkageLane | undefined {
  if (!linkageLedger || !laneName) {
    return undefined;
  }

  return linkageLedger.lanes.find((lane) => lane.laneName === laneName);
}

function resolveGeneratedTableRegistryDriftSnapshot(
  options: BuildGeneratedTableRegistryActiveLaneOwnershipHandoffOptions & {
    mainRepoRoot: string;
  },
): {
  discoveryStatus: GeneratedTableRegistryActiveLaneOwnershipDiscoveryStatus;
  discoveryUnavailableReason?: string;
  driftSnapshot?: PlannerWorktreeDriftSnapshot;
} {
  if (options.driftSnapshot) {
    return {
      discoveryStatus: "available",
      driftSnapshot: options.driftSnapshot,
    };
  }

  if (options.skipWorktreeDriftDiscovery) {
    return {
      discoveryStatus: "unavailable",
      discoveryUnavailableReason: "skipped-by-request",
    };
  }

  if (
    !options.workListJsonText ||
    !options.sessionListJsonText ||
    !options.worktreesDir
  ) {
    return {
      discoveryStatus: "unavailable",
      discoveryUnavailableReason: "missing queue/worktree discovery inputs",
    };
  }

  try {
    return {
      discoveryStatus: "available",
      driftSnapshot: discoverPlannerWorktreeDriftSnapshot({
        baseBranchName: options.remoteBaseRef,
        generatedAtUtc: options.generatedAtUtc,
        linkageLedger: options.linkageLedger,
        repoRoot: options.mainRepoRoot,
        sessionListJsonText: options.sessionListJsonText,
        workListJsonText: options.workListJsonText,
        worktreesDir: options.worktreesDir,
      }),
    };
  } catch (error) {
    return {
      discoveryStatus: "unavailable",
      discoveryUnavailableReason:
        error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildGeneratedTableRegistryActiveLaneOwnershipHandoff(
  options: BuildGeneratedTableRegistryActiveLaneOwnershipHandoffOptions = {},
): GeneratedTableRegistryActiveLaneOwnershipHandoff {
  const proofContext = resolveGeneratedTableRegistryProofContext({
    checkoutRepoPath: options.checkoutRepoPath,
    repoRoot: options.repoRoot,
    runGit: options.runGit,
  });
  const checkoutRepoPath = proofContext.checkoutRepoPath;
  const runGit = options.runGit ?? defaultRunGit;
  const driftEvidence =
    options.driftEvidence ??
    captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef: options.remoteBaseRef,
      repoRoot: proofContext.invocationRepoPath,
      runGit,
    });
  const mainRepoRoot = driftEvidence.rootRepoPath;
  const driftDiscovery = resolveGeneratedTableRegistryDriftSnapshot({
    ...options,
    mainRepoRoot,
  });
  const rootDirtyPath = driftDiscovery.driftSnapshot
    ? findGeneratedTableRegistryRootDirtyPath(driftDiscovery.driftSnapshot)
    : undefined;
  const ownership = rootDirtyPath?.ownership;
  const applicable =
    classifyGeneratedTableRegistryActiveLaneOwnershipApplicable({
      generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
      ownership,
    });
  const linkageLane = resolveLinkageLaneForOwnership(
    options.linkageLedger,
    ownership?.laneName,
  );
  const branchName = ownership?.branchName ?? linkageLane?.branchName;
  const pullRequestNumber = linkageLane?.pullRequest?.number;
  const pullRequestUrl = linkageLane?.pullRequest?.url;
  const worktreePath = ownership?.worktreePath ?? linkageLane?.worktreePath;
  const linkageStatus = ownership?.linkageStatus ?? linkageLane?.linkageStatus;
  const ownershipEvidence = buildActiveLaneOwnershipEvidence({
    branchName,
    discoveryStatus: driftDiscovery.discoveryStatus,
    generatedArtifactStatusLine: driftEvidence.generatedArtifactStatusLine,
    laneName: ownership?.laneName,
    linkageStatus,
    ownership,
    pullRequestNumber,
    pullRequestUrl,
    worktreePath,
  });

  if (!applicable) {
    return {
      applicable: false,
      checkoutRepoPath,
      discoveryStatus: driftDiscovery.discoveryStatus,
      discoveryUnavailableReason: driftDiscovery.discoveryUnavailableReason,
      generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
      generatedArtifactPath: GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
      generatedArtifactStatusLine: driftEvidence.generatedArtifactStatusLine,
      generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
      notApplicableReason: buildActiveLaneOwnershipNotApplicableReason({
        discoveryStatus: driftDiscovery.discoveryStatus,
        discoveryUnavailableReason: driftDiscovery.discoveryUnavailableReason,
        generatedArtifactCleanliness:
          driftEvidence.generatedArtifactCleanliness,
        ownership,
      }),
      ownership,
      ownershipEvidence,
      pageRefillHoldRule:
        GENERATED_TABLE_REGISTRY_ACTIVE_LANE_OWNERSHIP_PAGE_REFILL_HOLD_RULE,
      rootRepoPath: mainRepoRoot,
    };
  }

  const laneName = ownership?.laneName;
  if (!laneName || !ownership) {
    throw new Error(
      "Active lane ownership handoff classified as applicable without lane metadata.",
    );
  }

  return {
    applicable: true,
    branchName,
    checkoutRepoPath,
    discoveryStatus: driftDiscovery.discoveryStatus,
    generatedArtifactCleanliness: driftEvidence.generatedArtifactCleanliness,
    generatedArtifactPath: GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
    generatedArtifactStatusLine: driftEvidence.generatedArtifactStatusLine,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    laneName,
    linkageStatus,
    ownership,
    ownershipEvidence,
    ownershipRationale: buildActiveLaneOwnershipRationale({
      branchName,
      laneName,
      ownership,
      pullRequestNumber,
    }),
    pageRefillHoldRule: `Hold page refills until active lane ${laneName}${typeof pullRequestNumber === "number" ? ` (PR #${pullRequestNumber})` : ""} lands, refreshes, or releases ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}.`,
    pullRequestNumber,
    pullRequestUrl,
    rootRepoPath: mainRepoRoot,
    worktreePath,
  };
}

export function formatGeneratedTableRegistryActiveLaneOwnershipHandoff(
  handoff: GeneratedTableRegistryActiveLaneOwnershipHandoff,
): string {
  const lines = [
    `${GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER} — Active Lane Ownership`,
    `generated-at-utc=${handoff.generatedAtUtc}`,
    `checkout-repo-path=${handoff.checkoutRepoPath}`,
    `root-repo-path=${handoff.rootRepoPath}`,
    `generated-artifact-path=${handoff.generatedArtifactPath}`,
    `generated-artifact-cleanliness=${handoff.generatedArtifactCleanliness}`,
    `generated-artifact-status-line=${handoff.generatedArtifactStatusLine ?? "none"}`,
    `applicable=${handoff.applicable}`,
    `discovery-status=${handoff.discoveryStatus}`,
    `page-refill-hold-rule=${handoff.pageRefillHoldRule}`,
  ];

  if (handoff.discoveryUnavailableReason) {
    lines.push(
      `discovery-unavailable-reason=${handoff.discoveryUnavailableReason}`,
    );
  }

  if (handoff.notApplicableReason) {
    lines.push(`not-applicable-reason=${handoff.notApplicableReason}`);
  }

  if (handoff.laneName) {
    lines.push(`owning-lane=${handoff.laneName}`);
  }
  if (handoff.branchName) {
    lines.push(`owning-branch=${handoff.branchName}`);
  }
  if (typeof handoff.pullRequestNumber === "number") {
    lines.push(`owning-pr-number=${handoff.pullRequestNumber}`);
  }
  if (handoff.pullRequestUrl) {
    lines.push(`owning-pr-url=${handoff.pullRequestUrl}`);
  }
  if (handoff.worktreePath) {
    lines.push(`owning-worktree-path=${handoff.worktreePath}`);
  }
  if (handoff.linkageStatus) {
    lines.push(`linkage-status=${handoff.linkageStatus}`);
  }
  if (handoff.ownershipRationale) {
    lines.push(`ownership-rationale=${handoff.ownershipRationale}`);
  }

  lines.push("", "ownership-evidence:");
  if (handoff.ownershipEvidence.length === 0) {
    lines.push("- none");
  } else {
    for (const evidence of handoff.ownershipEvidence) {
      lines.push(`  - ${evidence}`);
    }
  }

  return lines.join("\n");
}

export function serializeGeneratedTableRegistryActiveLaneOwnershipHandoff(
  handoff: GeneratedTableRegistryActiveLaneOwnershipHandoff,
): string {
  return JSON.stringify(handoff, null, 2);
}
