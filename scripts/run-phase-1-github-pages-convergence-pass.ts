import { spawn } from "node:child_process";
import { join } from "node:path";
import { resolveBasePathForExportVerification } from "../src/lib/build/static-export";
import {
  type ExportSearchShellGateOutcome,
  mergeExportSearchConvergenceRows,
} from "../src/lib/verify/phase-1-export-search-convergence-evidence";
import {
  buildPhase1GitHubPagesConvergenceEvidenceSummary,
  getPhase1GitHubPagesConvergenceExitCode,
  printPhase1GitHubPagesConvergenceEvidenceSummary,
} from "../src/lib/verify/phase-1-github-pages-convergence-evidence";
import {
  STATIC_REGRESSION_QUERIES,
  STATIC_REGRESSION_ROUTES,
  type StaticRegressionCheckRow,
} from "../src/lib/verify/phase-1-github-pages-static-regression";
import { runPhase1GitHubPagesStaticRegressionChecks } from "../src/lib/verify/phase-1-github-pages-static-regression-http";
import { verifyPhase1ExportSearchShellFromOutDir } from "../src/lib/verify/phase-1-search-export-shell-checks";
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
  staticRegressionSkipped?: boolean;
  staticRegressionSkipReason?: string;
  staticRegressionRows?: StaticRegressionCheckRow[];
  exportSearchShellGate?: ExportSearchShellGateOutcome;
};

function extractHydrationProbeOutcomesFromRows(
  rows: readonly StaticRegressionCheckRow[],
): { query: (typeof STATIC_REGRESSION_QUERIES)[number]; reason?: string }[] {
  return STATIC_REGRESSION_QUERIES.map((query) => {
    const failure = rows.find(
      (row) =>
        row.route === STATIC_REGRESSION_ROUTES.searchPage &&
        row.query === query &&
        row.status === "fail",
    );
    return { query, reason: failure?.reason };
  });
}

function buildStaticRegressionRowsWithExportSearchClassification(
  probeRows: readonly StaticRegressionCheckRow[],
  shellGate: ExportSearchShellGateOutcome,
): StaticRegressionCheckRow[] {
  return mergeExportSearchConvergenceRows(probeRows, {
    shellGate,
    hydrationProbes: shellGate.ok
      ? extractHydrationProbeOutcomesFromRows(probeRows)
      : undefined,
  });
}

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
  exportSearchShellGate: ExportSearchShellGateOutcome,
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
    console.log(
      "Phase 1 batch-014 GitHub Pages convergence: running static search and route regression probes",
    );
    const probeRows = await runPhase1GitHubPagesStaticRegressionChecks(
      lifecycle.baseUrl,
      { exportSearchShellGate },
    );
    const staticRegressionRows =
      buildStaticRegressionRowsWithExportSearchClassification(
        probeRows,
        exportSearchShellGate,
      );
    return {
      staticServerLifecycleStatus: "pass",
      staticRegressionRows,
      exportSearchShellGate,
    };
  } finally {
    await lifecycle.session.cleanup();
  }
}

async function main(): Promise<number> {
  console.log(
    "Phase 1 batch-014 GitHub Pages convergence: running make internal-build-export",
  );
  const buildExportResult = await runShellCommand("make internal-build-export");
  const basePath = resolveBasePathForExportVerification(process.env);

  const upstreamStaticSkipReason =
    "Static export server verification skipped because make internal-build-export did not succeed.";
  let staticServerInput: StaticServerLifecycleInput = {
    staticServerSkipped: true,
    staticServerSkipReason: upstreamStaticSkipReason,
    staticRegressionSkipped: true,
    staticRegressionSkipReason:
      "Static regression probes skipped because make internal-build-export did not succeed.",
  };

  let exportSearchShellGate: ExportSearchShellGateOutcome = { ok: true };

  if (buildExportResult.exitCode !== 0) {
    console.error(
      "\nPhase 1 batch-014 GitHub Pages convergence: make internal-build-export failed; skipping static verification.",
    );
  } else {
    exportSearchShellGate = verifyPhase1ExportSearchShellFromOutDir("out", {
      cwd: projectRoot,
    });
    if (!exportSearchShellGate.ok) {
      console.error(
        `\nPhase 1 batch-014 GitHub Pages convergence: export search route shell gate failed — ${exportSearchShellGate.reason}`,
      );
    }

    staticServerInput = await runStaticServerLifecycleStage(
      basePath,
      exportSearchShellGate,
    );
    staticServerInput.exportSearchShellGate = exportSearchShellGate;

    if (staticServerInput.staticServerLifecycleStatus === "fail") {
      staticServerInput.staticRegressionSkipped = true;
      staticServerInput.staticRegressionSkipReason =
        "Static regression probes skipped because the static export server lifecycle failed.";
    }
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
