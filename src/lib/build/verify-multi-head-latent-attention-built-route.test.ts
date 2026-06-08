import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyMultiHeadLatentAttentionBuiltRouteFromFile,
  verifyMultiHeadLatentAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-multi-head-latent-attention-built-route";
import { buildMultiHeadLatentAttentionStubBody } from "@/lib/verify/multi-head-latent-attention-module-convergence";

describe("verifyMultiHeadLatentAttentionBuiltRouteFromHtml", () => {
  test("passes when HTML includes MLA module markers", () => {
    const result = verifyMultiHeadLatentAttentionBuiltRouteFromHtml(
      `<html><body>${buildMultiHeadLatentAttentionStubBody()}</body></html>`,
    );
    expect(result.ok).toBe(true);
  });

  test("fails when a required marker is missing", () => {
    const result = verifyMultiHeadLatentAttentionBuiltRouteFromHtml(
      "<html><body>Multi-Head Latent Attention</body></html>",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }
  });
});

describe("verifyMultiHeadLatentAttentionBuiltRouteFromFile", () => {
  test("fails when the built HTML file is missing", () => {
    const result = verifyMultiHeadLatentAttentionBuiltRouteFromFile(
      ".next/missing/multi-head-latent-attention.html",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing built HTML");
    }
  });

  test("passes against fixture built HTML on disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "mla-built-route-"));
    const htmlPath = join(dir, "multi-head-latent-attention.html");
    writeFileSync(
      htmlPath,
      `<html><body>${buildMultiHeadLatentAttentionStubBody()}</body></html>`,
    );

    const result = verifyMultiHeadLatentAttentionBuiltRouteFromFile(
      htmlPath,
      dir,
    );
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
