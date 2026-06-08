import { describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runStaticExportBuild } from "./run-static-export-build";

const STATIC_EXPORT_BUILD_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-static-export-build.lock",
);

describe("runStaticExportBuild", () => {
  test("returns a non-zero status when build:export is invoked from an invalid cwd", () => {
    try {
      unlinkSync(STATIC_EXPORT_BUILD_LOCK_PATH);
    } catch {
      // Lock file may not exist between parallel test files.
    }

    const result = runStaticExportBuild({
      cwd: join(tmpdir(), "missing-model-atlas-export-cwd"),
    });

    expect(result.status).not.toBe(0);
  });
});
