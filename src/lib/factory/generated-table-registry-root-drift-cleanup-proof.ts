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
  const checkoutRepoPath = resolve(
    options.checkoutRepoPath ?? options.repoRoot ?? process.cwd(),
  );
  const runGit = options.runGit ?? defaultRunGit;
  const readDir = options.readDir ?? defaultReadDir;
  const readFile = options.readFile ?? defaultReadFile;
  const pathExists = options.pathExists ?? fileExistsAtPath;
  const mainRepoRoot = resolveMainRepoRoot(
    checkoutRepoPath,
    (_binary, args, cwd) => {
      const result = runGit(cwd ?? checkoutRepoPath, args);
      return {
        ok: result.status === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.status,
      };
    },
  );
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
    `checkout-repo-path=${report.checkoutRepoPath}`,
    `root-repo-path=${report.rootRepoPath}`,
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
  const checkoutRepoPath = resolve(
    options.checkoutRepoPath ?? options.repoRoot ?? process.cwd(),
  );
  const driftEvidence =
    options.driftEvidence ??
    captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef: options.remoteBaseRef,
      repoRoot: checkoutRepoPath,
      runGit: options.runGit,
    });
  const reproducibilityProof = proveGeneratedTableRegistryReproducibility({
    checkoutRepoPath,
    generatedAtUtc: options.generatedAtUtc,
    pathExists: options.pathExists,
    readDir: options.readDir,
    readFile: options.readFile,
    remoteBaseRef: options.remoteBaseRef,
    repoRoot: checkoutRepoPath,
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
