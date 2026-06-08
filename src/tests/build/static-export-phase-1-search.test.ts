import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
  type AdvancedOramaExportPayload,
  EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH,
} from "@/lib/build/export-search-bootstrap";
import { runPhase1StaticHandoffSearchChecksFromOutDir } from "@/lib/build/run-phase-1-static-handoff-search-checks";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import { verifyPhase1ExportSearchFromOutDir } from "@/lib/build/verify-phase-1-export-search";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "@/lib/verify/phase-1-search-checks";
import { SAMPLE_MODULE_URL } from "../search/helpers";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const TEST_EXPORT_SEARCH_URL = "http://export.test/api/search";

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export Phase 1 search bootstrap", () => {
  const originalFetch = globalThis.fetch;
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test(
    "build:export emits out/api/search advanced Orama bootstrap payload",
    async () => {
      removeExportArtifacts();

      try {
        const result = runStaticExportBuild({
          cwd: repoRoot,
        });

        const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        expect(result.status).toBe(0);

        const bootstrapPath = join(
          outDir,
          EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH,
        );
        expect(existsSync(bootstrapPath)).toBe(true);

        const payload = JSON.parse(
          readFileSync(bootstrapPath, "utf8"),
        ) as AdvancedOramaExportPayload;
        expect(payload.type).toBe("advanced");
        expect(JSON.stringify(payload)).toContain(
          PHASE_1_GROUPED_QUERY_ATTENTION_URL,
        );

        const verification = await verifyPhase1ExportSearchFromOutDir("out", {
          cwd: repoRoot,
        });
        expect(verification.ok).toBe(true);

        const handoffChecks =
          await runPhase1StaticHandoffSearchChecksFromOutDir("out", metaByUrl, {
            cwd: repoRoot,
          });
        expect(handoffChecks.ok).toBe(true);

        globalThis.fetch = (async (input: RequestInfo | URL) => {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url;
          if (url === TEST_EXPORT_SEARCH_URL) {
            return new Response(JSON.stringify(payload), { status: 200 });
          }
          return originalFetch(input);
        }) as typeof fetch;

        const client = oramaStaticClient({ from: TEST_EXPORT_SEARCH_URL });
        const results = await client.search("GQA");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);

        if (combined.includes("Error")) {
          throw new Error(`Unexpected export build output: ${combined}`);
        }
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );

  test(
    "verify-phase-1-export-search-handoff script passes after build:export",
    async () => {
      removeExportArtifacts();

      try {
        const buildResult = runStaticExportBuild({
          cwd: repoRoot,
        });
        expect(buildResult.status).toBe(0);

        const verifyResult = spawnSync(
          "bun",
          ["./scripts/verify-phase-1-export-search-handoff.ts"],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: process.env,
          },
        );

        expect(verifyResult.status).toBe(0);
        expect(verifyResult.stdout ?? "").toContain(
          "Phase 1 static export search handoff verified",
        );
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );
});
