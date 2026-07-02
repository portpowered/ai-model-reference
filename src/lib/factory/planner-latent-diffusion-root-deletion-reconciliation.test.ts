import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectLatentDiffusionCompletedWorktreePathEvidence,
  collectLatentDiffusionOriginMainSurfaceEvidence,
  collectLatentDiffusionRootCheckoutEvidence,
  determineLatentDiffusionCompletedWorktreePathDisposition,
  determineLatentDiffusionLandedEvidenceVerificationStatus,
  formatLatentDiffusionCompletedWorktreeEvidenceReport,
  formatLatentDiffusionLandedEvidenceReport,
  inspectLatentDiffusionCompletedWorktreeEvidence,
  isMergeCommitInLineage,
  LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA,
  LATENT_DIFFUSION_LANDING_PR_NUMBER,
  LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES,
  LATENT_DIFFUSION_PAPER_PAGE_LANE_NAME,
  LATENT_DIFFUSION_PAPER_ROUTE,
  LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS,
  LATENT_DIFFUSION_ROOT_DELETION_RECONCILIATION_HEADER,
  verifyLatentDiffusionLandedEvidence,
} from "@/lib/factory/planner-latent-diffusion-root-deletion-reconciliation";

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
}

function createFixtureRepo(): {
  cleanup: () => void;
  mainRef: string;
  mergeCommitSha: string;
  repoRoot: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "latent-diffusion-reconciliation-"));
  const repoRoot = join(dir, "repo");
  mkdirSync(repoRoot, { recursive: true });

  runGit(repoRoot, ["init", "-b", "main"]);
  runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
  runGit(repoRoot, ["config", "user.name", "Planner Tests"]);

  for (const surface of LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES) {
    const filePath = join(repoRoot, surface.path);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, "{}\n");
  }

  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "initial"]);
  const initialSha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).stdout.trim();

  runGit(repoRoot, [
    "commit",
    "--allow-empty",
    "-m",
    "latent-diffusion landing",
  ]);
  const mergeCommitSha = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).stdout.trim();

  runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", mergeCommitSha]);
  runGit(repoRoot, ["update-ref", "refs/heads/main", initialSha]);

  return {
    cleanup: () => rmSync(dir, { force: true, recursive: true }),
    mainRef: "origin/main",
    mergeCommitSha,
    repoRoot,
  };
}

