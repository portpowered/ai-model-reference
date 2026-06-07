import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEPLOY_WORKFLOW_RELATIVE_PATH,
  DOCUMENTED_PRODUCTION_BRANCH,
} from "./phase-1-github-pages-deploy-workflow";

export const DEPLOY_DOCS_POSTURE_DOMAIN_ID = "deploy-docs-posture" as const;

export const DEPLOY_DOCS_POSTURE_DOMAIN_LABEL =
  "Deploy-facing documentation posture (README.md and docs/operations.md)";

export const DEPLOY_DOCS_POSTURE_CHECKLIST_ROW =
  "phase-1-github-pages-deploy-documentation";

export const README_RELATIVE_PATH = "README.md" as const;

export const OPERATIONS_RELATIVE_PATH = "docs/operations.md" as const;

export type DeployDocsPostureStatus = "pass" | "fail" | "uncertain";

export type DeployDocsPostureEvidence = {
  domainId: typeof DEPLOY_DOCS_POSTURE_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: DeployDocsPostureStatus;
  reason?: string;
};

export type DeriveDeployDocsPostureEvidenceInput = {
  readmeMarkdown: string | null | undefined;
  operationsMarkdown: string | null | undefined;
  deployWorkflowExists: boolean;
};

/** Production-deploy deferral phrases that must not remain while deploy.yml exists. */
export const PRODUCTION_DEPLOYMENT_DEFERRAL_PATTERNS: readonly RegExp[] = [
  /defers production deployment/i,
  /no deploy workflow/i,
  /not deployed yet/i,
  /does not deploy `out\/`/i,
  /before wiring a deploy workflow/i,
  /When a deploy workflow is added later/i,
  /Deploy gates are out of scope/i,
] as const;

export const MAINTAINER_DEPLOY_CONTRACT_MARKERS: readonly string[] = [
  DEPLOY_WORKFLOW_RELATIVE_PATH,
  "make build-export",
  "GITHUB_PAGES_BASE_PATH",
  "ai-model-reference",
] as const;

export const OPERATIONS_PAGES_PREREQUISITE_MARKERS: readonly string[] = [
  "GitHub Actions",
  "pages: write",
  "id-token: write",
  "contents: read",
  "github-pages",
] as const;

export const README_OPERATIONS_CROSS_LINK = "docs/operations.md";

type ContractGap = {
  document: "README.md" | "docs/operations.md";
  missing: string;
};

function buildEvidence(
  status: DeployDocsPostureStatus,
  reason?: string,
): DeployDocsPostureEvidence {
  return {
    domainId: DEPLOY_DOCS_POSTURE_DOMAIN_ID,
    label: DEPLOY_DOCS_POSTURE_DOMAIN_LABEL,
    checklistRow: DEPLOY_DOCS_POSTURE_CHECKLIST_ROW,
    status,
    reason,
  };
}

function findProductionDeferralMatches(
  documentLabel: "README.md" | "docs/operations.md",
  content: string,
): string[] {
  const matches: string[] = [];
  for (const pattern of PRODUCTION_DEPLOYMENT_DEFERRAL_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[0]) {
      matches.push(
        `${documentLabel} still claims production deployment deferral (${match[0]})`,
      );
    }
  }
  return matches;
}

function findContractGaps(
  document: "README.md" | "docs/operations.md",
  content: string,
  markers: readonly string[],
): ContractGap[] {
  const gaps: ContractGap[] = [];
  for (const marker of markers) {
    if (!content.includes(marker)) {
      gaps.push({ document, missing: marker });
    }
  }
  return gaps;
}

function formatContractGapReason(gaps: readonly ContractGap[]): string {
  return gaps
    .map((gap) => `${gap.document} missing deploy-path marker: ${gap.missing}`)
    .join("; ");
}

function claimsActiveDeployPath(
  readmeMarkdown: string,
  operationsMarkdown: string,
): boolean {
  const combined = `${readmeMarkdown}\n${operationsMarkdown}`;
  return (
    combined.includes(DEPLOY_WORKFLOW_RELATIVE_PATH) &&
    combined.includes("make build-export") &&
    /\*\*Implemented\*\*/i.test(operationsMarkdown)
  );
}

