import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "@/lib/verify/grouped-query-attention-module-convergence";
import { buildSearchPageExportShellStubBody } from "@/lib/verify/phase-1-search-export-shell-checks";
import {
  exportHtmlRelativePath,
  resolveExportHtmlFilePath,
  stripBasePathFromExportHtml,
  verifyExportOutDirectory,
  verifyPhase1ExportRouteFromFile,
  verifyPhase1ExportRoutesFromOutDir,
} from "./verify-phase-1-export-routes";

describe("export artifact path helpers", () => {
  test("exportHtmlRelativePath maps reader routes to out/ HTML files", () => {
    expect(exportHtmlRelativePath("/")).toBe("index.html");
    expect(exportHtmlRelativePath("/docs/architecture")).toBe(
      "docs/architecture.html",
    );
    expect(exportHtmlRelativePath("/tags/attention")).toBe(
      "tags/attention.html",
    );
  });

  test("resolveExportHtmlFilePath joins outDir with the relative HTML path", () => {
    const cwd = "/repo";
    expect(resolveExportHtmlFilePath("out", "/", cwd)).toBe(
      "/repo/out/index.html",
    );
    expect(resolveExportHtmlFilePath("out", "/docs/glossary", cwd)).toBe(
      "/repo/out/docs/glossary.html",
    );
  });

  test("stripBasePathFromExportHtml normalizes prefixed internal hrefs", () => {
    const html =
      '<a href="/ai-model-reference/docs/architecture">Architecture</a>';
    expect(stripBasePathFromExportHtml(html, "/ai-model-reference")).toContain(
      'href="/docs/architecture"',
    );
  });
});

describe("verifyExportOutDirectory", () => {
  test("fails when out/ is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-out-missing-"));
    const result = verifyExportOutDirectory("out", dir);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing export directory");
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when index.html is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-out-empty-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    const result = verifyExportOutDirectory("out", dir);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("index.html");
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("passes when out/index.html exists and is non-empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-out-valid-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    const result = verifyExportOutDirectory("out", dir);
    expect(result.ok).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("verifyPhase1ExportRouteFromFile", () => {
  test("fails with a clear message when the route HTML file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-missing-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");

    const result = verifyPhase1ExportRouteFromFile("/docs/architecture", {
      cwd: dir,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.route).toBe("/docs/architecture");
      expect(result.reason).toContain("Missing exported HTML");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when exported HTML lacks expected reader markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-markers-"));
    mkdirSync(join(dir, "out", "docs"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "docs", "architecture.html"),
      "<html></html>",
    );

    const result = verifyPhase1ExportRouteFromFile("/docs/architecture", {
      cwd: dir,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes search export HTML with inline search shell markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-search-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "search.html"),
      `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
    );

    const result = verifyPhase1ExportRouteFromFile("/search", { cwd: dir });
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails search export HTML when the input shell marker is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-search-missing-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "search.html"),
      "<html><h1>Search</h1></html>",
    );

    const result = verifyPhase1ExportRouteFromFile("/search", { cwd: dir });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.route).toBe("/search");
      expect(result.reason).toMatch(/search-page-input|Search Model Atlas/);
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes grouped-query-attention export HTML with Phase 1 module markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-gqa-"));
    mkdirSync(join(dir, "out", "docs", "modules"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "docs", "modules", "grouped-query-attention.html"),
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );

    const result = verifyPhase1ExportRouteFromFile(
      "/docs/modules/grouped-query-attention",
      { cwd: dir },
    );
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails GQA export HTML when base-path assets are missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-gqa-basepath-"));
    mkdirSync(join(dir, "out", "docs", "modules"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "docs", "modules", "grouped-query-attention.html"),
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );

    const result = verifyPhase1ExportRouteFromFile(
      "/docs/modules/grouped-query-attention",
      { cwd: dir, basePath: "/ai-model-reference" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("/_next/");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes grouped-query-attention export HTML with base-path graph shell markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-route-gqa-basepath-pass-"));
    mkdirSync(join(dir, "out", "docs", "modules"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "docs", "modules", "grouped-query-attention.html"),
      `<html><body><script src="/ai-model-reference/_next/static/chunks/main.js"></script>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );

    const result = verifyPhase1ExportRouteFromFile(
      "/docs/modules/grouped-query-attention",
      { cwd: dir, basePath: "/ai-model-reference" },
    );
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("verifyPhase1ExportRoutesFromOutDir", () => {
  test("fails fast when out/ is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-routes-missing-"));
    const result = verifyPhase1ExportRoutesFromOutDir("out", { cwd: dir });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.route).toBeNull();
      expect(result.reason).toContain("Missing export directory");
    }
    rmSync(dir, { recursive: true, force: true });
  });
});
