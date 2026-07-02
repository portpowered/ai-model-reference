import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  detectDefaultRemoteBaseRef,
  pathExistsOnGitRef,
} from "./planner-root-checkout-reconciliation";
import {
  parsePlannerRelevantDirtyPaths,
  type PlannerWorktreeDriftChangeKind,
} from "./planner-worktree-drift-watchdog";

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

export function buildLatentDiffusionMergeEvidence(
  options: {
    remoteBaseRef: string;
    repoRoot: string;
    runGit?: RunGit;
  },
): LatentDiffusionMergeEvidence {
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

export function collectLatentDiffusionOriginMainSurfaceEvidence(
  options: {
    remoteBaseRef: string;
    repoRoot: string;
    runGit?: RunGit;
  },
): LatentDiffusionOriginMainSurfaceEvidence[] {
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
    verificationStatus: determineLatentDiffusionLandedEvidenceVerificationStatus({
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
    for (const dirtyPath of report.rootCheckoutEvidence.latentDiffusionDirtyPaths) {
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
