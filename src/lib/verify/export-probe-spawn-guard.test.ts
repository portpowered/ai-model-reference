import { describe, expect, test } from "bun:test";
import {
  isRetryableExportProbeFailure,
  runExportProbeWithSpawnGuard,
} from "./export-probe-spawn-guard";

describe("isRetryableExportProbeFailure", () => {
  test("treats transient Playwright browser closure as retryable", () => {
    expect(isRetryableExportProbeFailure(null)).toBe(false);
    expect(
      isRetryableExportProbeFailure(
        "goto: Target page, context or browser has been closed",
      ),
    ).toBe(true);
    expect(isRetryableExportProbeFailure("Failed to connect")).toBe(true);
    expect(
      isRetryableExportProbeFailure(
        "GQA comparison graph shell did not appear after hydration.",
      ),
    ).toBe(false);
  });
});

describe("runExportProbeWithSpawnGuard", () => {
  test("returns probe result when no spawn rejection escapes", async () => {
    const result = await runExportProbeWithSpawnGuard(async () => null);
    expect(result).toBeNull();
  });

  test("returns thrown probe errors as failure reasons", async () => {
    const result = await runExportProbeWithSpawnGuard(async () => {
      throw new Error("Failed to connect");
    });
    expect(result).toBe("Failed to connect");
  });
});
