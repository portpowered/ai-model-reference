import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const readmePath = join(repoRoot, "README.md");
const makefilePath = join(repoRoot, "Makefile");
const packageJsonPath = join(repoRoot, "package.json");
const ideafyAgentsPath = join(
  repoRoot,
  "factory/workstations/ideafy/AGENTS.md",
);
const customerAskConvergenceDocPath = join(
  repoRoot,
  "factory/docs/phase-1-customer-ask-convergence-validator.md",
);
const convergencePassDocPath = join(
  repoRoot,
  "factory/docs/phase-1-convergence-pass.md",
);

describe("Phase 1 built-app verifier entrypoint documentation", () => {
  test("README documents make verify-phase-1-ux as the built-app manual gate command", () => {
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/make verify-phase-1-ux/);
    expect(readme).toMatch(/bun run verify:phase-1-ux/);
    expect(readme).toMatch(/docs\/internal\/customer-ask\.md/);
    expect(readme).toMatch(/empty-results/i);
    expect(readme).toMatch(/3100.*3999|3100–3999/);
    expect(readme).toMatch(/UX convergence scope/i);
    expect(readme).toMatch(/eight Phase 1 reader routes/i);
    expect(readme).toMatch(/shell convergence|unified Fumadocs shell/i);
    expect(readme).toMatch(/Modules and Glossary sidebar/i);
    expect(readme).toMatch(/home search entry|single search entry/i);
    expect(readme).toMatch(/\/docs\/modules\/grouped-query-attention/);
    expect(readme).toMatch(/\/tags\/attention/);
    expect(readme).toMatch(/Customer-ask convergence report/i);
    expect(readme).toMatch(/pass.*fail.*uncertain|pass \/ fail \/ uncertain/i);
    expect(readme).toMatch(
      /factory\/docs\/phase-1-customer-ask-convergence-validator\.md/,
    );
  });

  test("Makefile and package.json expose the built-app verifier command", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(makefile).toMatch(/^verify-phase-1-ux:/m);
    expect(makefile).toMatch(/verify-phase-1-route-search-ux\.ts/);
    expect(makefile).toMatch(/^verify-phase-1-convergence:/m);
    expect(makefile).toMatch(/run-phase-1-convergence-pass\.ts/);
    expect(makefile).toMatch(/^verify-phase-1-built-app-convergence:/m);
    expect(makefile).toMatch(/run-phase-1-built-app-convergence-validator\.ts/);
    expect(packageJson.scripts["verify:phase-1-ux"]).toContain(
      "verify-phase-1-route-search-ux.ts",
    );
    expect(packageJson.scripts["verify:phase-1-convergence"]).toContain(
      "run-phase-1-convergence-pass.ts",
    );
    expect(
      packageJson.scripts["verify:phase-1-built-app-convergence"],
    ).toContain("run-phase-1-built-app-convergence-validator.ts");
  });

  test("planner-facing ideafy docs reference the built-app verifier for Phase 1 loopback convergence", () => {
    const ideafyAgents = readFileSync(ideafyAgentsPath, "utf8");
    expect(ideafyAgents).toMatch(/make verify-phase-1-ux/);
    expect(ideafyAgents).toMatch(/built-app manual gate/i);
    expect(ideafyAgents).toMatch(/eight reader routes/i);
    expect(ideafyAgents).toMatch(/shell convergence|unified docs shell/i);
    expect(ideafyAgents).toMatch(/home single search entry/i);
    expect(ideafyAgents).toMatch(/\/docs\/modules\/grouped-query-attention/);
    expect(ideafyAgents).toMatch(/batch-008 loopback/i);
    expect(ideafyAgents).toMatch(/Customer-ask convergence report/i);
    expect(ideafyAgents).toMatch(
      /pass.*fail.*uncertain|pass`, `fail`, or `uncertain/i,
    );
    expect(ideafyAgents).toMatch(
      /factory\/docs\/phase-1-customer-ask-convergence-validator\.md/,
    );
  });

  test("factory doc lists customer-ask convergence check ids and checklist rows", () => {
    const customerAskDoc = readFileSync(customerAskConvergenceDocPath, "utf8");
    expect(customerAskDoc).toMatch(/home\.header-search-entry/);
    expect(customerAskDoc).toMatch(/search\.page\.page-level-hits/);
    expect(customerAskDoc).toMatch(/glossary\.presentation/);
    expect(customerAskDoc).toMatch(/docs\.footer-hover-focus-parity/);
    expect(customerAskDoc).toMatch(/module\.graph-build-markers/);
    expect(customerAskDoc).toMatch(/module\.mha-gqa-comparison/);
    expect(customerAskDoc).toMatch(/phase-1-home-header-polish/);
    expect(customerAskDoc).toMatch(/phase-1-search-surface/);
    expect(customerAskDoc).toMatch(/\/docs\/glossary\/token/);
    expect(customerAskDoc).toMatch(/\/docs\/modules\/grouped-query-attention/);
  });

  test("factory doc documents the batch-009 convergence pass workflow", () => {
    const convergencePassDoc = readFileSync(convergencePassDocPath, "utf8");
    expect(convergencePassDoc).toMatch(/make verify-phase-1-convergence/);
    expect(convergencePassDoc).toMatch(/make ci/);
    expect(convergencePassDoc).toMatch(/make build && make verify-phase-1-ux/);
    expect(convergencePassDoc).toMatch(/gqa-module-graph-build-markers/);
    expect(convergencePassDoc).toMatch(/docs-footer-hover-focus-parity/);
    expect(convergencePassDoc).toMatch(/phase-1-route-gate/);
    expect(convergencePassDoc).toMatch(/Playwright Chromium/);
    expect(convergencePassDoc).toMatch(
      /Phase 1 batch-009 CI blocker domain report/,
    );
    expect(convergencePassDoc).toMatch(
      /Phase 1 batch-009 convergence evidence summary/,
    );
    expect(convergencePassDoc).toMatch(
      /queue-one-narrow-repair-batch|stop-and-wait-for-phase-advancement/,
    );
    expect(convergencePassDoc).toMatch(/Recommendation:/);
    expect(convergencePassDoc).toMatch(/phase-1-convergence-evidence\.ts/);
  });
});
