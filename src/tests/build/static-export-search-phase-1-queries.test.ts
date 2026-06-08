import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { verifyStaticExportSearchPhase1Queries } from "@/lib/verify/static-export-search-phase-1-queries-http";

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

describe("static export /search Phase 1 canonical queries on GitHub Pages base path", () => {
  beforeAll(() => {
    removeExportArtifacts();
    ensureSearchExportArtifacts();
  }, 300_000);

  afterAll(() => {
    removeExportArtifacts();
  });

  test(
    "served static export surfaces grouped-query-attention for GQA on base path",
    async () => {
      ensureSearchExportArtifacts();

      const server = await createStaticExportHttpServer({
        cwd: repoRoot,
        basePath: exportBasePath,
      });
      try {
        const reason = await verifyStaticExportSearchPhase1Queries(
          server.baseUrl,
          {
            timeoutMs: 45_000,
            queries: ["GQA"],
          },
        );
        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: 300_000 },
  );
});
