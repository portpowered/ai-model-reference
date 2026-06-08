import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docsSearchApi } from "@/lib/search/search-server";
import { EXPORT_SEARCH_HYDRATION_SURFACE } from "@/lib/verify/phase-1-export-search-convergence-evidence";
import { EXPORT_SEARCH_UX_STUB_ENV } from "@/lib/verify/phase-1-export-search-ux-checks";

const repoRoot = process.cwd();

describe("verify-phase-1-export-search-ux script", () => {
  test(
    "exits non-zero with hydration-tagged /search failure including query",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "verify-export-ux-fail-"));
      const outDir = join(dir, "out");
      mkdirSync(join(outDir, "api"), { recursive: true });
      const exported = await (await docsSearchApi.staticGET()).json();
      writeFileSync(join(outDir, "api", "search"), JSON.stringify(exported));
      writeFileSync(join(outDir, "index.html"), "<html></html>");

      const result = spawnSync(
        "bun",
        ["./scripts/verify-phase-1-export-search-ux.ts", outDir],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            [EXPORT_SEARCH_UX_STUB_ENV]: "fail-search",
          },
        },
      );

      expect(result.status).toBe(1);
      const stderr = result.stderr ?? "";
      expect(stderr).toContain("/search?query=attention:");
      expect(stderr).toContain(EXPORT_SEARCH_HYDRATION_SURFACE);
      expect(stderr).toContain("attention");
      expect(stderr).not.toContain("route-shell");

      rmSync(dir, { recursive: true, force: true });
    },
    { timeout: 180_000 },
  );

  test(
    "exits zero when stubbed browser checks succeed",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "verify-export-ux-pass-"));
      const outDir = join(dir, "out");
      mkdirSync(join(outDir, "api"), { recursive: true });
      const exported = await (await docsSearchApi.staticGET()).json();
      writeFileSync(join(outDir, "api", "search"), JSON.stringify(exported));
      writeFileSync(join(outDir, "index.html"), "<html></html>");

      const result = spawnSync(
        "bun",
        ["./scripts/verify-phase-1-export-search-ux.ts", outDir],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            [EXPORT_SEARCH_UX_STUB_ENV]: "pass",
          },
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout ?? "").toContain(
        "Phase 1 static export search UX verified",
      );

      rmSync(dir, { recursive: true, force: true });
    },
    { timeout: 180_000 },
  );
});
