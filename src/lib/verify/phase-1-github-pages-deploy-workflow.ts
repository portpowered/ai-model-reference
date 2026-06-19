import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEPLOY_WORKFLOW_DOMAIN_ID = "deploy-workflow" as const;

export const DEPLOY_WORKFLOW_DOMAIN_LABEL =
  "GitHub Pages deploy workflow contract (.github/workflows/deploy.yml)";

export const DEPLOY_WORKFLOW_CHECKLIST_ROW =
  "phase-1-github-pages-deploy-workflow";

export const DEPLOY_WORKFLOW_RELATIVE_PATH =
  ".github/workflows/deploy.yml" as const;

export const CI_WORKFLOW_RELATIVE_PATH = ".github/workflows/ci.yml" as const;

export const DOCUMENTED_PRODUCTION_BRANCH = "main" as const;

export const CANONICAL_GITHUB_PAGES_BASE_PATH = "ai-model-reference" as const;

export type DeployWorkflowStatus = "pass" | "fail" | "uncertain";

export type DeployWorkflowEvidence = {
  domainId: typeof DEPLOY_WORKFLOW_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: DeployWorkflowStatus;
  reason?: string;
};

export type DeriveDeployWorkflowEvidenceInput = {
  deployWorkflowYaml: string | null | undefined;
  ciWorkflowYaml?: string | null;
};

const MISSING_DEPLOY_WORKFLOW_REASON =
  "Missing .github/workflows/deploy.yml; batch-015 deploy workflow activation did not land.";

const AMBIGUOUS_YAML_UNCERTAIN_REASON =
  "deploy.yml is present but contract signals are ambiguous; manual review required before treating the workflow as publish-ready.";

type ContractEvaluation = {
  status: DeployWorkflowStatus;
  reason?: string;
};

function buildEvidence(
  status: DeployWorkflowStatus,
  reason?: string,
): DeployWorkflowEvidence {
  return {
    domainId: DEPLOY_WORKFLOW_DOMAIN_ID,
    label: DEPLOY_WORKFLOW_DOMAIN_LABEL,
    checklistRow: DEPLOY_WORKFLOW_CHECKLIST_ROW,
    status,
    reason,
  };
}

function isAmbiguousYaml(workflow: string): boolean {
  const trimmed = workflow.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const withoutComments = trimmed
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n")
    .trim();

  if (withoutComments.length === 0) {
    return true;
  }

  return !/jobs:/m.test(withoutComments);
}

function evaluateDeployWorkflowContract(
  workflow: string,
  ciWorkflow?: string | null,
): ContractEvaluation {
  if (isAmbiguousYaml(workflow)) {
    return {
      status: "uncertain",
      reason: AMBIGUOUS_YAML_UNCERTAIN_REASON,
    };
  }

  const failures: string[] = [];
  const uncertainties: string[] = [];

  if (!/push:[\s\S]*branches:[\s\S]*- main/m.test(workflow)) {
    failures.push(
      `deploy workflow must trigger on push to ${DOCUMENTED_PRODUCTION_BRANCH}`,
    );
  }

  if (!/pages:\s*write/m.test(workflow)) {
    failures.push("deploy workflow must set pages: write permission");
  }
  if (!/id-token:\s*write/m.test(workflow)) {
    failures.push("deploy workflow must set id-token: write permission");
  }
  if (!/contents:\s*read/m.test(workflow)) {
    failures.push("deploy workflow must set contents: read permission");
  }

  if (!/run:\s*make internal-build-export/m.test(workflow)) {
    failures.push("deploy workflow must run make internal-build-export");
  }

  if (/GITHUB_PAGES_BASE_PATH:\s*\$\{\{/m.test(workflow)) {
    uncertainties.push(
      "GITHUB_PAGES_BASE_PATH is set via an expression; static contract review cannot confirm the project-site prefix",
    );
  } else if (!/GITHUB_PAGES_BASE_PATH:\s*ai-model-reference/m.test(workflow)) {
    failures.push(
      `deploy workflow must set GITHUB_PAGES_BASE_PATH to ${CANONICAL_GITHUB_PAGES_BASE_PATH}`,
    );
  }

  if (!/actions\/upload-pages-artifact@v3/m.test(workflow)) {
    failures.push(
      "deploy workflow must upload the static export with actions/upload-pages-artifact@v3",
    );
  }
  if (!/path:\s*out\//m.test(workflow)) {
    failures.push("deploy workflow must upload out/ as the Pages artifact");
  }

  if (!/actions\/deploy-pages@v4/m.test(workflow)) {
    failures.push(
      "deploy workflow must invoke actions/deploy-pages@v4 in a deploy job",
    );
  }
  if (!/^\s*deploy:\s*$/m.test(workflow)) {
    failures.push("deploy workflow must declare a separate deploy job");
  }
  if (!/needs:\s*build/m.test(workflow)) {
    failures.push("deploy job must depend on the build job via needs: build");
  }

  if (ciWorkflow) {
    if (workflow.trim() === ciWorkflow.trim()) {
      failures.push(
        "deploy workflow must be separate from .github/workflows/ci.yml",
      );
    }
    if (/pull_request:/m.test(workflow)) {
      failures.push(
        "deploy workflow must not replace CI pull_request triggers; keep deploy separate from ci.yml",
      );
    }
    if (
      /actions\/upload-pages-artifact|actions\/deploy-pages|actions\/configure-pages/m.test(
        ciWorkflow,
      )
    ) {
      failures.push(
        "ci.yml must not publish Pages artifacts while deploy.yml exists",
      );
    }
  }

  if (failures.length > 0) {
    return {
      status: "fail",
      reason: failures.join("; "),
    };
  }

  if (uncertainties.length > 0) {
    return {
      status: "uncertain",
      reason: uncertainties.join("; "),
    };
  }

  return { status: "pass" };
}

/**
 * Derives deploy-workflow pass/fail/uncertain evidence from captured workflow
 * YAML. Missing deploy.yml or required contract signals yield fail; ambiguous
 * YAML yields uncertain.
 */
export function deriveDeployWorkflowEvidence(
  input: DeriveDeployWorkflowEvidenceInput,
): DeployWorkflowEvidence {
  const deployWorkflowYaml = input.deployWorkflowYaml;

  if (deployWorkflowYaml == null || deployWorkflowYaml.trim().length === 0) {
    return buildEvidence("fail", MISSING_DEPLOY_WORKFLOW_REASON);
  }

  const evaluation = evaluateDeployWorkflowContract(
    deployWorkflowYaml,
    input.ciWorkflowYaml,
  );
  return buildEvidence(evaluation.status, evaluation.reason);
}

export function deriveDeployWorkflowEvidenceFromRepo(
  repoRoot: string,
): DeployWorkflowEvidence {
  const deployWorkflowPath = join(repoRoot, DEPLOY_WORKFLOW_RELATIVE_PATH);
  const ciWorkflowPath = join(repoRoot, CI_WORKFLOW_RELATIVE_PATH);

  if (!existsSync(deployWorkflowPath)) {
    return buildEvidence("fail", MISSING_DEPLOY_WORKFLOW_REASON);
  }

  const deployWorkflowYaml = readFileSync(deployWorkflowPath, "utf8");
  const ciWorkflowYaml = existsSync(ciWorkflowPath)
    ? readFileSync(ciWorkflowPath, "utf8")
    : null;

  return deriveDeployWorkflowEvidence({
    deployWorkflowYaml,
    ciWorkflowYaml,
  });
}

export function formatDeployWorkflowEvidenceLine(
  evidence: DeployWorkflowEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
