import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GITHUB_PAGES_BASE_PATH_ENV } from "@/lib/build/static-export";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  buildDeployConvergenceBuildExportEnv,
  DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND,
  DEPLOY_EXPORT_ARTIFACT_CHECKLIST_ROW,
  DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID,
  deriveDeployExportArtifactEvidence,
  formatDeployExportArtifactEvidenceLine,
} from "./phase-1-github-pages-deploy-export-artifact";
import { CANONICAL_GITHUB_PAGES_BASE_PATH } from "./phase-1-github-pages-deploy-workflow";
import {
  EXPORT_BUILD_SUCCESS_ROUTE_MARKER,
  EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER,
} from "./phase-1-github-pages-export-command-path";
import { buildSearchPageExportShellStubBody } from "./phase-1-search-export-shell-checks";

const PASSING_ROUTE_HTML: Record<string, string> = {
  "/": "<html><title>Model Atlas</title></html>",
  "/search": `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
  "/docs/architecture": "<html><h1>Architecture</h1><p>Token</p></html>",
  "/docs/glossary": "<html><h1>Glossary</h1><p>Token</p></html>",
  "/docs/glossary/token":
    '<html><h1>Token</h1><div data-registry-id="concept.token"></div></html>',
  "/docs/glossary/vector":
    '<html><h1>Vector</h1><article data-registry-id="concept.vector"></article></html>',
  "/docs/glossary/hidden-size":
    '<html><h1>Hidden Size</h1><article data-registry-id="concept.hidden-size"></article></html>',
  "/docs/modules/attention":
    '<html><h1>Attention</h1><div data-registry-id="module.attention"></div><a href="/docs/modules/multi-head-attention">MHA</a><a href="/docs/modules/multi-query-attention">MQA</a><a href="/docs/modules/grouped-query-attention">GQA</a></html>',
  "/tags": '<html><h1>Tags</h1><a href="/tags/attention">Attention</a></html>',
  "/tags/attention":
    '<html><h1>Attention</h1><a href="/docs/modules/grouped-query-attention">GQA</a><a href="/docs/glossary/token">Token</a><a href="/search?tag=attention">Search</a></html>',
  "/docs/modules/grouped-query-attention": `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
};

function routeToRelativeHtmlPath(route: string): string {
  if (route === "/") {
    return "index.html";
  }
  const trimmed = route.startsWith("/") ? route.slice(1) : route;
  return `${trimmed}.html`;
}

function writePassingExportFixture(rootDir: string): void {
  const outDir = join(rootDir, "out");
  mkdirSync(outDir, { recursive: true });

  for (const [route, html] of Object.entries(PASSING_ROUTE_HTML)) {
    const relativePath = routeToRelativeHtmlPath(route);
    const filePath = join(outDir, relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, html);
  }
}

function successfulBuildExportOutput(): string {
  return [
    "Static export build complete.",
    `${EXPORT_BUILD_SUCCESS_ROUTE_MARKER} (7 paths in out).`,
    `${EXPORT_BUILD_SUCCESS_SEARCH_HANDOFF_MARKER} (3 queries in out).`,
  ].join("\n");
}

describe("buildDeployConvergenceBuildExportEnv", () => {
  test("sets canonical GITHUB_PAGES_BASE_PATH for make build-export", () => {
    const env = buildDeployConvergenceBuildExportEnv({
      ...process.env,
      PATH: "/usr/bin",
      GITHUB_PAGES_BASE_PATH: "stale-value",
    });

    expect(env[GITHUB_PAGES_BASE_PATH_ENV]).toBe(
      CANONICAL_GITHUB_PAGES_BASE_PATH,
    );
    expect(env.PATH).toBe("/usr/bin");
  });
});

describe("deriveDeployExportArtifactEvidence", () => {
  test("returns pass when build-export succeeds and export routes verify", () => {
    const dir = mkdtempSync(join(tmpdir(), "deploy-export-artifact-pass-"));
    writePassingExportFixture(dir);

    const evidence = deriveDeployExportArtifactEvidence({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    expect(evidence.domainId).toBe(DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID);
    expect(evidence.checklistRow).toBe(DEPLOY_EXPORT_ARTIFACT_CHECKLIST_ROW);
    expect(evidence.status).toBe("pass");
    expect(evidence.reason).toBeUndefined();

    rmSync(dir, { recursive: true, force: true });
  });

  test("returns fail when build-export exits non-zero", () => {
    const evidence = deriveDeployExportArtifactEvidence({
      buildExportOutput: [
        "Static export build complete.",
        "Phase 1 export route verification failed:",
        "  missing exported HTML for /docs/modules/grouped-query-attention",
      ].join("\n"),
      buildExportExitCode: 1,
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain(
      "Phase 1 export route verification failed",
    );
  });

  test("returns fail when a representative route HTML file is missing after zero exit", () => {
    const dir = mkdtempSync(join(tmpdir(), "deploy-export-artifact-route-"));
    writePassingExportFixture(dir);
    rmSync(join(dir, "out", "docs", "architecture.html"), { force: true });

    const evidence = deriveDeployExportArtifactEvidence({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("/docs/architecture");
    expect(evidence.reason).toContain("out/docs/architecture.html");

    rmSync(dir, { recursive: true, force: true });
  });

  test("returns uncertain when out/ is missing after build-export exits zero", () => {
    const dir = mkdtempSync(join(tmpdir(), "deploy-export-artifact-missing-"));

    const evidence = deriveDeployExportArtifactEvidence({
      buildExportOutput: successfulBuildExportOutput(),
      buildExportExitCode: 0,
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("Missing export directory");

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("formatDeployExportArtifactEvidenceLine", () => {
  test("formats domain line with checklistRow marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "deploy-export-artifact-format-"));
    writePassingExportFixture(dir);

    const passLine = formatDeployExportArtifactEvidenceLine(
      deriveDeployExportArtifactEvidence({
        buildExportOutput: successfulBuildExportOutput(),
        buildExportExitCode: 0,
        outDir: "out",
        cwd: dir,
        basePath: "",
      }),
    );
    const failLine = formatDeployExportArtifactEvidenceLine({
      domainId: DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID,
      label: "label",
      checklistRow: DEPLOY_EXPORT_ARTIFACT_CHECKLIST_ROW,
      status: "fail",
      reason: `${DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND} exited with code 2`,
    });

    expect(passLine).toContain(`[PASS] ${DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID}`);
    expect(passLine).toContain(
      `checklistRow=${DEPLOY_EXPORT_ARTIFACT_CHECKLIST_ROW}`,
    );
    expect(failLine).toContain(`[FAIL] ${DEPLOY_EXPORT_ARTIFACT_DOMAIN_ID}`);
    expect(failLine).toContain(DEPLOY_CONVERGENCE_BUILD_EXPORT_COMMAND);

    rmSync(dir, { recursive: true, force: true });
  });
});
