import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureExportSearchArtifacts } from "@/lib/build/ensure-export-search-artifacts";
import { shouldRunBuiltHtmlFileConvergenceTests } from "@/lib/verify/built-html-convergence-test-helpers";
import { getExportIntegrationBunTestTimeoutMs } from "@/lib/verify/export-integration-probe-lock";
import { runPhase1ExportSearchUxChecks } from "@/lib/verify/phase-1-export-search-ux-checks";

const repoRoot = join(import.meta.dir, "../../..");
const VERIFY_EXPORT_SEARCH_UX_SCRIPT_INTEGRATION_ENV =
  "VERIFY_EXPORT_SEARCH_UX_SCRIPT_INTEGRATION";

function shouldRunExportSearchUxScriptIntegration(): boolean {
  return process.env[VERIFY_EXPORT_SEARCH_UX_SCRIPT_INTEGRATION_ENV] === "1";
}

/**
 * Served static-export Phase 1 search UX probes run under `make internal-test-integration`
 * so they do not contend with parallel export tests or flake on unhydrated
 * `/search` input snapshots during full `make test`.
 */
describe("static export Phase 1 search UX integration", () => {
  test(
    "build:export serves GQA, attention, and KV cache on /search and header dialog",
    async () => {
      if (!shouldRunBuiltHtmlFileConvergenceTests(repoRoot)) {
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
      if (!shouldRunBuiltHtmlFileConvergenceTests(repoRoot)) {
        return;
      }
      if (!shouldRunExportSearchUxScriptIntegration()) {
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
