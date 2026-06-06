import {
  evaluateComponentCoverageGate,
  formatComponentCoverageSummaryLine,
  runCoverageSubprocess,
} from "../src/lib/docs/component-coverage-gate";
import {
  evaluateVerifierCoverageGate,
  formatVerifierCoverageSummaryLine,
} from "../src/lib/verify/verifier-coverage-gate";

const { rows: coverageRows } = runCoverageSubprocess(process.cwd());

const componentGate = evaluateComponentCoverageGate({
  coverageRows,
});

console.log("\nComponent coverage gate:");
for (const line of componentGate.summaryLines) {
  console.log(formatComponentCoverageSummaryLine(line));
}

const verifierGate = evaluateVerifierCoverageGate({
  coverageRows,
});

console.log("\nVerifier coverage gate:");
for (const line of verifierGate.summaryLines) {
  console.log(formatVerifierCoverageSummaryLine(line));
}

const failedGates: Array<{ name: string; errors: string[] }> = [];
if (!componentGate.ok) {
  failedGates.push({ name: "Component", errors: componentGate.errors });
}
if (!verifierGate.ok) {
  failedGates.push({ name: "Verifier", errors: verifierGate.errors });
}

if (failedGates.length > 0) {
  for (const gate of failedGates) {
    console.error(`\n${gate.name} coverage gate failed:`);
    for (const message of gate.errors) {
      console.error(`  - ${message}`);
    }
  }
  process.exit(1);
}

console.log("\nComponent coverage gate: PASS");
console.log("Verifier coverage gate: PASS");
