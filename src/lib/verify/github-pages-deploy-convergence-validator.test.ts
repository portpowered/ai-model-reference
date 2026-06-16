import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER } from "./phase-1-github-pages-deploy-convergence-evidence";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  shouldRunVerifyProductionIntegrationTests,
} from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const DEPLOY_CONVERGENCE_SCRIPT = join(
  repoRoot,
  "scripts/run-phase-1-github-pages-deploy-convergence-pass.ts",
);
const DEPLOY_CONVERGENCE_E2E_TIMEOUT_MS =
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 600_000;

function runDeployConvergenceScript(
  options: { cwd?: string; env?: Record<string, string | undefined> } = {},
): Promise<{ exitCode: number; output: string }> {
  const mergedEnv = { ...process.env, ...options.env };
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) {
      delete mergedEnv[key];
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn("bun", [DEPLOY_CONVERGENCE_SCRIPT], {
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

describe("run-phase-1-github-pages-deploy-convergence-pass script", () => {
  test(
    "canonical run prints batch-015 evidence summary with all deploy domains",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const result = await runDeployConvergenceScript({
        env: { VERIFY_BASE_URL: undefined },
      });

      expect(result.output).toContain(
        PHASE_1_BATCH_015_GITHUB_PAGES_DEPLOY_CONVERGENCE_EVIDENCE_SUMMARY_HEADER,
      );
      expect(result.output).toContain("deploy-workflow");
      expect(result.output).toContain("deploy-docs-posture");
      expect(result.output).toContain("export-artifact");
      expect(result.output).toContain("deploy-path-search");
      expect(result.output).toMatch(
        /Recommendation: (queue-one-narrow-repair-batch|stop-and-wait-for-phase-advancement)/,
      );
      expect(result.output).toContain("Rationale:");
      expect([0, 1]).toContain(result.exitCode);
    },
    DEPLOY_CONVERGENCE_E2E_TIMEOUT_MS,
  );
});
