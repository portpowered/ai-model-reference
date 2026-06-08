import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSearchPageExportShellStubBody } from "@/lib/verify/phase-1-search-export-shell-checks";

const repoRoot = process.cwd();

describe("verify-phase-1-export-search-shell script", () => {
  test("exits non-zero with route-shell failure when input shell marker is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "verify-export-shell-missing-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(outDir, "search.html"),
      `<html><h1>Search</h1><p>Search Model Atlas</p><p>/search ?q=</p><output data-testid="search-page-idle"></output></html>`,
    );

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-search-shell.ts", outDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    const stderr = result.stderr ?? "";
    expect(stderr).toContain("route-shell");
    expect(stderr).toContain("missing input shell");
    expect(stderr).toMatch(/search-page-input/);
    expect(stderr).not.toMatch(/hydrat|timed out/i);

    rmSync(dir, { recursive: true, force: true });
  });

  test("exits zero when export shell markers are present", () => {
    const dir = mkdtempSync(join(tmpdir(), "verify-export-shell-pass-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), "<html>Model Atlas</html>");
    writeFileSync(
      join(outDir, "search.html"),
      `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
    );

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-search-shell.ts", outDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout ?? "").toContain(
      "Phase 1 export search shell verified",
    );

    rmSync(dir, { recursive: true, force: true });
  });
});
