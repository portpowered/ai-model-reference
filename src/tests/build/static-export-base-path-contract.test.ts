import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  type AdvancedOramaExportPayload,
  EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH,
} from "@/lib/build/export-search-bootstrap";
import { runPhase1StaticHandoffSearchChecksFromOutDir } from "@/lib/build/run-phase-1-static-handoff-search-checks";
import {
  getStaticExportBuildBunTestTimeoutMs,
  withStaticExportBuildLockSync,
} from "@/lib/build/run-static-export-build";
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
import { verifyPhase1ExportSearchFromOutDir } from "@/lib/build/verify-phase-1-export-search";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "@/lib/verify/phase-1-search-checks";
import {
  assertSearchPageExportShell,
  assertSearchPageExportShellStateRegion,
  SEARCH_PAGE_INPUT_HTML_MARKER,
  verifyPhase1ExportSearchShellFromOutDir,
} from "@/lib/verify/phase-1-search-export-shell-checks";
import { withGlobalFetchOverride } from "@/tests/shared/global-fetch-lock";
import { SAMPLE_MODULE_URL } from "../search/helpers";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";
const searchExportHtmlPath = join(outDir, "search.html");
const gqaExportHtmlPath = join(
  outDir,
  "docs/modules/grouped-query-attention.html",
);
const TEST_EXPORT_SEARCH_URL = "http://export.test/api/search";

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export GitHub Pages base-path contract", () => {
  const originalFetch = globalThis.fetch;
  let searchPayload: AdvancedOramaExportPayload;
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());

    withStaticExportBuildLockSync(() => {
      removeExportArtifacts();
    });

    ensureExportSearchArtifacts({
      repoRoot,
      basePath: exportBasePath,
    });

    const bootstrapPath = join(outDir, EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH);
    expect(existsSync(bootstrapPath)).toBe(true);
    searchPayload = JSON.parse(
      readFileSync(bootstrapPath, "utf8"),
    ) as AdvancedOramaExportPayload;
  }, getStaticExportBuildBunTestTimeoutMs());

  test("emits static search bootstrap and handoff payload", async () => {
    expect(searchPayload.type).toBe("advanced");
    expect(JSON.stringify(searchPayload)).toContain(
      PHASE_1_GROUPED_QUERY_ATTENTION_URL,
    );

    const verification = await verifyPhase1ExportSearchFromOutDir("out", {
      cwd: repoRoot,
    });
    expect(verification.ok).toBe(true);

    const handoffChecks = await runPhase1StaticHandoffSearchChecksFromOutDir(
      "out",
      metaByUrl,
      {
        cwd: repoRoot,
      },
    );
    expect(handoffChecks.ok).toBe(true);
  });

  test("serves bootstrap payload through the static Orama client contract", async () => {
    await withGlobalFetchOverride(
      (async (input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url === TEST_EXPORT_SEARCH_URL) {
          return new Response(JSON.stringify(searchPayload), { status: 200 });
        }
        return originalFetch(input);
      }) as typeof fetch,
      async () => {
        const client = oramaStaticClient({ from: TEST_EXPORT_SEARCH_URL });
        const results = await client.search("GQA");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
      },
    );
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
    expect(assertSearchPageExportShellStateRegion(searchHtml)).toBeNull();
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

  test("script entrypoints pass against the shared base-path export artifact", () => {
    const scriptEnv = {
      ...process.env,
      GITHUB_PAGES_BASE_PATH: exportBasePath,
    };

    const routeResult = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-routes.ts"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: scriptEnv,
      },
    );
    expect(routeResult.status).toBe(0);
    expect(routeResult.stdout ?? "").toContain(
      "Phase 1 export routes verified",
    );

    const handoffResult = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-search-handoff.ts"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: scriptEnv,
      },
    );
    expect(handoffResult.status).toBe(0);
    expect(handoffResult.stdout ?? "").toContain(
      "Phase 1 static export search handoff verified",
    );

    const shellResult = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-search-shell.ts"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: scriptEnv,
      },
    );
    expect(shellResult.status).toBe(0);
    expect(shellResult.stdout ?? "").toContain(
      "Phase 1 export search shell verified",
    );

    const shellVerification = verifyPhase1ExportSearchShellFromOutDir("out", {
      cwd: repoRoot,
    });
    expect(shellVerification.ok).toBe(true);
  });
});
