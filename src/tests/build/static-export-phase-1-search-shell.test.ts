import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  assertSearchPageExportShell,
  assertSearchPageExportShellStateRegion,
  SEARCH_PAGE_INPUT_HTML_MARKER,
  verifyPhase1ExportSearchShellFromOutDir,
} from "@/lib/verify/phase-1-search-export-shell-checks";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");
const searchExportHtmlPath = join(outDir, "search.html");

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export Phase 1 /search shell regression", () => {
  test(
    "build:export emits out/search.html with the real search input shell markers",
    () => {
      removeExportArtifacts();

      try {
        const result = spawnSync("bun", ["run", "build:export"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        });

        const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        expect(result.status).toBe(0);
        expect(existsSync(searchExportHtmlPath)).toBe(true);

        const searchHtml = readFileSync(searchExportHtmlPath, "utf8");
        expect(searchHtml).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);
        expect(assertSearchPageExportShellStateRegion(searchHtml)).toBeNull();
        expect(assertSearchPageExportShell(searchHtml)).toBeNull();

        const verification = verifyPhase1ExportSearchShellFromOutDir("out", {
          cwd: repoRoot,
        });
        expect(verification.ok).toBe(true);

        if (combined.includes("Error")) {
          throw new Error(`Unexpected export build output: ${combined}`);
        }
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );

  test(
    "verify-phase-1-export-search-shell script passes after build:export",
    () => {
      removeExportArtifacts();

      try {
        const buildResult = spawnSync("bun", ["run", "build:export"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        });
        expect(buildResult.status).toBe(0);

        const verifyResult = spawnSync(
          "bun",
          ["./scripts/verify-phase-1-export-search-shell.ts"],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: process.env,
          },
        );

        expect(verifyResult.status).toBe(0);
        expect(verifyResult.stdout ?? "").toContain(
          "Phase 1 export search shell verified",
        );
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 180_000 },
  );
});
