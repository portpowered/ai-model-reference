import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  buildRenderedQualityRegressionEvidence,
  formatRenderedQualityRegressionReport,
  getRenderedQualityRegressionExitCode,
  RENDERED_QUALITY_REGRESSION_TEST_FILES,
} from "../src/lib/verify/rendered-quality-regression";

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
  const evidence = buildRenderedQualityRegressionEvidence();

  console.log("Rendered quality regression pass");
  console.log("");
  console.log(formatRenderedQualityRegressionReport(evidence));

  const unitTestCommand = `bun test ${RENDERED_QUALITY_REGRESSION_TEST_FILES.join(" ")}`;
  console.log("");
  console.log(
    `Rendered quality regression pass: running unit regression suite\n${unitTestCommand}`,
  );
  const unitTestResult = await runShellCommand(unitTestCommand);
  if (unitTestResult.exitCode !== 0) {
    return getRenderedQualityRegressionExitCode(unitTestResult.exitCode);
  }

  console.log("");
  console.log(
    "Rendered quality regression pass: running make build && make internal-verify-rendered-quality-baseline",
  );
  const baselineResult = await runShellCommand(
    "make build && make internal-verify-rendered-quality-baseline",
  );

  return getRenderedQualityRegressionExitCode(
    unitTestResult.exitCode,
    baselineResult.exitCode,
  );
}

const exitCode = await main();
process.exit(exitCode);
