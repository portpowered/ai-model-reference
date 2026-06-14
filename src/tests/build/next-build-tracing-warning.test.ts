import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  buildOutputHasTurbopackWholeProjectTracingWarning,
  firstMatchingTurbopackTracingWarningPattern,
} from "@/lib/build/turbopack-nft-tracing-warning";

const repoRoot = join(import.meta.dir, "../../..");
const nextDir = join(repoRoot, ".next");

/**
 * Regression gate for Turbopack NFT whole-project filesystem tracing warnings.
 *
 * Guarded diagnostic fragments (see turbopack-nft-tracing-warning.ts):
 * - "Encountered unexpected file" … "NFT"
 * - "whole project" … "traced unintentionally"
 * - unintentional whole-project filesystem tracing copy
 * - next.config import traces that pull in node:fs from content loaders
 */
describe("next build turbopack NFT tracing warning", () => {
  test(
    "bun run build exits 0 without whole-project NFT tracing warnings",
    () => {
      if (existsSync(nextDir)) {
        rmSync(nextDir, { recursive: true, force: true });
      }

      try {
        const result = spawnSync("bun", ["run", "build"], {
          cwd: repoRoot,
          encoding: "utf8",
          env: process.env,
        });

        const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

        expect(result.status).toBe(0);

        const matchedPattern =
          firstMatchingTurbopackTracingWarningPattern(combined);
        if (matchedPattern !== undefined) {
          throw new Error(
            `Turbopack NFT whole-project tracing warning matched guarded pattern: ${matchedPattern}`,
          );
        }
        expect(
          buildOutputHasTurbopackWholeProjectTracingWarning(combined),
        ).toBe(false);
      } finally {
        if (existsSync(nextDir)) {
          rmSync(nextDir, { recursive: true, force: true });
        }
      }
    },
    { timeout: 180_000 },
  );
});
