import {
  evaluateComponentCoverageGate,
  formatComponentCoverageSummaryLine,
  runCoverageSubprocess,
} from "../src/lib/docs/component-coverage-gate";

const { rows: coverageRows } = runCoverageSubprocess(process.cwd());

const gate = evaluateComponentCoverageGate({
  coverageRows,
});

console.log("\nComponent coverage gate:");
for (const line of gate.summaryLines) {
  console.log(formatComponentCoverageSummaryLine(line));
}

if (!gate.ok) {
  console.error("\nComponent coverage gate failed:");
  for (const message of gate.errors) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}

console.log("\nComponent coverage gate: PASS");
