import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const rootAgentsPath = join(repoRoot, "AGENTS.md");
const ideafyAgentsPath = join(
  repoRoot,
  "factory/workstations/ideafy/AGENTS.md",
);
const writingStandardsPath = join(repoRoot, "docs/writing-standards.md");
const graphingStandardsPath = join(repoRoot, "docs/graphing-standards.md");

describe("agent and planner standards guidance", () => {
  test("root AGENTS.md mandates writing and graphing standards for docs authoring", () => {
    const agents = readFileSync(rootAgentsPath, "utf8");
    expect(agents).toMatch(/# writing docs/);
    expect(agents).toMatch(/docs\/writing-standards\.md/);
    expect(agents).toMatch(/docs\/graphing-standards\.md/);
    expect(agents).toMatch(/Mandatory references/i);
    expect(agents).toMatch(/symbol-only math definitions/i);
    expect(agents).toMatch(/attention-variant comparison/i);
  });

  test("ideafy planner docs reference standards and GQA graph/math manual gate checks", () => {
    const ideafyAgents = readFileSync(ideafyAgentsPath, "utf8");
    expect(ideafyAgents).toMatch(/docs\/writing-standards\.md/);
    expect(ideafyAgents).toMatch(/docs\/graphing-standards\.md/);
    expect(ideafyAgents).toMatch(/graph and math baseline convergence/i);
    expect(ideafyAgents).toMatch(/docs\/internal\/customer-ask\.md/);
    expect(ideafyAgents).toMatch(/module\.graph-build-markers/);
    expect(ideafyAgents).toMatch(/module\.mha-gqa-comparison/);
    expect(ideafyAgents).toMatch(/module\.graph-theme-readability/);
    expect(ideafyAgents).toMatch(/module\.no-duplicate-math-graph/);
    expect(ideafyAgents).toMatch(/module\.math-qkv-definitions/);
    expect(ideafyAgents).toMatch(
      /factory\/docs\/phase-1-batch-012-gqa-graph-visibility-manual-check\.md/,
    );
    expect(ideafyAgents).toMatch(
      /make verify-phase-1-github-pages-convergence/,
    );
    expect(ideafyAgents).toMatch(
      /static-regression\.route\.gqa-module-presentation/,
    );
  });

  test("standards docs summarize reusable lessons from prior GQA repair", () => {
    const writingStandards = readFileSync(writingStandardsPath, "utf8");
    const graphingStandards = readFileSync(graphingStandardsPath, "utf8");

    expect(writingStandards).toMatch(/Lessons from prior GQA repair/);
    expect(writingStandards).toMatch(/openingSummary/);
    expect(writingStandards).toMatch(/callouts\.readerShortcut/);
    expect(writingStandards).toMatch(/projection, grouping/);

    expect(graphingStandards).toMatch(/Lessons from prior GQA repair/);
    expect(graphingStandards).toMatch(/comparison switcher/i);
    expect(graphingStandards).toMatch(/zoom\/pan/i);
    expect(graphingStandards).toMatch(/computeSchema/);
    expect(graphingStandards).toMatch(
      /verify-phase-1-github-pages-convergence/,
    );
  });
});
