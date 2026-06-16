import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import { runExportProbeWithSpawnGuard } from "@/lib/verify/export-probe-spawn-guard";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import {
  isRetryableStaticExportSearchProbeFailure,
  verifyStaticExportSearchEmptyErrorStates,
} from "@/lib/verify/static-export-search-empty-error-states-http";
import { verifyStaticExportSearchInputHydration } from "@/lib/verify/static-export-search-input-hydration-http";
import { verifyStaticExportSearchUrlHandoff } from "@/lib/verify/static-export-search-url-handoff-http";

const repoRoot = join(import.meta.dir, "../../..");
const exportBasePath = "/ai-model-reference";
const CI_PROBE_RETRY_DELAY_MS = 5_000;

type StaticExportServer = Awaited<
  ReturnType<typeof createStaticExportHttpServer>
>;

async function retryProbe(
  probe: () => Promise<string | null>,
  isRetryable: (reason: string | null) => boolean,
): Promise<string | null> {
  const maxAttempts =
    process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true" ? 3 : 1;
  let reason: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    reason = await runExportProbeWithSpawnGuard(probe);
    if (reason === null || !isRetryable(reason) || attempt === maxAttempts) {
      break;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, CI_PROBE_RETRY_DELAY_MS),
    );
  }

  return reason;
}

function expectExportServer(
  server: StaticExportServer | undefined,
): StaticExportServer {
  if (!server) {
    throw new Error("static export HTTP server was not started");
  }
  return server;
}

describe("static export GitHub Pages base-path served integration", () => {
  let server: StaticExportServer | undefined;

  beforeAll(async () => {
    if (!shouldRunExportIntegrationProbeTests()) {
      return;
    }

    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });

    server = await createStaticExportHttpServer({
      cwd: repoRoot,
      basePath: exportBasePath,
    });
  }, getExportIntegrationBunTestTimeoutMs());

  afterAll(async () => {
    await server?.cleanup();
  });

  test(
    "served export hydrates /search input and URL handoffs",
    async () => {
      if (!shouldRunExportIntegrationProbeTests()) {
        return;
      }
      const activeServer = expectExportServer(server);

      const inputHydrationReason = await retryProbe(
        () =>
          verifyStaticExportSearchInputHydration(activeServer.baseUrl, {
            timeoutMs: 45_000,
          }),
        isRetryableStaticExportSearchProbeFailure,
      );
      expect(inputHydrationReason).toBeNull();

      const urlHandoffReason = await retryProbe(
        () =>
          verifyStaticExportSearchUrlHandoff(activeServer.baseUrl, {
            timeoutMs: 60_000,
            handoffPaths: ["/search?q=attention", "/search?tag=attention"],
          }),
        isRetryableStaticExportSearchProbeFailure,
      );
      expect(urlHandoffReason).toBeNull();
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );

  test(
    "served export exposes search empty/error states",
    async () => {
      if (!shouldRunExportIntegrationProbeTests()) {
        return;
      }
      const activeServer = expectExportServer(server);

      const emptyErrorReason = await retryProbe(
        () => verifyStaticExportSearchEmptyErrorStates(activeServer.baseUrl),
        isRetryableStaticExportSearchProbeFailure,
      );
      expect(emptyErrorReason).toBeNull();
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
