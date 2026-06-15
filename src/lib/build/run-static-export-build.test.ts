import { describe, expect, test } from "bun:test";
import { closeSync, openSync, unlinkSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getStaticExportBuildBunTestTimeoutMs,
  runStaticExportBuild,
  STALE_STATIC_EXPORT_BUILD_LOCK_MAX_AGE_MS,
  STATIC_EXPORT_BUILD_LOCK_PATH,
} from "./run-static-export-build";

describe("runStaticExportBuild", () => {
  test("uses a 600s Bun timeout ceiling for export build rows", () => {
    expect(getStaticExportBuildBunTestTimeoutMs({ CI: "true" })).toBe(600_000);
    expect(getStaticExportBuildBunTestTimeoutMs({})).toBe(600_000);
  });

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

  test("reclaims stale static export build locks left by crashed workers", () => {
    try {
      unlinkSync(STATIC_EXPORT_BUILD_LOCK_PATH);
    } catch {
      // Lock file may not exist between parallel test files.
    }

    const fd = openSync(STATIC_EXPORT_BUILD_LOCK_PATH, "wx");
    closeSync(fd);
    const staleTime =
      Date.now() - STALE_STATIC_EXPORT_BUILD_LOCK_MAX_AGE_MS - 1_000;
    utimesSync(
      STATIC_EXPORT_BUILD_LOCK_PATH,
      staleTime / 1000,
      staleTime / 1000,
    );

    const result = runStaticExportBuild({
      cwd: join(tmpdir(), "missing-model-atlas-export-cwd"),
    });

    expect(result.status).not.toBe(0);
  });
});
