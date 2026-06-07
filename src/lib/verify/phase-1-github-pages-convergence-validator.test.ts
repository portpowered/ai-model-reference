import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  derivePhase1GitHubPagesConvergenceRecommendation,
  PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  PHASE_1_GITHUB_PAGES_CONVERGENCE_WORKFLOW_STEPS,
} from "./phase-1-github-pages-convergence-evidence";
import { EXPORT_ARTIFACT_DOMAIN_ID } from "./phase-1-github-pages-export-artifact";
import { EXPORT_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-export-command-path";
import { STATIC_REGRESSION_DOMAIN_ID } from "./phase-1-github-pages-static-regression";
import { STATIC_SERVER_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-static-server-command-path";

const repoRoot = join(import.meta.dir, "../../..");

describe("phase-1-github-pages-convergence CLI wiring", () => {
  test("Makefile and package.json expose verify-phase-1-github-pages-convergence", () => {
    const makefile = readFileSync(join(repoRoot, "Makefile"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(makefile).toMatch(/^verify-phase-1-github-pages-convergence:/m);
    expect(makefile).toMatch(/run-phase-1-github-pages-convergence-pass\.ts/);
    expect(
      packageJson.scripts["verify:phase-1-github-pages-convergence"],
    ).toContain("run-phase-1-github-pages-convergence-pass.ts");
  });

  test("workflow constants name the batch-014 GitHub Pages convergence gate", () => {
    expect(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    ).toBe("Phase 1 batch-014 GitHub Pages convergence evidence summary");
    expect(PHASE_1_GITHUB_PAGES_CONVERGENCE_WORKFLOW_STEPS).toEqual([
      "make build-export",
      "serve out/ on loopback static file server",
      "run Phase 1 static search and route regression probes",
    ]);
  });
});

describe("derivePhase1GitHubPagesConvergenceRecommendation", () => {
  test("recommends repair when any domain fails", () => {
    const result = derivePhase1GitHubPagesConvergenceRecommendation({
      exportCommandPath: {
        domainId: EXPORT_COMMAND_PATH_DOMAIN_ID,
        label: "Export command path",
        checklistRow: "phase-1-github-pages-export-command-path",
        status: "fail",
        reason: "make build-export exited 1",
      },
      exportArtifact: {
        domainId: EXPORT_ARTIFACT_DOMAIN_ID,
        label: "Export artifact",
        checklistRow: "phase-1-github-pages-export-artifact",
        status: "pass",
        rows: [],
      },
      staticServerCommandPath: {
        domainId: STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
        label: "Static server",
        checklistRow: "phase-1-github-pages-static-server-command-path",
        status: "pass",
      },
      staticRegression: {
        domainId: STATIC_REGRESSION_DOMAIN_ID,
        label: "Static regression",
        checklistRow: "phase-1-github-pages-static-regression",
        status: "pass",
        rows: [],
      },
    });

    expect(result.recommendation).toBe("queue-one-narrow-repair-batch");
    expect(result.rationale).toContain("export-command-path");
  });

  test("recommends stop-and-wait when only uncertain rows remain", () => {
    const result = derivePhase1GitHubPagesConvergenceRecommendation({
      exportCommandPath: {
        domainId: EXPORT_COMMAND_PATH_DOMAIN_ID,
        label: "Export command path",
        checklistRow: "phase-1-github-pages-export-command-path",
        status: "pass",
      },
      exportArtifact: {
        domainId: EXPORT_ARTIFACT_DOMAIN_ID,
        label: "Export artifact",
        checklistRow: "phase-1-github-pages-export-artifact",
        status: "uncertain",
        rows: [
          {
            checkId: "export-artifact.base-path.assets",
            title: "Base path assets",
            status: "uncertain",
            reason: "GITHUB_PAGES_BASE_PATH is unset",
            checklistRow: "phase-1-github-pages-export-artifact",
          },
        ],
      },
      staticServerCommandPath: {
        domainId: STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
        label: "Static server",
        checklistRow: "phase-1-github-pages-static-server-command-path",
        status: "pass",
      },
      staticRegression: {
        domainId: STATIC_REGRESSION_DOMAIN_ID,
        label: "Static regression",
        checklistRow: "phase-1-github-pages-static-regression",
        status: "pass",
        rows: [],
      },
    });

    expect(result.recommendation).toBe("stop-and-wait-for-phase-advancement");
    expect(result.rationale).toContain("export-artifact.base-path.assets");
    expect(result.rationale).toContain("non-blocking");
  });
});
