import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";
import {
  exportClientBundleIncludesBootstrapFrom,
  readExportClientChunkContents,
  resolveExportSearchBootstrapClientFrom,
} from "@/lib/build/verify-export-search-bootstrap-client-path";
import { getExportIntegrationBunTestTimeoutMs } from "@/lib/verify/export-integration-probe-lock";
import {
  assertSearchPageExportShell,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "@/lib/verify/phase-1-search-export-shell-checks";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const exportBasePath = "/ai-model-reference";
const searchExportHtmlPath = join(outDir, "search.html");

describe("static export /search URL query and tag handoff on GitHub Pages base path", () => {
  beforeAll(() => {
    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });
  }, getExportIntegrationBunTestTimeoutMs());

  test("build-export emits /search HTML with handoff contract copy and prefixed assets", () => {
    const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
    expect(searchHtml).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
    expect(searchHtml).toContain("?q=");
    expect(searchHtml).toContain("?tag=");
    expect(assertSearchPageExportShell(searchHtml)).toBeNull();
    expect(exportHtmlReferencesBasePathAssets(searchHtml, exportBasePath)).toBe(
      true,
    );
    expect(
      exportHtmlReferencesBasePathInternalLinks(searchHtml, exportBasePath),
    ).toBe(true);
  });

  test("build-export bakes client-side URL handoff wiring for GitHub Pages search", () => {
    const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
    expect(searchHtml).toContain("tag handoffs may append ?tag=");

    const chunks = readExportClientChunkContents("out", repoRoot);
    expect(
      exportClientBundleIncludesBootstrapFrom(
        chunks,
        resolveExportSearchBootstrapClientFrom(exportBasePath),
      ),
    ).toBe(true);
    expect(chunks).toContain("tagFilterDescription");
  });
});
