import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldRunExportIntegrationProbeTests,
} from "@/lib/verify/export-integration-probe-lock";
import { runPhase1ExportSearchUxChecks } from "@/lib/verify/phase-1-export-search-ux-checks";

const repoRoot = join(import.meta.dir, "../../..");

describe("static export Phase 1 search UX", () => {
  beforeAll(() => {
    if (!shouldRunExportIntegrationProbeTests()) {
      return;
    }
    ensureExportSearchArtifacts({ repoRoot });
  }, getExportIntegrationBunTestTimeoutMs());

  test(
    "build:export serves GQA, attention, and KV cache on /search and header dialog",
    async () => {
      if (!shouldRunExportIntegrationProbeTests()) {
        return;
      }
      ensureExportSearchArtifacts({ repoRoot });

      const failures = await runPhase1ExportSearchUxChecks({
        cwd: repoRoot,
        searchPageOptions: { timeoutMs: 45_000 },
        searchDialogOptions: { timeoutMs: 45_000 },
      });
      expect(failures).toEqual([]);
    },
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );

  test(
    "verify-phase-1-export-search-ux script passes after build:export",
    () => {
      if (!shouldRunExportIntegrationProbeTests()) {
        return;
      }
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
    { timeout: getExportIntegrationBunTestTimeoutMs() },
  );
});
