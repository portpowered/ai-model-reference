import { describe, expect, test } from "bun:test";
import { runExportProbeWithSpawnGuard } from "./export-probe-spawn-guard";

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
