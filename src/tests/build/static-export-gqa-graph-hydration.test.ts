import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  exportHtmlIncludesGqaAttentionVariantGraphShellMarkers,
  exportHtmlReferencesBasePathAssets,
} from "@/lib/build/verify-export-base-path";
import { verifyPhase1ExportRoutesFromOutDir } from "@/lib/build/verify-phase-1-export-routes";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import {
  isRetryableExportProbeFailure,
  runExportProbeWithSpawnGuard,
} from "@/lib/verify/export-probe-spawn-guard";
import { verifyStaticExportGqaGraphHydration } from "@/lib/verify/static-export-gqa-graph-hydration-http";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const exportBasePath = "/ai-model-reference";
const CI_PROBE_RETRY_DELAY_MS = 5_000;
const gqaExportHtmlPath = join(
  outDir,
  "docs/modules/grouped-query-attention.html",
);

describe("static export GQA graph hydration on GitHub Pages base path", () => {
  beforeAll(() => {
    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });
    if (!existsSync(gqaExportHtmlPath)) {
      throw new Error(`missing export artifact at ${gqaExportHtmlPath}`);
    }
  }, getExportIntegrationBunTestTimeoutMs());

  test("build-export produces GQA HTML with graph shell markers and prefixed assets", () => {
    const gqaHtml = readFileSync(gqaExportHtmlPath, "utf8");
    expect(
      exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(gqaHtml),
    ).toBe(true);
    expect(exportHtmlReferencesBasePathAssets(gqaHtml, exportBasePath)).toBe(
      true,
    );

    const routeResult = verifyPhase1ExportRoutesFromOutDir("out", {
      cwd: repoRoot,
      basePath: exportBasePath,
    });
    expect(routeResult.ok).toBe(true);
  });

  test(
    "served static export hydrates the GQA comparison graph and toggles MHA/GQA",
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
            verifyStaticExportGqaGraphHydration(server.baseUrl),
          );
          if (
            reason === null ||
            !isRetryableExportProbeFailure(reason) ||
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
