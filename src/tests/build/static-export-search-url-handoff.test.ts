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
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import { runExportProbeWithSpawnGuard } from "@/lib/verify/export-probe-spawn-guard";
import {
  assertSearchPageExportShell,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "@/lib/verify/phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { isRetryableStaticExportSearchProbeFailure } from "@/lib/verify/static-export-search-empty-error-states-http";
import { verifyStaticExportSearchUrlHandoff } from "@/lib/verify/static-export-search-url-handoff-http";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const exportBasePath = "/ai-model-reference";
const searchExportHtmlPath = join(outDir, "search.html");
const CI_PROBE_RETRY_DELAY_MS = 5_000;

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

  test(
    "served static export surfaces grouped-query-attention for query and tag handoffs",
    async () => {
      if (!shouldRunExportIntegrationProbeTests()) {
        return;
      }
      ensureExportSearchArtifacts({
        repoRoot,
        basePath: exportBasePath,
      });

      const server = await createStaticExportHttpServer({
        cwd: repoRoot,
        basePath: exportBasePath,
      });
      try {
        const maxAttempts =
          process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true"
            ? 3
            : 1;
        let reason: string | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          reason = await runExportProbeWithSpawnGuard(async () =>
            verifyStaticExportSearchUrlHandoff(server.baseUrl, {
              timeoutMs: 60_000,
              handoffPaths: ["/search?q=attention", "/search?tag=attention"],
            }),
          );
          if (
            reason === null ||
            !isRetryableStaticExportSearchProbeFailure(reason) ||
            attempt === maxAttempts
          ) {
            break;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, CI_PROBE_RETRY_DELAY_MS),
          );
        }

        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