function evaluateDeployDocsPosture(
  input: DeriveDeployDocsPostureEvidenceInput,
): DeployDocsPostureEvidence {
  const readmeMarkdown = input.readmeMarkdown ?? "";
  const operationsMarkdown = input.operationsMarkdown ?? "";

  if (readmeMarkdown.trim().length === 0) {
    return buildEvidence(
      "uncertain",
      "README.md is missing or empty; cannot confirm deploy-facing documentation posture.",
    );
  }

  if (operationsMarkdown.trim().length === 0) {
    return buildEvidence(
      "uncertain",
      "docs/operations.md is missing or empty; cannot confirm maintainer deploy prerequisites.",
    );
  }

  if (input.deployWorkflowExists) {
    const deferralFailures = [
      ...findProductionDeferralMatches("README.md", readmeMarkdown),
      ...findProductionDeferralMatches(
        "docs/operations.md",
        operationsMarkdown,
      ),
    ];
    if (deferralFailures.length > 0) {
      return buildEvidence("fail", deferralFailures.join("; "));
    }
  } else if (claimsActiveDeployPath(readmeMarkdown, operationsMarkdown)) {
    return buildEvidence(
      "uncertain",
      "README.md and docs/operations.md describe an active deploy path but .github/workflows/deploy.yml is missing; documentation and workflow activation are contradictory.",
    );
  }

  const contractGaps = [
    ...findContractGaps(
      "README.md",
      readmeMarkdown,
      MAINTAINER_DEPLOY_CONTRACT_MARKERS,
    ),
    ...findContractGaps(
      "docs/operations.md",
      operationsMarkdown,
      MAINTAINER_DEPLOY_CONTRACT_MARKERS,
    ),
    ...findContractGaps(
      "docs/operations.md",
      operationsMarkdown,
      OPERATIONS_PAGES_PREREQUISITE_MARKERS,
    ),
  ];

  if (!readmeMarkdown.includes(README_OPERATIONS_CROSS_LINK)) {
    contractGaps.push({
      document: "README.md",
      missing: README_OPERATIONS_CROSS_LINK,
    });
  }

  if (!operationsMarkdown.includes(DOCUMENTED_PRODUCTION_BRANCH)) {
    contractGaps.push({
      document: "docs/operations.md",
      missing: `push to ${DOCUMENTED_PRODUCTION_BRANCH}`,
    });
  }

  if (contractGaps.length > 0) {
    return buildEvidence("uncertain", formatContractGapReason(contractGaps));
  }

  if (!input.deployWorkflowExists) {
    return buildEvidence(
      "uncertain",
      "Deploy-facing docs do not contradict the missing deploy workflow, but .github/workflows/deploy.yml is still absent; confirm whether documentation should defer production deployment.",
    );
  }

  return buildEvidence("pass");
}

/**
 * Derives deploy-docs-posture pass/fail/uncertain evidence from captured README
 * and operations markdown. Deferred production language while deploy.yml exists
 * yields fail; contradictory or incomplete guidance yields uncertain.
 */
export function deriveDeployDocsPostureEvidence(
  input: DeriveDeployDocsPostureEvidenceInput,
): DeployDocsPostureEvidence {
  return evaluateDeployDocsPosture(input);
}

export function deriveDeployDocsPostureEvidenceFromRepo(
  repoRoot: string,
): DeployDocsPostureEvidence {
  const readmePath = join(repoRoot, README_RELATIVE_PATH);
  const operationsPath = join(repoRoot, OPERATIONS_RELATIVE_PATH);
  const deployWorkflowPath = join(repoRoot, DEPLOY_WORKFLOW_RELATIVE_PATH);

  const readmeMarkdown = existsSync(readmePath)
    ? readFileSync(readmePath, "utf8")
    : null;
  const operationsMarkdown = existsSync(operationsPath)
    ? readFileSync(operationsPath, "utf8")
    : null;

  return deriveDeployDocsPostureEvidence({
    readmeMarkdown,
    operationsMarkdown,
    deployWorkflowExists: existsSync(deployWorkflowPath),
  });
}

export function formatDeployDocsPostureEvidenceLine(
  evidence: DeployDocsPostureEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
