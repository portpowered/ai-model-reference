import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import { verifyStaticExportGqaGraphHydration } from "./static-export-gqa-graph-hydration-http";
import { createStaticExportHttpServer } from "./static-export-http-server";

function writeGqaExportFixture(rootDir: string): void {
  const outDir = join(rootDir, "out");
  const gqaPath = join(
    outDir,
    "docs",
    "modules",
    "grouped-query-attention.html",
  );
  mkdirSync(join(gqaPath, ".."), { recursive: true });
  writeFileSync(
    gqaPath,
    `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    { encoding: "utf8" },
  );
}

describe("verifyStaticExportGqaGraphHydration", () => {
  test(
    "returns a failure reason when the comparison graph shell is absent",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "gqa-graph-hydration-missing-"));
      const gqaPath = join(
        root,
        "out",
        "docs",
        "modules",
        "grouped-query-attention.html",
      );
      mkdirSync(join(gqaPath, ".."), { recursive: true });
      writeFileSync(
        gqaPath,
        "<html><body>Grouped-Query Attention</body></html>",
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportGqaGraphHydration(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toContain("comparison graph shell markers");
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 15_000 },
  );

  test(
    "returns a failure reason when SSR markers exist but React Flow does not hydrate",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "gqa-graph-hydration-static-"));
      writeGqaExportFixture(root);

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportGqaGraphHydration(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toContain("React Flow canvas did not hydrate");
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 15_000 },
  );
});
