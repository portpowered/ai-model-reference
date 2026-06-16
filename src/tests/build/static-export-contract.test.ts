import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
  type AdvancedOramaExportPayload,
  EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH,
} from "@/lib/build/export-search-bootstrap";
import { runPhase1StaticHandoffSearchChecksFromOutDir } from "@/lib/build/run-phase-1-static-handoff-search-checks";
import {
  getStaticExportBuildBunTestTimeoutMs,
  runStaticExportBuild,
} from "@/lib/build/run-static-export-build";
import {
  GROUPED_QUERY_ATTENTION_EXPORT_HTML_PATH,
  verifyGroupedQueryAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-grouped-query-attention-built-route";
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
import { SAMPLE_MODULE_URL } from "../search/helpers";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const searchExportHtmlPath = join(outDir, "search.html");
const exportBuildTestTimeout = getStaticExportBuildBunTestTimeoutMs();
const TEST_EXPORT_SEARCH_URL = "http://export.test/api/search";

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

function runScript(scriptPath: string) {
  return spawnSync("bun", [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

describe("static export contract", () => {
  const originalFetch = globalThis.fetch;
  let searchPayload: AdvancedOramaExportPayload;
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    removeExportArtifacts();

    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());

    const result = runStaticExportBuild({
      cwd: repoRoot,
    });
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    expect(result.status).toBe(0);

    if (combined.includes("Error")) {
      throw new Error(`Unexpected export build output: ${combined}`);
    }

    const bootstrapPath = join(outDir, EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH);
    expect(existsSync(bootstrapPath)).toBe(true);
    searchPayload = JSON.parse(
      readFileSync(bootstrapPath, "utf8"),
    ) as AdvancedOramaExportPayload;
  }, exportBuildTestTimeout);

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    removeExportArtifacts();
  });

  test("emits route HTML with Phase 1 shell and content markers", () => {
    const verification = verifyPhase1ExportRoutesFromOutDir("out", {
      cwd: repoRoot,
    });
    if (!verification.ok) {
      throw new Error(
        `Export route verification failed for ${verification.route ?? "out/"}: ${verification.reason}`,
      );
    }

    const gqaResult = verifyGroupedQueryAttentionBuiltRouteFromFile(
      GROUPED_QUERY_ATTENTION_EXPORT_HTML_PATH,
      repoRoot,
    );
    expect(gqaResult.ok).toBe(true);
  });

  test("emits the advanced Orama search bootstrap and handoff payload", async () => {
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

  test("serves the bootstrap payload through the static Orama client contract", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
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
    }) as typeof fetch;

    const client = oramaStaticClient({ from: TEST_EXPORT_SEARCH_URL });
    const results = await client.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
  });

  test("emits /search shell markers and state region", () => {
    expect(existsSync(searchExportHtmlPath)).toBe(true);

    const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
    expect(searchHtml).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
    expect(assertSearchPageExportShellStateRegion(searchHtml)).toBeNull();
    expect(assertSearchPageExportShell(searchHtml)).toBeNull();

    const verification = verifyPhase1ExportSearchShellFromOutDir("out", {
      cwd: repoRoot,
    });
    expect(verification.ok).toBe(true);
  });

  test("script entrypoints pass against the shared export artifact", () => {
    const routeResult = runScript("./scripts/verify-phase-1-export-routes.ts");
    expect(routeResult.status).toBe(0);
    expect(routeResult.stdout ?? "").toContain(
      "Phase 1 export routes verified",
    );

    const handoffResult = runScript(
      "./scripts/verify-phase-1-export-search-handoff.ts",
    );
    expect(handoffResult.status).toBe(0);
    expect(handoffResult.stdout ?? "").toContain(
      "Phase 1 static export search handoff verified",
    );

    const shellResult = runScript(
      "./scripts/verify-phase-1-export-search-shell.ts",
    );
    expect(shellResult.status).toBe(0);
    expect(shellResult.stdout ?? "").toContain(
      "Phase 1 export search shell verified",
    );
  });
});
