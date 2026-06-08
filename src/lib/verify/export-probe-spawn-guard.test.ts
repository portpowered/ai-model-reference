import { describe, expect, test } from "bun:test";
import { runExportProbeWithSpawnGuard } from "./export-probe-spawn-guard";

describe("runExportProbeWithSpawnGuard", () => {
  test("returns probe result when no spawn rejection escapes", async () => {
    const result = await runExportProbeWithSpawnGuard(async () => null);
    expect(result).toBeNull();
  });

  test("converts escaped spawn rejections into retryable failure reasons", async () => {
    const result = await runExportProbeWithSpawnGuard(async () => {
      process.emit(
        "unhandledRejection",
        Object.assign(new Error("Failed to connect"), {
          code: "ENOENT",
          errno: -2,
        }),
      );
      return null;
    });

    expect(result).toBe("Failed to connect");
  });
});
