import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { buildSearchPageExportShellStubBody } from "./phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "./static-export-http-server";
import { verifyStaticExportSearchPhase1Queries } from "./static-export-search-phase-1-queries-http";

describe("verifyStaticExportSearchPhase1Queries", () => {
  test(
    "returns a failure reason when export HTML lacks the search input shell",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }
      const root = mkdtempSync(join(tmpdir(), "search-phase1-missing-"));
      const outDir = join(root, "out");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "search.html"),
        "<html><body>Search</body></html>",
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportSearchPhase1Queries(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toMatch(/search-page-input|Search Model Atlas/);
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 15_000 },
  );

  test(
    "returns a failure reason when SSR shell exists but queries never hydrate",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }
      const root = mkdtempSync(join(tmpdir(), "search-phase1-static-"));
      const outDir = join(root, "out");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "search.html"),
        `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportSearchPhase1Queries(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toMatch(
          /did not update|idle state remained visible|no loading, results, or empty outcome|timed out waiting|no search results rendered/,
        );
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 30_000 },
  );
});
