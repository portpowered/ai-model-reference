import { describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { verifyStaticExportSearchEmptyErrorStates } from "@/lib/verify/static-export-search-empty-error-states-http";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export /search empty and error states on GitHub Pages base path", () => {
  test(
    "served static export exposes recoverable empty and error states with accessible outcomes",
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
          const reason = await verifyStaticExportSearchEmptyErrorStates(
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
    { timeout: 300_000 },
  );
});
