import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";
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
import { verifyStaticExportSearchInputHydration } from "@/lib/verify/static-export-search-input-hydration-http";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const exportBasePath = "/ai-model-reference";
const searchExportHtmlPath = join(outDir, "search.html");
const CI_PROBE_RETRY_DELAY_MS = 5_000;

describe("static export /search input hydration on GitHub Pages base path", () => {
  beforeAll(() => {
    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });
  }, getExportIntegrationBunTestTimeoutMs());

  test("build-export emits /search HTML with the real input shell and prefixed assets", () => {
    const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
    expect(searchHtml).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
    expect(assertSearchPageExportShell(searchHtml)).toBeNull();
    expect(exportHtmlReferencesBasePathAssets(searchHtml, exportBasePath)).toBe(
      true,
    );
    expect(
      exportHtmlReferencesBasePathInternalLinks(searchHtml, exportBasePath),
    ).toBe(true);
  });

  test(
    "served static export hydrates an operable /search input that accepts typed queries",
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
            verifyStaticExportSearchInputHydration(server.baseUrl, {
              timeoutMs: 45_000,
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
