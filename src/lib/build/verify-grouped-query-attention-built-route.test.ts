import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyGroupedQueryAttentionBuiltRouteFromFile,
  verifyGroupedQueryAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-grouped-query-attention-built-route";
import { buildGroupedQueryAttentionStubBody } from "@/lib/verify/grouped-query-attention-module-convergence";

describe("verifyGroupedQueryAttentionBuiltRouteFromHtml", () => {
  test("passes when HTML includes Phase 1 GQA module markers", () => {
    const result = verifyGroupedQueryAttentionBuiltRouteFromHtml(
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );
    expect(result.ok).toBe(true);
  });

  test("fails when a required marker is missing", () => {
    const result = verifyGroupedQueryAttentionBuiltRouteFromHtml(
      "<html><body>Grouped-Query Attention</body></html>",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }
  });
});

describe("verifyGroupedQueryAttentionBuiltRouteFromFile", () => {
  test("fails when the built HTML file is missing", () => {
    const result = verifyGroupedQueryAttentionBuiltRouteFromFile(
      ".next/missing/grouped-query-attention.html",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing built HTML");
    }
  });

  test("passes against fixture built HTML on disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "gqa-built-route-"));
    const htmlPath = join(dir, "grouped-query-attention.html");
    writeFileSync(
      htmlPath,
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );

    const result = verifyGroupedQueryAttentionBuiltRouteFromFile(htmlPath, dir);
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
