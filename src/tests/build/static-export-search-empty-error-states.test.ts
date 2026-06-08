import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import { verifyStaticExportSearchEmptyErrorStates } from "@/lib/verify/static-export-search-empty-error-states-http";

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
        const reason = await verifyStaticExportSearchEmptyErrorStates(
          server.baseUrl,
        );
        expect(reason).toBeNull();
      } finally {
        await server.cleanup();
      }
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
