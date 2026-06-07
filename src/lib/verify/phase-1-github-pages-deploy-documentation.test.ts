import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DEPLOY_DOCS_POSTURE_CHECKLIST_ROW,
  DEPLOY_DOCS_POSTURE_DOMAIN_ID,
  deriveDeployDocsPostureEvidence,
  deriveDeployDocsPostureEvidenceFromRepo,
  formatDeployDocsPostureEvidenceLine,
} from "./phase-1-github-pages-deploy-documentation";

const repoRoot = join(import.meta.dir, "../../..");

const alignedOperationsMarkdown = `# Operations

## Deployment posture

Phase 1 publishes the static export to GitHub Pages via GitHub Actions.

| Item | Value |
| --- | --- |
| Workflow file | .github/workflows/deploy.yml |
| Trigger | push to main |
| Build entrypoint | make build-export with GITHUB_PAGES_BASE_PATH: ai-model-reference |
| Published artifact | out/ |

### Required GitHub repository settings

| Setting | Phase 1 expectation |
| --- | --- |
| Pages source | GitHub Actions |
| Deploy workflow permissions | contents: read, pages: write, id-token: write, github-pages environment |

| Checklist row | Phase 1 status |
| --- | --- |
| Website deploys automatically via GitHub Actions (GitHub Pages or equivalent) | **Implemented** |
| Deployment status is visible in GitHub checks | **Implemented** on main |
`;

const alignedReadmeMarkdown = `# Learn Language Models

## Static export (GitHub Pages)

Use make build-export with GITHUB_PAGES_BASE_PATH=ai-model-reference.
The deploy workflow at .github/workflows/deploy.yml runs the same target on main pushes.

See docs/operations.md for deployment posture and required Pages settings.

## Operations and release

Merges to main trigger GitHub Pages deployment via .github/workflows/deploy.yml,
which builds out/ with make build-export. See docs/operations.md for required
Pages settings and deploy check visibility.
`;

const deferredReadmeMarkdown = `# Learn Language Models

## Static export (GitHub Pages)

Production deployment defers production deployment until a deploy workflow lands.
There is no deploy workflow checked in yet.

See docs/operations.md for deployment posture.
`;

const deferredOperationsMarkdown = `# Operations

## Deployment posture

Phase 1 defers production deployment. There is no deploy workflow yet.
`;

describe("deriveDeployDocsPostureEvidence", () => {
  test("returns pass when README and operations describe the active deploy path", () => {
    const evidence = deriveDeployDocsPostureEvidence({
      readmeMarkdown: alignedReadmeMarkdown,
      operationsMarkdown: alignedOperationsMarkdown,
      deployWorkflowExists: true,
    });

    expect(evidence.domainId).toBe(DEPLOY_DOCS_POSTURE_DOMAIN_ID);
    expect(evidence.checklistRow).toBe(DEPLOY_DOCS_POSTURE_CHECKLIST_ROW);
    expect(evidence.status).toBe("pass");
    expect(evidence.reason).toBeUndefined();
  });

  test("returns fail when deferred-language remains while deploy.yml exists", () => {
    const evidence = deriveDeployDocsPostureEvidence({
      readmeMarkdown: deferredReadmeMarkdown,
      operationsMarkdown: deferredOperationsMarkdown,
      deployWorkflowExists: true,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("README.md");
    expect(evidence.reason).toContain("docs/operations.md");
    expect(evidence.reason).toMatch(/defers production deployment/i);
    expect(evidence.reason).toMatch(/no deploy workflow/i);
  });

  test("returns uncertain when docs claim an active deploy path but deploy.yml is missing", () => {
    const evidence = deriveDeployDocsPostureEvidence({
      readmeMarkdown: alignedReadmeMarkdown,
      operationsMarkdown: alignedOperationsMarkdown,
      deployWorkflowExists: false,
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("contradictory");
  });

  test("returns uncertain when aligned workflow exists but maintainer prerequisites are incomplete", () => {
    const incompleteOperations = alignedOperationsMarkdown.replace(
      "pages: write",
      "",
    );

    const evidence = deriveDeployDocsPostureEvidence({
      readmeMarkdown: alignedReadmeMarkdown,
      operationsMarkdown: incompleteOperations,
      deployWorkflowExists: true,
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain(
      "docs/operations.md missing deploy-path marker",
    );
    expect(evidence.reason).toContain("pages: write");
  });
});

describe("deriveDeployDocsPostureEvidenceFromRepo", () => {
  test("returns pass for the checked-in README and operations deploy posture", () => {
    const evidence = deriveDeployDocsPostureEvidenceFromRepo(repoRoot);

    expect(evidence.status).toBe("pass");
    expect(evidence.domainId).toBe(DEPLOY_DOCS_POSTURE_DOMAIN_ID);
  });
});

describe("formatDeployDocsPostureEvidenceLine", () => {
  test("formats pass without reason and fail with reason", () => {
    const passLine = formatDeployDocsPostureEvidenceLine(
      deriveDeployDocsPostureEvidence({
        readmeMarkdown: alignedReadmeMarkdown,
        operationsMarkdown: alignedOperationsMarkdown,
        deployWorkflowExists: true,
      }),
    );
    const failLine = formatDeployDocsPostureEvidenceLine(
      deriveDeployDocsPostureEvidence({
        readmeMarkdown: deferredReadmeMarkdown,
        operationsMarkdown: deferredOperationsMarkdown,
        deployWorkflowExists: true,
      }),
    );

    expect(passLine).toContain("[PASS] deploy-docs-posture");
    expect(passLine).toContain(
      "checklistRow=phase-1-github-pages-deploy-documentation",
    );
    expect(failLine).toContain("[FAIL] deploy-docs-posture");
    expect(failLine).toMatch(/defers production deployment/i);
  });
});
