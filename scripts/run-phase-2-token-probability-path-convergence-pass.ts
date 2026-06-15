import {
  formatTokenProbabilityPathValidationReport,
  getTokenProbabilityPathValidationExitCode,
  runTokenProbabilityPathValidationGate,
} from "../src/lib/content/phase-2-token-probability-path-validation";

async function main(): Promise<number> {
  console.log(
    "Phase 2 token-probability path convergence pass: running focused validation gate checks",
  );
  const results = await runTokenProbabilityPathValidationGate();
  console.log("");
  console.log(formatTokenProbabilityPathValidationReport(results));

  return getTokenProbabilityPathValidationExitCode(results);
}

const exitCode = await main();
process.exit(exitCode);
