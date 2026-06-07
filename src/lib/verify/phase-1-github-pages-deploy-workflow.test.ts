import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DEPLOY_WORKFLOW_CHECKLIST_ROW,
  DEPLOY_WORKFLOW_DOMAIN_ID,
  deriveDeployWorkflowEvidence,
  deriveDeployWorkflowEvidenceFromRepo,
  formatDeployWorkflowEvidenceLine,
} from "./phase-1-github-pages-deploy-workflow";

const repoRoot = join(import.meta.dir, "../../..");

const passingDeployWorkflow = `# Maintainer deploy and release policy: docs/operations.md
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Build static export
        run: make build-export
        env:
          GITHUB_PAGES_BASE_PATH: ai-model-reference
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
`;

const passingCiWorkflow = `name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - run: make ci
`;

describe("deriveDeployWorkflowEvidence", () => {
  test("returns pass for a deploy workflow that matches the static export publish contract", () => {
    const evidence = deriveDeployWorkflowEvidence({
      deployWorkflowYaml: passingDeployWorkflow,
      ciWorkflowYaml: passingCiWorkflow,
    });

    expect(evidence.domainId).toBe(DEPLOY_WORKFLOW_DOMAIN_ID);
    expect(evidence.checklistRow).toBe(DEPLOY_WORKFLOW_CHECKLIST_ROW);
    expect(evidence.status).toBe("pass");
    expect(evidence.reason).toBeUndefined();
  });

  test("returns fail when deploy workflow file content is missing", () => {
    const evidence = deriveDeployWorkflowEvidence({
      deployWorkflowYaml: null,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("Missing .github/workflows/deploy.yml");
  });

  test("returns fail when required contract signals are absent", () => {
    const evidence = deriveDeployWorkflowEvidence({
      deployWorkflowYaml: `name: Deploy GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: make ci
`,
      ciWorkflowYaml: passingCiWorkflow,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("pages: write permission");
    expect(evidence.reason).toContain("make build-export");
    expect(evidence.reason).toContain("actions/deploy-pages@v4");
  });

  test("returns uncertain when GITHUB_PAGES_BASE_PATH uses an expression", () => {
    const expressionBasePath =
      "GITHUB_PAGES_BASE_PATH: $" + "{{ vars.GITHUB_PAGES_BASE_PATH }}";
    const workflow = passingDeployWorkflow.replace(
      "GITHUB_PAGES_BASE_PATH: ai-model-reference",
      expressionBasePath,
    );

    const evidence = deriveDeployWorkflowEvidence({
      deployWorkflowYaml: workflow,
      ciWorkflowYaml: passingCiWorkflow,
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("expression");
  });

  test("returns uncertain when deploy.yml shape is too ambiguous to evaluate", () => {
    const evidence = deriveDeployWorkflowEvidence({
      deployWorkflowYaml: "# placeholder deploy notes only\n",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("ambiguous");
  });
});

describe("deriveDeployWorkflowEvidenceFromRepo", () => {
  test("returns pass for the checked-in deploy workflow contract", () => {
    const evidence = deriveDeployWorkflowEvidenceFromRepo(repoRoot);

    expect(evidence.status).toBe("pass");
    expect(evidence.domainId).toBe(DEPLOY_WORKFLOW_DOMAIN_ID);
  });
});

describe("formatDeployWorkflowEvidenceLine", () => {
  test("formats pass without reason and fail with reason", () => {
    const passLine = formatDeployWorkflowEvidenceLine(
      deriveDeployWorkflowEvidence({
        deployWorkflowYaml: passingDeployWorkflow,
        ciWorkflowYaml: passingCiWorkflow,
      }),
    );
    const failLine = formatDeployWorkflowEvidenceLine(
      deriveDeployWorkflowEvidence({
        deployWorkflowYaml: null,
      }),
    );

    expect(passLine).toContain("[PASS] deploy-workflow");
    expect(passLine).toContain(
      "checklistRow=phase-1-github-pages-deploy-workflow",
    );
    expect(failLine).toContain("[FAIL] deploy-workflow");
    expect(failLine).toContain("Missing .github/workflows/deploy.yml");
  });
});
