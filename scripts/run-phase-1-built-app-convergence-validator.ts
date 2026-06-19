import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  buildPhase1BuiltAppConvergenceEvidenceSummary,
  getPhase1BuiltAppConvergenceExitCode,
  printPhase1BuiltAppConvergenceEvidenceSummary,
} from "../src/lib/verify/phase-1-built-app-convergence-evidence";
import {
  NEXT_BUILD_REQUIRED_MESSAGE,
  VERIFY_BASE_URL_ENV,
} from "../src/lib/verify/server-lifecycle";

const projectRoot = join(import.meta.dir, "..");

type CommandResult = {
  exitCode: number;
  output: string;
};

async function runShellCommand(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: projectRoot,
      shell: true,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });
  });
}

function canonicalVerifyEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env[VERIFY_BASE_URL_ENV];
  return env;
}

async function main(): Promise<number> {
  console.log("Phase 1 built-app convergence: running make build");
  const buildResult = await runShellCommand("make build");
  if (buildResult.exitCode !== 0) {
    console.error(
      "\nPhase 1 built-app convergence: make build failed; skipping verify-phase-1-ux.",
    );
    const evidenceSummary = buildPhase1BuiltAppConvergenceEvidenceSummary({
      verifyOutput: `${buildResult.output}\n${NEXT_BUILD_REQUIRED_MESSAGE}\n`,
    });
    console.log("");
    printPhase1BuiltAppConvergenceEvidenceSummary(evidenceSummary);
    return getPhase1BuiltAppConvergenceExitCode(evidenceSummary);
  }

  console.log(
    "\nPhase 1 built-app convergence: running make internal-verify-phase-1-ux with VERIFY_BASE_URL unset",
  );
  const verifyResult = await runShellCommand(
    "make internal-verify-phase-1-ux",
    canonicalVerifyEnv(),
  );

  const evidenceSummary = buildPhase1BuiltAppConvergenceEvidenceSummary({
    verifyOutput: verifyResult.output,
  });
  console.log("");
  printPhase1BuiltAppConvergenceEvidenceSummary(evidenceSummary);

  return getPhase1BuiltAppConvergenceExitCode(evidenceSummary);
}

const exitCode = await main();
process.exit(exitCode);
