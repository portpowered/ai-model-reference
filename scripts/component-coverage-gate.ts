import { spawnSync } from "node:child_process";
import {
  COVERAGE_TEST_ARGS,
  evaluateComponentCoverageGate,
  formatComponentCoverageSummaryLine,
  parseCoverageTable,
} from "../src/lib/docs/component-coverage-gate";

const result = spawnSync("bun", [...COVERAGE_TEST_ARGS], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env, FORCE_COLOR: "0" },
});

const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const gate = evaluateComponentCoverageGate({
  coverageRows: parseCoverageTable(combined),
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
