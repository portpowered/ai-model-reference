import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const exportBasePath = "/ai-model-reference";

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export GitHub Pages base path", () => {
  test(
    "build-export workflow verifies prefixed out/ HTML when GITHUB_PAGES_BASE_PATH is set",
    () => {
      removeExportArtifacts();

      try {
        const buildResult = spawnSync("bun", ["run", "build:export"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            GITHUB_PAGES_BASE_PATH: exportBasePath,
          },
        });
        expect(buildResult.status).toBe(0);

        const verifyResult = spawnSync(
          "bun",
          ["./scripts/verify-phase-1-export-routes.ts"],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: {
              ...process.env,
              GITHUB_PAGES_BASE_PATH: exportBasePath,
            },
          },
        );

        expect(verifyResult.status).toBe(0);
        expect(verifyResult.stdout ?? "").toContain(
          "Phase 1 export routes verified",
        );
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );

  test(
    "build:export prefixes bundled assets and internal links in out/index.html",
    () => {
      removeExportArtifacts();

      try {
        const result = spawnSync("bun", ["run", "build:export"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            GITHUB_PAGES_BASE_PATH: exportBasePath,
          },
        });

        const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        expect(result.status).toBe(0);

        const indexHtmlPath = join(outDir, "index.html");
        expect(existsSync(indexHtmlPath)).toBe(true);

        const html = readFileSync(indexHtmlPath, "utf8");
        expect(exportHtmlReferencesBasePathAssets(html, exportBasePath)).toBe(
          true,
        );
        expect(
          exportHtmlReferencesBasePathInternalLinks(html, exportBasePath),
        ).toBe(true);

        if (combined.includes("Error")) {
          throw new Error(`Unexpected export build output: ${combined}`);
        }
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );
});
