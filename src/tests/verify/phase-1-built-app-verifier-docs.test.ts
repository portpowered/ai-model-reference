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

describe("Phase 1 built-app verifier entrypoint documentation", () => {
  test("README documents make verify-phase-1-ux as the built-app manual gate command", () => {
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/make verify-phase-1-ux/);
    expect(readme).toMatch(/bun run verify:phase-1-ux/);
    expect(readme).toMatch(/docs\/internal\/customer-ask\.md/);
    expect(readme).toMatch(/empty-results/i);
    expect(readme).toMatch(/3100.*3999|3100–3999/);
  });

  test("Makefile and package.json expose the built-app verifier command", () => {
    const makefile = readFileSync(makefilePath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(makefile).toMatch(/^verify-phase-1-ux:/m);
    expect(makefile).toMatch(/verify-phase-1-route-search-ux\.ts/);
    expect(packageJson.scripts["verify:phase-1-ux"]).toContain(
      "verify-phase-1-route-search-ux.ts",
    );
  });

  test("planner-facing ideafy docs reference the built-app verifier for Phase 1 loopback convergence", () => {
    const ideafyAgents = readFileSync(ideafyAgentsPath, "utf8");
    expect(ideafyAgents).toMatch(/make verify-phase-1-ux/);
    expect(ideafyAgents).toMatch(/built-app manual gate/i);
  });
});
