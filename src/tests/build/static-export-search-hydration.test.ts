import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import {
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";
import {
  assertSearchPageExportShell,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "@/lib/verify/phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { verifyStaticExportSearchInputHydration } from "@/lib/verify/static-export-search-input-hydration-http";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";
const searchExportHtmlPath = join(outDir, "search.html");

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export /search input hydration on GitHub Pages base path", () => {
  test(
    "build-export emits /search HTML with the real input shell and prefixed assets",
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
        expect(existsSync(searchExportHtmlPath)).toBe(true);

        const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
        expect(searchHtml).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
        expect(assertSearchPageExportShell(searchHtml)).toBeNull();
        expect(
          exportHtmlReferencesBasePathAssets(searchHtml, exportBasePath),
        ).toBe(true);
        expect(
          exportHtmlReferencesBasePathInternalLinks(searchHtml, exportBasePath),
        ).toBe(true);
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );

  test(
    "served static export hydrates an operable /search input that accepts typed queries",
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
          const reason = await verifyStaticExportSearchInputHydration(
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
