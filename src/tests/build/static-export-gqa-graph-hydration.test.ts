import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import {
  exportHtmlIncludesGqaAttentionVariantGraphShellMarkers,
  exportHtmlReferencesBasePathAssets,
} from "@/lib/build/verify-export-base-path";
import { verifyPhase1ExportRoutesFromOutDir } from "@/lib/build/verify-phase-1-export-routes";
import { verifyStaticExportGqaGraphHydration } from "@/lib/verify/static-export-gqa-graph-hydration-http";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";
const gqaExportHtmlPath = join(
  outDir,
  "docs/modules/grouped-query-attention.html",
);

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export GQA graph hydration on GitHub Pages base path", () => {
  test(
    "build-export produces GQA HTML with graph shell markers and prefixed assets",
    () => {
      removeExportArtifacts();

      try {
        const buildResult = runStaticExportBuild({
          cwd: repoRoot,
          env: {
            GITHUB_PAGES_BASE_PATH: exportBasePath,
          },
        });
        expect(buildResult.status).toBe(0);
        expect(existsSync(gqaExportHtmlPath)).toBe(true);

        const gqaHtml = readFileSync(gqaExportHtmlPath, "utf8");
        expect(
          exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(gqaHtml),
        ).toBe(true);
        expect(
          exportHtmlReferencesBasePathAssets(gqaHtml, exportBasePath),
        ).toBe(true);

        const routeResult = verifyPhase1ExportRoutesFromOutDir("out", {
          cwd: repoRoot,
          basePath: exportBasePath,
        });
        expect(routeResult.ok).toBe(true);
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );

  test(
    "served static export hydrates the GQA comparison graph and toggles MHA/GQA",
    async () => {
      removeExportArtifacts();

      try {
        const buildResult = runStaticExportBuild({
          cwd: repoRoot,
          env: {
            GITHUB_PAGES_BASE_PATH: exportBasePath,
          },
        });
        expect(buildResult.status).toBe(0);

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
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 240_000 },
  );
});
