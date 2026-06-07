import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = process.cwd();

describe("verify-phase-1-export-routes script", () => {
  test("exits non-zero when out/ is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "verify-export-script-missing-"));
    const missingOutDir = join(dir, "missing-out");

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-routes.ts", missingOutDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr ?? "").toContain(
      "Phase 1 export route verification failed",
    );
    expect(result.stderr ?? "").toContain("Missing export directory");

    rmSync(dir, { recursive: true, force: true });
  });

  test("exits non-zero when a representative route HTML is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "verify-export-script-route-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), "<html>Model Atlas</html>");

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-routes.ts", outDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr ?? "").toContain("Missing exported HTML");

    rmSync(dir, { recursive: true, force: true });
  });
});
