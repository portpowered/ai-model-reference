import { spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const verifyDir = join(repoRoot, "src/lib/verify");

const prepareResult = spawnSync("bun", ["run", "pretest"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (prepareResult.status !== 0) {
  process.exit(prepareResult.status ?? 1);
}

const websiteVerifierPatterns = [
  /customer-ask-.*convergence(-http)?\.test\.ts$/,
  /diffusion-transformer-block-module-convergence\.test\.ts$/,
  /diffusion-transformer-block-module-graph-viewport-http\.test\.ts$/,
  /docs-footer-hover-checks\.test\.ts$/,
  /docs-shell-convergence(-http)?\.test\.ts$/,
  /export-search-ux-checks\.test\.ts$/,
  /github-pages-static-regression(-http)?\.test\.ts$/,
  /glossary-page-convergence(-http)?\.test\.ts$/,
  /gated-deltanet-module-graph-viewport-http\.test\.ts$/,
  /gqa-module.*convergence(-http)?\.test\.ts$/,
  /grouped-query-attention-module-convergence\.test\.ts$/,
  /home-search-entry-convergence(-http)?\.test\.ts$/,
  /linear-attention-module-convergence\.test\.ts$/,
  /multi-head-latent-attention-module-convergence\.test\.ts$/,
  /multi-token-prediction-module-graph-viewport-http\.test\.ts$/,
  /roofline-throughput-explorer-viewport-http\.test\.tsx$/,
  /reader-convergence-http\.test\.ts$/,
  /reader-route-checks\.test\.ts$/,
  /reader-route-content-convergence(-http)?\.test\.ts$/,
  /reader-ux-convergence\.test\.ts$/,
  /rendered-quality-accessibility-convergence\.test\.ts$/,
  /rendered-quality-baseline-accessibility\.test\.ts$/,
  /rendered-quality-baseline-graph-interaction\.test\.ts$/,
  /rendered-quality-baseline-rich-content\.test\.ts$/,
  /search-built-app-shell-checks\.test\.ts$/,
  /search-checks\.test\.ts$/,
  /search-dialog-checks\.test\.ts$/,
  /search-export-shell-checks\.test\.ts$/,
  /search-page-checks\.test\.ts$/,
  /sliding-window-attention-module-convergence\.test\.ts$/,
  /sparse-attention-module-convergence\.test\.ts$/,
  /static-export-gqa-graph-hydration-http\.test\.ts$/,
  /static-export-mtp-graph-hydration-http\.test\.ts$/,
  /static-export-search-.*-http\.test\.ts$/,
  /tags-navigation-convergence(-http)?\.test\.ts$/,
];

const toolingVerifierPatterns = [
  /-check-inventory\.test\.ts$/,
  /-closure\.test\.ts$/,
  /-command-path\.test\.ts$/,
  /-domain\.test\.ts$/,
  /-evidence\.test\.ts$/,
  /-orchestrator\.test\.ts$/,
  /-pass\.test\.ts$/,
  /-reporter\.test\.ts$/,
  /-validator\.test\.ts$/,
  /build-source-fingerprint\.test\.ts$/,
  /built-html-convergence-test-helpers\.test\.ts$/,
  /export-integration-probe-lock\.test\.ts$/,
  /export-probe-spawn-guard\.test\.ts$/,
  /github-pages-deploy-static-harness\.test\.ts$/,
  /github-pages-deploy-path-search(-http)?\.test\.ts$/,
  /github-pages-deploy-workflow\.test\.ts$/,
  /github-pages-export-command-path\.test\.ts$/,
  /github-pages-static-server-command-path\.test\.ts$/,
  /http-harness\.test\.ts$/,
  /launch-playwright-browser\.test\.ts$/,
  /production-integration-.*\.test\.ts$/,
  /reader-ux-verifier\.test\.ts$/,
  /rendered-quality-regression\.test\.ts$/,
  /search-shortcut-checks\.test\.ts$/,
  /server-lifecycle\.test\.ts$/,
  /static-export-http-server\.test\.ts$/,
  /static-export-server-lifecycle\.test\.ts$/,
  /verifier-coverage-gate\.test\.ts$/,
  /verify-listen-port-lock\.test\.ts$/,
];

function isWebsiteVerifierTest(fileName: string): boolean {
  return (
    websiteVerifierPatterns.some((pattern) => pattern.test(fileName)) &&
    !toolingVerifierPatterns.some((pattern) => pattern.test(fileName))
  );
}

const testFiles = readdirSync(verifyDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter(isWebsiteVerifierTest)
  .map((fileName) => `src/lib/verify/${fileName}`)
  .sort();

if (testFiles.length === 0) {
  console.error("No website verifier test files found.");
  process.exit(1);
}

const child = spawn("bun", ["test", ...testFiles], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

child.once("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.once("close", (code) => {
  process.exit(code ?? 1);
});
