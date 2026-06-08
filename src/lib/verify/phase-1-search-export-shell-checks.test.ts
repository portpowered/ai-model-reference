import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertSearchPageExportShell,
  assertSearchPageExportShellStateRegion,
  buildSearchPageExportShellStubBody,
  classifyPhase1ExportSearchShellFailure,
  EXPORT_SEARCH_SHELL_SURFACE,
  formatPhase1ExportSearchShellFailure,
  isRouteShellExportSearchFailureLine,
  SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER,
  SEARCH_PAGE_EMPTY_HTML_MARKER,
  SEARCH_PAGE_IDLE_HTML_MARKER,
  SEARCH_PAGE_INPUT_HTML_MARKER,
  SEARCH_PAGE_RESULTS_HTML_MARKER,
  verifyPhase1ExportSearchShellFromOutDir,
} from "./phase-1-search-export-shell-checks";

describe("assertSearchPageExportShell", () => {
  test("passes on export shell markers and manual-gate copy", () => {
    expect(
      assertSearchPageExportShell(
        `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
      ),
    ).toBeNull();
  });

  test("fails when the search input shell marker is missing", () => {
    const html = `<html><h1>Search</h1><p>Search Model Atlas</p><p>/search ?q=</p><output ${SEARCH_PAGE_IDLE_HTML_MARKER}></output></html>`;
    expect(assertSearchPageExportShell(html)).toContain(
      SEARCH_PAGE_INPUT_HTML_MARKER,
    );
  });

  test("fails when no search state region marker is present", () => {
    const html = `<html><h1>Search</h1><p>Search Model Atlas</p><p>/search ?q=</p><input ${SEARCH_PAGE_INPUT_HTML_MARKER} /></html>`;
    expect(assertSearchPageExportShell(html)).toContain("search state region");
  });

  test("fails when the aria-hidden placeholder fallback is present", () => {
    const html = `<html><body>${buildSearchPageExportShellStubBody()}<div ${SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER}>placeholder</span></div></body></html>`;
    expect(assertSearchPageExportShell(html)).toContain(
      SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER,
    );
  });
});

describe("assertSearchPageExportShellStateRegion", () => {
  test("passes when idle, results, or empty marker is present", () => {
    expect(
      assertSearchPageExportShellStateRegion(
        `<output ${SEARCH_PAGE_IDLE_HTML_MARKER}></output>`,
      ),
    ).toBeNull();
    expect(
      assertSearchPageExportShellStateRegion(
        `<ul ${SEARCH_PAGE_RESULTS_HTML_MARKER}></ul>`,
      ),
    ).toBeNull();
    expect(
      assertSearchPageExportShellStateRegion(
        `<p ${SEARCH_PAGE_EMPTY_HTML_MARKER}></p>`,
      ),
    ).toBeNull();
  });

  test("fails when no state region marker is present", () => {
    expect(assertSearchPageExportShellStateRegion("<html></html>")).toContain(
      "search state region",
    );
  });
});

describe("formatPhase1ExportSearchShellFailure", () => {
  test("labels missing input shell as route-shell without hydration wording", () => {
    const line = formatPhase1ExportSearchShellFailure(
      `missing expected content: ${SEARCH_PAGE_INPUT_HTML_MARKER}`,
    );
    expect(line).toContain(EXPORT_SEARCH_SHELL_SURFACE);
    expect(line).toContain("missing input shell");
    expect(line).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
    expect(isRouteShellExportSearchFailureLine(line)).toBe(true);
    expect(line).not.toMatch(/hydrat|timeout/i);
  });

  test("labels missing state region as route-shell", () => {
    const reason =
      "missing search state region: expected one of data-testid markers";
    const line = formatPhase1ExportSearchShellFailure(reason);
    expect(line).toContain("missing state region");
    expect(classifyPhase1ExportSearchShellFailure(reason)).toBe(
      "missing-state-region",
    );
    expect(isRouteShellExportSearchFailureLine(line)).toBe(true);
  });
});

describe("verifyPhase1ExportSearchShellFromOutDir", () => {
  test("passes when out/search.html includes export shell markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-shell-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "search.html"),
      `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
    );

    const result = verifyPhase1ExportSearchShellFromOutDir("out", {
      cwd: dir,
    });
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when out/search.html lacks the input shell marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-shell-missing-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(dir, "out", "search.html"),
      "<html><h1>Search</h1></html>",
    );

    const result = verifyPhase1ExportSearchShellFromOutDir("out", {
      cwd: dir,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/search-page-input|Search Model Atlas/);
    }

    rmSync(dir, { recursive: true, force: true });
  });
});
