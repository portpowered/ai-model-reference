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
const builtAppConvergenceDocPath = join(
  repoRoot,
  "factory/docs/phase-1-built-app-convergence-validator.md",
);
const followUpConvergenceDocPath = join(
  repoRoot,
  "factory/docs/phase-1-follow-up-customer-ask-convergence-validator.md",
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
    expect(readme).toMatch(/make verify-phase-1-built-app-convergence/);
    expect(readme).toMatch(/bun run verify:phase-1-built-app-convergence/);
    expect(readme).toMatch(
      /factory\/docs\/phase-1-built-app-convergence-validator\.md/,
    );
    expect(readme).toMatch(
      /Phase 1 batch-010 built-app convergence evidence[\s\S]*summary/i,
    );
    expect(readme).toMatch(/VERIFY_BASE_URL.*unset|unset.*VERIFY_BASE_URL/i);
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

  test("factory doc documents the batch-010 built-app convergence validator workflow", () => {
    const builtAppConvergenceDoc = readFileSync(
      builtAppConvergenceDocPath,
      "utf8",
    );
    expect(builtAppConvergenceDoc).toMatch(
      /make verify-phase-1-built-app-convergence/,
    );
    expect(builtAppConvergenceDoc).toMatch(/make build/);
    expect(builtAppConvergenceDoc).toMatch(/make verify-phase-1-ux/);
    expect(builtAppConvergenceDoc).toMatch(
      /VERIFY_BASE_URL.*unset|unset.*VERIFY_BASE_URL/i,
    );
    expect(builtAppConvergenceDoc).toMatch(
      /factory\/docs\/phase-1-customer-ask-convergence-validator\.md/,
    );
    expect(builtAppConvergenceDoc).toMatch(/verifier-command-path/);
    expect(builtAppConvergenceDoc).toMatch(/customer-ask-convergence/);
    expect(builtAppConvergenceDoc).toMatch(/Playwright Chromium/);
    expect(builtAppConvergenceDoc).toMatch(
      /Phase 1 batch-010 built-app convergence evidence summary/,
    );
    expect(builtAppConvergenceDoc).toMatch(
      /queue-one-narrow-repair-batch|close-verifier-harness-regression|stop-and-wait-for-phase-advancement/,
    );
    expect(builtAppConvergenceDoc).toMatch(/Recommendation:/);
    expect(builtAppConvergenceDoc).toMatch(/Rationale:/);
    expect(builtAppConvergenceDoc).toMatch(
      /phase-1-built-app-convergence-evidence\.ts/,
    );
    expect(builtAppConvergenceDoc).toMatch(
      /phase-1-built-app-verifier-command-path\.ts/,
    );
  });

  test("factory doc documents the batch-011 follow-up convergence validator workflow", () => {
    const followUpConvergenceDoc = readFileSync(
      followUpConvergenceDocPath,
      "utf8",
    );
    expect(followUpConvergenceDoc).toMatch(
      /make verify-phase-1-follow-up-convergence/,
    );
    expect(followUpConvergenceDoc).toMatch(/make build/);
    expect(followUpConvergenceDoc).toMatch(/make verify-phase-1-ux/);
    expect(followUpConvergenceDoc).toMatch(
      /VERIFY_BASE_URL.*unset|unset.*VERIFY_BASE_URL/i,
    );
    expect(followUpConvergenceDoc).toMatch(/home\.brevity/);
    expect(followUpConvergenceDoc).toMatch(/nav\.no-broken-theme-toggle/);
    expect(followUpConvergenceDoc).toMatch(/search\.page\.row-hover-coherence/);
    expect(followUpConvergenceDoc).toMatch(
      /search\.dialog\.matched-text-selection-contrast/,
    );
    expect(followUpConvergenceDoc).toMatch(/docs\.footer-hover-focus-parity/);
    expect(followUpConvergenceDoc).toMatch(/module\.mha-gqa-comparison/);
    expect(followUpConvergenceDoc).toMatch(
      /phase-1-follow-up-customer-ask-convergence/,
    );
    expect(followUpConvergenceDoc).toMatch(/verifier-command-path/);
    expect(followUpConvergenceDoc).toMatch(/customer-ask-convergence/);
    expect(followUpConvergenceDoc).toMatch(/Playwright Chromium/);
    expect(followUpConvergenceDoc).toMatch(
      /Phase 1 batch-011 follow-up convergence evidence summary/,
    );
    expect(followUpConvergenceDoc).toMatch(
      /queue-one-narrow-repair-batch|stop-and-wait-for-phase-advancement/,
    );
    expect(followUpConvergenceDoc).toMatch(/Recommendation:/);
    expect(followUpConvergenceDoc).toMatch(/Rationale:/);
    expect(followUpConvergenceDoc).toMatch(
      /batch-008.*batch-010.*stale|stale.*batch-008|Prior batch-008 and batch-010 all-pass evidence is stale/i,
    );
    expect(followUpConvergenceDoc).toMatch(
      /phase-1-follow-up-convergence-evidence\.ts/,
    );
    expect(followUpConvergenceDoc).toMatch(
      /batch-011-follow-up-customer-ask-check-inventory\.ts/,
    );
  });

  test("planner-facing ideafy docs reference the batch-011 follow-up validator for post-batch-011 loopback", () => {
    const ideafyAgents = readFileSync(ideafyAgentsPath, "utf8");
    expect(ideafyAgents).toMatch(/make verify-phase-1-follow-up-convergence/);
    expect(ideafyAgents).toMatch(/batch-011 follow-up convergence/i);
    expect(ideafyAgents).toMatch(
      /batch-011 follow-up convergence evidence summary/i,
    );
    expect(ideafyAgents).toMatch(
      /factory\/docs\/phase-1-follow-up-customer-ask-convergence-validator\.md/,
    );
    expect(ideafyAgents).toMatch(
      /batch-008.*batch-010.*stale|stale.*batch-008|Prior batch-008\/010/i,
    );
    expect(ideafyAgents).toMatch(
      /queue-one-narrow-repair-batch|stop-and-wait-for-phase-advancement/,
    );
  });

  test("README and Makefile expose the batch-011 follow-up convergence validator command", () => {
    const readme = readFileSync(readmePath, "utf8");
    const makefile = readFileSync(makefilePath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(readme).toMatch(/make verify-phase-1-follow-up-convergence/);
    expect(readme).toMatch(/bun run verify:phase-1-follow-up-convergence/);
    expect(readme).toMatch(
      /factory\/docs\/phase-1-follow-up-customer-ask-convergence-validator\.md/,
    );
    expect(readme).toMatch(
      /Phase 1 batch-011 follow-up convergence evidence[\s\S]*summary/i,
    );
    expect(readme).toMatch(/VERIFY_BASE_URL.*unset|unset.*VERIFY_BASE_URL/i);
    expect(makefile).toMatch(/^verify-phase-1-follow-up-convergence:/m);
    expect(makefile).toMatch(/run-phase-1-follow-up-convergence-pass\.ts/);
    expect(
      packageJson.scripts["verify:phase-1-follow-up-convergence"],
    ).toContain("run-phase-1-follow-up-convergence-pass.ts");
  });
});
