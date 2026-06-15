import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  getStaticExportBuildBunTestTimeoutMs,
  runStaticExportBuild,
} from "@/lib/build/run-static-export-build";
import {
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";
import {
  exportClientBundleIncludesBootstrapFrom,
  readExportClientChunkContents,
  resolveExportSearchBootstrapClientFrom,
} from "@/lib/build/verify-export-search-bootstrap-client-path";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";
const exportBuildTestTimeout = getStaticExportBuildBunTestTimeoutMs();

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export GitHub Pages base path", () => {
  beforeAll(
    () => {
      removeExportArtifacts();

      const buildResult = runStaticExportBuild({
        cwd: repoRoot,
        env: {
          GITHUB_PAGES_BASE_PATH: exportBasePath,
        },
      });

      const combined = `${buildResult.stdout ?? ""}\n${buildResult.stderr ?? ""}`;
      expect(buildResult.status).toBe(0);

      if (combined.includes("Error")) {
        throw new Error(`Unexpected export build output: ${combined}`);
      }
    },
    { timeout: exportBuildTestTimeout },
  );

  afterAll(() => {
    removeExportArtifacts();
  });

  test("build-export workflow verifies prefixed out/ HTML when GITHUB_PAGES_BASE_PATH is set", () => {
    const verifyResult = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-routes.ts"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_PAGES_BASE_PATH: exportBasePath,
        },
      },
    );

    expect(verifyResult.status).toBe(0);
    expect(verifyResult.stdout ?? "").toContain(
      "Phase 1 export routes verified",
    );
  });

  test("build:export bakes basePath-prefixed search bootstrap path into client chunks", () => {
    const chunks = readExportClientChunkContents("out", repoRoot);
    const expectedBootstrapFrom =
      resolveExportSearchBootstrapClientFrom(exportBasePath);
    expect(
      exportClientBundleIncludesBootstrapFrom(chunks, expectedBootstrapFrom),
    ).toBe(true);
  });

  test("build:export prefixes bundled assets and internal links in out/index.html", () => {
    const indexHtmlPath = join(outDir, "index.html");
    expect(existsSync(indexHtmlPath)).toBe(true);

    const html = readFileSync(indexHtmlPath, "utf8");
    expect(exportHtmlReferencesBasePathAssets(html, exportBasePath)).toBe(true);
    expect(
      exportHtmlReferencesBasePathInternalLinks(html, exportBasePath),
    ).toBe(true);
  });
});