describe("planner-latent-diffusion-root-deletion-reconciliation", () => {
  test("lists every PRD reconciliation dirty path", () => {
    expect(LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS).toEqual([
      "src/content/docs/papers/latent-diffusion/assets.json",
      "src/content/docs/papers/latent-diffusion/messages/en.json",
      "src/content/docs/papers/latent-diffusion/page.mdx",
      "src/content/registry/citations/latent-diffusion-models.json",
      "src/content/registry/graphs/latent-diffusion-contribution.json",
      "src/content/registry/papers/latent-diffusion.json",
      "src/lib/content/latent-diffusion-paper-page.test.ts",
      "src/lib/content/registry-runtime.test.ts",
      "src/lib/source.test.ts",
    ]);
  });

  test("origin-main surfaces include route, registry ids, and focused discovery proof", () => {
    const registryIds = LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES.flatMap(
      (surface) => (surface.registryId ? [surface.registryId] : []),
    );
    const routes = LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES.flatMap((surface) =>
      surface.route ? [surface.route] : [],
    );
    const focusedTests = LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES.filter(
      (surface) => surface.kind === "focused-test",
    );

    expect(registryIds).toEqual(
      expect.arrayContaining([
        "paper.latent-diffusion",
        "citation.latent-diffusion-models",
        "graph.latent-diffusion-contribution",
      ]),
    );
    expect(routes).toContain(LATENT_DIFFUSION_PAPER_ROUTE);
    expect(focusedTests.map((surface) => surface.path)).toEqual([
      "src/lib/content/latent-diffusion-paper-page.test.ts",
    ]);
  });

  test("collectLatentDiffusionRootCheckoutEvidence isolates latent-diffusion dirty paths", () => {
    const statusOutput = [
      " D src/content/docs/papers/latent-diffusion/page.mdx",
      " M src/lib/content/registry-runtime.test.ts",
      " M src/lib/source.test.ts",
      " M src/lib/factory/unrelated.ts",
    ].join("\n");

    const evidence = collectLatentDiffusionRootCheckoutEvidence(statusOutput);

    expect(evidence.isClean).toBe(false);
    expect(evidence.dirtyPathCount).toBe(4);
    expect(
      evidence.latentDiffusionDirtyPaths.map((entry) => entry.path),
    ).toEqual([
      "src/content/docs/papers/latent-diffusion/page.mdx",
      "src/lib/content/registry-runtime.test.ts",
      "src/lib/source.test.ts",
    ]);
  });

  test("determineLatentDiffusionLandedEvidenceVerificationStatus requires merge commit and all surfaces", () => {
    expect(
      determineLatentDiffusionLandedEvidenceVerificationStatus({
        mergeEvidence: {
          mergeCommitSha: LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA,
          mergeCommitShort: "3ea842f",
          presentInLineage: false,
          pullRequestNumber: LATENT_DIFFUSION_LANDING_PR_NUMBER,
          status: "absent-from-lineage",
        },
        originMainSurfaces: LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES.map(
          (surface) => ({
            ...surface,
            presentOnOriginMain: true,
            status: "present" as const,
          }),
        ),
      }),
    ).toBe("merge-commit-missing");

    expect(
      determineLatentDiffusionLandedEvidenceVerificationStatus({
        mergeEvidence: {
          mergeCommitSha: LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA,
          mergeCommitShort: "3ea842f",
          presentInLineage: true,
          pullRequestNumber: LATENT_DIFFUSION_LANDING_PR_NUMBER,
          status: "present-in-lineage",
        },
        originMainSurfaces: [
          {
            kind: "page-bundle",
            path: "src/content/docs/papers/latent-diffusion/page.mdx",
            presentOnOriginMain: false,
            status: "absent",
          },
        ],
      }),
    ).toBe("incomplete");

    expect(
      determineLatentDiffusionLandedEvidenceVerificationStatus({
        mergeEvidence: {
          mergeCommitSha: LATENT_DIFFUSION_LANDING_MERGE_COMMIT_SHA,
          mergeCommitShort: "3ea842f",
          presentInLineage: true,
          pullRequestNumber: LATENT_DIFFUSION_LANDING_PR_NUMBER,
          status: "present-in-lineage",
        },
        originMainSurfaces: LATENT_DIFFUSION_ORIGIN_MAIN_SURFACES.map(
          (surface) => ({
            ...surface,
            presentOnOriginMain: true,
            status: "present" as const,
          }),
        ),
      }),
    ).toBe("verified");
  });

  test("verifyLatentDiffusionLandedEvidence distinguishes shipped main surfaces from root dirty paths", () => {
    const fixture = createFixtureRepo();

    try {
      const statusOutput = [
        " D src/content/docs/papers/latent-diffusion/page.mdx",
        " M src/lib/source.test.ts",
      ].join("\n");

      const report = verifyLatentDiffusionLandedEvidence({
        generatedAtUtc: "2026-07-02T04:00:00.000Z",
        remoteBaseRef: fixture.mainRef,
        repoRoot: fixture.repoRoot,
        statusOutput,
        runGit: (repoRoot, args) => {
          const result = spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
          return {
            status: result.status,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
          };
        },
      });

      expect(
        report.originMainSurfaces.every(
          (surface) => surface.presentOnOriginMain,
        ),
      ).toBe(true);
      expect(
        report.rootCheckoutEvidence.latentDiffusionDirtyPaths,
      ).toHaveLength(2);
      expect(report.rootCheckoutEvidence.isClean).toBe(false);
      expect(
        isMergeCommitInLineage(
          fixture.repoRoot,
          fixture.mergeCommitSha,
          fixture.mainRef,
        ),
      ).toBe(true);

      const surfaces = collectLatentDiffusionOriginMainSurfaceEvidence({
        remoteBaseRef: fixture.mainRef,
        repoRoot: fixture.repoRoot,
      });
      expect(surfaces.every((surface) => surface.status === "present")).toBe(
        true,
      );

      const formatted = formatLatentDiffusionLandedEvidenceReport(report);
      expect(formatted).toContain(
        LATENT_DIFFUSION_ROOT_DELETION_RECONCILIATION_HEADER,
      );
      expect(formatted).toContain("shipped-vs-dirty");
      expect(formatted).toContain(
        "path=src/content/docs/papers/latent-diffusion/page.mdx",
      );
      expect(formatted).toContain("registry-id=paper.latent-diffusion");
      expect(formatted).toContain(`route=${LATENT_DIFFUSION_PAPER_ROUTE}`);
      expect(formatted).toContain(
        "path=src/lib/content/latent-diffusion-paper-page.test.ts",
      );
    } finally {
      fixture.cleanup();
    }
  });

  test("determineLatentDiffusionCompletedWorktreePathDisposition classifies branch vs main presence", () => {
    expect(
      determineLatentDiffusionCompletedWorktreePathDisposition({
        contentMatchesOriginMain: true,
        presentOnCompletedBranch: true,
        presentOnOriginMain: true,
      }),
    ).toBe("existed-unchanged");

    expect(
      determineLatentDiffusionCompletedWorktreePathDisposition({
        contentMatchesOriginMain: false,
        presentOnCompletedBranch: true,
        presentOnOriginMain: true,
      }),
    ).toBe("existed-modified");

    expect(
      determineLatentDiffusionCompletedWorktreePathDisposition({
        contentMatchesOriginMain: null,
        presentOnCompletedBranch: false,
        presentOnOriginMain: true,
      }),
    ).toBe("removed-on-branch");
  });

  test("collectLatentDiffusionCompletedWorktreePathEvidence records branch diff and main mismatches", () => {
    const fixture = createFixtureRepo();

    try {
      const changedPath = "src/content/docs/papers/latent-diffusion/page.mdx";
      const unchangedPath =
        "src/content/docs/papers/latent-diffusion/assets.json";
      const branchName = "latent-diffusion-paper-page";
      runGit(fixture.repoRoot, ["checkout", "-B", branchName, fixture.mainRef]);
      writeFileSync(
        join(fixture.repoRoot, changedPath),
        "export const changed = true;\n",
      );
      runGit(fixture.repoRoot, ["add", changedPath]);
      runGit(fixture.repoRoot, [
        "commit",
        "-m",
        "branch-only page bundle change",
      ]);

      const evidence = collectLatentDiffusionCompletedWorktreePathEvidence({
        branchChangedPaths: new Set([changedPath, unchangedPath]),
        branchName,
        paths: [changedPath, unchangedPath],
        remoteBaseRef: fixture.mainRef,
        repoRoot: fixture.repoRoot,
        runGit: (repoRoot, args) => {
          const result = spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
          return {
            status: result.status,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
          };
        },
      });

      expect(evidence).toEqual([
        expect.objectContaining({
          changedInCompletedBranchDiff: true,
          contentMatchesOriginMain: false,
          disposition: "existed-modified",
          mismatchWithOriginMain: true,
          path: changedPath,
          presentOnCompletedBranch: true,
          presentOnOriginMain: true,
        }),
        expect.objectContaining({
          changedInCompletedBranchDiff: true,
          contentMatchesOriginMain: true,
          disposition: "existed-unchanged",
          mismatchWithOriginMain: false,
          path: unchangedPath,
          presentOnCompletedBranch: true,
          presentOnOriginMain: true,
        }),
      ]);
    } finally {
      fixture.cleanup();
    }
  });

  test("inspectLatentDiffusionCompletedWorktreeEvidence records lane identity and path evidence", () => {
    const fixture = createFixtureRepo();

    try {
      const branchName = LATENT_DIFFUSION_PAPER_PAGE_LANE_NAME;
      runGit(fixture.repoRoot, ["branch", "-f", branchName, fixture.mainRef]);

      const report = inspectLatentDiffusionCompletedWorktreeEvidence({
        branchName,
        generatedAtUtc: "2026-07-02T05:00:00.000Z",
        laneName: branchName,
        remoteBaseRef: fixture.mainRef,
        repoRoot: fixture.repoRoot,
        worktreePath: "/tmp/latent-diffusion-paper-page",
        runGit: (repoRoot, args) => {
          const result = spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
          return {
            status: result.status,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
          };
        },
      });

      expect(report.inspectionStatus).toBe("inspected");
      expect(report.identity.branchName).toBe(branchName);
      expect(report.identity.worktreePath).toBe(
        "/tmp/latent-diffusion-paper-page",
      );
      expect(report.pathEvidence).toHaveLength(
        LATENT_DIFFUSION_RECONCILIATION_DIRTY_PATHS.length,
      );
      expect(report.mismatchesWithOriginMain).toEqual([]);

      const formatted =
        formatLatentDiffusionCompletedWorktreeEvidenceReport(report);
      expect(formatted).toContain("Completed Worktree Evidence");
      expect(formatted).toContain("completed-vs-main");
      expect(formatted).toContain(
        "path=src/content/docs/papers/latent-diffusion/page.mdx",
      );
    } finally {
      fixture.cleanup();
    }
  });
});
