import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  buildPhase1ConvergenceEvidenceSummary,
  parseCustomerAskConvergenceReport,
  printPhase1ConvergenceEvidenceSummary,
} from "../src/lib/verify/phase-1-convergence-evidence";
import {
  derivePhase1CiBlockerDomainEvidence,
  getPhase1ConvergencePassExitCode,
  printPhase1CiBlockerDomainReport,
} from "../src/lib/verify/phase-1-convergence-pass";

const projectRoot = join(import.meta.dir, "..");

type CommandResult = {
  exitCode: number;
  output: string;
};

async function runShellCommand(command: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: projectRoot,
      shell: true,
      env: process.env,
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
  console.log("Phase 1 convergence pass: running make ci");
  const ciResult = await runShellCommand("make ci");
  const ciEvidence = derivePhase1CiBlockerDomainEvidence(
    ciResult.output,
    ciResult.exitCode === 0,
  );
  printPhase1CiBlockerDomainReport(ciEvidence);

  console.log(
    "\nPhase 1 convergence pass: running make build && make verify-phase-1-ux",
  );
  const verifyResult = await runShellCommand(
    "make build && make verify-phase-1-ux",
  );

  const customerAskRows = parseCustomerAskConvergenceReport(verifyResult.output);
  const evidenceSummary = buildPhase1ConvergenceEvidenceSummary({
    ciEvidence,
    customerAskRows,
    verifyOutput: verifyResult.output,
  });
  console.log("");
  printPhase1ConvergenceEvidenceSummary(evidenceSummary);

  return getPhase1ConvergencePassExitCode({
    ciExitCode: ciResult.exitCode,
    verifyExitCode: verifyResult.exitCode,
  });
}

const exitCode = await main();
process.exit(exitCode);
