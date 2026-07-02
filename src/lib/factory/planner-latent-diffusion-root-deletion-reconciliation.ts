import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseWorktreeListPorcelain } from "./conflict-hotspot-report";
import {
  detectDefaultRemoteBaseRef,
  pathExistsOnGitRef,
} from "./planner-root-checkout-reconciliation";
import {
  type PlannerWorktreeDriftChangeKind,
  parsePlannerRelevantDirtyPaths,
} from "./planner-worktree-drift-watchdog";
import { readWorktreeLaneMetadata } from "./worktree-lane-metadata";

export const LATENT_DIFFUSION_ROOT_DELETION_RECONCILIATION_HEADER =
  "Latent Diffusion Root Deletion Reconciliation";

export const LATENT_DIFFUSION_LANDING_PR_NUMBER = 264;

export const LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA =
  "3ea842f11a25b23d6a93b0fe703d2c18e46de855";

export const LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHORT =
  LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA.slice(0, 7);

export const LATENT_DIFFUSION_PAPER_PAGE_LANE_NAME =
  "latent-diffusion-paper-page";

export const LATENT_DIFFUSION_PAPER_ROUTE = "/docs/papers/latent-diffusion";

export const LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS = [
  "src/content/docs/papers/latent-diffusion/assets.json",
  "src/content/docs/papers/latent-diffusion/messages/en.json",
  "src/content/docs/papers/latent-diffusion/page.mdx",
  "src/content/registry/citations/latent-diffusion-models.json",
  "src/content/registry/graphs/latent-diffusion-contribution.json",
  "src/content/registry/papers/latent-diffusion.json",
  "src/lib/content/latent-diffusion-paper-page.test.ts",
  "src/lib/content/registry-runtime.test.ts",
  "src/lib/source.test.ts",
] as const;

export const LATENT_DIFFUSION_SHARED_MODIFIED_TEST_PATHS = [
  "src/lib/content/registry-runtime.test.ts",
  "src/lib/source.test.ts",
] as const;

export type LatentDiffusionRootPathClassification =
  | "stale-merge-checkouter-drift"
  | "operator-owned-work"
  | "intended-removal"
  | "blocked-unknown"
  | "cleared";

export type LatentDiffusionRootCheckoutStatus =
  | "clean"
  | "deleted"
  | "modified"
  | "added"
  | "renamed"
  | "copied"
  | "type-changed"
  | "untracked"
  | "unknown";

export type LatentDiffusionOriginMainSurfaceKind =
  | "page-bundle"
  | "registry-record"
  | "focused-test";

export interface LatentDiffusionOriginMainSurface {
  kind: LatentDiffusionOriginMainSurfaceKind;
  path: string;
  registryId?: string;
  route?: string;
}

export const LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES: LatentDiffusionOriginMainSurface[] =
  [
    {
      kind: "page-bundle",
      path: "src/content/docs/papers/latent-diffusion/page.mdx",
      registryId: "paper.latent-diffusion",
      route: LATENT_DIFFUSION_PAPER_ROUTE,
    },
    {
      kind: "page-bundle",
      path: "src/content/docs/papers/latent-diffusion/messages/en.json",
      registryId: "paper.latent-diffusion",
      route: LATENT_DIFFUSION_PAPER_ROUTE,
    },
    {
      kind: "page-bundle",
      path: "src/content/docs/papers/latent-diffusion/assets.json",
      registryId: "paper.latent-diffusion",
      route: LATENT_DIFFUSION_PAPER_ROUTE,
    },
    {
      kind: "registry-record",
      path: "src/content/registry/papers/latent-diffusion.json",
      registryId: "paper.latent-diffusion",
    },
    {
      kind: "registry-record",
      path: "src/content/registry/citations/latent-diffusion-models.json",
      registryId: "citation.latent-diffusion-models",
    },
    {
      kind: "registry-record",
      path: "src/content/registry/graphs/latent-diffusion-contribution.json",
      registryId: "graph.latent-diffusion-contribution",
    },
    {
      kind: "focused-test",
      path: "src/lib/content/latent-diffusion-paper-page.test.ts",
    },
  ];

export type LatentDiffusionOriginMainSurfaceStatus = "present" | "absent";

export interface LatentDiffusionOriginMainSurfaceEvidence {
  kind: LatentDiffusionOriginMainSurfaceKind;
  path: string;
  presentOnOriginMain: boolean;
  registryId?: string;
  route?: string;
  status: LatentDiffusionOriginMainSurfaceStatus;
}

export type LatentDiffusionMergeEvidenceStatus =
  | "present-in-lineage"
  | "absent-from-lineage"
  | "unavailable";

export interface LatentDiffusionMergeEvidence {
  mergeCommitSha: string;
  mergeCommitShort: string;
  presentInLineage: boolean;
  pullRequestNumber: number;
  status: LatentDiffusionMergeEvidenceStatus;
}

