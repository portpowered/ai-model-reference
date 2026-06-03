import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const sourceDir = join(repoRoot, ".source");
const sourceServerModule = join(sourceDir, "server.ts");

/** TypeScript missing-module errors for the gitignored Fumadocs import path. */
const missingSourceServerPattern =
  /cannot find module.*\.source\/server|cannot find module.*\.\.\/\.\.\/\.source\/server/i;

describe("fresh-checkout typecheck", () => {
  test("make typecheck succeeds when .source is absent and regenerates output", () => {
    if (existsSync(sourceDir)) {
      rmSync(sourceDir, { recursive: true, force: true });
    }
    expect(existsSync(sourceDir)).toBe(false);

    const result = spawnSync("make", ["typecheck"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    });

    const stderr = result.stderr ?? "";
    expect(stderr).not.toMatch(missingSourceServerPattern);
    expect(stderr).not.toContain(".source/server");

    expect(result.status).toBe(0);
    expect(existsSync(sourceServerModule)).toBe(true);
  });
});
