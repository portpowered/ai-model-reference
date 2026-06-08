import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyLinearAttentionBuiltRouteFromFile,
  verifyLinearAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-linear-attention-built-route";
import { buildLinearAttentionStubBody } from "@/lib/verify/linear-attention-module-convergence";

describe("verifyLinearAttentionBuiltRouteFromHtml", () => {
  test("passes when HTML includes linear-attention module markers", () => {
    const result = verifyLinearAttentionBuiltRouteFromHtml(
      `<html><body>${buildLinearAttentionStubBody()}</body></html>`,
    );
    expect(result.ok).toBe(true);
  });

  test("fails when a required marker is missing", () => {
    const result = verifyLinearAttentionBuiltRouteFromHtml(
      "<html><body>Linear Attention</body></html>",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }
  });
});

describe("verifyLinearAttentionBuiltRouteFromFile", () => {
  test("fails when the built HTML file is missing", () => {
    const result = verifyLinearAttentionBuiltRouteFromFile(
      ".next/missing/linear-attention.html",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing built HTML");
    }
  });

  test("passes against fixture built HTML on disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "linear-built-route-"));
    const htmlPath = join(dir, "linear-attention.html");
    writeFileSync(
      htmlPath,
      `<html><body>${buildLinearAttentionStubBody()}</body></html>`,
    );

    const result = verifyLinearAttentionBuiltRouteFromFile(htmlPath, dir);
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
