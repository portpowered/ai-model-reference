import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const deployWorkflowPath = join(repoRoot, ".github/workflows/deploy.yml");
const readmePath = join(repoRoot, "README.md");
const operationsPath = join(repoRoot, "docs/operations.md");

/** Production-deploy deferral phrases that must not return while deploy.yml exists. */
const productionDeferralPatterns = [
  /defers production deployment/i,
  /no deploy workflow/i,
  /not deployed yet/i,
  /does not deploy `out\/`/i,
  /before wiring a deploy workflow/i,
  /When a deploy workflow is added later/i,
  /Deploy gates are out of scope/i,
] as const;

const maintainerDeployContract = [
  ".github/workflows/deploy.yml",
  "make build-export",
  "GITHUB_PAGES_BASE_PATH",
  "ai-model-reference",
] as const;

function readmeDeploymentSections(
  readme: string,
): { name: string; content: string }[] {
  return [
    {
      name: "README Static export (GitHub Pages)",
      content: readme.slice(
        readme.indexOf("## Static export (GitHub Pages)"),
        readme.indexOf("## Phase 2 docs authoring"),
      ),
    },
    {
      name: "README Operations and release",
      content: readme.slice(
        readme.indexOf("## Operations and release"),
        readme.indexOf("## Quality Gates"),
      ),
    },
    {
      name: "README Quality Gates",
      content: readme.slice(readme.indexOf("## Quality Gates")),
    },
  ];
}

function assertNoProductionDeferral(
  docName: string,
  content: string,
  pattern: RegExp,
): void {
  if (pattern.test(content)) {
    throw new Error(
      `${docName} must not regress to production deployment deferral (${pattern}) while .github/workflows/deploy.yml exists`,
    );
  }
}

describe("deployment posture drift guard", () => {
  test("README deployment sections reject production deferral when deploy.yml exists", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const readme = readFileSync(readmePath, "utf8");

    for (const { name, content } of readmeDeploymentSections(readme)) {
      for (const pattern of productionDeferralPatterns) {
        assertNoProductionDeferral(name, content, pattern);
      }
    }
  });

  test("docs/operations.md rejects production deferral when deploy.yml exists", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const operations = readFileSync(operationsPath, "utf8");

    for (const pattern of productionDeferralPatterns) {
      assertNoProductionDeferral("docs/operations.md", operations, pattern);
    }
  });

  test("maintainer docs keep deploy workflow contract when deploy.yml exists", () => {
    if (!existsSync(deployWorkflowPath)) {
      return;
    }

    const readme = readFileSync(readmePath, "utf8");
    const operations = readFileSync(operationsPath, "utf8");

    for (const doc of [readme, operations]) {
      for (const value of maintainerDeployContract) {
        expect(doc).toContain(value);
      }
    }
  });
});
