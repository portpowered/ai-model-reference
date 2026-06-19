import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  assertPhase1GitHubPagesConvergenceClosureReady,
  toPhase1GitHubPagesConvergenceClosureSummary,
} from "./phase-1-github-pages-convergence-closure";
import {
  derivePhase1GitHubPagesConvergenceRecommendation,
  PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
  PHASE_1_GITHUB_PAGES_CONVERGENCE_WORKFLOW_STEPS,
} from "./phase-1-github-pages-convergence-evidence";
import { EXPORT_ARTIFACT_DOMAIN_ID } from "./phase-1-github-pages-export-artifact";
import { EXPORT_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-export-command-path";
import { STATIC_REGRESSION_DOMAIN_ID } from "./phase-1-github-pages-static-regression";
import { STATIC_SERVER_COMMAND_PATH_DOMAIN_ID } from "./phase-1-github-pages-static-server-command-path";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  shouldRunVerifyProductionIntegrationTests,
} from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const GITHUB_PAGES_CONVERGENCE_SCRIPT = join(
  repoRoot,
  "scripts/run-phase-1-github-pages-convergence-pass.ts",
);
const GITHUB_PAGES_CONVERGENCE_E2E_TIMEOUT_MS =
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 600_000;

function runGitHubPagesConvergenceScript(
  options: { cwd?: string; env?: Record<string, string | undefined> } = {},
): Promise<{ exitCode: number; output: string }> {
  const mergedEnv = { ...process.env, ...options.env };
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) {
      delete mergedEnv[key];
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn("bun", [GITHUB_PAGES_CONVERGENCE_SCRIPT], {
      cwd: options.cwd ?? repoRoot,
      env: mergedEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      output += String(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });
  });
}

describe("phase-1-github-pages-convergence workflow constants", () => {
  test("workflow constants name the batch-014 GitHub Pages convergence gate", () => {
    expect(
      PHASE_1_BATCH_014_GITHUB_PAGES_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
    ).toBe("Phase 1 batch-014 GitHub Pages convergence evidence summary");
    expect(PHASE_1_GITHUB_PAGES_CONVERGENCE_WORKFLOW_STEPS).toEqual([
      "make internal-build-export",
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
        reason: "make internal-build-export exited 1",
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

describe("run-phase-1-github-pages-convergence-pass script", () => {
  test(
    "canonical run prints closure-ready evidence when default spawn path is healthy",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const result = await runGitHubPagesConvergenceScript({
        env: { VERIFY_BASE_URL: undefined },
      });

      const parsed = assertPhase1GitHubPagesConvergenceClosureReady(
        result.output,
      );
      const summary = toPhase1GitHubPagesConvergenceClosureSummary(parsed);
      expect(result.exitCode).toBe(0);
      expect(summary.exportCommandPath.status).toBe("pass");
      expect(summary.recommendation).toBe(
        "stop-and-wait-for-phase-advancement",
      );
    },
    GITHUB_PAGES_CONVERGENCE_E2E_TIMEOUT_MS,
  );
});
