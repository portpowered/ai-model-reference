import { join } from "node:path";
import {
  formatPhase23ReconciliationConvergenceReport,
  getPhase23ReconciliationConvergenceExitCode,
  runPhase23ReconciliationConvergenceGate,
} from "../src/lib/content/phase-2-3-reconciliation-convergence";

const projectRoot = join(import.meta.dir, "..");

async function main(): Promise<number> {
  console.log(
    "Phase 2/3 reconciliation convergence pass: running make internal-validate-data",
  );
  const validate = Bun.spawnSync(["make", "validate-data"], {
    cwd: projectRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (validate.exitCode !== 0) {
    return validate.exitCode ?? 1;
  }

  console.log(
    "\nPhase 2/3 reconciliation convergence pass: running focused gate checks",
  );
  const results = await runPhase23ReconciliationConvergenceGate();
  console.log("");
  console.log(formatPhase23ReconciliationConvergenceReport(results));

  return getPhase23ReconciliationConvergenceExitCode(results);
}

const exitCode = await main();
process.exit(exitCode);
