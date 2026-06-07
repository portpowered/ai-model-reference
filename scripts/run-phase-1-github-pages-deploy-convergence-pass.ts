import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  buildPhase1GitHubPagesDeployConvergenceEvidenceSummary,
  getPhase1GitHubPagesDeployConvergenceExitCode,
  printPhase1GitHubPagesDeployConvergenceEvidenceSummary,
} from "../src/lib/verify/phase-1-github-pages-deploy-convergence-evidence";
import {
  buildDeployConvergenceBuildExportEnv,
  DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND,
} from "../src/lib/verify/phase-1-github-pages-deploy-export-artifact";
import { deriveDeployPathSearchEvidenceFromHarnessOutcome } from "../src/lib/verify/phase-1-github-pages-deploy-path-search-http";
import {
  acquireStaticExportVerifySession,
  buildDeployConvergenceVerifyEnv,
  resolveDeployStaticHarnessBasePath,
} from "../src/lib/verify/phase-1-github-pages-deploy-static-harness";

const projectRoot = join(import.meta.dir, "..");

type CommandResult = {
  exitCode: number;
  output: string;
};

async function runShellCommand(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: projectRoot,
      shell: true,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });
  });
}

async function main(): Promise<number> {
  console.log(
    "Phase 1 batch-015 GitHub Pages deploy convergence: inspecting deploy workflow and documentation posture",
  );

  const basePath = resolveDeployStaticHarnessBasePath();

  console.log(
    `Phase 1 batch-015 GitHub Pages deploy convergence: running ${DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND} with canonical GITHUB_PAGES_BASE_PATH`,
  );
  const buildExportResult = await runShellCommand(
    DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND,
    buildDeployConvergenceBuildExportEnv(),
  );

  let deployPathSearchEvidence:
    | Awaited<
        ReturnType<typeof deriveDeployPathSearchEvidenceFromHarnessOutcome>
      >
    | undefined;

  if (buildExportResult.exitCode !== 0) {
    console.error(
      `\nPhase 1 batch-015 GitHub Pages deploy convergence: ${DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND} failed; skipping deploy-path static harness and /search probes.`,
    );
  } else {
    console.log(
      "\nPhase 1 batch-015 GitHub Pages deploy convergence: serving out/ from loopback static file server with project-site base path",
    );
    const harnessOutcome = await acquireStaticExportVerifySession({
      cwd: projectRoot,
      basePath,
      env: buildDeployConvergenceVerifyEnv(),
    });

    if (harnessOutcome.status === "fail") {
      console.error(
        `\nPhase 1 batch-015 GitHub Pages deploy convergence: static export harness failed — ${harnessOutcome.reason}`,
      );
      deployPathSearchEvidence =
        await deriveDeployPathSearchEvidenceFromHarnessOutcome(harnessOutcome);
    } else {
      console.log(
        `\nPhase 1 batch-015 GitHub Pages deploy convergence: static export harness ready at ${harnessOutcome.baseUrl}`,
      );
      console.log(
        "Phase 1 batch-015 GitHub Pages deploy convergence: running deploy-path /search probes (GQA, attention, KV cache)",
      );
      deployPathSearchEvidence =
        await deriveDeployPathSearchEvidenceFromHarnessOutcome(harnessOutcome);
    }
  }

  const evidenceSummary =
    buildPhase1GitHubPagesDeployConvergenceEvidenceSummary({
      repoRoot: projectRoot,
      cwd: projectRoot,
      basePath,
      buildExportOutput: buildExportResult.output,
      buildExportExitCode: buildExportResult.exitCode,
      deployPathSearch: deployPathSearchEvidence,
      deployPathSearchSkipped: deployPathSearchEvidence === undefined,
      deployPathSearchSkipReason:
        deployPathSearchEvidence === undefined
          ? `Deploy-path search probes skipped because ${DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND} did not succeed.`
          : undefined,
      deployPathSearchSkipStatus:
        deployPathSearchEvidence === undefined ? "uncertain" : undefined,
    });

  console.log("");
  printPhase1GitHubPagesDeployConvergenceEvidenceSummary(evidenceSummary);

  return getPhase1GitHubPagesDeployConvergenceExitCode(evidenceSummary);
}

const exitCode = await main();
process.exit(exitCode);
