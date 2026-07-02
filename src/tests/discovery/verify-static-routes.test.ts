import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  missingPhase1StaticRoutes,
  missingRequiredBuildStaticRoutes,
  PHASE_1_STATIC_ROUTES,
  PHASE_2_TAXONOMY_GLOSSARY_ROUTES,
  REQUIRED_BUILD_STATIC_ROUTES,
  verifyPhase1StaticRoutesFromManifest,
  verifyRequiredBuildStaticRoutesFromManifest,
} from "@/lib/build/verify-phase-1-static-routes";
import { getGeneratedDocsSourceRoot } from "@/lib/content/content-paths";

setDefaultTimeout(30_000);

/** Minimal manifest whose values cover every required static route. */
function completeRequiredBuildManifest(): Record<string, string> {
  return Object.fromEntries(
    REQUIRED_BUILD_STATIC_ROUTES.map((route) => [`/_app${route}`, route]),
  );
}

/** Minimal manifest whose values cover every Phase 1 static route. */
function completePhase1Manifest(): Record<string, string> {
  return Object.fromEntries(
    PHASE_1_STATIC_ROUTES.map((route) => [`/_app${route}`, route]),
  );
}

function regenerateFumadocsSourceBindings() {
  const prepareResult = spawnSync("bun", ["run", "prepare:content-runtime"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  expect(prepareResult.status).toBe(0);

  const generateResult = spawnSync("bunx", ["fumadocs-mdx"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  expect(generateResult.status).toBe(0);
}

describe("verifyRequiredBuildStaticRoutesFromManifest", () => {
  test("passes when all required routes are present in manifest values", () => {
    const result = verifyRequiredBuildStaticRoutesFromManifest(
      completeRequiredBuildManifest(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      expect(result.missing).toEqual([]);
    }
  });

  test("passes when a required glossary route is covered by docs catch-all params", () => {
    const manifest = completeRequiredBuildManifest();
    delete manifest["/_app/docs/glossary/token"];
    manifest["/_app/docs/[[...slug]]"] = "/docs/[[...slug]]";

    const catchAllSlugs = new Set(["glossary/token"]);
    const result = verifyRequiredBuildStaticRoutesFromManifest(
      manifest,
      catchAllSlugs,
    );

    expect(result.ok).toBe(true);
    expect(missingRequiredBuildStaticRoutes(manifest, catchAllSlugs)).toEqual(
      [],
    );
  });

  test("fails when a Phase 2 taxonomy glossary route is absent", () => {
    const manifest = completeRequiredBuildManifest();
    delete manifest["/_app/docs/glossary/model"];

    const missing = missingRequiredBuildStaticRoutes(manifest);
    expect(missing).toContain("/docs/glossary/model");

    const result = verifyRequiredBuildStaticRoutesFromManifest(manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("/docs/glossary/model");
    }
  });

  test("taxonomy glossary route list covers all nine Phase 2 pages", () => {
    expect(PHASE_2_TAXONOMY_GLOSSARY_ROUTES).toHaveLength(9);
    expect(PHASE_2_TAXONOMY_GLOSSARY_ROUTES).toContain("/docs/glossary/model");
    expect(PHASE_2_TAXONOMY_GLOSSARY_ROUTES).toContain(
      "/docs/glossary/representation",
    );
  });
});

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
    const manifest = completeRequiredBuildManifest();
    delete manifest["/_app/search"];

    writeFileSync(manifestPath, JSON.stringify(manifest));

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-static-routes.ts", manifestPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("/search");
    expect(result.stderr).toContain("Required static routes missing");

    rmSync(dir, { recursive: true, force: true });
  });

  test("exits zero against a complete fixture manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "phase-1-manifest-"));
    const manifestPath = join(dir, "app-path-routes-manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify(completeRequiredBuildManifest()),
    );

    const result = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-static-routes.ts", manifestPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Required static routes verified");

    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "uses published docs runtime instead of requiring .source for explicit fixture manifests",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "phase-1-manifest-"));
      const manifestPath = join(dir, "app-path-routes-manifest.json");
      const sourceRoot = getGeneratedDocsSourceRoot(process.cwd());
      writeFileSync(
        manifestPath,
        JSON.stringify(completeRequiredBuildManifest()),
      );

      try {
        rmSync(sourceRoot, { recursive: true, force: true });

        const result = spawnSync(
          "bun",
          ["./scripts/verify-phase-1-static-routes.ts", manifestPath],
          { cwd: process.cwd(), encoding: "utf8" },
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("Required static routes verified");
      } finally {
        rmSync(dir, { recursive: true, force: true });
        regenerateFumadocsSourceBindings();
      }
    },
    { timeout: 15_000 },
  );
});
