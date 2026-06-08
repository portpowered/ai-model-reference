import { afterEach, describe, expect, test } from "bun:test";
import {
  getExportIntegrationBunTestTimeoutMs,
  shouldSerializeExportIntegrationProbes,
  withExportIntegrationProbeLock,
} from "./export-integration-probe-lock";

describe("export integration probe lock", () => {
  const originalCi = process.env.CI;
  const originalGithubActions = process.env.GITHUB_ACTIONS;

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
    if (originalGithubActions === undefined) {
      delete process.env.GITHUB_ACTIONS;
    } else {
      process.env.GITHUB_ACTIONS = originalGithubActions;
    }
  });

  test("resolves export integration Bun ceilings from current env", () => {
    process.env.CI = "true";
    expect(getExportIntegrationBunTestTimeoutMs()).toBe(900_000);

    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    expect(getExportIntegrationBunTestTimeoutMs()).toBe(300_000);
  });

  test("detects CI serialization flags", () => {
    process.env.CI = "true";
    expect(shouldSerializeExportIntegrationProbes()).toBe(true);

    delete process.env.CI;
    process.env.GITHUB_ACTIONS = "true";
    expect(shouldSerializeExportIntegrationProbes()).toBe(true);

    delete process.env.GITHUB_ACTIONS;
    expect(shouldSerializeExportIntegrationProbes()).toBe(false);
  });

  test("runs probes without serialization outside CI", async () => {
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    expect(shouldSerializeExportIntegrationProbes()).toBe(false);

    const value = await withExportIntegrationProbeLock(async () => "ok");
    expect(value).toBe("ok");
  });
});
