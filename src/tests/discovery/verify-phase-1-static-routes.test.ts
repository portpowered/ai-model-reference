import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  missingPhase1StaticRoutes,
  PHASE_1_STATIC_ROUTES,
  verifyPhase1StaticRoutesFromManifest,
} from "@/lib/build/verify-phase-1-static-routes";

/** Minimal manifest whose values cover every Phase 1 static route. */
function completePhase1Manifest(): Record<string, string> {
  return Object.fromEntries(
    PHASE_1_STATIC_ROUTES.map((route) => [`/_app${route}`, route]),
  );
}

describe("verifyPhase1StaticRoutesFromManifest", () => {
  test("passes when all Phase 1 routes are present in manifest values", () => {
    const result = verifyPhase1StaticRoutesFromManifest(
      completePhase1Manifest(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      expect(result.missing).toEqual([]);
    }
  });

  test("fails and names missing routes when a required path is absent", () => {
    const manifest = completePhase1Manifest();
    delete manifest["/_app/docs/modules/grouped-query-attention"];

    const missing = missingPhase1StaticRoutes(manifest);
    expect(missing).toContain("/docs/modules/grouped-query-attention");

    const result = verifyPhase1StaticRoutesFromManifest(manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("/docs/modules/grouped-query-attention");
    }
  });
});

describe("verify-phase-1-static-routes script", () => {
  test("exits non-zero against a fixture manifest missing a required route", () => {
    const dir = mkdtempSync(join(tmpdir(), "phase-1-manifest-"));
    const manifestPath = join(dir, "app-path-routes-manifest.json");
    const manifest = completePhase1Manifest();
    delete manifest["/_app/search"];

    writeFileSync(manifestPath, JSON.stringify(manifest));

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-static-routes.ts", manifestPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("/search");
    expect(result.stderr).toContain("Phase 1 static routes missing");

    rmSync(dir, { recursive: true, force: true });
  });

  test("exits zero against a complete fixture manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "phase-1-manifest-"));
    const manifestPath = join(dir, "app-path-routes-manifest.json");
    writeFileSync(manifestPath, JSON.stringify(completePhase1Manifest()));

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-static-routes.ts", manifestPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Phase 1 static routes verified");

    rmSync(dir, { recursive: true, force: true });
  });
});
