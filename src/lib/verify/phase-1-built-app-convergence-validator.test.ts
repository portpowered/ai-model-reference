import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { assertBatch010BuiltAppConvergenceClosureReady } from "./phase-1-built-app-convergence-closure";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  shouldRunVerifyProductionIntegrationTests,
} from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const BUILT_APP_CONVERGENCE_SCRIPT = join(
  repoRoot,
  "scripts/run-phase-1-built-app-convergence-validator.ts",
);
const BUILT_APP_CONVERGENCE_E2E_TIMEOUT_MS =
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 600_000;

function runBuiltAppConvergenceScript(
  options: { cwd?: string; env?: Record<string, string | undefined> } = {},
): Promise<{ exitCode: number; output: string }> {
  const mergedEnv = { ...process.env, ...options.env };
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) {
      delete mergedEnv[key];
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn("bun", [BUILT_APP_CONVERGENCE_SCRIPT], {
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

describe("run-phase-1-built-app-convergence-validator script", () => {
  test(
    "canonical run prints closure-ready evidence when default spawn path is healthy",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const result = await runBuiltAppConvergenceScript({
        env: { VERIFY_BASE_URL: undefined },
      });

      const summary = assertBatch010BuiltAppConvergenceClosureReady(
        result.output,
      );
      expect(result.exitCode).toBe(0);
      expect(summary.commandPath.status).toBe("pass");
      expect([
        "close-verifier-harness-regression",
        "stop-and-wait-for-phase-advancement",
      ]).toContain(summary.recommendation);
    },
    BUILT_APP_CONVERGENCE_E2E_TIMEOUT_MS,
  );
});
