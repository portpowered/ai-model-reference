import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  exportHtmlIncludesGqaAttentionVariantGraphShellMarkers,
  exportHtmlReferencesBasePathAssets,
} from "@/lib/build/verify-export-base-path";
import { verifyPhase1ExportRoutesFromOutDir } from "@/lib/build/verify-phase-1-export-routes";
import { EXPORT_INTEGRATION_BUN_TEST_TIMEOUT_MS } from "@/lib/verify/export-integration-probe-lock";
import { verifyStaticExportGqaGraphHydration } from "@/lib/verify/static-export-gqa-graph-hydration-http";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const exportBasePath = "/ai-model-reference";
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
  }, 300_000);

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
      ensureExportSearchArtifacts({
        repoRoot,
        basePath: exportBasePath,
      });

      const server = await createStaticExportHttpServer({
        cwd: repoRoot,
        basePath: exportBasePath,
      });
      try {
        const reason = await verifyStaticExportGqaGraphHydration(
          server.baseUrl,
        );
        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: EXPORT_INTEGRATION_BUN_TEST_TIMEOUT_MS },
  );
});
