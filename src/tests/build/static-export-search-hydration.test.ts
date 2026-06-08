import { afterAll, beforeAll, describe, expect, test } from "bun:test";
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

function ensureSearchExportArtifacts(): void {
  if (existsSync(searchExportHtmlPath)) {
    return;
  }

  const buildResult = runStaticExportBuild({
    cwd: repoRoot,
    env: {
      GITHUB_PAGES_BASE_PATH: exportBasePath,
    },
  });
  if (buildResult.status !== 0) {
    throw new Error(
      `build-export failed with status ${buildResult.status}: ${buildResult.stderr ?? buildResult.stdout ?? ""}`,
    );
  }
  if (!existsSync(searchExportHtmlPath)) {
    throw new Error(`missing export artifact at ${searchExportHtmlPath}`);
  }
}

describe("static export /search input hydration on GitHub Pages base path", () => {
  beforeAll(() => {
    removeExportArtifacts();
    ensureSearchExportArtifacts();
  }, 300_000);

  afterAll(() => {
    removeExportArtifacts();
  });

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
      ensureSearchExportArtifacts();

      const server = await createStaticExportHttpServer({
        cwd: repoRoot,
        basePath: exportBasePath,
      });
      try {
        const reason = await verifyStaticExportSearchInputHydration(
          server.baseUrl,
          { timeoutMs: 45_000 },
        );
        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: 300_000 },
  );
});
