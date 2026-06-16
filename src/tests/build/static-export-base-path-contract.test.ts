import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  exportHtmlIncludesGqaAttentionVariantGraphShellMarkers,
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";
import {
  exportClientBundleIncludesBootstrapFrom,
  readExportClientChunkContents,
  resolveExportSearchBootstrapClientFrom,
} from "@/lib/build/verify-export-search-bootstrap-client-path";
import { verifyPhase1ExportRoutesFromOutDir } from "@/lib/build/verify-phase-1-export-routes";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import { runExportProbeWithSpawnGuard } from "@/lib/verify/export-probe-spawn-guard";
import {
  assertSearchPageExportShell,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "@/lib/verify/phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "@/lib/verify/static-export-http-server";
import {
  isRetryableStaticExportSearchProbeFailure,
  verifyStaticExportSearchEmptyErrorStates,
} from "@/lib/verify/static-export-search-empty-error-states-http";
import { verifyStaticExportSearchInputHydration } from "@/lib/verify/static-export-search-input-hydration-http";
import { verifyStaticExportSearchUrlHandoff } from "@/lib/verify/static-export-search-url-handoff-http";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";
const searchExportHtmlPath = join(outDir, "search.html");
const gqaExportHtmlPath = join(
  outDir,
  "docs/modules/grouped-query-attention.html",
);
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

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export GitHub Pages base-path contract", () => {
  let server: StaticExportServer | undefined;

  beforeAll(async () => {
    removeExportArtifacts();

    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });

    if (shouldRunExportIntegrationProbeTests()) {
      server = await createStaticExportHttpServer({
        cwd: repoRoot,
        basePath: exportBasePath,
      });
    }
  }, getExportIntegrationBunTestTimeoutMs());

  afterAll(async () => {
    await server?.cleanup();
  });

  test("export verifiers pass with GITHUB_PAGES_BASE_PATH set", () => {
    const routeResult = verifyPhase1ExportRoutesFromOutDir("out", {
      cwd: repoRoot,
      basePath: exportBasePath,
    });
    expect(routeResult.ok).toBe(true);

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

  test("search HTML, client chunks, and GQA graph markers use the base path", () => {
    expect(existsSync(searchExportHtmlPath)).toBe(true);
    expect(existsSync(gqaExportHtmlPath)).toBe(true);

    const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
    expect(searchHtml).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
    expect(searchHtml).toContain("?q=");
    expect(searchHtml).toContain("?tag=");
    expect(searchHtml).toContain("tag handoffs may append ?tag=");
    expect(assertSearchPageExportShell(searchHtml)).toBeNull();
    expect(exportHtmlReferencesBasePathAssets(searchHtml, exportBasePath)).toBe(
      true,
    );
    expect(
      exportHtmlReferencesBasePathInternalLinks(searchHtml, exportBasePath),
    ).toBe(true);

    const chunks = readExportClientChunkContents("out", repoRoot);
    expect(
      exportClientBundleIncludesBootstrapFrom(
        chunks,
        resolveExportSearchBootstrapClientFrom(exportBasePath),
      ),
    ).toBe(true);
    expect(chunks).toContain("tagFilterDescription");

    const gqaHtml = readFileSync(gqaExportHtmlPath, "utf8");
    expect(
      exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(gqaHtml),
    ).toBe(true);
    expect(exportHtmlReferencesBasePathAssets(gqaHtml, exportBasePath)).toBe(
      true,
    );
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
