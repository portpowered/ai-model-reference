import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import { runPhase1ExportSearchUxChecks } from "@/lib/verify/phase-1-export-search-ux-checks";

const repoRoot = join(import.meta.dir, "../../..");

describe("static export Phase 1 search UX", () => {
  beforeAll(() => {
    ensureExportSearchArtifacts({ repoRoot });
  }, 300_000);

  test(
    "build:export serves GQA, attention, and KV cache on /search and header dialog",
    async () => {
      ensureExportSearchArtifacts({ repoRoot });

      const failures = await runPhase1ExportSearchUxChecks({
        cwd: repoRoot,
        searchPageOptions: { timeoutMs: 45_000 },
        searchDialogOptions: { timeoutMs: 45_000 },
      });
      expect(failures).toEqual([]);
    },
    { timeout: 300_000 },
  );

  test(
    "verify-phase-1-export-search-ux script passes after build:export",
    () => {
      ensureExportSearchArtifacts({ repoRoot });

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
    },
    { timeout: 300_000 },
  );
});
