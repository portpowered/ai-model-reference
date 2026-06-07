import { spawn } from "node:child_process";
import { join } from "node:path";
import { resolveBasePathForExportVerification } from "../src/lib/build/static-export";
import {
  buildPhase1GitHubPagesConvergenceEvidenceSummary,
  getPhase1GitHubPagesConvergenceExitCode,
  printPhase1GitHubPagesConvergenceEvidenceSummary,
} from "../src/lib/verify/phase-1-github-pages-convergence-evidence";

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

async function main(): Promise<number> {
  console.log(
    "Phase 1 batch-014 GitHub Pages convergence: running make build-export",
  );
  const buildExportResult = await runShellCommand("make build-export");

  if (buildExportResult.exitCode !== 0) {
    console.error(
      "\nPhase 1 batch-014 GitHub Pages convergence: make build-export failed; skipping static verification.",
    );
  }

  const evidenceSummary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
    buildExportOutput: buildExportResult.output,
    buildExportExitCode: buildExportResult.exitCode,
    cwd: projectRoot,
    basePath: resolveBasePathForExportVerification(process.env),
  });
  console.log("");
  printPhase1GitHubPagesConvergenceEvidenceSummary(evidenceSummary);

  if (buildExportResult.exitCode === 0) {
    console.log(
      "\nPhase 1 batch-014 GitHub Pages convergence: export build succeeded; static server and regression probes will run in later workflow stages.",
    );
  }

  return getPhase1GitHubPagesConvergenceExitCode(evidenceSummary);
}

const exitCode = await main();
process.exit(exitCode);
