import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifySlidingWindowAttentionBuiltRouteFromFile,
  verifySlidingWindowAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-sliding-window-attention-built-route";
import { buildSlidingWindowAttentionStubBody } from "@/lib/verify/sliding-window-attention-module-convergence";

describe("verifySlidingWindowAttentionBuiltRouteFromHtml", () => {
  test("passes when HTML includes sliding-window-attention module markers", () => {
    const result = verifySlidingWindowAttentionBuiltRouteFromHtml(
      `<html><body>${buildSlidingWindowAttentionStubBody()}</body></html>`,
    );
    expect(result.ok).toBe(true);
  });

  test("fails when a required marker is missing", () => {
    const result = verifySlidingWindowAttentionBuiltRouteFromHtml(
      "<html><body>Sliding-Window Attention</body></html>",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }
  });
});

describe("verifySlidingWindowAttentionBuiltRouteFromFile", () => {
  test("fails when the built HTML file is missing", () => {
    const result = verifySlidingWindowAttentionBuiltRouteFromFile(
      ".next/missing/sliding-window-attention.html",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing built HTML");
    }
  });

  test("passes against fixture built HTML on disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "sliding-window-built-route-"));
    const htmlPath = join(dir, "sliding-window-attention.html");
    writeFileSync(
      htmlPath,
      `<html><body>${buildSlidingWindowAttentionStubBody()}</body></html>`,
    );

    const result = verifySlidingWindowAttentionBuiltRouteFromFile(
      htmlPath,
      dir,
    );
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
