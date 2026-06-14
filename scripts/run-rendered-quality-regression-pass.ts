import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  buildRenderedQualityRegressionCatalogRows,
  deriveRenderedQualityRegressionEvidence,
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
  const catalogRows = buildRenderedQualityRegressionCatalogRows();
  const catalogEvidence = deriveRenderedQualityRegressionEvidence(catalogRows);

  console.log("Rendered quality regression pass: validating coverage catalog");
  console.log("");
  console.log(formatRenderedQualityRegressionReport(catalogEvidence));

  if (catalogEvidence.status === "fail") {
    return getRenderedQualityRegressionExitCode(catalogEvidence);
  }

  const unitTestCommand = `bun test ${RENDERED_QUALITY_REGRESSION_TEST_FILES.join(" ")}`;
  console.log("");
  console.log(
    `Rendered quality regression pass: running unit regression suite\n${unitTestCommand}`,
  );
  const unitTestResult = await runShellCommand(unitTestCommand);
  if (unitTestResult.exitCode !== 0) {
    return getRenderedQualityRegressionExitCode(
      catalogEvidence,
      unitTestResult.exitCode,
    );
  }

  console.log("");
  console.log(
    "Rendered quality regression pass: running make build && make verify-rendered-quality-baseline",
  );
  const baselineResult = await runShellCommand(
    "make build && make verify-rendered-quality-baseline",
  );

  return getRenderedQualityRegressionExitCode(
    catalogEvidence,
    unitTestResult.exitCode,
    baselineResult.exitCode,
  );
}

const exitCode = await main();
process.exit(exitCode);
