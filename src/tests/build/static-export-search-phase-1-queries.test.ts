import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
  shouldSerializeExportIntegrationProbes,
} from "@/lib/verify/export-integration-probe-lock";
import { runExportProbeWithSpawnGuard } from "@/lib/verify/export-probe-spawn-guard";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { isRetryableStaticExportSearchProbeFailure } from "@/lib/verify/static-export-search-empty-error-states-http";
import { verifyStaticExportSearchPhase1Queries } from "@/lib/verify/static-export-search-phase-1-queries-http";

const repoRoot = join(import.meta.dir, "../../..");
const exportBasePath = "/ai-model-reference";
const CI_PROBE_RETRY_DELAY_MS = 5_000;

function resolvePhase1CanonicalProbeQueries(): string[] {
  return shouldSerializeExportIntegrationProbes()
    ? ["GQA"]
    : ["GQA", "attention", "KV cache"];
}

describe("static export /search Phase 1 canonical queries on GitHub Pages base path", () => {
  beforeAll(() => {
    if (!shouldRunExportIntegrationProbeTests()) {
      return;
    }
    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });
  }, getExportIntegrationBunTestTimeoutMs());

  test.each(resolvePhase1CanonicalProbeQueries().map((query) => [query]))(
    "served static export surfaces grouped-query-attention for %s after static bootstrap",
    async (query: string) => {
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
            ? 5
            : 1;
        let reason: string | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          reason = await runExportProbeWithSpawnGuard(async () =>
            verifyStaticExportSearchPhase1Queries(server.baseUrl, {
              timeoutMs: 45_000,
              queries: [query],
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
