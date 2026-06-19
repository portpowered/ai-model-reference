import { GITHUB_PAGES_BASE_PATH_ENV } from "@/lib/build/static-export";
import {
  DEFAULT_EXPORT_OUT_DIR,
  formatPhase1ExportRouteFailure,
  verifyPhase1ExportRoutesFromOutDir,
} from "@/lib/build/verify-phase-1-export-routes";
import { CANONICAL_GITHUB_PAGES_BASE_PATH } from "./phase-1-github-pages-deploy-workflow";
import { deriveExportCommandPathEvidence } from "./phase-1-github-pages-export-command-path";

export const DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID = "export-artifact" as const;

export const DEPLOY_EXPORT_ARTIFACT_DOMAIN_LABEL =
  "GitHub Pages export artifact (make internal-build-export + export-route gate)";

export const DEPLOY_EXPORT_ARTIFACT_CHECKLIST_ROW =
  "phase-1-export-route-gate" as const;

export const DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND =
  "make internal-build-export" as const;

export type DeployExportArtifactStatus = "pass" | "fail" | "uncertain";

export type DeployExportArtifactEvidence = {
  domainId: typeof DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: DeployExportArtifactStatus;
  reason?: string;
};

export type DeriveDeployExportArtifactEvidenceInput = {
  buildExportOutput: string;
  buildExportExitCode: number;
  outDir?: string;
  cwd?: string;
  basePath?: string;
};

const MISSING_OUT_AFTER_ZERO_EXIT_UNCERTAIN_REASON =
  "make internal-build-export exited 0 but out/ is missing or incomplete; cannot confirm export-route gate health.";

function buildEvidence(
  status: DeployExportArtifactStatus,
  reason?: string,
): DeployExportArtifactEvidence {
  return {
    domainId: DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID,
    label: DEPLOY_EXPORT_ARTIFACT_DOMAIN_LABEL,
    checklistRow: DEPLOY_EXPORT_ARTIFACT_CHECKLIST_ROW,
    status,
    reason,
  };
}

function resolveCanonicalBasePath(
  input: DeriveDeployExportArtifactEvidenceInput,
): string {
  if (input.basePath !== undefined) {
    return input.basePath;
  }
  return `/${CANONICAL_GITHUB_PAGES_BASE_PATH}`;
}

/**
 * Environment for the deploy convergence `make internal-build-export` step with the
 * canonical GitHub Pages project-site base path.
 */
export function buildDeployConvergenceBuildExportEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...env,
    [GITHUB_PAGES_BASE_PATH_ENV]: CANONICAL_GITHUB_PAGES_BASE_PATH,
  };
}

/**
 * Derives export-artifact pass/fail/uncertain evidence from captured
 * `make internal-build-export` output and `verifyPhase1ExportRoutesFromOutDir` against
 * the built `out/` tree. Build or route verification failures yield fail;
 * missing `out/` after a zero exit yields uncertain.
 */
export function deriveDeployExportArtifactEvidence(
  input: DeriveDeployExportArtifactEvidenceInput,
): DeployExportArtifactEvidence {
  const outDir = input.outDir ?? DEFAULT_EXPORT_OUT_DIR;
  const cwd = input.cwd ?? process.cwd();
  const basePath = resolveCanonicalBasePath(input);

  if (input.buildExportExitCode !== 0) {
    const commandPathEvidence = deriveExportCommandPathEvidence({
      output: input.buildExportOutput,
      exitCode: input.buildExportExitCode,
    });
    if (commandPathEvidence.status === "fail" && commandPathEvidence.reason) {
      return buildEvidence("fail", commandPathEvidence.reason);
    }

    const trimmedOutput = input.buildExportOutput.trim();
    const lastLine = trimmedOutput.split(/\r?\n/).at(-1)?.trim();
    return buildEvidence(
      "fail",
      lastLine && lastLine.length > 0
        ? lastLine
        : `${DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND} exited with code ${input.buildExportExitCode}`,
    );
  }

  const routeVerification = verifyPhase1ExportRoutesFromOutDir(outDir, {
    cwd,
    basePath,
  });

  if (!routeVerification.ok) {
    if (routeVerification.route === null) {
      return buildEvidence(
        "uncertain",
        routeVerification.reason ??
          MISSING_OUT_AFTER_ZERO_EXIT_UNCERTAIN_REASON,
      );
    }

    return buildEvidence(
      "fail",
      formatPhase1ExportRouteFailure(routeVerification),
    );
  }

  return buildEvidence("pass");
}

export function formatDeployExportArtifactEvidenceLine(
  evidence: DeployExportArtifactEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
