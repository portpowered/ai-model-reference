import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifySparseAttentionBuiltRouteFromFile,
  verifySparseAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-sparse-attention-built-route";
import { buildSparseAttentionStubBody } from "@/lib/verify/sparse-attention-module-convergence";

describe("verifySparseAttentionBuiltRouteFromHtml", () => {
  test("passes when HTML includes sparse-attention module markers", () => {
    const result = verifySparseAttentionBuiltRouteFromHtml(
      `<html><body>${buildSparseAttentionStubBody()}</body></html>`,
    );
    expect(result.ok).toBe(true);
  });

  test("fails when a required marker is missing", () => {
    const result = verifySparseAttentionBuiltRouteFromHtml(
      "<html><body>Sparse Attention</body></html>",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }
  });
});

describe("verifySparseAttentionBuiltRouteFromFile", () => {
  test("fails when the built HTML file is missing", () => {
    const result = verifySparseAttentionBuiltRouteFromFile(
      ".next/missing/sparse-attention.html",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing built HTML");
    }
  });

  test("passes against fixture built HTML on disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "sparse-built-route-"));
    const htmlPath = join(dir, "sparse-attention.html");
    writeFileSync(
      htmlPath,
      `<html><body>${buildSparseAttentionStubBody()}</body></html>`,
    );

    const result = verifySparseAttentionBuiltRouteFromFile(htmlPath, dir);
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
