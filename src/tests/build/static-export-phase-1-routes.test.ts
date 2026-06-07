import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  GROUPED_QUERY_ATTENTION_EXPORT_HTML_PATH,
  verifyGroupedQueryAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-grouped-query-attention-built-route";
import { verifyPhase1ExportRoutesFromOutDir } from "@/lib/build/verify-phase-1-export-routes";

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

describe("static export Phase 1 reader routes", () => {
  test(
    "build:export emits out/ HTML with Phase 1 shell and content markers",
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

        const verification = verifyPhase1ExportRoutesFromOutDir("out", {
          cwd: repoRoot,
        });
        if (!verification.ok) {
          throw new Error(
            `Export route verification failed for ${verification.route ?? "out/"}: ${verification.reason}`,
          );
        }

        const gqaResult = verifyGroupedQueryAttentionBuiltRouteFromFile(
          GROUPED_QUERY_ATTENTION_EXPORT_HTML_PATH,
          repoRoot,
        );
        expect(gqaResult.ok).toBe(true);

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
    "verify-phase-1-export-routes script passes after build:export",
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
          ["./scripts/verify-phase-1-export-routes.ts"],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: process.env,
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
});
