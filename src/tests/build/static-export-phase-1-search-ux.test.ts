import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runStaticExportBuild } from "@/lib/build/run-static-export-build";
import { runPhase1ExportSearchUxChecks } from "@/lib/verify/phase-1-export-search-ux-checks";

const repoRoot = join(import.meta.dir, "../../..");
const outDir = join(repoRoot, "out");
const nextDir = join(repoRoot, ".next");

function removeExportArtifacts(): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
}

describe("static export Phase 1 search UX", () => {
  beforeAll(() => {
    removeExportArtifacts();

    const buildResult = runStaticExportBuild({
      cwd: repoRoot,
    });
    if (buildResult.status !== 0) {
      throw new Error(
        `build-export failed with status ${buildResult.status}: ${buildResult.stderr ?? buildResult.stdout ?? ""}`,
      );
    }
  }, 300_000);

  afterAll(() => {
    removeExportArtifacts();
  });

  test(
    "build:export serves GQA, attention, and KV cache on /search and header dialog",
    async () => {
      const failures = await runPhase1ExportSearchUxChecks({
        cwd: repoRoot,
        searchPageOptions: { timeoutMs: 30_000 },
        searchDialogOptions: { timeoutMs: 30_000 },
      });
      expect(failures).toEqual([]);
    },
    { timeout: 240_000 },
  );

  test("verify-phase-1-export-search-ux script passes after build:export", () => {
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
