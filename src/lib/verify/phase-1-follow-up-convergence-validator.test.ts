import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { assertBatch011FollowUpConvergenceClosureReady } from "./phase-1-follow-up-convergence-closure";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  shouldRunVerifyProductionIntegrationTests,
} from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const FOLLOW_UP_CONVERGENCE_SCRIPT = join(
  repoRoot,
  "scripts/run-phase-1-follow-up-convergence-pass.ts",
);
const FOLLOW_UP_CONVERGENCE_E2E_TIMEOUT_MS =
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS + 600_000;

function runFollowUpConvergenceScript(
  options: { cwd?: string; env?: Record<string, string | undefined> } = {},
): Promise<{ exitCode: number; output: string }> {
  const mergedEnv = { ...process.env, ...options.env };
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) {
      delete mergedEnv[key];
    }
  }

  return new Promise((resolve, reject) => {
    const child = spawn("bun", [FOLLOW_UP_CONVERGENCE_SCRIPT], {
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

describe("run-phase-1-follow-up-convergence-pass script", () => {
  test(
    "canonical run prints closure-ready evidence when default spawn path is healthy",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const result = await runFollowUpConvergenceScript({
        env: { VERIFY_BASE_URL: undefined },
      });

      const summary = assertBatch011FollowUpConvergenceClosureReady(
        result.output,
      );
      expect(result.exitCode).toBe(0);
      expect(summary.commandPath.status).toBe("pass");
      expect(summary.recommendation).toBe(
        "stop-and-wait-for-phase-advancement",
      );
    },
    FOLLOW_UP_CONVERGENCE_E2E_TIMEOUT_MS,
  );
});
