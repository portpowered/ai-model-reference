import { spawn } from "node:child_process";
import { join } from "node:path";
import { resolveBasePathForExportVerification } from "../src/lib/build/static-export";
import {
  buildPhase1GitHubPagesConvergenceEvidenceSummary,
  getPhase1GitHubPagesConvergenceExitCode,
  printPhase1GitHubPagesConvergenceEvidenceSummary,
} from "../src/lib/verify/phase-1-github-pages-convergence-evidence";
import { runStaticExportServerLifecycle } from "../src/lib/verify/static-export-server-lifecycle";

const projectRoot = join(import.meta.dir, "..");

type CommandResult = {
  exitCode: number;
  output: string;
};

type StaticServerLifecycleInput = {
  staticServerSkipped?: boolean;
  staticServerSkipReason?: string;
  staticServerLifecycleStatus?: "pass" | "fail";
  staticServerLifecycleReason?: string;
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

async function runStaticServerLifecycleStage(
  basePath: string,
): Promise<StaticServerLifecycleInput> {
  console.log(
    "Phase 1 batch-014 GitHub Pages convergence: serving out/ from loopback static file server",
  );

  const lifecycle = await runStaticExportServerLifecycle({
    cwd: projectRoot,
    basePath,
  });

  if (lifecycle.status === "fail") {
    console.error(
      `\nPhase 1 batch-014 GitHub Pages convergence: static export server failed — ${lifecycle.reason}`,
    );
    return {
      staticServerLifecycleStatus: "fail",
      staticServerLifecycleReason: lifecycle.reason,
    };
  }

  try {
    console.log(
      `\nPhase 1 batch-014 GitHub Pages convergence: static export server ready at ${lifecycle.baseUrl}`,
    );
    return {
      staticServerLifecycleStatus: "pass",
    };
  } finally {
    await lifecycle.session.cleanup();
  }
}

async function main(): Promise<number> {
  console.log(
    "Phase 1 batch-014 GitHub Pages convergence: running make build-export",
  );
  const buildExportResult = await runShellCommand("make build-export");
  const basePath = resolveBasePathForExportVerification(process.env);

  let staticServerInput: StaticServerLifecycleInput = {
    staticServerSkipped: true,
    staticServerSkipReason:
      "Static export server verification skipped because make build-export did not succeed.",
  };

  if (buildExportResult.exitCode !== 0) {
    console.error(
      "\nPhase 1 batch-014 GitHub Pages convergence: make build-export failed; skipping static verification.",
    );
  } else {
    staticServerInput = await runStaticServerLifecycleStage(basePath);
  }

  const evidenceSummary = buildPhase1GitHubPagesConvergenceEvidenceSummary({
    buildExportOutput: buildExportResult.output,
    buildExportExitCode: buildExportResult.exitCode,
    cwd: projectRoot,
    basePath,
    ...staticServerInput,
  });
  console.log("");
  printPhase1GitHubPagesConvergenceEvidenceSummary(evidenceSummary);

  return getPhase1GitHubPagesConvergenceExitCode(evidenceSummary);
}

const exitCode = await main();
process.exit(exitCode);