export interface LatentDiffusionRootDirtyPathEvidence {
  changeKind: PlannerWorktreeDriftChangeKind;
  path: string;
  statusCode: string;
}

export interface LatentDiffusionRootCheckoutEvidence {
  dirtyPathCount: number;
  isClean: boolean;
  latentDiffusionDirtyPaths: LatentDiffusionRootDirtyPathEvidence[];
}

export type LatentDiffusionLandedEvidenceVerificationStatus =
  | "verified"
  | "incomplete"
  | "merge-commit-missing";

export interface LatentDiffusionLandedEvidenceReport {
  generatedAtUtc: string;
  mergeEvidence: LatentDiffusionMergeEvidence;
  originMainSha: string;
  originMainSurfaces: LatentDiffusionOriginMainSurfaceEvidence[];
  remoteBaseRef: string;
  repoRoot: string;
  rootCheckoutEvidence: LatentDiffusionRootCheckoutEvidence;
  verificationStatus: LatentDiffusionLandedEvidenceVerificationStatus;
}

export interface VerifyLatentDiffusionLandedEvidenceOptions {
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

function resolveOriginMainSha(
  repoRoot: string,
  remoteBaseRef: string,
  runGit: RunGit,
): string {
  const result = runGit(repoRoot, ["rev-parse", remoteBaseRef]);
  if (result.status !== 0 || result.stdout.trim().length === 0) {
    throw new Error(`Unable to resolve ${remoteBaseRef} at ${repoRoot}`);
  }
  return result.stdout.trim();
}

export function isMergeCommitInLineage(
  repoRoot: string,
  mergeCommitSha: string,
  remoteBaseRef: string,
  runGit: RunGit = defaultRunGit,
): boolean {
  return (
    runGit(repoRoot, [
      "merge-base",
      "--is-ancestor",
      mergeCommitSha,
      remoteBaseRef,
    ]).status === 0
  );
}

export function buildLatentDiffusionMergeEvidence(options: {
  remoteBaseRef: string;
  repoRoot: string;
  runGit?: RunGit;
}): LatentDiffusionMergeEvidence {
  const runGit = options.runGit ?? defaultRunGit;
  const presentInLineage = isMergeCommitInLineage(
    options.repoRoot,
    LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA,
    options.remoteBaseRef,
    runGit,
  );

  return {
    mergeCommitSha: LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA,
    mergeCommitShort: LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHORT,
    presentInLineage,
    pullRequestNumber: LATENT_DIFFUSION_LANDING_PR_NUMBER,
    status: presentInLineage ? "present-in-lineage" : "absent-from-lineage",
  };
}

export function collectLatentDiffusionOriginMainSurfaceEvidence(options: {
  remoteBaseRef: string;
  repoRoot: string;
  runGit?: RunGit;
}): LatentDiffusionOriginMainSurfaceEvidence[] {
  const runGit = options.runGit ?? defaultRunGit;

  return LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES.map((surface) => {
    const presentOnOriginMain = pathExistsOnGitRef(
      options.repoRoot,
      options.remoteBaseRef,
      surface.path,
      runGit,
    );

    return {
      kind: surface.kind,
      path: surface.path,
      presentOnOriginMain,
      registryId: surface.registryId,
      route: surface.route,
      status: presentOnOriginMain ? "present" : "absent",
    };
  });
}

export function collectLatentDiffusionRootCheckoutEvidence(
  statusOutput: string,
): LatentDiffusionRootCheckoutEvidence {
  const dirtyPaths = parsePlannerRelevantDirtyPaths(statusOutput, "root");
  const reconciliationPathSet = new Set<string>(
    LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS,
  );
  const latentDiffusionDirtyPaths = dirtyPaths
    .filter((dirtyPath) => reconciliationPathSet.has(dirtyPath.path))
    .map((dirtyPath) => ({
      changeKind: dirtyPath.changeKind,
      path: dirtyPath.path,
      statusCode: dirtyPath.statusCode,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    dirtyPathCount: dirtyPaths.length,
    isClean: dirtyPaths.length === 0,
    latentDiffusionDirtyPaths,
  };
}

export function determineLatentDiffusionLandedEvidenceVerificationStatus(input: {
  mergeEvidence: LatentDiffusionMergeEvidence;
  originMainSurfaces: LatentDiffusionOriginMainSurfaceEvidence[];
}): LatentDiffusionLandedEvidenceVerificationStatus {
  if (!input.mergeEvidence.presentInLineage) {
    return "merge-commit-missing";
  }

  const allSurfacesPresent = input.originMainSurfaces.every(
    (surface) => surface.presentOnOriginMain,
  );

  return allSurfacesPresent ? "verified" : "incomplete";
}

export function verifyLatentDiffusionLandedEvidence(
  options: VerifyLatentDiffusionLandedEvidenceOptions = {},
): LatentDiffusionLandedEvidenceReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(repoRoot, runGit);
  const statusOutput = options.statusOutput ?? runGitStatus(repoRoot);
  const originMainSha = resolveOriginMainSha(repoRoot, remoteBaseRef, runGit);
  const mergeEvidence = buildLatentDiffusionMergeEvidence({
    remoteBaseRef,
    repoRoot,
    runGit,
  });
  const originMainSurfaces = collectLatentDiffusionOriginMainSurfaceEvidence({
    remoteBaseRef,
    repoRoot,
    runGit,
  });
  const rootCheckoutEvidence =
    collectLatentDiffusionRootCheckoutEvidence(statusOutput);

  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    mergeEvidence,
    originMainSha,
    originMainSurfaces,
    remoteBaseRef,
    repoRoot,
    rootCheckoutEvidence,
    verificationStatus:
      determineLatentDiffusionLandedEvidenceVerificationStatus({
        mergeEvidence,
        originMainSurfaces,
      }),
  };
}

function formatSurfaceEvidenceLine(
  surface: LatentDiffusionOriginMainSurfaceEvidence,
): string {
  const fields = [
    `path=${surface.path}`,
    `kind=${surface.kind}`,
    `status=${surface.status}`,
    `present-on-origin-main=${surface.presentOnOriginMain}`,
  ];

  if (surface.registryId) {
    fields.push(`registry-id=${surface.registryId}`);
  }

  if (surface.route) {
    fields.push(`route=${surface.route}`);
  }

  return `    - ${fields.join(" ")}`;
}

function formatDirtyPathEvidenceLine(
  dirtyPath: LatentDiffusionRootDirtyPathEvidence,
): string {
  return `    - path=${dirtyPath.path} status=${dirtyPath.statusCode} change=${dirtyPath.changeKind}`;
}

export function formatLatentDiffusionLandedEvidenceReport(
  report: LatentDiffusionLandedEvidenceReport,
): string {
  const lines = [
    LATENT_DIFFUSION_ROOT_DELETION_RECONCILIATION_HEADER,
    `verification-status=${report.verificationStatus} remote-base-ref=${report.remoteBaseRef} origin-main-sha=${report.originMainSha}`,
    `- merge-evidence pr=#${report.mergeEvidence.pullRequestNumber} merge=${report.mergeEvidence.mergeCommitShort} status=${report.mergeEvidence.status} present-in-lineage=${report.mergeEvidence.presentInLineage}`,
    `- origin-main-surfaces count=${report.originMainSurfaces.length} all-present=${report.originMainSurfaces.every((surface) => surface.presentOnOriginMain)}`,
  ];

  for (const surface of report.originMainSurfaces) {
    lines.push(formatSurfaceEvidenceLine(surface));
  }

  lines.push(
    `- root-checkout-evidence clean=${report.rootCheckoutEvidence.isClean} total-dirty-paths=${report.rootCheckoutEvidence.dirtyPathCount} latent-diffusion-dirty-paths=${report.rootCheckoutEvidence.latentDiffusionDirtyPaths.length}`,
  );

  if (report.rootCheckoutEvidence.latentDiffusionDirtyPaths.length === 0) {
    lines.push("    - none");
  } else {
    for (const dirtyPath of report.rootCheckoutEvidence
      .latentDiffusionDirtyPaths) {
      lines.push(formatDirtyPathEvidenceLine(dirtyPath));
    }
  }

  lines.push(
    "- shipped-vs-dirty: origin/main surfaces above are canonical shipped evidence; root-checkout-evidence is separate planner-root drift and must not be treated as missing main content.",
  );

  return lines.join("\n");
}

export function serializeLatentDiffusionLandedEvidenceReport(
  report: LatentDiffusionLandedEvidenceReport,
): string {
  return JSON.stringify(report, null, 2);
}

export type LatentDiffusionCompletedWorktreePathDisposition =
  | "existed-unchanged"
  | "existed-modified"
  | "removed-on-branch"
  | "added-on-branch"
  | "absent-on-both"
  | "unavailable";

export type LatentDiffusionCompletedWorktreeInspectionStatus =
  | "inspected"
  | "worktree-unavailable"
  | "branch-unavailable";

export interface LatentDiffusionCompletedWorktreeIdentityEvidence {
  branchName: string;
  branchTipSha: string;
  branchTipShort: string;
  laneName: string;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  worktreePath: string | null;
  worktreePresent: boolean;
}

export interface LatentDiffusionCompletedWorktreePathEvidence {
  changedInCompletedBranchDiff: boolean;
  contentMatchesOriginMain: boolean | null;
  disposition: LatentDiffusionCompletedWorktreePathDisposition;
  mismatchWithOriginMain: boolean;
  path: string;
  presentOnCompletedBranch: boolean;
  presentOnOriginMain: boolean;
}

export interface LatentDiffusionCompletedWorktreeEvidenceReport {
  branchDiffUnavailableReason?: string;
  generatedAtUtc: string;
  identity: LatentDiffusionCompletedWorktreeIdentityEvidence;
  inspectionStatus: LatentDiffusionCompletedWorktreeInspectionStatus;
  mismatchesWithOriginMain: string[];
  pathEvidence: LatentDiffusionCompletedWorktreePathEvidence[];
  remoteBaseRef: string;
  repoRoot: string;
}

export interface InspectLatentDiffusionCompletedWorktreeEvidenceOptions {
  branchName?: string;
  generatedAtUtc?: string;
  laneName?: string;
  remoteBaseRef?: string;
  repoRoot?: string;
  runGit?: RunGit;
  worktreePath?: string;
}

function gitRefExists(repoRoot: string, ref: string, runGit: RunGit): boolean {
  return runGit(repoRoot, ["rev-parse", "--verify", ref]).status === 0;
}

function resolveGitRefSha(
  repoRoot: string,
  ref: string,
  runGit: RunGit,
): string | null {
  const result = runGit(repoRoot, ["rev-parse", ref]);
  if (result.status !== 0 || result.stdout.trim().length === 0) {
    return null;
  }
  return result.stdout.trim();
}

function normalizeBranchLabel(branch: string | null): string | null {
  if (!branch) {
    return null;
  }
  return branch.replace(/^refs\/heads\//, "").trim() || null;
}

export function resolveCompletedWorktreePathForLane(
  repoRoot: string,
  laneName: string,
  runGit: RunGit = defaultRunGit,
): string | null {
  const worktreeListResult = runGit(repoRoot, [
    "worktree",
    "list",
    "--porcelain",
  ]);
  if (worktreeListResult.status === 0) {
    for (const worktree of parseWorktreeListPorcelain(
      worktreeListResult.stdout,
    )) {
      const branchName = normalizeBranchLabel(worktree.branch);
      if (branchName === laneName) {
        return worktree.path;
      }
    }
  }

  const metadata = readWorktreeLaneMetadata(
    resolve(repoRoot, ".claude", "worktrees", laneName),
  );
  if (metadata?.worktreePath) {
    return metadata.worktreePath;
  }

  return null;
}

function pathsMatchAcrossRefs(
  repoRoot: string,
  leftRef: string,
  rightRef: string,
  path: string,
  runGit: RunGit,
): boolean | null {
  const result = runGit(repoRoot, [
    "diff",
    "--quiet",
    leftRef,
    rightRef,
    "--",
    path,
  ]);
  if (result.status === 0) {
    return true;
  }
  if (result.status === 1) {
    return false;
  }
  return null;
}

function collectBranchChangedPathSet(input: {
  branchName: string;
  mainRef: string;
  repoRoot: string;
  runGit: RunGit;
}): { changedPaths: Set<string>; unavailableReason?: string } {
  if (!gitRefExists(input.repoRoot, input.branchName, input.runGit)) {
    return {
      changedPaths: new Set(),
      unavailableReason: `branch ref "${input.branchName}" is not available`,
    };
  }

  const mergeBaseResult = input.runGit(input.repoRoot, [
    "merge-base",
    input.mainRef,
    input.branchName,
  ]);
  const mergeBase = mergeBaseResult.stdout.trim();
  if (mergeBaseResult.status !== 0 || !mergeBase) {
    return {
      changedPaths: new Set(),
      unavailableReason: `unable to resolve merge-base between ${input.mainRef} and ${input.branchName}`,
    };
  }

  const diffResult = input.runGit(input.repoRoot, [
    "diff",
    "--name-only",
    `${mergeBase}..${input.branchName}`,
  ]);
  if (diffResult.status !== 0) {
    return {
      changedPaths: new Set(),
      unavailableReason: `unable to diff ${input.branchName} against merge-base ${mergeBase}`,
    };
  }

  return {
    changedPaths: new Set(
      diffResult.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    ),
  };
}

export function determineLatentDiffusionCompletedWorktreePathDisposition(input: {
  contentMatchesOriginMain: boolean | null;
  presentOnCompletedBranch: boolean;
  presentOnOriginMain: boolean;
}): LatentDiffusionCompletedWorktreePathDisposition {
  if (
    input.presentOnCompletedBranch === false &&
    input.presentOnOriginMain === false
  ) {
    return "absent-on-both";
  }

  if (input.presentOnCompletedBranch && !input.presentOnOriginMain) {
    return "added-on-branch";
  }

  if (!input.presentOnCompletedBranch && input.presentOnOriginMain) {
    return "removed-on-branch";
  }

  if (input.contentMatchesOriginMain === false) {
    return "existed-modified";
  }

  if (input.contentMatchesOriginMain === true) {
    return "existed-unchanged";
  }

  return "unavailable";
}

export function collectLatentDiffusionCompletedWorktreePathEvidence(input: {
  branchName: string;
  branchChangedPaths: Set<string>;
  paths: readonly string[];
  remoteBaseRef: string;
  repoRoot: string;
  runGit: RunGit;
}): LatentDiffusionCompletedWorktreePathEvidence[] {
  return input.paths.map((path) => {
    const presentOnCompletedBranch = pathExistsOnGitRef(
      input.repoRoot,
      input.branchName,
      path,
      input.runGit,
    );
    const presentOnOriginMain = pathExistsOnGitRef(
      input.repoRoot,
      input.remoteBaseRef,
      path,
      input.runGit,
    );
    const contentMatchesOriginMain =
      presentOnCompletedBranch && presentOnOriginMain
        ? pathsMatchAcrossRefs(
            input.repoRoot,
            input.remoteBaseRef,
            input.branchName,
            path,
            input.runGit,
          )
        : null;
    const disposition =
      determineLatentDiffusionCompletedWorktreePathDisposition({
        contentMatchesOriginMain,
        presentOnCompletedBranch,
        presentOnOriginMain,
      });

    return {
      changedInCompletedBranchDiff: input.branchChangedPaths.has(path),
      contentMatchesOriginMain,
      disposition,
      mismatchWithOriginMain: contentMatchesOriginMain === false,
      path,
      presentOnCompletedBranch,
      presentOnOriginMain,
    };
  });
}

export function buildLatentDiffusionCompletedWorktreeIdentityEvidence(input: {
  branchName: string;
  branchTipSha: string | null;
  laneName: string;
  repoRoot: string;
  runGit: RunGit;
  worktreePath: string | null;
}): LatentDiffusionCompletedWorktreeIdentityEvidence {
  const metadata = input.worktreePath
    ? readWorktreeLaneMetadata(input.worktreePath)
    : null;

  return {
    branchName: input.branchName,
    branchTipSha: input.branchTipSha ?? "",
    branchTipShort: input.branchTipSha ? input.branchTipSha.slice(0, 7) : "",
    laneName: input.laneName,
    pullRequestNumber: metadata?.pullRequest?.number ?? null,
    pullRequestUrl: metadata?.pullRequest?.url ?? null,
    worktreePath: input.worktreePath,
    worktreePresent: input.worktreePath !== null,
  };
}

export function inspectLatentDiffusionCompletedWorktreeEvidence(
  options: InspectLatentDiffusionCompletedWorktreeEvidenceOptions = {},
): LatentDiffusionCompletedWorktreeEvidenceReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const laneName = options.laneName ?? LATENT_DIFFUSION_PAPER_PAGE_LANE_NAME;
  const branchName = options.branchName ?? laneName;
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(repoRoot, runGit);
  const worktreePath =
    options.worktreePath ??
    resolveCompletedWorktreePathForLane(repoRoot, laneName, runGit);
  const branchTipSha = resolveGitRefSha(repoRoot, branchName, runGit);

  if (!branchTipSha) {
    return {
      branchDiffUnavailableReason: `branch ref "${branchName}" is not available`,
      generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
      identity: buildLatentDiffusionCompletedWorktreeIdentityEvidence({
        branchName,
        branchTipSha: null,
        laneName,
        repoRoot,
        runGit,
        worktreePath,
      }),
      inspectionStatus: "branch-unavailable",
      mismatchesWithOriginMain: [],
      pathEvidence: [],
      remoteBaseRef,
      repoRoot,
    };
  }

  if (!worktreePath) {
    return {
      generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
      identity: buildLatentDiffusionCompletedWorktreeIdentityEvidence({
        branchName,
        branchTipSha,
        laneName,
        repoRoot,
        runGit,
        worktreePath: null,
      }),
      inspectionStatus: "worktree-unavailable",
      mismatchesWithOriginMain: [],
      pathEvidence: [],
      remoteBaseRef,
      repoRoot,
    };
  }

  const branchDiff = collectBranchChangedPathSet({
    branchName,
    mainRef: remoteBaseRef,
    repoRoot,
    runGit,
  });
  const pathEvidence = collectLatentDiffusionCompletedWorktreePathEvidence({
    branchChangedPaths: branchDiff.changedPaths,
    branchName,
    paths: LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS,
    remoteBaseRef,
    repoRoot,
    runGit,
  });

  return {
    branchDiffUnavailableReason: branchDiff.unavailableReason,
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    identity: buildLatentDiffusionCompletedWorktreeIdentityEvidence({
      branchName,
      branchTipSha,
      laneName,
      repoRoot,
      runGit,
      worktreePath,
    }),
    inspectionStatus: "inspected",
    mismatchesWithOriginMain: pathEvidence
      .filter((entry) => entry.mismatchWithOriginMain)
      .map((entry) => entry.path)
      .sort(),
    pathEvidence,
    remoteBaseRef,
    repoRoot,
  };
}

function formatCompletedWorktreePathEvidenceLine(
  entry: LatentDiffusionCompletedWorktreePathEvidence,
): string {
  return [
    `    - path=${entry.path}`,
    `disposition=${entry.disposition}`,
    `present-on-completed-branch=${entry.presentOnCompletedBranch}`,
    `present-on-origin-main=${entry.presentOnOriginMain}`,
    `content-matches-origin-main=${entry.contentMatchesOriginMain}`,
    `changed-in-completed-branch-diff=${entry.changedInCompletedBranchDiff}`,
    `mismatch-with-origin-main=${entry.mismatchWithOriginMain}`,
  ].join(" ");
}

export function formatLatentDiffusionCompletedWorktreeEvidenceReport(
  report: LatentDiffusionCompletedWorktreeEvidenceReport,
): string {
  const lines = [
    `${LATENT_DIFFUSION_ROOT_DELETION_RECONCILIATION_HEADER} — Completed Worktree Evidence`,
    `inspection-status=${report.inspectionStatus} remote-base-ref=${report.remoteBaseRef}`,
    `- completed-lane lane=${report.identity.laneName} branch=${report.identity.branchName} tip=${report.identity.branchTipShort || "unavailable"} worktree=${report.identity.worktreePath ?? "unavailable"} worktree-present=${report.identity.worktreePresent}`,
    `- pull-request number=${report.identity.pullRequestNumber ?? "none"} url=${report.identity.pullRequestUrl ?? "none"}`,
    `- path-evidence count=${report.pathEvidence.length} mismatches-with-origin-main=${report.mismatchesWithOriginMain.length}`,
  ];

  if (report.branchDiffUnavailableReason) {
    lines.push(
      `- branch-diff-warning reason=${report.branchDiffUnavailableReason}`,
    );
  }

  for (const entry of report.pathEvidence) {
    lines.push(formatCompletedWorktreePathEvidenceLine(entry));
  }

  if (report.mismatchesWithOriginMain.length === 0) {
    lines.push("    - mismatches-with-origin-main: none");
  } else {
    for (const path of report.mismatchesWithOriginMain) {
      lines.push(`    - mismatch path=${path}`);
    }
  }

  lines.push(
    "- completed-vs-main: path evidence above compares the completed lane branch against origin/main; mismatches are recorded separately from planner-root dirty checkout state.",
  );

  return lines.join("\n");
}

export function serializeLatentDiffusionCompletedWorktreeEvidenceReport(
  report: LatentDiffusionCompletedWorktreeEvidenceReport,
): string {
  return JSON.stringify(report, null, 2);
}

export interface LatentDiffusionRootDirtyPathClassificationEvidence {
  changedInCompletedBranchDiff: boolean | null;
  classification: LatentDiffusionRootPathClassification;
  completedWorktreeDisposition: LatentDiffusionCompletedWorktreePathDisposition | null;
  evidence: string[];
  headPresent: boolean | null;
  isSharedModifiedTestPath: boolean;
  path: string;
  presentOnOriginMain: boolean;
  rootCheckoutStatus: LatentDiffusionRootCheckoutStatus;
  statusCode: string | null;
}

export interface LatentDiffusionRootDirtyPathClassificationReport {
  blockedUnknownCount: number;
  clearedCount: number;
  generatedAtUtc: string;
  intendedRemovalCount: number;
  operatorOwnedCount: number;
  pathClassifications: LatentDiffusionRootDirtyPathClassificationEvidence[];
  remoteBaseRef: string;
  repoRoot: string;
  staleDriftCount: number;
}

export interface ClassifyLatentDiffusionRootDirtyPathsOptions {
  completedWorktreeReport: LatentDiffusionCompletedWorktreeEvidenceReport;
  landedEvidenceReport: LatentDiffusionLandedEvidenceReport;
  remoteBaseRef: string;
  repoRoot: string;
  runGit?: RunGit;
}

export function isLatentDiffusionSharedModifiedTestPath(path: string): boolean {
  return (
    LATENT_DIFFUSION_SHARED_MODIFIED_TEST_PATHS as readonly string[]
  ).includes(path);
}

export function mapChangeKindToRootCheckoutStatus(
  changeKind: PlannerWorktreeDriftChangeKind | null,
): LatentDiffusionRootCheckoutStatus {
  if (changeKind === null) {
    return "clean";
  }

  switch (changeKind) {
    case "deleted":
      return "deleted";
    case "modified":
      return "modified";
    case "added":
      return "added";
    case "renamed":
      return "renamed";
    case "copied":
      return "copied";
    case "type-changed":
      return "type-changed";
    case "untracked":
      return "untracked";
    default:
      return "unknown";
  }
}

export function determineLatentDiffusionRootPathClassification(input: {
  changeKind: PlannerWorktreeDriftChangeKind | null;
  changedInCompletedBranchDiff: boolean | null;
  completedWorktreeDisposition: LatentDiffusionCompletedWorktreePathDisposition | null;
  isSharedModifiedTestPath: boolean;
  presentOnOriginMain: boolean;
}): LatentDiffusionRootPathClassification {
  if (input.changeKind === null) {
    return "cleared";
  }

  if (input.changeKind === "deleted") {
    if (
      input.presentOnOriginMain &&
      input.completedWorktreeDisposition !== "removed-on-branch"
    ) {
      return "stale-merge-checkouter-drift";
    }

    if (
      !input.presentOnOriginMain &&
      input.completedWorktreeDisposition === "removed-on-branch"
    ) {
      return "intended-removal";
    }

    return "blocked-unknown";
  }

  if (input.isSharedModifiedTestPath) {
    return "blocked-unknown";
  }

  if (
    input.completedWorktreeDisposition === "existed-modified" &&
    input.changedInCompletedBranchDiff === true
  ) {
    return "operator-owned-work";
  }

  return "blocked-unknown";
}

function buildLatentDiffusionRootPathClassificationEvidence(input: {
  changeKind: PlannerWorktreeDriftChangeKind | null;
  changedInCompletedBranchDiff: boolean | null;
  completedWorktreeDisposition: LatentDiffusionCompletedWorktreePathDisposition | null;
  headPresent: boolean | null;
  isSharedModifiedTestPath: boolean;
  path: string;
  presentOnOriginMain: boolean;
  remoteBaseRef: string;
  statusCode: string | null;
}): LatentDiffusionRootDirtyPathClassificationEvidence {
  const rootCheckoutStatus = mapChangeKindToRootCheckoutStatus(input.changeKind);
  const classification = determineLatentDiffusionRootPathClassification({
    changeKind: input.changeKind,
    changedInCompletedBranchDiff: input.changedInCompletedBranchDiff,
    completedWorktreeDisposition: input.completedWorktreeDisposition,
    isSharedModifiedTestPath: input.isSharedModifiedTestPath,
    presentOnOriginMain: input.presentOnOriginMain,
  });

  const evidence: string[] = [
    `root-checkout-status=${rootCheckoutStatus}`,
    input.statusCode
      ? `root-status-code=${input.statusCode.trim()}`
      : "root-status-code=clean",
    `present-on-origin-main=${input.presentOnOriginMain}`,
    `completed-worktree-disposition=${input.completedWorktreeDisposition ?? "unavailable"}`,
  ];

  if (input.isSharedModifiedTestPath) {
    evidence.push("shared-modified-test-path=true");
  }

  if (input.headPresent !== null) {
    evidence.push(`head-present=${input.headPresent}`);
  }

  if (input.changedInCompletedBranchDiff !== null) {
    evidence.push(
      `changed-in-completed-branch-diff=${input.changedInCompletedBranchDiff}`,
    );
  }

  if (classification === "stale-merge-checkouter-drift") {
    evidence.push(
      `present-on-${input.remoteBaseRef}=true with root deletion and no completed-branch removal signal`,
    );
  }

  return {
    changedInCompletedBranchDiff: input.changedInCompletedBranchDiff,
    classification,
    completedWorktreeDisposition: input.completedWorktreeDisposition,
    evidence,
    headPresent: input.headPresent,
    isSharedModifiedTestPath: input.isSharedModifiedTestPath,
    path: input.path,
    presentOnOriginMain: input.presentOnOriginMain,
    rootCheckoutStatus,
    statusCode: input.statusCode,
  };
}

export function classifyLatentDiffusionRootDirtyPaths(
  options: ClassifyLatentDiffusionRootDirtyPathsOptions,
): LatentDiffusionRootDirtyPathClassificationEvidence[] {
  const runGit = options.runGit ?? defaultRunGit;
  const dirtyPathByPath = new Map(
    options.landedEvidenceReport.rootCheckoutEvidence.latentDiffusionDirtyPaths.map(
      (entry) => [entry.path, entry],
    ),
  );
  const completedPathByPath = new Map(
    options.completedWorktreeReport.pathEvidence.map((entry) => [
      entry.path,
      entry,
    ]),
  );
  const originMainPresenceByPath = new Map(
    options.landedEvidenceReport.originMainSurfaces.map((surface) => [
      surface.path,
      surface.presentOnOriginMain,
    ]),
  );

  return LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS.map((path) => {
    const dirtyPath = dirtyPathByPath.get(path);
    const completedPath = completedPathByPath.get(path);
    const presentOnOriginMain =
      originMainPresenceByPath.get(path) ??
      completedPath?.presentOnOriginMain ??
      pathExistsOnGitRef(
        options.repoRoot,
        options.remoteBaseRef,
        path,
        runGit,
      );
    const changeKind = dirtyPath?.changeKind ?? null;
    const headPresent =
      changeKind === "deleted"
        ? pathExistsOnGitRef(options.repoRoot, "HEAD", path, runGit)
        : null;

    return buildLatentDiffusionRootPathClassificationEvidence({
      changeKind,
      changedInCompletedBranchDiff:
        completedPath?.changedInCompletedBranchDiff ?? null,
      completedWorktreeDisposition: completedPath?.disposition ?? null,
      headPresent,
      isSharedModifiedTestPath: isLatentDiffusionSharedModifiedTestPath(path),
      path,
      presentOnOriginMain,
      remoteBaseRef: options.remoteBaseRef,
      statusCode: dirtyPath?.statusCode ?? null,
    });
  });
}

export function buildLatentDiffusionRootDirtyPathClassificationReport(
  options: {
    completedWorktreeReport?: LatentDiffusionCompletedWorktreeEvidenceReport;
    generatedAtUtc?: string;
    landedEvidenceReport?: LatentDiffusionLandedEvidenceReport;
    remoteBaseRef?: string;
    repoRoot?: string;
    runGit?: RunGit;
    runGitStatus?: RunGitStatus;
    statusOutput?: string;
  } = {},
): LatentDiffusionRootDirtyPathClassificationReport {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const runGit = options.runGit ?? defaultRunGit;
  const runGitStatus = options.runGitStatus ?? defaultRunGitStatus;
  const remoteBaseRef =
    options.remoteBaseRef ?? detectDefaultRemoteBaseRef(repoRoot, runGit);
  const landedEvidenceReport =
    options.landedEvidenceReport ??
    verifyLatentDiffusionLandedEvidence({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef,
      repoRoot,
      runGit,
      runGitStatus,
      statusOutput: options.statusOutput,
    });
  const completedWorktreeReport =
    options.completedWorktreeReport ??
    inspectLatentDiffusionCompletedWorktreeEvidence({
      generatedAtUtc: options.generatedAtUtc,
      remoteBaseRef,
      repoRoot,
      runGit,
    });
  const pathClassifications = classifyLatentDiffusionRootDirtyPaths({
    completedWorktreeReport,
    landedEvidenceReport,
    remoteBaseRef,
    repoRoot,
    runGit,
  });

  const countByClassification = (
    classification: LatentDiffusionRootPathClassification,
  ): number =>
    pathClassifications.filter(
      (entry) => entry.classification === classification,
    ).length;

  return {
    blockedUnknownCount: countByClassification("blocked-unknown"),
    clearedCount: countByClassification("cleared"),
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    intendedRemovalCount: countByClassification("intended-removal"),
    operatorOwnedCount: countByClassification("operator-owned-work"),
    pathClassifications,
    remoteBaseRef,
    repoRoot,
    staleDriftCount: countByClassification("stale-merge-checkouter-drift"),
  };
}

function formatRootDirtyPathClassificationLine(
  entry: LatentDiffusionRootDirtyPathClassificationEvidence,
): string {
  return [
    `    - path=${entry.path}`,
    `classification=${entry.classification}`,
    `root-checkout-status=${entry.rootCheckoutStatus}`,
    entry.statusCode
      ? `status-code=${entry.statusCode.trim()}`
      : "status-code=clean",
    `present-on-origin-main=${entry.presentOnOriginMain}`,
    `completed-worktree-disposition=${entry.completedWorktreeDisposition ?? "unavailable"}`,
    entry.isSharedModifiedTestPath
      ? "shared-modified-test-path=true"
      : "shared-modified-test-path=false",
    `evidence=${entry.evidence.join("; ")}`,
  ].join(" ");
}

export function formatLatentDiffusionRootDirtyPathClassificationReport(
  report: LatentDiffusionRootDirtyPathClassificationReport,
): string {
  const lines = [
    `${LATENT_DIFFUSION_ROOT_DELETION_RECONCILIATION_HEADER} — Root Dirty Path Classification`,
    `remote-base-ref=${report.remoteBaseRef} path-count=${report.pathClassifications.length} cleared=${report.clearedCount} stale-drift=${report.staleDriftCount} operator-owned=${report.operatorOwnedCount} intended-removal=${report.intendedRemovalCount} blocked-unknown=${report.blockedUnknownCount}`,
  ];

  for (const entry of report.pathClassifications) {
    lines.push(formatRootDirtyPathClassificationLine(entry));
  }

  lines.push(
    "- classification-note: cleared paths have no root dirty status; stale-merge-checkouter-drift requires present-on-origin-main deletion without completed-branch removal; shared modified tests require explicit ownership when dirty.",
  );

  return lines.join("\n");
}

export function serializeLatentDiffusionRootDirtyPathClassificationReport(
  report: LatentDiffusionRootDirtyPathClassificationReport,
): string {
  return JSON.stringify(report, null, 2);
}
