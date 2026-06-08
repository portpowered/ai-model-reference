import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import {
  isRetryableStaticExportSearchProbeFailure,
  verifyStaticExportSearchEmptyErrorStates,
} from "@/lib/verify/static-export-search-empty-error-states-http";

const repoRoot = join(import.meta.dir, "../../..");
const exportBasePath = "/ai-model-reference";

describe("static export /search empty and error states on GitHub Pages base path", () => {
  beforeAll(() => {
    if (!shouldRunExportIntegrationProbeTests()) {
      return;
    }
    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });
  }, getExportIntegrationBunTestTimeoutMs());

  test(
    "served static export exposes recoverable empty and error states with accessible outcomes",
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
            ? 5
            : 1;
        let reason: string | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            reason = await verifyStaticExportSearchEmptyErrorStates(
              server.baseUrl,
            );
          } catch (error) {
            reason = error instanceof Error ? error.message : String(error);
          }
          if (
            reason === null ||
            !isRetryableStaticExportSearchProbeFailure(reason) ||
            attempt === maxAttempts
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 3_000));
        }

        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
