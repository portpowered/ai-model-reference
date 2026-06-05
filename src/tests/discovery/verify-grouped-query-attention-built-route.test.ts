import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGroupedQueryAttentionStubBody } from "@/lib/verify/grouped-query-attention-module-convergence";

describe("verify-grouped-query-attention-built-route script", () => {
  test("exits non-zero when built HTML is missing required markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "gqa-built-route-script-"));
    const htmlPath = join(dir, "grouped-query-attention.html");
    writeFileSync(
      htmlPath,
      "<html><body>Grouped-Query Attention</body></html>",
    );

    const result = spawnSync(
      "bun",
      ["./scripts/verify-grouped-query-attention-built-route.ts", htmlPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("convergence verification failed");
    expect(result.stderr).toContain("missing expected content");

    rmSync(dir, { recursive: true, force: true });
  });

  test("exits zero against fixture HTML with Phase 1 markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "gqa-built-route-script-"));
    const htmlPath = join(dir, "grouped-query-attention.html");
    writeFileSync(
      htmlPath,
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );

    const result = spawnSync(
      "bun",
      ["./scripts/verify-grouped-query-attention-built-route.ts", htmlPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("convergence verified");

    rmSync(dir, { recursive: true, force: true });
  });
});
