import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "./export-integration-probe-lock";
import { buildMultiTokenPredictionStubBody } from "./multi-token-prediction-module-convergence";
import { createStaticExportHttpServer } from "./static-export-http-server";
import { verifyStaticExportMtpGraphHydration } from "./static-export-mtp-graph-hydration-http";

function writeMtpExportFixture(rootDir: string): void {
  const outDir = join(rootDir, "out");
  const mtpPath = join(
    outDir,
    "docs",
    "modules",
    "multi-token-prediction.html",
  );
  mkdirSync(join(mtpPath, ".."), { recursive: true });
  writeFileSync(
    mtpPath,
    `<html><body>${buildMultiTokenPredictionStubBody()}</body></html>`,
    { encoding: "utf8" },
  );
}

describe("verifyStaticExportMtpGraphHydration", () => {
  test(
    "returns a failure reason when the comparison graph shell is absent",
    async () => {
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }
      const root = mkdtempSync(join(tmpdir(), "mtp-graph-hydration-missing-"));
      const mtpPath = join(
        root,
        "out",
        "docs",
        "modules",
        "multi-token-prediction.html",
      );
      mkdirSync(join(mtpPath, ".."), { recursive: true });
      writeFileSync(
        mtpPath,
        "<html><body>Multi-Token Prediction</body></html>",
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportMtpGraphHydration(
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
      if (!shouldRunPlaywrightHttpVerifierUnitTests()) {
        return;
      }
      const root = mkdtempSync(join(tmpdir(), "mtp-graph-hydration-static-"));
      writeMtpExportFixture(root);

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportMtpGraphHydration(
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
