import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import { runPhase1ExportSearchUxChecks } from "@/lib/verify/phase-1-export-search-ux-checks";

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

function ensureSearchExportArtifacts(): void {
  if (existsSync(searchExportHtmlPath)) {
    return;
  }

  const buildResult = runStaticExportBuild({
    cwd: repoRoot,
  });
  if (buildResult.status !== 0) {
    throw new Error(
      `build-export failed with status ${buildResult.status}: ${buildResult.stderr ?? buildResult.stdout ?? ""}`,
    );
  }
  if (!existsSync(searchExportHtmlPath)) {
    throw new Error(`missing export artifact at ${searchExportHtmlPath}`);
  }
}

describe("static export Phase 1 search UX", () => {
  beforeAll(() => {
    removeExportArtifacts();
    ensureSearchExportArtifacts();
  }, 300_000);

  afterAll(() => {
    removeExportArtifacts();
  });

  test(
    "build:export serves GQA, attention, and KV cache on /search and header dialog",
    async () => {
      ensureSearchExportArtifacts();

      const failures = await runPhase1ExportSearchUxChecks({
        cwd: repoRoot,
        searchPageOptions: { timeoutMs: 45_000 },
        searchDialogOptions: { timeoutMs: 45_000 },
      });
      expect(failures).toEqual([]);
    },
    { timeout: 300_000 },
  );

  test("verify-phase-1-export-search-ux script passes after build:export", () => {
    ensureSearchExportArtifacts();

    const verifyResult = spawnSync(
      "bun",
      ["./scripts/verify-phase-1-export-search-ux.ts"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: process.env,
      },
    );

    expect(verifyResult.status).toBe(0);
    expect(verifyResult.stdout ?? "").toContain(
      "Phase 1 static export search UX verified",
    );
  });
});
