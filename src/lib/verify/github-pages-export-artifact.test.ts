import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  deriveExportArtifactEvidence,
  EXPORT_ARTIFACT_CHECKLIST_ROW,
  EXPORT_ARTIFACT_DOMAIN_ID,
  formatExportArtifactCheckRowLine,
  formatExportArtifactDomainLine,
} from "./phase-1-github-pages-export-artifact";
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
    '<html><h1>Attention</h1><article data-registry-id="module.attention"></article><a href="/docs/modules/multi-head-attention">MHA</a><a href="/docs/modules/multi-query-attention">MQA</a><a href="/docs/modules/grouped-query-attention">GQA</a></html>',
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

function writePassingExportFixture(
  rootDir: string,
  options: { basePath?: string } = {},
): void {
  const outDir = join(rootDir, "out");
  mkdirSync(outDir, { recursive: true });

  for (const [route, html] of Object.entries(PASSING_ROUTE_HTML)) {
    const relativePath = routeToRelativeHtmlPath(route);
    const filePath = join(outDir, relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, html);
  }

  if (options.basePath) {
    const basePath = options.basePath;
    const prefixedIndex = `
      <html><title>Model Atlas</title>
        <script src="${basePath}/_next/static/chunks/main.js"></script>
        <a href="${basePath}/docs/glossary">Glossary</a>
      </html>
    `;
    writeFileSync(join(outDir, "index.html"), prefixedIndex);

    const gqaRoute = "/docs/modules/grouped-query-attention";
    const gqaHtml = PASSING_ROUTE_HTML[gqaRoute];
    const prefixedGqaHtml = `
      <html><body>
        <script src="${basePath}/_next/static/chunks/main.js"></script>
        ${gqaHtml.replace(/^<html><body>/, "").replace(/<\/body><\/html>$/, "")}
      </body></html>
    `;
    writeFileSync(
      join(outDir, routeToRelativeHtmlPath(gqaRoute)),
      prefixedGqaHtml,
    );
  }
}

describe("deriveExportArtifactEvidence", () => {
  test("passes when out/ contains index and representative Phase 1 route HTML", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-artifact-pass-"));
    writePassingExportFixture(dir);

    const evidence = deriveExportArtifactEvidence({
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    expect(evidence.domainId).toBe(EXPORT_ARTIFACT_DOMAIN_ID);
    expect(evidence.status).toBe("uncertain");
    expect(
      evidence.rows
        .filter((row) => !row.checkId.startsWith("export-artifact.base-path."))
        .every((row) => row.status === "pass"),
    ).toBe(true);
    expect(evidence.rows.map((row) => row.checkId)).toContain(
      "export-artifact.out-index-html",
    );
    expect(evidence.rows.map((row) => row.checkId)).toContain(
      "export-artifact.route-docs-modules-grouped-query-attention",
    );
    expect(evidence.rows.map((row) => row.checkId)).toContain(
      "export-artifact.route-docs-modules-attention",
    );
    expect(evidence.rows.map((row) => row.checkId)).toContain(
      "export-artifact.route-docs-glossary-vector",
    );

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when out/ is missing with a concrete index row reason", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-artifact-missing-"));

    const evidence = deriveExportArtifactEvidence({
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    expect(evidence.status).toBe("fail");
    const indexRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.out-index-html",
    );
    expect(indexRow?.status).toBe("fail");
    expect(indexRow?.reason).toContain("Missing export directory");

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when a representative route HTML file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-artifact-route-"));
    writePassingExportFixture(dir);
    rmSync(join(dir, "out", "docs", "architecture.html"), { force: true });

    const evidence = deriveExportArtifactEvidence({
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    const routeRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.route-docs-architecture",
    );
    expect(routeRow?.status).toBe("fail");
    expect(routeRow?.reason).toContain("out/docs/architecture.html");

    rmSync(dir, { recursive: true, force: true });
  });

  test("marks base-path rows uncertain when no base path is configured", () => {
    const dir = mkdtempSync(
      join(tmpdir(), "gh-pages-artifact-base-uncertain-"),
    );
    writePassingExportFixture(dir);

    const evidence = deriveExportArtifactEvidence({
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    const assetRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.base-path.assets",
    );
    const linksRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.base-path.internal-links",
    );

    expect(assetRow?.status).toBe("uncertain");
    expect(linksRow?.status).toBe("uncertain");
    expect(assetRow?.reason).toContain("GITHUB_PAGES_BASE_PATH is unset");
    expect(evidence.status).toBe("uncertain");

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes base-path asset and internal-link rows when markers are present", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-artifact-base-pass-"));
    writePassingExportFixture(dir, { basePath: "/ai-model-reference" });

    const evidence = deriveExportArtifactEvidence({
      outDir: "out",
      cwd: dir,
      basePath: "/ai-model-reference",
    });

    const assetRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.base-path.assets",
    );
    const linksRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.base-path.internal-links",
    );

    expect(assetRow?.status).toBe("pass");
    expect(linksRow?.status).toBe("pass");
    expect(evidence.status).toBe("pass");

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("export artifact evidence formatting", () => {
  test("formats domain and per-check rows with checklistRow marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "gh-pages-artifact-format-"));
    writePassingExportFixture(dir);

    const evidence = deriveExportArtifactEvidence({
      outDir: "out",
      cwd: dir,
      basePath: "",
    });

    expect(formatExportArtifactDomainLine(evidence)).toContain(
      `[UNCERTAIN] ${EXPORT_ARTIFACT_DOMAIN_ID}`,
    );
    expect(formatExportArtifactDomainLine(evidence)).toContain(
      `checklistRow=${EXPORT_ARTIFACT_CHECKLIST_ROW}`,
    );

    const indexRow = evidence.rows.find(
      (row) => row.checkId === "export-artifact.out-index-html",
    );
    if (!indexRow) {
      throw new Error("expected export-artifact.out-index-html row");
    }
    const checkLine = formatExportArtifactCheckRowLine(indexRow);
    expect(checkLine).toMatch(
      /^\s+\[PASS\] export-artifact\.out-index-html — .+ — checklistRow=phase-1-github-pages-export-artifact$/,
    );

    rmSync(dir, { recursive: true, force: true });
  });
});
