import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
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
  test(
    "build:export serves GQA, attention, and KV cache on /search and header dialog",
    async () => {
      removeExportArtifacts();

      try {
        const buildResult = spawnSync("bun", ["run", "build:export"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        });
        expect(buildResult.status).toBe(0);

        const failures = await runPhase1ExportSearchUxChecks({ cwd: repoRoot });
        expect(failures).toEqual([]);
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 240_000 },
  );

  test(
    "verify-phase-1-export-search-ux script passes after build:export",
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
      } finally {
        removeExportArtifacts();
      }
    },
    { timeout: 240_000 },
  );
});
