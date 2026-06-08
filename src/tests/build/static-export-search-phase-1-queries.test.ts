import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import { getExportIntegrationBunTestTimeoutMs } from "@/lib/verify/export-integration-probe-lock";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { verifyStaticExportSearchPhase1Queries } from "@/lib/verify/static-export-search-phase-1-queries-http";

const repoRoot = join(import.meta.dir, "../../..");
const exportBasePath = "/ai-model-reference";

describe("static export /search Phase 1 canonical queries on GitHub Pages base path", () => {
  beforeAll(() => {
    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });
  }, getExportIntegrationBunTestTimeoutMs());

  test.each(["GQA", "attention", "KV cache"] as const)(
    "served static export surfaces grouped-query-attention for %s after static bootstrap",
    async (query) => {
      ensureExportSearchArtifacts({
        repoRoot,
        basePath: exportBasePath,
      });

      const server = await createStaticExportHttpServer({
        cwd: repoRoot,
        basePath: exportBasePath,
      });
      try {
        const reason = await verifyStaticExportSearchPhase1Queries(
          server.baseUrl,
          {
            timeoutMs: 45_000,
            queries: [query],
          },
        );
        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
